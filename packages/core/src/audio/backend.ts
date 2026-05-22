// Platform-agnostic audio backend interface.
// See docs/BUILD_GUIDE.md § 3.4 and § 4.

export type Unsubscribe = () => void;

export type TrackHandle = {
  readonly id: string;
  readonly uri: string;
};

export type LoadOptions = {
  gapless?: boolean;
  /**
   * Which mixing bus to route through. `music` is the default and gets
   * ducked when SFX/soundboard plays; `soundboard` plays alongside without
   * being ducked itself.
   */
  bus?: "music" | "soundboard";
};

export type AudioBackend = {
  /** Wall-clock seconds since the backend's audio context started. */
  currentTime(): number;

  /** Load a track from a platform URI (file://, content://, app://, etc.). */
  loadTrack(uri: string, opts?: LoadOptions): Promise<TrackHandle>;

  /** Start playback. `at` is seconds from the start of the clip. */
  play(handle: TrackHandle, at?: number): void;

  /** Pause playback. Resumes from the same position on next play(). */
  pause(handle: TrackHandle): void;

  /** Seek to `t` seconds from the start of the clip. */
  seek(handle: TrackHandle, t: number): void;

  /**
   * Ramp gain to `g` (0..1). If `rampSeconds` is omitted or 0, set instantly;
   * otherwise schedule a linear ramp from the current value over `rampSeconds`.
   */
  setGain(handle: TrackHandle, g: number, rampSeconds?: number): void;

  /** Release all resources held by this handle. After this, the handle is dead. */
  destroy(handle: TrackHandle): void;

  /** Subscribe to playback time updates (seconds). */
  onProgress(handle: TrackHandle, cb: (t: number) => void): Unsubscribe;

  /** Subscribe to the natural end-of-track event. */
  onEnded(handle: TrackHandle, cb: () => void): Unsubscribe;
};
