// Cloud-sync merge primitives — per-record last-write-wins for grades,
// notes, scenes, soundboard slots, and config; set-union for the NPC
// history. Pure functions; no I/O. The transport layer (PR-4 of
// docs/CLOUD_SYNC.md) calls these to combine local + remote blobs
// before writing the result back to sqlite.
//
// Decisions captured here:
//   * Per-record LWW (docs/CLOUD_SYNC.md D1). Each grade / note / scene /
//     slot / config entry carries its own `updatedAt`; the higher one
//     wins. Ties prefer `remote` so two clients seeing the same pair
//     converge deterministically.
//   * No tombstones in v2. A record present in either input survives the
//     merge — deletes don't propagate yet. Tracked as a follow-up before
//     the cloud rollout in PR-5.
//   * `npcHistory` is union-merged. Every generated name is a distinct
//     fact; nothing to overwrite. The merged `updatedAt` is the later
//     of the two inputs' timestamps.

import type {
  AnySyncBlob,
  SyncBlobV2,
  TimestampedScene,
  TimestampedSlot,
  Versioned,
} from "./sync-blob.js";
import { ensureV2 } from "./sync-blob.js";

/**
 * Merge two sync blobs. Either input may be v1; both are migrated to v2
 * first. The result is always v2.
 *
 * - `local` is the blob just built from the device's current state.
 * - `remote` is the blob fetched from the cloud (or the file the user
 *   imported). On ties, remote wins — when a future PR adds conflict UX
 *   we may flip this; documenting it now keeps the invariant explicit.
 *
 * The returned blob carries `local`'s `deviceId` + `deviceLabel` — it
 * represents "what the local device should now persist", not a peer.
 */
export function mergeSyncBlobs(
  localIn: AnySyncBlob,
  remoteIn: AnySyncBlob,
): SyncBlobV2 {
  const local = ensureV2(localIn);
  const remote = ensureV2(remoteIn);

  return {
    version: 2,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    deviceId: local.deviceId,
    ...(local.deviceLabel ? { deviceLabel: local.deviceLabel } : {}),
    grades: mergeVersionedMap(local.grades, remote.grades),
    notes: mergeVersionedMap(local.notes, remote.notes),
    scenes: mergeTimestampedById(local.scenes, remote.scenes, (s) => s.id),
    soundboard: mergeTimestampedById(
      local.soundboard,
      remote.soundboard,
      (s) => `${s.page}-${s.slot}`,
    ),
    npcHistory: mergeNpcHistory(local.npcHistory, remote.npcHistory),
    config: mergeVersionedMap(local.config, remote.config),
  };
}

/**
 * Per-key LWW over a `Record<string, Versioned<T>>`. Keys present in
 * either input survive. For a key in both, the higher `updatedAt` wins;
 * ties prefer `remote`.
 */
export function mergeVersionedMap<T>(
  local: Record<string, Versioned<T>>,
  remote: Record<string, Versioned<T>>,
): Record<string, Versioned<T>> {
  const out: Record<string, Versioned<T>> = {};
  // Local-only + winners-from-overlap.
  for (const [key, lv] of Object.entries(local)) {
    const rv = remote[key];
    if (!rv) {
      out[key] = lv;
      continue;
    }
    out[key] = rv.updatedAt >= lv.updatedAt ? rv : lv;
  }
  // Remote-only keys.
  for (const [key, rv] of Object.entries(remote)) {
    if (!(key in local)) out[key] = rv;
  }
  return out;
}

/**
 * Per-id LWW over an array of records carrying `updatedAt`. `keyFn`
 * yields a stable identity (`scene.id`, `slot.page + slot.slot`). The
 * output is sorted by key so two devices computing the same merge produce
 * byte-identical results (matters for diff-based debugging + tests).
 */
export function mergeTimestampedById<T extends { updatedAt: number }>(
  local: readonly T[],
  remote: readonly T[],
  keyFn: (item: T) => string,
): T[] {
  const merged = new Map<string, T>();
  for (const item of local) merged.set(keyFn(item), item);
  for (const item of remote) {
    const key = keyFn(item);
    const cur = merged.get(key);
    if (!cur) {
      merged.set(key, item);
      continue;
    }
    if (item.updatedAt >= cur.updatedAt) merged.set(key, item);
  }
  // Sort for stable output across devices.
  return Array.from(merged.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([, v]) => v);
}

function mergeNpcHistory(
  local: SyncBlobV2["npcHistory"],
  remote: SyncBlobV2["npcHistory"],
): SyncBlobV2["npcHistory"] {
  // Union; preserve insertion order with locals first (history is
  // chronological per device; locals are the user's most-recent context).
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const e of local.entries) {
    if (!seen.has(e)) {
      seen.add(e);
      entries.push(e);
    }
  }
  for (const e of remote.entries) {
    if (!seen.has(e)) {
      seen.add(e);
      entries.push(e);
    }
  }
  return {
    entries,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

// Re-exports kept for callers that imported from this module.
export type { TimestampedScene, TimestampedSlot };
