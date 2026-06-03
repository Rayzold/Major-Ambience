// Build a SyncBlob from local expo-sqlite state, and apply one back.
// The mobile parallel to packages/data/src/sync-repo.ts — same wire
// format (SyncBlob v2), same replace-style apply semantics, different
// driver (expo-sqlite vs tauri-plugin-sql).
//
// What syncs from a phone:
//   * grades + notes  — keyed by content hash (trackKey) so they follow
//     the audio across devices even though the files themselves don't.
//   * scenes + soundboard — replaced wholesale on apply (cloud merge
//     preserves both sides upstream via mergeSyncBlobs, so this is safe).
//   * config — the handful of keys the mobile app actually persists.
//
// NPC name history is desktop-only today (mobile has no name-history
// store), so the blob carries an empty `npcHistory` from a phone; a
// desktop's entries union-merge in and are preserved untouched.
//
// Merge-fidelity caveat (same as desktop): every record is stamped with
// the blob's build time because SQLite tracks no per-record edit time,
// so on a conflicting key the freshly-built local value wins. Records
// that exist only on the remote still merge in. Full per-record LWW
// arrives with a sidecar timestamp column (tracked with tombstones as a
// pre-rollout follow-up in docs/CLOUD_SYNC.md).

import type {
  AnySyncBlob,
  Scene,
  SoundboardSlot,
  SyncBlob,
  TimestampedScene,
  TimestampedSlot,
  Track,
  Versioned,
} from "@mc/core";
import { ensureV2, trackKey } from "@mc/core";
import type { Db } from "./db";
import { listScenes, saveScene, deleteScene } from "./scenes-repo";
import { listSoundboard, upsertSlot, clearSlot } from "./soundboard-repo";
import { listTracks, setGrade, setNote } from "./tracks-repo";
import { getConfig, setConfig } from "./config-repo";

/**
 * Config keys the mobile app persists and is willing to carry between
 * devices. Disjoint from desktop's set (desktop syncs theme/fade/volume/
 * ducking/etc., which mobile doesn't store) — the blob's `config` is a
 * free-form map, so each surface emits the keys it owns and ignores the
 * rest on apply; the merge preserves every key regardless.
 */
const CONFIG_KEYS_TO_SYNC = [
  "loop_mode",
  "dm_combatants",
  "dm_encounter_tables",
  "dm_countdown_timers",
  "dm_xp_ledger",
  "dm_recap",
] as const;

export async function buildSyncBlob(
  db: Db,
  opts: { deviceId: string; deviceLabel?: string } = { deviceId: "unknown" },
): Promise<SyncBlob> {
  const stamp = Date.now();
  const tracks = await listTracks(db);

  const grades: Record<string, Versioned<Track["grade"]>> = {};
  const notes: Record<string, Versioned<string>> = {};
  for (const t of tracks) {
    if (t.grade) grades[trackKey(t.title, t.pack)] = { value: t.grade, updatedAt: stamp };
    if (t.note) notes[trackKey(t.title, t.pack)] = { value: t.note, updatedAt: stamp };
  }

  const rawScenes = await listScenes(db);
  const scenes: TimestampedScene[] = rawScenes.map((s) => ({ ...s, updatedAt: stamp }));

  const rawSoundboard = await listSoundboard(db);
  const soundboard: TimestampedSlot[] = rawSoundboard.map((s) => ({ ...s, updatedAt: stamp }));

  const config: Record<string, Versioned<string>> = {};
  for (const key of CONFIG_KEYS_TO_SYNC) {
    const value = await getConfig(db, key);
    if (value !== null) config[key] = { value, updatedAt: stamp };
  }

  return {
    version: 2,
    updatedAt: stamp,
    deviceId: opts.deviceId,
    ...(opts.deviceLabel ? { deviceLabel: opts.deviceLabel } : {}),
    grades,
    notes,
    scenes,
    soundboard,
    // Mobile has no name-history store yet; emit empty so a desktop's
    // entries union-merge in and survive the round-trip.
    npcHistory: { entries: [], updatedAt: stamp },
    config,
  };
}

export type ApplyResult = {
  gradesApplied: number;
  gradesSkipped: number;
  notesApplied: number;
  scenesReplaced: number;
  soundboardSlotsReplaced: number;
  configKeysSet: number;
};

export async function applySyncBlob(db: Db, blobIn: AnySyncBlob): Promise<ApplyResult> {
  if (blobIn.version !== 1 && blobIn.version !== 2) {
    throw new Error(
      `Unsupported sync blob version: ${(blobIn as { version: number }).version}`,
    );
  }
  const blob = ensureV2(blobIn);

  // Index local tracks by content key so grades/notes follow the audio.
  const tracks = await listTracks(db);
  const byKey = new Map<string, Track>();
  for (const t of tracks) byKey.set(trackKey(t.title, t.pack), t);

  let gradesApplied = 0;
  let gradesSkipped = 0;
  for (const [key, versioned] of Object.entries(blob.grades)) {
    const target = byKey.get(key);
    if (target) {
      await setGrade(db, target.id, versioned.value);
      gradesApplied++;
    } else {
      gradesSkipped++;
    }
  }

  let notesApplied = 0;
  for (const [key, versioned] of Object.entries(blob.notes)) {
    const target = byKey.get(key);
    if (target) {
      await setNote(db, target.id, versioned.value);
      notesApplied++;
    }
  }

  // Scenes — replace wholesale (strip the sync `updatedAt` envelope).
  for (const s of await listScenes(db)) await deleteScene(db, s.id);
  for (const ts of blob.scenes) {
    const { updatedAt: _u, ...s } = ts;
    void _u;
    await saveScene(db, s as Scene);
  }

  // Soundboard — replace wholesale.
  for (const s of await listSoundboard(db)) await clearSlot(db, s.page, s.slot);
  for (const ts of blob.soundboard) {
    const { updatedAt: _u, ...s } = ts;
    void _u;
    await upsertSlot(db, s as SoundboardSlot);
  }

  // Config — overwrite each known key present in the blob.
  let configKeysSet = 0;
  for (const key of CONFIG_KEYS_TO_SYNC) {
    const entry = blob.config[key];
    if (entry !== undefined) {
      await setConfig(db, key, entry.value);
      configKeysSet++;
    }
  }

  return {
    gradesApplied,
    gradesSkipped,
    notesApplied,
    scenesReplaced: blob.scenes.length,
    soundboardSlotsReplaced: blob.soundboard.length,
    configKeysSet,
  };
}
