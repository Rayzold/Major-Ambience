// Now-Playing store — module-level state + a tiny pub/sub so any
// component can subscribe via the usePlayer() hook. We don't reach for
// Zustand because (a) it isn't a workspace dep, (b) the surface here is
// small enough that React's useSyncExternalStore handles it cleanly.
//
// Flow:
//   playTrack(track, queue)
//     → loadTrack via backend
//     → swap the live handle (crossfading if there was a previous one)
//     → wire onProgress / onEnded
//     → onEnded picks next track from queue (or stops if empty)
//
// State surfaced to React:
//   nowPlaying:  current Track or null
//   playing:     boolean — true while the player is unpaused
//   positionSec: where we are in the current clip
//   durationSec: clip duration, 0 until known
//   queue:       remaining tracks (next-up preview, drives auto-advance)

import { useSyncExternalStore } from "react";
import type { Track, TrackHandle } from "@mc/core";
import { crossfade } from "@mc/core";
import { ensureAudioMode, getBackend } from "./backend";

export type PlayerState = {
  nowPlaying: Track | null;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  queue: Track[];
};

const INITIAL_STATE: PlayerState = {
  nowPlaying: null,
  playing: false,
  positionSec: 0,
  durationSec: 0,
  queue: [],
};

let _state: PlayerState = INITIAL_STATE;
let _activeHandle: TrackHandle | null = null;
let _unsubProgress: (() => void) | null = null;
let _unsubEnded: (() => void) | null = null;

const listeners = new Set<() => void>();

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): PlayerState {
  return _state;
}

function setState(patch: Partial<PlayerState>): void {
  _state = { ..._state, ...patch };
  for (const l of listeners) l();
}

/** React hook — re-renders on any state change. */
export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Start playing a track. If something is already playing, crossfades over
 * 600ms. The optional `queue` populates auto-advance — the first item in
 * the queue (after the now-playing one) becomes the next track on natural
 * end. Pass the visible-track-list slice from a category view so the user
 * hears the next adjacent track when the current one finishes.
 */
export async function playTrack(track: Track, queue: readonly Track[] = []): Promise<void> {
  await ensureAudioMode();
  const backend = getBackend();
  const newHandle = await backend.loadTrack(track.uri, { bus: "music" });
  backend.setGain(newHandle, 0); // start silent for fade-in
  backend.play(newHandle, 0);
  backend.setGain(newHandle, 1, 0.6);

  // Crossfade out + destroy the previous handle (if any).
  const prev = _activeHandle;
  if (prev) {
    crossfade(prev, newHandle, 0.6, backend);
  }

  // Tear down old subscriptions before swapping the handle reference.
  _unsubProgress?.();
  _unsubEnded?.();
  _activeHandle = newHandle;
  _unsubProgress = backend.onProgress(newHandle, (t) => {
    setState({ positionSec: t });
  });
  _unsubEnded = backend.onEnded(newHandle, () => {
    void handleNaturalEnd();
  });

  // Filter out the now-playing track from the queue we keep for auto-advance.
  // Callers usually pass the full visible list, so we drop everything up to
  // and including the current track to find the next-up slice.
  const nextQueue = sliceAfter(queue, track.id);

  setState({
    nowPlaying: track,
    playing: true,
    positionSec: 0,
    durationSec: (track.durationMs ?? 0) / 1000,
    queue: nextQueue,
  });
}

export function togglePlay(): void {
  const backend = getBackend();
  if (!_activeHandle) return;
  if (_state.playing) {
    backend.pause(_activeHandle);
    setState({ playing: false });
  } else {
    backend.play(_activeHandle);
    setState({ playing: true });
  }
}

/** Stop playback and tear everything down. */
export function stop(): void {
  const backend = getBackend();
  if (_activeHandle) {
    backend.destroy(_activeHandle);
    _activeHandle = null;
  }
  _unsubProgress?.();
  _unsubEnded?.();
  _unsubProgress = null;
  _unsubEnded = null;
  setState({
    nowPlaying: null,
    playing: false,
    positionSec: 0,
    durationSec: 0,
    queue: [],
  });
}

/** Skip to the next queued track. No-op when the queue is empty. */
export async function skipNext(): Promise<void> {
  const next = _state.queue[0];
  if (!next) {
    stop();
    return;
  }
  await playTrack(next, _state.queue);
}

async function handleNaturalEnd(): Promise<void> {
  // Same path as a manual skip — keeps auto-advance and tap-skip semantically aligned.
  await skipNext();
}

function sliceAfter(queue: readonly Track[], currentId: string): Track[] {
  const idx = queue.findIndex((t) => t.id === currentId);
  if (idx < 0) return queue.slice();
  return queue.slice(idx + 1);
}
