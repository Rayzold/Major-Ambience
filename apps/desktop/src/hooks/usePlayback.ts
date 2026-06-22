// usePlayback — slice 3b of the Library.tsx god-component extraction
// (BACKLOG #2). The transport. Owns playback state + every primitive
// users interact with via the bottom transport bar:
//
//   - playTrack(track, queueContext?) — load + crossfade + wire onEnded
//     for queue advancement. The recursive call inside handles both
//     loop "track" self-crossfade and loop "queue" wraparound.
//   - togglePlay / prev / next / seek / seekRelative / stopAll
//   - cycleLoop (off → track → queue → off, persisted)
//
// What stays in Library (composition layer):
//   - handleShuffleCategory, handlePlayRandomFromCategory, handlePlayBoss,
//     handleRestoreScene — they build queues then call playback.playTrack().
//
// External seams the hook needs:
//   - `tracks` — read for prev/next lookups + the handleNext category-pool
//     fallback.
//   - `setTracks` — written by handlePlayTrack to enrich a track with
//     real duration (first load) + bump playCount + lastPlayedAt.
//   - `fadeMs` — crossfade duration. Lives in useAudioSettings; passed
//     in rather than re-owned so the loop-track self-crossfade trigger
//     and the inter-track crossfade share the same source of truth.
//   - `tracksByCategory` — used by handleNext's fallback (when the
//     queue is empty / exhausted, shuffle the current track's category).
//
// Closure note: handlePlayTrack's onEnded callback closes over loopMode
// + queue at subscription time. Naive state reads would go stale if the
// user toggles loop or rebuilds the queue mid-playback. We mirror both
// into refs (updated via useEffect) and read the refs in the closure.
// This is the same workaround as in the pre-extraction Library code.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  type CategoryId,
  type Track,
  type TrackHandle,
  crossfade,
  weightedShuffle,
} from "@mc/core";
import {
  bumpPlayCount,
  getConfig,
  getDb,
  setConfig,
  setDuration,
} from "@mc/data";
import { getAudioBackend } from "../lib/audio.js";
import { stopAllPads } from "../lib/pad-audio.js";
import { logEvent } from "../lib/diag.js";

export type PlaybackState = {
  trackId: string;
  handle: TrackHandle;
  startedAt: number;
  /** onProgress + onEnded subscriptions for THIS handle. Called BEFORE
   *  the next crossfade so the outgoing handle stops firing
   *  setCurrentTime — otherwise the scrubber oscillates between
   *  outgoing + incoming positions during the fade tail. */
  unsubProgress: () => void;
  unsubEnded: () => void;
};

export type LoopMode = "off" | "track" | "queue";

export type UsePlaybackOptions = {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  /** Crossfade duration in milliseconds. Read on every play attempt
   *  so a mid-track slider change applies on the NEXT crossfade. */
  fadeMs: number;
  /** Precomputed Library map — used by handleNext's category-pool
   *  fallback. Hot-path read; Library already memoizes it. */
  tracksByCategory: Map<CategoryId, Track[]>;
};

export type UsePlaybackReturn = {
  // Reactive state.
  playback: PlaybackState | null;
  isPlaying: boolean;
  currentTime: number;
  trackDurationSec: number;
  queue: Track[];
  loopMode: LoopMode;

  /** Queue setter — exposed for Library composition (handleRestoreScene
   *  rebuilds the queue before playing the head). Most callers should
   *  go through playTrack with a queueContext instead. */
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;

  // Transport.
  playTrack: (track: Track, queueContext?: Track[]) => Promise<void>;
  togglePlay: () => void;
  prev: () => void;
  next: () => void;
  seek: (sec: number) => void;
  seekRelative: (delta: number) => void;
  stopAll: () => void;
  cycleLoop: () => Promise<void>;

  /** Re-load persisted bits (loop mode) from SQLite. Called from
   *  Library's `refreshSyncableFromDb` after a cloud merge. */
  reloadFromDb: () => Promise<void>;
};

