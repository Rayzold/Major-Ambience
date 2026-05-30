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
import type { CategoryId, Track, TrackHandle } from "@mc/core";
import { crossfade } from "@mc/core";
import { weightedShuffle } from "@mc/core/shuffle";
import { ensureAudioMode, getBackend } from "./backend";
import { getDb } from "../data/db";
import { getConfig, setConfig } from "../data/config-repo";
import { bumpPlayCount, listTracksByCategory } from "../data/tracks-repo";

export type LoopMode = "off" | "track" | "queue";

export type PlayerState = {
  nowPlaying: Track | null;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  queue: Track[];
  loopMode: LoopMode;
};

const INITIAL_STATE: PlayerState = {
  nowPlaying: null,
  playing: false,
  positionSec: 0,
  durationSec: 0,
  queue: [],
  loopMode: "off",
};

const LOOP_MODE_KEY = "loop_mode";

let _state: PlayerState = INITIAL_STATE;
let _activeHandle: TrackHandle | null = null;
let _unsubProgress: (() => void) | null = null;
let _unsubEnded: (() => void) | null = null;
/**
 * The original queue passed to the last `playTrack` call. Kept so
 * "loop queue" can wrap back to the first track once the live `queue`
 * slice is exhausted. Distinct from `_state.queue`, which is the
 * remaining next-up slice that drains as tracks auto-advance.
 */
let _fullQueue: Track[] = [];

// Lazy-load persisted loop mode on module init. Fire-and-forget — the
// first frame may render with the default "off", and the next state
// push triggers a re-render with the loaded value.
void (async () => {
  try {
    const db = await getDb();
    const raw = await getConfig(db, LOOP_MODE_KEY);
    if (raw === "track" || raw === "queue" || raw === "off") {
      setState({ loopMode: raw });
    }
  } catch (err) {
    console.warn("loop_mode load failed:", err);
  }
})();

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
  // Take ownership of the lock-screen / Control Center entry. Required on
  // Android to keep background playback alive past the ~3 min idle cap.
  backend.setLockScreenMetadata(newHandle, {
    title: track.title,
    artist: track.pack || undefined,
  });

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

  // Remember the full caller-supplied queue so loop=queue can wrap back to
  // the top after the live next-up slice drains. The live `_state.queue`
  // below is the *next-up* slice (sliceAfter), which is what the UI
  // displays; `_fullQueue` is the source for the wraparound.
  _fullQueue = queue.length > 0 ? queue.slice() : [track];

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

  // Persist play_count + last_played_at so the Recently-played and
  // Favorites pseudo-views have current data. Unix seconds (not ms)
  // so the sync-blob format stays interoperable with desktop. Fire-
  // and-forget — a write failure shouldn't break playback.
  void (async () => {
    try {
      const db = await getDb();
      await bumpPlayCount(db, track.id, Math.floor(Date.now() / 1000));
    } catch (err) {
      console.warn("bumpPlayCount failed:", err);
    }
  })();
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
  // Loop modes intercept the natural-end path. Manual skip (skipNext)
  // deliberately doesn't honor "track" loop — a user tap means "skip",
  // not "restart". "queue" loop is honored in skipNext too so manual
  // skip past the end also wraps.
  const mode = _state.loopMode;
  if (mode === "track" && _state.nowPlaying) {
    // Replay the same track. playTrack handles tearing down the active
    // handle and starting fresh — simpler than a sample-accurate
    // self-crossfade, and matches desktop's behaviour when fadeSec is 0.
    await playTrack(_state.nowPlaying, _fullQueue);
    return;
  }
  if (_state.queue.length === 0 && mode === "queue" && _fullQueue.length > 0) {
    const first = _fullQueue[0];
    if (first) {
      await playTrack(first, _fullQueue);
      return;
    }
  }
  await skipNext();
}

/**
 * Play a weighted-shuffled list from the given category. Used by encounter
 * tables — rolling a category-bound entry should feel like "play me
 * something from this mood" rather than a deterministic track. The first
 * shuffled track becomes the now-playing track, the rest become the queue
 * so auto-advance keeps the same mood going.
 */
export async function playCategory(categoryId: CategoryId): Promise<void> {
  try {
    const db = await getDb();
    const list = await listTracksByCategory(db, categoryId);
    if (list.length === 0) return;
    const shuffled = weightedShuffle(list);
    const first = shuffled[0];
    if (!first) return;
    await playTrack(first, shuffled);
  } catch (err) {
    console.error("playCategory failed:", err);
  }
}

/**
 * Cycle loop mode: off → track → queue → off. Persists the new value
 * to the same `loop_mode` config key the desktop uses, so a future
 * cloud-sync round-trip carries it across surfaces.
 */
export async function cycleLoopMode(): Promise<void> {
  const next: LoopMode =
    _state.loopMode === "off"
      ? "track"
      : _state.loopMode === "track"
        ? "queue"
        : "off";
  setState({ loopMode: next });
  try {
    const db = await getDb();
    await setConfig(db, LOOP_MODE_KEY, next);
  } catch (err) {
    console.warn("loop_mode save failed:", err);
  }
}

function sliceAfter(queue: readonly Track[], currentId: string): Track[] {
  const idx = queue.findIndex((t) => t.id === currentId);
  if (idx < 0) return queue.slice();
  return queue.slice(idx + 1);
}
