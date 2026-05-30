// Background duration scanner — mirrors apps/desktop/src/lib/duration-scan.ts
// in role, but uses expo-audio's createAudioPlayer to read the duration off
// the first playback status update. We never call .play() — loading is
// enough for expo-audio to surface `AudioStatus.duration`.
//
// Why not the AudioBackend? Same reason as desktop: the backend allocates
// gain wiring + bus tracking we don't need just to read the metadata
// header. A bare AudioPlayer with a status listener is the cheapest path.
//
// Concurrency is 2 (vs desktop's 4) because mobile has tighter memory
// budgets and an extra AudioPlayer instance per probe costs more than on
// desktop's Web Audio context.

import { createAudioPlayer, type AudioStatus } from "expo-audio";
import type { Track } from "@mc/core";
import { getDb } from "../data/db";
import {
  listTracks,
  updateDuration,
} from "../data/tracks-repo";

const CONCURRENCY = 2;
// Per-file timeout. Corrupt or unreadable files never fire a
// `isLoaded: true` status — without this they'd hold a player open
// forever and block the queue.
const PER_FILE_TIMEOUT_MS = 8000;

export type DurationProbeResult = {
  trackId: string;
  /** Milliseconds. 0 means "tried and failed" — caller can decide to retry. */
  durationMs: number;
  error?: string;
};

/**
 * In-memory dedupe: trackIds we've already attempted to probe this
 * session, success or failure. Persisting a failed probe as
 * `duration_ms = 0` still re-queries on the next boot, but this set
 * stops us from re-probing the same corrupt file within a session
 * (e.g. when the user focuses the Library tab repeatedly).
 */
const _attempted = new Set<string>();
let _running = false;

/**
 * Probe a single track for its duration via a transient AudioPlayer.
 * Resolves with `{ durationMs: 0, error }` on failure rather than
 * throwing — the scanner runs across hundreds of files and one bad
 * codec shouldn't kill the batch.
 */
export function probeDuration(track: Track): Promise<DurationProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    let sub: { remove: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        sub?.remove();
      } catch {
        /* swallow */
      }
      sub = null;
      try {
        // remove() releases the native player resources. No play() was
        // called, so there's nothing to pause first.
        player?.remove();
      } catch {
        /* swallow */
      }
      player = null;
    };

    const settle = (result: DurationProbeResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    try {
      player = createAudioPlayer({ uri: track.uri });
    } catch (err) {
      settle({
        trackId: track.id,
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    sub = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      if (settled) return;
      // Some platforms report a non-zero duration before `isLoaded`
      // flips, others don't — accept the first signal of either.
      const dur = status.duration;
      if (status.isLoaded && Number.isFinite(dur) && dur > 0) {
        settle({
          trackId: track.id,
          durationMs: Math.round(dur * 1000),
        });
      } else if (status.isLoaded && (!Number.isFinite(dur) || dur <= 0)) {
        // Loaded but no duration — usually live stream or codec the
        // platform can't measure. Mark tried-and-failed.
        settle({
          trackId: track.id,
          durationMs: 0,
          error: "no-duration",
        });
      }
    });

    // Belt-and-suspenders timeout — corrupt files may never fire an
    // `isLoaded: true` status at all.
    timer = setTimeout(
      () =>
        settle({ trackId: track.id, durationMs: 0, error: "timeout" }),
      PER_FILE_TIMEOUT_MS,
    );
  });
}

/**
 * One-shot, idempotent: probe every track in the library that doesn't
 * yet have a duration. Safe to call from multiple places (app boot,
 * Library tab focus, after import) — concurrent calls return the
 * already-running promise rather than spinning up a second scan.
 *
 * Returns the number of tracks for which we wrote a new duration
 * (excludes failed probes, which we persist as 0 to record the
 * attempt). The caller can use this to decide whether to refresh
 * derived UI state.
 */
export async function ensureDurationsProbed(): Promise<number> {
  if (_running) return 0;
  _running = true;
  let updated = 0;
  try {
    const db = await getDb();
    const all = await listTracks(db);
    const queue = all.filter(
      (t) =>
        !_attempted.has(t.id) &&
        (!Number.isFinite(t.durationMs) || t.durationMs <= 0),
    );
    while (queue.length > 0) {
      const batch = queue.splice(0, CONCURRENCY);
      const results = await Promise.all(batch.map((t) => probeDuration(t)));
      for (const r of results) {
        _attempted.add(r.trackId);
        try {
          await updateDuration(db, r.trackId, r.durationMs);
          if (r.durationMs > 0) updated += 1;
        } catch (err) {
          console.warn("updateDuration write failed:", err);
        }
      }
    }
  } catch (err) {
    console.warn("ensureDurationsProbed failed:", err);
  } finally {
    _running = false;
  }
  return updated;
}
