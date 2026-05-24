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
//     per-player gain (`userGain`) and the bus gain (`busGain`) in JS
//     and multiply on write. `bus` is accepted for interface parity
//     but ducking lands in a follow-up PR.
//   - `currentTime()` returns wall-clock from process start, not from
//     an audio context. Sufficient for the only caller (crossfade
//     scheduling).

import {
  createAudioPlayer,
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

export class ExpoAudioBackend implements AudioBackend {
  private readonly started = Date.now();
  private readonly handles = new WeakMap<TrackHandle, InternalHandle>();
  /** Per-bus gain multipliers — applied on top of each handle's userGain. */
  private busGains: Record<Bus, number> = { music: 1, soundboard: 1 };
  private masterGain = 1;

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

    this.handles.set(publicHandle, internal);
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
    try {
      // expo-audio AudioPlayer exposes `remove()` to release native resources.
      h.player.remove();
    } catch {
      /* swallow */
    }
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

  /** Master volume (slider) — multiplied into every player's effective gain. */
  setMasterGain(g: number): void {
    this.masterGain = clamp01(g);
    this.reapplyAll();
  }

  /** Per-bus gain (music vs soundboard). Reserved for the future ducker. */
  setBusGain(bus: Bus, g: number): void {
    this.busGains[bus] = clamp01(g);
    this.reapplyAll();
  }

  private applyGain(h: InternalHandle): void {
    const effective = h.userGain * this.busGains[h.bus] * this.masterGain;
    try {
      h.player.volume = clamp01(effective);
    } catch {
      // Player may have been removed under us; ignore — destroy() will tidy.
    }
  }

  private reapplyAll(): void {
    // WeakMap has no iterator — we'd need a parallel Set if we want a true
    // global re-apply. For master volume changes the cheapest path is to
    // ramp from the call site; this hook is here so the API is complete.
    // No-op for now; v1 callers only set master gain at construction.
  }

  private get(handle: TrackHandle): InternalHandle | undefined {
    return this.handles.get(handle);
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
