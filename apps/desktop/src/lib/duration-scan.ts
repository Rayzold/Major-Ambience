// Background duration scanner — loads HTMLAudioElement metadata for each
// track that doesn't yet have a persisted duration. Avoids playing the
// file: `preload="metadata"` is enough to populate `audio.duration`.
//
// Why not use the AudioBackend? The backend allocates a full playback
// graph per track (gain nodes, listeners, asset-protocol fetch). For
// 5,000+ tracks we just want the duration header — a bare audio element
// with `preload="metadata"` is an order of magnitude cheaper and tears
// down cleanly.

import { convertFileSrc } from "@tauri-apps/api/core";
import type { Track } from "@mc/core";

// Tunables. 4 in parallel keeps CPU/disk responsive without serializing.
const CONCURRENCY = 4;
// Per-file timeout. Corrupt or unreadable files hang `loadedmetadata`
// indefinitely otherwise.
const PER_FILE_TIMEOUT_MS = 8000;

export type DurationProbeResult = {
  trackId: string;
  /** Milliseconds. 0 means "tried and failed" — caller can decide to retry. */
  durationMs: number;
  error?: string;
};

export type DurationScanProgress = {
  done: number;
  total: number;
  current?: Track;
  lastResult?: DurationProbeResult;
};

export type DurationScanOptions = {
  /**
   * Called after each track resolves (success or failure). The UI uses
   * this to fill in the TIME column progressively rather than waiting
   * for the whole batch.
   */
  onProgress?: (p: DurationScanProgress) => void;
  /** Aborts the scan when this returns true between batches. */
  shouldCancel?: () => boolean;
};

/**
 * Probe a single track for its duration via a transient audio element.
 * Resolves with `{ durationMs: 0, error }` on failure rather than
 * throwing — the scanner runs across thousands of files and one bad
 * codec shouldn't kill the batch.
 */
export function probeDuration(track: Track): Promise<DurationProbeResult> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    let settled = false;

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onErr);
      // Releasing the src prompts the browser to drop the underlying
      // fetch + decoder context immediately rather than waiting for GC.
      audio.src = "";
      audio.load();
    };

    const settle = (result: DurationProbeResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onMeta = () => {
      const sec = audio.duration;
      if (Number.isFinite(sec) && sec > 0) {
        settle({ trackId: track.id, durationMs: Math.round(sec * 1000) });
      } else {
        settle({ trackId: track.id, durationMs: 0, error: "no-duration" });
      }
    };

    const onErr = () => {
      const code = audio.error?.code;
      settle({
        trackId: track.id,
        durationMs: 0,
        error: code ? `media-error-${code}` : "media-error",
      });
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onErr);

    // Belt-and-suspenders timeout — some corrupt MP3s never fire
    // loadedmetadata OR error.
    setTimeout(() => settle({ trackId: track.id, durationMs: 0, error: "timeout" }), PER_FILE_TIMEOUT_MS);

    try {
      audio.src = convertFileSrc(track.uri);
    } catch (err) {
      settle({
        trackId: track.id,
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

/**
 * Scan a list of tracks and yield duration results as each one resolves.
 * Runs `CONCURRENCY` probes in parallel. Callers wire `onProgress` to
 * persist + update React state incrementally.
 *
 * Returns the full list of results once every track has settled. Cancel
 * by returning true from `shouldCancel` — the next batch won't start
 * and the returned list will be partial.
 */
export async function scanDurations(
  tracks: readonly Track[],
  opts: DurationScanOptions = {},
): Promise<DurationProbeResult[]> {
  const results: DurationProbeResult[] = [];
  const queue = [...tracks];
  const total = queue.length;
  let done = 0;

  while (queue.length > 0) {
    if (opts.shouldCancel?.()) break;
    const batch = queue.splice(0, CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (t) => {
        const r = await probeDuration(t);
        done += 1;
        opts.onProgress?.({ done, total, current: t, lastResult: r });
        return r;
      }),
    );
    results.push(...settled);
  }
  return results;
}

/** Convenience filter — the input set we actually want to scan. */
export function tracksMissingDuration(tracks: readonly Track[]): Track[] {
  return tracks.filter((t) => !Number.isFinite(t.durationMs) || t.durationMs <= 0);
}
