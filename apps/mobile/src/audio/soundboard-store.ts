// Soundboard audio store — manages multiple simultaneous pad sounds.
// Each pad can play independently with its own volume, loop, and state.
//
// Auto-ducks the music bus while any pad is alive — desktop parity
// from apps/desktop/src/lib/pad-audio.ts (BUILD_GUIDE.md § 4.2).
//   "When any SFX plays, ramp the music bus down to (1 - duckingAmount)
//   over 150ms, hold while at least one SFX is alive, then ramp back
//   over 400ms."

import React from "react";
import type { SoundboardSlot, Track, TrackHandle } from "@mc/core";
import { getBackend } from "./backend";

const DUCK_DOWN_SEC = 0.15;
const DUCK_UP_SEC = 0.4;
let duckingPct = 0.4;

/** Set the duck amount (0..1). If pads are alive, re-applies on the fly. */
export function setDuckingPct(pct: number): void {
  duckingPct = Math.max(0, Math.min(1, pct));
  if (activePads.size > 0) {
    getBackend().setBusGain("music", 1 - duckingPct, DUCK_DOWN_SEC);
  }
}

export function getDuckingPct(): number {
  return duckingPct;
}

/**
 * Apply the current duck state based on how many pads are alive.
 * Called after every set / delete on `activePads`.
 */
function applyDuckForActiveCount(): void {
  const backend = getBackend();
  if (activePads.size > 0) {
    backend.setBusGain("music", 1 - duckingPct, DUCK_DOWN_SEC);
  } else {
    backend.setBusGain("music", 1, DUCK_UP_SEC);
  }
}

type PadHandle = {
  slot: SoundboardSlot;
  track: Track;
  handle: TrackHandle;
  playing: boolean;
  /** Detaches the onEnded listener — called on manual stop so the
   *  auto-cleanup callback can't fire against an already-destroyed handle. */
  unsubEnded: () => void;
};

let activePads = new Map<string, PadHandle>();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
}

export function subscribeSoundboard(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getActivePads(): Map<string, PadHandle> {
  return new Map(activePads);
}

export function isPadPlaying(page: string, slot: number): boolean {
  const key = `${page}-${slot}`;
  const pad = activePads.get(key);
  return pad?.playing ?? false;
}

/**
 * Play a sound from a soundboard pad.
 * If the pad is already playing, stop it first.
 * Supports per-pad volume and looping.
 */
export async function playPad(
  slot: SoundboardSlot,
  track: Track,
): Promise<void> {
  const key = `${slot.page}-${slot.slot}`;
  
  // Stop if already playing
  if (activePads.has(key)) {
    await stopPad(slot.page, slot.slot);
  }

  try {
    const backend = getBackend();
    const handle = await backend.loadTrack(track.uri, { bus: "soundboard" });

    // Apply per-pad settings. getBackend() returns the concrete
    // ExpoAudioBackend, so setLooping is in scope without a cast.
    backend.setGain(handle, slot.volume);
    backend.setLooping(handle, slot.loop);

    // Auto-cleanup when playback finishes. Use the backend's onEnded
    // rather than a setTimeout(durationMs): mobile often hasn't probed
    // durationMs (it's 0 → a timer would never fire and the pad would
    // leak), and even when known a timer drifts against real playback
    // latency. Looping pads never fire onEnded (player.loop = true), so
    // they only stop on an explicit stopPad / stopAllPads.
    const unsubEnded = backend.onEnded(handle, () => {
      void stopPad(slot.page, slot.slot);
    });

    // Start playback
    backend.play(handle);

    // Track active pad
    activePads.set(key, {
      slot,
      track,
      handle,
      playing: true,
      unsubEnded,
    });

    applyDuckForActiveCount();
    notifyListeners();
  } catch (err) {
    console.error("Failed to play pad:", err);
    throw err;
  }
}

/**
 * Stop a playing pad.
 */
export async function stopPad(page: string, slot: number): Promise<void> {
  const key = `${page}-${slot}`;
  const pad = activePads.get(key);
  
  if (!pad) return;

  try {
    const backend = getBackend();
    pad.unsubEnded();
    backend.pause(pad.handle);
    backend.destroy(pad.handle);
  } catch (err) {
    console.error("Failed to stop pad:", err);
  } finally {
    activePads.delete(key);
    applyDuckForActiveCount();
    notifyListeners();
  }
}

/**
 * One-shot soundboard fire — for stingers, alerts, and any other
 * pad-shaped audio that doesn't have a (page, slot) home. Routes
 * through the soundboard bus (so the music ducker reacts the same as
 * a real pad), uses a unique synthetic key so multiple stingers can
 * overlap, and auto-cleans on natural end.
 *
 * Used by Timers: when a tension countdown reaches zero, the bound
 * stinger track fires here. Each timer can fire independently and
 * none of them collide with the manual soundboard grid above.
 */
export async function fireSfx(track: Track): Promise<void> {
  const key = `sfx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  // SoundboardSlot's page/slot fields are strict literals (`"A"|"B"|"C"`
  // and `1..8`), so we can't invent a "_sfx" channel here. The handle is
  // keyed by our synthetic `key` above, which is what every lookup uses
  // — the slot.page/slot fields below only need to satisfy the type and
  // are never read for sfx fires. setPadVolume("A", 1, v) finds the real
  // pad (if any) under the "A-1" key, not this entry.
  const slot: SoundboardSlot = {
    page: "A",
    slot: 1,
    trackId: track.id,
    loop: false,
    volume: 1,
  };

  try {
    const backend = getBackend();
    const handle = await backend.loadTrack(track.uri, { bus: "soundboard" });
    backend.setGain(handle, slot.volume);
    backend.setLooping(handle, slot.loop);

    const unsubEnded = backend.onEnded(handle, () => {
      // Auto-cleanup: stop is keyed by (page, slot) but our synthetic
      // key isn't expressible there. Run an inline teardown that mirrors
      // stopPad and ticks the ducker.
      const pad = activePads.get(key);
      if (!pad) return;
      try {
        pad.unsubEnded();
        backend.destroy(pad.handle);
      } catch {
        /* swallow */
      }
      activePads.delete(key);
      applyDuckForActiveCount();
      notifyListeners();
    });

    backend.play(handle);

    activePads.set(key, {
      slot,
      track,
      handle,
      playing: true,
      unsubEnded,
    });

    applyDuckForActiveCount();
    notifyListeners();
  } catch (err) {
    console.error("fireSfx failed:", err);
  }
}

/**
 * Stop all playing pads.
 */
export async function stopAllPads(): Promise<void> {
  const keys = Array.from(activePads.keys());
  await Promise.all(
    keys.map((key) => {
      const [page, slotStr] = key.split("-");
      return stopPad(page, parseInt(slotStr, 10));
    }),
  );
}

/**
 * Update pad volume while playing.
 */
export function setPadVolume(page: string, slot: number, volume: number): void {
  const key = `${page}-${slot}`;
  const pad = activePads.get(key);
  
  if (!pad) return;

  try {
    const backend = getBackend();
    backend.setGain(pad.handle, volume);
    pad.slot.volume = volume;
    notifyListeners();
  } catch (err) {
    console.error("Failed to set pad volume:", err);
  }
}

/**
 * Hook for React components.
 */
export function useSoundboard() {
  const [, forceUpdate] = React.useState({});
  
  React.useEffect(() => {
    const unsub = subscribeSoundboard(() => forceUpdate({}));
    return unsub;
  }, []);

  return {
    activePads: getActivePads(),
    isPadPlaying,
    playPad,
    stopPad,
    stopAllPads,
    setPadVolume,
  };
}