export function usePlayback(opts: UsePlaybackOptions): UsePlaybackReturn {
  const { tracks, setTracks, fadeMs, tracksByCategory } = opts;

  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDurationSec, setTrackDurationSec] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [loopMode, setLoopMode] = useState<LoopMode>("off");

  // Stable mirrors for the onEnded / onProgress closures (see header comment).
  const loopModeRef = useRef(loopMode);
  const queueRef = useRef(queue);
  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // fadeMs is read inside handlePlayTrack's recursive call paths — keep
  // it on a ref so the recursion (loop track self-crossfade) sees the
  // current value rather than the captured-at-mount value.
  const fadeMsRef = useRef(fadeMs);
  useEffect(() => {
    fadeMsRef.current = fadeMs;
  }, [fadeMs]);

  // Same for tracks + tracksByCategory — handleNext / handlePrev read
  // these via refs so changes don't churn closure identity.
  const tracksRef = useRef(tracks);
  const tracksByCategoryRef = useRef(tracksByCategory);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  useEffect(() => {
    tracksByCategoryRef.current = tracksByCategory;
  }, [tracksByCategory]);

  /**
   * Play a track. Optionally accepts a `queueContext` — the list of
   * tracks the click came from (e.g. the current filtered library
   * view) — and builds an autoqueue: the clicked track at position 0,
   * everything after it in its original order next, then everything
   * before it (wrapping). When the clicked track ends, onEnded picks
   * up the next entry; "queue" loop mode wraps at the end.
   *
   * Pass an empty array to leave the existing queue alone (used by
   * single-shot plays like the Shuffle button which manages the queue
   * separately).
   */
  const playTrack = useCallback(
    async (track: Track, queueContext: Track[] = []): Promise<void> => {
      if (queueContext.length > 0) {
        const idx = queueContext.findIndex((t) => t.id === track.id);
        const built =
          idx === -1
            ? [track, ...queueContext]
            : [...queueContext.slice(idx), ...queueContext.slice(0, idx)];
        setQueue(built);
      }
      const backend = getAudioBackend();
      const assetUri = convertFileSrc(track.uri);
      // Forensic trail for the silent-exit-during-playback class of bug
      // — every play attempt logs the track id + uri prefix before the
      // load even starts, so the last entry in the diag dump identifies
      // what was playing when the host died.
      logEvent("audio.play.start", {
        trackId: track.id,
        title: track.title,
        pack: track.pack,
      });
      try {
        const next = await backend.loadTrack(assetUri);
        backend.setGain(next, 0);

        // Capture and persist real duration on first load.
        const raw = backend.getRawHandle(next);
        const realDurSec = raw?.audio.duration;
        if (raw && Number.isFinite(realDurSec) && realDurSec! > 0) {
          const durMs = Math.round(realDurSec! * 1000);
          if (durMs !== track.durationMs) {
            void setDuration(await getDb(), track.id, durMs);
            setTracks((prev) =>
              prev.map((t) =>
                t.id === track.id ? { ...t, durationMs: durMs } : t,
              ),
            );
          }
          setTrackDurationSec(realDurSec!);
        }

        // Native loop stays off — both loop modes are handled in JS so
        // the crossfade ramp can apply (HTMLAudioElement.loop is a hard
        // cut). "track" loops via the self-crossfade trigger in
        // onProgress below; "queue" loops via the onEnded handler
        // wrapping to the queue head.
        if (raw) raw.audio.loop = false;

        // Latch — onProgress fires several times per second, but we
        // only want to kick the self-crossfade once per playback.
        // Reset on each fresh handlePlayTrack call by virtue of being
        // a new closure.
        let loopCrossfadeKicked = false;

        const subProgress = backend.onProgress(next, (t) => {
          setCurrentTime(t);
          const r = backend.getRawHandle(next);
          if (r && Number.isFinite(r.audio.duration)) {
            setTrackDurationSec(r.audio.duration);

            // Self-crossfade loop for "track" mode. When we enter the
            // last `fadeSec` of playback, start a fresh playback of
            // the same track. handlePlayTrack's existing crossfade
            // ramps the new handle in while the old handle ramps out,
            // so the loop point sounds like a smooth blend instead of
            // the hard cut you'd get from HTMLAudioElement.loop.
            // fadeMs comes from the ref so a mid-track slider change
            // applies on the NEXT iteration, not the one currently
            // fading.
            //
            // For tracks shorter than the configured fade we clamp
            // the trigger window to half the duration so we don't
            // fire at t=0 and chain self-loops without ever playing
            // the body.
            const dur = r.audio.duration;
            const fadeSec = Math.min(fadeMsRef.current / 1000, dur / 2);
            if (
              !loopCrossfadeKicked &&
              loopModeRef.current === "track" &&
              dur > 0 &&
              fadeSec > 0 &&
              dur - t <= fadeSec
            ) {
              loopCrossfadeKicked = true;
              logEvent("audio.loop.track.kick", {
                trackId: track.id,
                dur,
                fadeSec,
              });
              // No queueContext — looping the same track shouldn't
              // rewrite the queue ordering the user already built up.
              void playTrack(track);
            }
          }
        });
        const subEnded = backend.onEnded(next, () => {
          subProgress();
          subEnded();
          // When the self-crossfade already kicked off a fresh
          // playback of the same track, the new handle is now the
          // live one — letting this ended event run would flip
          // isPlaying off mid-loop and potentially advance the queue
          // past the just-restarted track.
          if (loopCrossfadeKicked) return;
          logEvent("audio.natural.end", { trackId: track.id });
          setIsPlaying(false);
          // Read loopMode + queue from refs — values captured in this
          // closure at subscription time get stale if the user
          // changes loop mode (or the queue) before the track ends.
          const liveQueue = queueRef.current;
          const liveLoopMode = loopModeRef.current;
          const idx = liveQueue.findIndex((t) => t.id === track.id);
          if (idx !== -1 && idx + 1 < liveQueue.length) {
            const upcoming = liveQueue[idx + 1];
            if (upcoming) void playTrack(upcoming);
          } else if (liveLoopMode === "queue" && liveQueue.length > 0) {
            const first = liveQueue[0];
            if (first) void playTrack(first);
          }
        });

        backend.play(next);
        backend.setGain(next, 1, fadeMsRef.current / 1000);

        // Capture the previous playback via the setter to avoid
        // racing two concurrent playTrack calls.
        let previous: PlaybackState | null = null;
        setPlayback((current) => {
          previous = current;
          return {
            trackId: track.id,
            handle: next,
            startedAt: performance.now(),
            unsubProgress: subProgress,
            unsubEnded: subEnded,
          };
        });
        if (previous) {
          // Detach the previous handle's onProgress + onEnded BEFORE
          // the crossfade starts. Otherwise both handles fire
          // setCurrentTime for the full fade duration and the
          // scrubber visibly jitters between the outgoing position
          // (near end) and the incoming position (near 0). The old
          // handle keeps playing for the fade-out — crossfade()
          // destroys it when the ramp completes.
          (previous as PlaybackState).unsubProgress();
          (previous as PlaybackState).unsubEnded();
          crossfade(
            (previous as PlaybackState).handle,
            next,
            fadeMsRef.current / 1000,
            backend,
          );
        }
        setIsPlaying(true);
        setCurrentTime(0);

        const db = await getDb();
        await bumpPlayCount(db, track.id, Math.floor(Date.now() / 1000));
        setTracks((prev) =>
          prev.map((t) =>
            t.id === track.id
              ? {
                  ...t,
                  playCount: t.playCount + 1,
                  lastPlayedAt: Math.floor(Date.now() / 1000),
                }
              : t,
          ),
        );
      } catch (err) {
        console.error("[playback] play failed:", err);
      }
    },
    [setTracks],
  );

  const togglePlay = useCallback(() => {
    setPlayback((current) => {
      if (!current) return current;
      const backend = getAudioBackend();
      // Use the functional setIsPlaying so we read the current value
      // without adding it to the deps + invalidating the callback on
      // every play/pause.
      setIsPlaying((wasPlaying) => {
        if (wasPlaying) backend.pause(current.handle);
        else backend.play(current.handle);
        return !wasPlaying;
      });
      return current;
    });
  }, []);

  /**
   * Cycle loop mode: off → track → queue → off. Persists to config.
   * The actual loop behavior is driven by `loopModeRef` reads inside
   * the active playTrack closures, so flipping the mode mid-track
   * takes effect on the next loop trigger (track loop) or natural end
   * (queue loop) — no need to poke the live HTMLAudioElement here.
   */
  const cycleLoop = useCallback(async () => {
    const next: LoopMode =
      loopMode === "off" ? "track" : loopMode === "track" ? "queue" : "off";
    setLoopMode(next);
    const db = await getDb();
    await setConfig(db, "loop_mode", next);
  }, [loopMode]);

  /**
   * Hard stop. Tears down the current music playback handle, halts
   * every soundboard pad (including the turn-sound pseudo-slots), and
   * resets the transport UI to the no-playback baseline.
   */
  const stopAll = useCallback(() => {
    setPlayback((current) => {
      if (current) {
        const backend = getAudioBackend();
        // Detach subscriptions first so the trailing onEnded that
        // fires when we destroy() doesn't try to advance the queue or
        // flip isPlaying back on.
        current.unsubProgress();
        current.unsubEnded();
        backend.pause(current.handle);
        backend.destroy(current.handle);
      }
      return null;
    });
    stopAllPads();
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackDurationSec(0);
  }, []);

  const seek = useCallback(
    (sec: number) => {
      if (!playback) return;
      const clamped = Math.max(
        0,
        Math.min(trackDurationSec || Infinity, sec),
      );
      logEvent("audio.seek", { to: clamped, dur: trackDurationSec });
      getAudioBackend().seek(playback.handle, clamped);
      setCurrentTime(clamped);
    },
    [playback, trackDurationSec],
  );

  const seekRelative = useCallback(
    (delta: number) => {
      if (!playback) return;
      seek(currentTime + delta);
    },
    [playback, currentTime, seek],
  );

  const prev = useCallback(() => {
    if (!playback || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === playback.trackId);
    if (idx > 0) {
      const t = queue[idx - 1];
      if (t) void playTrack(t);
    }
  }, [playback, queue, playTrack]);

  const next = useCallback(() => {
    if (!playback) return;
    const idx = queue.findIndex((t) => t.id === playback.trackId);
    if (idx !== -1 && idx + 1 < queue.length) {
      const t = queue[idx + 1];
      if (t) void playTrack(t);
      return;
    }
    // Queue exhausted (or never built) — fall back to the playing
    // track's category. Weighted-shuffle the rest, set as new queue,
    // play the head. Without this, the Next button silently no-ops
    // whenever the user got here via a search row, Recently Played,
    // or any other entry point that didn't seed a queue.
    const current = tracksRef.current.find((t) => t.id === playback.trackId);
    if (!current) return;
    const pool = (tracksByCategoryRef.current.get(current.category) ?? []).filter(
      (t) => t.id !== current.id,
    );
    if (pool.length === 0) return;
    const shuffled = weightedShuffle(pool);
    if (shuffled.length === 0) return;
    setQueue([current, ...shuffled]);
    const first = shuffled[0];
    if (first) void playTrack(first);
  }, [playback, queue, playTrack]);

  const reloadFromDb = useCallback(async () => {
    const db = await getDb();
    const loopRaw = (await getConfig(db, "loop_mode")) as
      | "off"
      | "track"
      | "queue"
      | undefined;
    if (loopRaw === "track" || loopRaw === "queue") setLoopMode(loopRaw);
  }, []);

  // Boot: hydrate loop_mode from SQLite.
  useEffect(() => {
    void (async () => {
      try {
        await reloadFromDb();
      } catch (err) {
        console.error("[playback] init failed:", err);
      }
    })();
  }, [reloadFromDb]);

  return useMemo(
    () => ({
      playback,
      isPlaying,
      currentTime,
      trackDurationSec,
      queue,
      loopMode,
      setQueue,
      playTrack,
      togglePlay,
      prev,
      next,
      seek,
      seekRelative,
      stopAll,
      cycleLoop,
      reloadFromDb,
    }),
    [
      playback,
      isPlaying,
      currentTime,
      trackDurationSec,
      queue,
      loopMode,
      playTrack,
      togglePlay,
      prev,
      next,
      seek,
      seekRelative,
      stopAll,
      cycleLoop,
      reloadFromDb,
    ],
  );
}
