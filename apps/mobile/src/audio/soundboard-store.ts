// Soundboard audio store — manages multiple simultaneous pad sounds.
// Each pad can play independently with its own volume, loop, and state.

import React from "react";
import type { SoundboardSlot, Track, TrackHandle } from "@mc/core";
import { getBackend } from "./backend";

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
    notifyListeners();
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
