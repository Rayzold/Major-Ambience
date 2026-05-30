// ExpoAudioBackend — mobile AudioBackend implementation on top of
// expo-audio (Expo SDK 56+). See docs/BUILD_GUIDE.md § 3.4 for the
// interface contract and § 4 for the desktop reference.
//
// Why expo-audio (not expo-av, not react-native-track-player):
//   - expo-av is deprecated in SDK 54+; we'd be writing dead code.
//   - react-native-track-player is the heaviest option, requires an
//     EAS dev-client build, and is geared toward queue-driven podcast
//     apps. We want a low-level mixer the React layer drives, not a
//     queue we hand tracks to.
//   - expo-audio is the supported Expo audio API as of SDK 56 and gives
//     us imperative AudioPlayer handles, which map cleanly onto our
//     AudioBackend interface.
//
// Differences vs WebAudioBackend (acknowledged limits, not bugs):
//   - No native gain-ramp API. `setGain(handle, g, rampSeconds)` runs a
//     JS-driven linear ramp via setInterval (~60Hz). Audible artifacts
//     are minor at typical fade lengths (1–4s), but don't expect the
//     sample-accurate ramps you get from a Web Audio AudioParam.
//   - No mix-bus graph. expo-audio players are independent — there is
//     no shared GainNode for "all music" we can duck. We track the
//     per-player gain (`userGain`) and the per-bus gain (`busGain`) in
//     JS and multiply on write. `setBusGain(bus, g, rampSeconds?)`
//     drives the bus ramp from JS and re-applies to every live handle
//     on the same bus on every tick.
//   - `currentTime()` returns wall-clock from process start, not from
//     an audio context. Sufficient for the only caller (crossfade
//     scheduling).

