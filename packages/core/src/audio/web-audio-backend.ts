// WebAudioBackend — desktop & web AudioBackend implementation.
// See docs/BUILD_GUIDE.md § 3.4 (interface) and § 4 (engine details).
//
// Architecture (BUILD_GUIDE § 4.3):
//   <audio> ──> MediaElementSource ──> per-track Gain ──┐
//                                                       ├──> musicBus      ──┐
//                                                       │                    │
//                                                       └──> soundboardBus  ─┤──> master ──> destination
//
// One GainNode per track means crossfading is two independent ramps on two
// gain nodes; no glide artifact between sources.
// Splitting into musicBus + soundboardBus lets us duck only the music when
// a soundboard pad fires (BUILD_GUIDE § 4.2).

import type { AudioBackend, LoadOptions, TrackHandle, Unsubscribe } from "./backend.js";

type Bus = "music" | "soundboard";

type InternalHandle = TrackHandle & {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  bus: Bus;
  endedListeners: Set<() => void>;
  progressListeners: Set<(t: number) => void>;
  destroyed: boolean;
};

let handleCounter = 0;

export class WebAudioBackend implements AudioBackend {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;
  private readonly soundboardBus: GainNode;
  private readonly handles = new WeakMap<TrackHandle, InternalHandle>();

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.master);

    this.soundboardBus = this.ctx.createGain();
    this.soundboardBus.gain.value = 1;
    this.soundboardBus.connect(this.master);
  }

  /** Linear ramp on the master bus — volume slider feeds this. */
  setMasterGain(g: number, rampSeconds?: number): void {
    this.rampParam(this.master.gain, g, rampSeconds);
  }

  /** Music bus gain — the ducker drives this when soundboard pads fire. */
  setMusicBusGain(g: number, rampSeconds?: number): void {
    this.rampParam(this.musicBus.gain, g, rampSeconds);
  }

  /** Soundboard bus gain — rarely needed externally; included for parity. */
  setSoundboardBusGain(g: number, rampSeconds?: number): void {
    this.rampParam(this.soundboardBus.gain, g, rampSeconds);
  }

  private rampParam(param: AudioParam, g: number, rampSeconds?: number): void {
    const target = clamp01(g);
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (rampSeconds && rampSeconds > 0) {
      param.linearRampToValueAtTime(target, now + rampSeconds);
    } else {
      param.setValueAtTime(target, now);
    }
  }

  currentTime(): number {
    return this.ctx.currentTime;
  }

  async loadTrack(uri: string, opts: LoadOptions = {}): Promise<TrackHandle> {
    const bus: Bus = opts.bus ?? "music";

    // AudioContext starts suspended in many browsers/WebViews — resume lazily.
    if (this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => {
        /* will be retried on first play() */
      });
    }

    const audio = new Audio();
    audio.src = uri;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    await waitForCanPlay(audio);

    const source = this.ctx.createMediaElementSource(audio);
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    const target = bus === "soundboard" ? this.soundboardBus : this.musicBus;
    source.connect(gain).connect(target);

    const id = `wab-${++handleCounter}`;
    const publicHandle: TrackHandle = { id, uri };
    const internal: InternalHandle = {
      ...publicHandle,
      audio,
      source,
      gain,
      bus,
      endedListeners: new Set(),
      progressListeners: new Set(),
      destroyed: false,
    };

    audio.addEventListener("ended", () => {
      for (const cb of internal.endedListeners) cb();
    });
    audio.addEventListener("timeupdate", () => {
      const t = audio.currentTime;
      for (const cb of internal.progressListeners) cb(t);
    });

    this.handles.set(publicHandle, internal);
    return publicHandle;
  }

  play(handle: TrackHandle, at?: number): void {
    const h = this.get(handle);
    if (!h) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (typeof at === "number" && Number.isFinite(at)) h.audio.currentTime = at;
    void h.audio.play().catch(() => {
      // Browsers may block play() without a gesture; the next call from a
      // user-initiated handler will succeed.
    });
  }

  pause(handle: TrackHandle): void {
    const h = this.get(handle);
    if (!h) return;
    h.audio.pause();
  }

  seek(handle: TrackHandle, t: number): void {
    const h = this.get(handle);
    if (!h) return;
    if (Number.isFinite(t) && t >= 0) h.audio.currentTime = t;
  }

  setGain(handle: TrackHandle, g: number, rampSeconds?: number): void {
    const h = this.get(handle);
    if (!h) return;
    const target = clamp01(g);
    const param = h.gain.gain;
    const now = this.ctx.currentTime;
    // Cancel any pending automation and anchor at the current value so the
    // ramp starts from "now" rather than from whatever was last scheduled.
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (rampSeconds && rampSeconds > 0) {
      param.linearRampToValueAtTime(target, now + rampSeconds);
    } else {
      param.setValueAtTime(target, now);
    }
  }

  destroy(handle: TrackHandle): void {
    const h = this.get(handle);
    if (!h || h.destroyed) return;
    h.destroyed = true;
    try {
      h.audio.pause();
      h.audio.removeAttribute("src");
      h.audio.load();
    } catch {
      /* swallow */
    }
    try {
      h.source.disconnect();
      h.gain.disconnect();
    } catch {
      /* swallow */
    }
    h.endedListeners.clear();
    h.progressListeners.clear();
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

  /** Lower-level access for debugging in the renderer. Not part of AudioBackend. */
  getRawHandle(handle: TrackHandle): InternalHandle | undefined {
    return this.handles.get(handle);
  }

  private get(handle: TrackHandle): InternalHandle | undefined {
    return this.handles.get(handle);
  }
}

/**
 * Crossfade — ramp out -> 0 and in -> 1 over `durationSec`, then destroy `out`.
 * Spec: BUILD_GUIDE.md § 4.1.
 */
export function crossfade(
  out: TrackHandle,
  in_: TrackHandle,
  durationSec: number,
  backend: AudioBackend,
): void {
  backend.setGain(out, 0, durationSec);
  backend.setGain(in_, 1, durationSec);
  setTimeout(() => backend.destroy(out), durationSec * 1000 + 50);
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audio.readyState >= 3 /* HAVE_FUTURE_DATA */) {
      resolve();
      return;
    }
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(audio.error ?? new Error("audio load error"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
  });
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