import {
  createAudioPlayer,
  type AudioMetadata,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";
import type {
  AudioBackend,
  LoadOptions,
  TrackHandle,
  Unsubscribe,
} from "@mc/core";

type Bus = "music" | "soundboard";

type InternalHandle = TrackHandle & {
  player: AudioPlayer;
  bus: Bus;
  /** Gain the caller asked for via setGain. Multiplied with busGain when writing to the player. */
  userGain: number;
  /** Current ramp state, if any — letting destroy() cancel cleanly. */
  ramp: { cancel: () => void } | null;
  /** Last-known position in seconds — fed from status updates so we don't poll the native side. */
  positionSec: number;
  /** Set once the natural-end event has fired so we don't double-dispatch. */
  endedFired: boolean;
  endedListeners: Set<() => void>;
  progressListeners: Set<(t: number) => void>;
  /** Cleanup for the per-player status subscription. */
  statusSub: { remove: () => void } | null;
  destroyed: boolean;
};

let handleCounter = 0;
const RAMP_TICK_MS = 16; // ~60 Hz JS ramp

type BusRamp = { cancel: () => void };

export class ExpoAudioBackend implements AudioBackend {
  private readonly started = Date.now();
  /**
   * Live handle store. A regular `Map` keyed by `handle.id` (not a
   * WeakMap) so `reapplyAll()` can actually iterate. `destroy()` clears
   * the entry, so retention is bounded by caller discipline (the same
   * contract as before — destroy() was already required to release the
   * native player). Map size in steady state is small (1–2 music
   * tracks + N pads, typically < 10).
   */
  private readonly handles = new Map<string, InternalHandle>();
  /**
   * The handle currently owning the lock-screen / remote-control session.
   * expo-audio allows only one player to be active for lock-screen at a
   * time, so we track who has it and clear when that handle is destroyed.
   */
  private lockScreenHandleId: string | null = null;
  /** Per-bus gain multipliers — applied on top of each handle's userGain. */
  private busGains: Record<Bus, number> = { music: 1, soundboard: 1 };
  /** Active per-bus ramp, if any — cancelled before scheduling the next. */
  private busRamps: Record<Bus, BusRamp | null> = { music: null, soundboard: null };
  private masterGain = 1;
  private masterRamp: BusRamp | null = null;

  currentTime(): number {
    return (Date.now() - this.started) / 1000;
  }

  async loadTrack(uri: string, opts: LoadOptions = {}): Promise<TrackHandle> {
    const bus: Bus = opts.bus ?? "music";
    // createAudioPlayer is synchronous in expo-audio — it kicks off
    // loading internally and surfaces readiness via status updates.
    const player = createAudioPlayer({ uri });

    const id = `eab-${++handleCounter}`;
    const publicHandle: TrackHandle = { id, uri };
    const internal: InternalHandle = {
      ...publicHandle,
      player,
      bus,
      userGain: 1,
      ramp: null,
      positionSec: 0,
      endedFired: false,
      endedListeners: new Set(),
      progressListeners: new Set(),
      statusSub: null,
      destroyed: false,
    };

    // Subscribe to status updates. We use them for both progress dispatch
    // and end-of-track detection (didJustFinish).
    internal.statusSub = player.addListener(
      "playbackStatusUpdate",
      (status: AudioStatus) => {
        if (internal.destroyed) return;
        if (typeof status.currentTime === "number") {
          internal.positionSec = status.currentTime;
          for (const cb of internal.progressListeners) cb(status.currentTime);
        }
        if (status.didJustFinish && !internal.endedFired && !player.loop) {
          internal.endedFired = true;
          for (const cb of internal.endedListeners) cb();
        }
      },
    );

    // Push the initial gain through so the player respects bus + master from frame 1.
    this.applyGain(internal);

    this.handles.set(id, internal);
    return publicHandle;
  }

  play(handle: TrackHandle, at?: number): void {
    const h = this.get(handle);
    if (!h) return;
    if (typeof at === "number" && Number.isFinite(at) && at >= 0) {
      h.player.seekTo(at);
    }
    // Replaying after a natural end requires us to reset the latch so
    // onEnded fires next time around.
    h.endedFired = false;
    h.player.play();
  }

  pause(handle: TrackHandle): void {
    const h = this.get(handle);
    if (!h) return;
    h.player.pause();
  }

  seek(handle: TrackHandle, t: number): void {
    const h = this.get(handle);
    if (!h) return;
    if (Number.isFinite(t) && t >= 0) h.player.seekTo(t);
  }

  setGain(handle: TrackHandle, g: number, rampSeconds?: number): void {
    const h = this.get(handle);
    if (!h) return;
    const target = clamp01(g);

    // Cancel any in-flight ramp before scheduling the next one.
    if (h.ramp) {
      h.ramp.cancel();
      h.ramp = null;
    }

    if (!rampSeconds || rampSeconds <= 0) {
      h.userGain = target;
      this.applyGain(h);
      return;
    }

    const start = h.userGain;
    const delta = target - start;
    const tStart = performance.now();
    const tEnd = tStart + rampSeconds * 1000;
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
      if (h.destroyed) {
        if (timer) clearInterval(timer);
        return;
      }
      const now = performance.now();
      const frac = (now - tStart) / (tEnd - tStart);
      if (frac >= 1) {
        h.userGain = target;
        this.applyGain(h);
        if (timer) clearInterval(timer);
        timer = null;
        h.ramp = null;
        return;
      }
      h.userGain = start + delta * frac;
      this.applyGain(h);
    }, RAMP_TICK_MS);
    h.ramp = {
      cancel: () => {
        if (timer) clearInterval(timer);
        timer = null;
      },
    };
  }

  destroy(handle: TrackHandle): void {
    const h = this.get(handle);
    if (!h || h.destroyed) return;
    h.destroyed = true;
    if (h.ramp) {
      h.ramp.cancel();
      h.ramp = null;
    }
    h.endedListeners.clear();
    h.progressListeners.clear();
    try {
      h.statusSub?.remove();
    } catch {
      /* swallow */
    }
    h.statusSub = null;
    try {
      h.player.pause();
    } catch {
      /* swallow */
    }
    if (this.lockScreenHandleId === h.id) {
      try {
        h.player.clearLockScreenControls();
      } catch {
        /* swallow */
      }
      this.lockScreenHandleId = null;
    }
    try {
      // expo-audio AudioPlayer exposes `remove()` to release native resources.
      h.player.remove();
    } catch {
      /* swallow */
    }
    this.handles.delete(handle.id);
  }

  onProgress(handle: TrackHandle, cb: (t: number) => void): Unsubscribe {
    const h = this.get(handle);
    if (!h) return () => {};
    h.progressListeners.add(cb);
    return () => h.progressListeners.delete(cb);
  }

  onEnded(handle: TrackHandle, cb: () => void): Unsubscribe {
    const h = this.get(handle);
    if (!h) return () => {};
    h.endedListeners.add(cb);
    return () => h.endedListeners.delete(cb);
  }

  /** Looping is exposed off-interface — Library reads loopMode and calls this. */
  setLooping(handle: TrackHandle, loop: boolean): void {
    const h = this.get(handle);
    if (!h) return;
    h.player.loop = loop;
  }

  /**
   * Activate lock-screen / Now-Playing controls for this handle with the
   * given metadata. Required on Android for sustained background
   * playback: without it the OS pauses background audio after ~3 minutes
   * (expo-audio docs). On iOS it also drives the Control Center widget
   * and lock-screen artwork.
   *
   * Only one handle owns the session at a time — calling this with a new
   * handle transparently transfers ownership and clears the previous
   * owner's controls. Pass through every track change in the music
   * store; do NOT call for soundboard pads or stingers (they'd
   * supplant the music entry on the lock-screen).
   */
  setLockScreenMetadata(handle: TrackHandle, metadata: AudioMetadata): void {
    const h = this.get(handle);
    if (!h) return;
    if (this.lockScreenHandleId && this.lockScreenHandleId !== h.id) {
      const prev = this.handles.get(this.lockScreenHandleId);
      if (prev) {
        try {
          prev.player.clearLockScreenControls();
        } catch {
          /* swallow — old player may already be gone */
        }
      }
    }
    try {
      h.player.setActiveForLockScreen(true, metadata);
      this.lockScreenHandleId = h.id;
    } catch (err) {
      console.warn("setActiveForLockScreen failed:", err);
    }
  }

  /** Master volume (slider) — multiplied into every player's effective gain. */
  setMasterGain(g: number, rampSeconds?: number): void {
    const target = clamp01(g);
    if (this.masterRamp) {
      this.masterRamp.cancel();
      this.masterRamp = null;
    }
    if (!rampSeconds || rampSeconds <= 0) {
      this.masterGain = target;
      this.reapplyAll();
      return;
    }
    this.masterRamp = this.scheduleRamp(this.masterGain, target, rampSeconds, (v) => {
      this.masterGain = v;
      this.reapplyAll();
    });
  }

  /**
   * Per-bus gain (music vs soundboard). The mobile mixer has no native bus
   * graph, so this animates `busGains[bus]` in JS and re-applies the
   * effective gain (`userGain × busGain × masterGain`) to every live handle
   * on every tick. The soundboard store calls this to duck music when a
   * pad fires.
   */
  setBusGain(bus: Bus, g: number, rampSeconds?: number): void {
    const target = clamp01(g);
    if (this.busRamps[bus]) {
      this.busRamps[bus]!.cancel();
      this.busRamps[bus] = null;
    }
    if (!rampSeconds || rampSeconds <= 0) {
      this.busGains[bus] = target;
      this.reapplyBus(bus);
      return;
    }
    const start = this.busGains[bus];
    this.busRamps[bus] = this.scheduleRamp(start, target, rampSeconds, (v) => {
      this.busGains[bus] = v;
      this.reapplyBus(bus);
    });
  }

  private applyGain(h: InternalHandle): void {
    const effective = h.userGain * this.busGains[h.bus] * this.masterGain;
    try {
      h.player.volume = clamp01(effective);
    } catch {
      // Player may have been removed under us; ignore — destroy() will tidy.
    }
  }

  /** Re-apply effective gain to every live handle. Used by master ramps. */
  private reapplyAll(): void {
    for (const h of this.handles.values()) {
      if (!h.destroyed) this.applyGain(h);
    }
  }

  /** Re-apply effective gain to every live handle on `bus` only. */
  private reapplyBus(bus: Bus): void {
    for (const h of this.handles.values()) {
      if (!h.destroyed && h.bus === bus) this.applyGain(h);
    }
  }

  /**
   * Shared linear ramp scheduler — used for the bus + master gains, which
   * don't have per-handle ramp state. The per-handle `setGain` ramp is a
   * separate copy in scope of the handle itself so destroy() can cancel
   * it directly without bookkeeping a handle reference here.
   */
  private scheduleRamp(
    start: number,
    target: number,
    seconds: number,
    onTick: (v: number) => void,
  ): BusRamp {
    const tStart = performance.now();
    const tEnd = tStart + seconds * 1000;
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
      const now = performance.now();
      const frac = (now - tStart) / (tEnd - tStart);
      if (frac >= 1) {
        onTick(target);
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      onTick(start + (target - start) * frac);
    }, RAMP_TICK_MS);
    return {
      cancel: () => {
        if (timer) clearInterval(timer);
        timer = null;
      },
    };
  }

  private get(handle: TrackHandle): InternalHandle | undefined {
    return this.handles.get(handle.id);
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
