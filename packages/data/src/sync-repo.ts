// Build a SyncBlob from local SQLite state, and apply one back.
//
// Spec: docs/BUILD_GUIDE.md § 6.4. Implementation plan: docs/CLOUD_SYNC.md.
//
// Wire format is v2 (per-record `updatedAt` envelopes). v1 blobs imported
// from older exports still apply — `ensureV2` migrates them up first.
//
// Apply semantics (per the plan's PR-1 — pre-cloud, pre-tombstones):
//   * grades, notes — replace any local grade/note for tracks whose
//     trackKey appears in the blob; tracks not in the blob keep their
//     local grade.
//   * scenes — replace wholesale (drop existing, insert all from blob).
//     Cloud merge will preserve both sides upstream, so this stays safe.
//   * soundboard — replace wholesale.
//   * config — overwrite each known key present in the blob.
//   * npc history — replace wholesale.
//
// `buildSyncBlob` stamps every record's `updatedAt` with the blob's
// build time. SQLite doesn't yet track per-grade edit timestamps; that
// fidelity arrives when grading writes a sidecar column. Until then the
// LWW resolution treats all of a device's grades as having been edited
// at "the moment the blob was built", which is correct for the cloud-
// sync rollout in PR-5 (first push wins until something newer ships).

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
import type { Db } from "./db.js";
import { listScenes, saveScene, deleteScene } from "./scenes-repo.js";
import { listSoundboard, upsertSlot, clearSlot } from "./soundboard-repo.js";
import { listTracks, setGrade } from "./tracks-repo.js";
import { getConfig, setConfig } from "./config-repo.js";

const CONFIG_KEYS_TO_SYNC = [
  "theme",
  "fade_ms",
  "master_volume",
  "ducking_pct",
  "dm_mode",
  "tutorials_seen",
  "dm_name_history",
] as const;

export async function buildSyncBlob(
  db: Db,
  opts: { deviceId: string; deviceLabel?: string } = { deviceId: "unknown" },
): Promise<SyncBlob> {
  const stamp = Date.now();
  const tracks = await listTracks(db);

  const grades: Record<string, Versioned<Track["grade"]>> = {};
  for (const t of tracks) {
    if (t.grade) grades[trackKey(t.title, t.pack)] = { value: t.grade, updatedAt: stamp };
  }

  const notes: Record<string, Versioned<string>> = {};
  for (const t of tracks) {
    if (t.note) notes[trackKey(t.title, t.pack)] = { value: t.note, updatedAt: stamp };
  }

  const rawScenes = await listScenes(db);
  const scenes: TimestampedScene[] = rawScenes.map((s) => ({ ...s, updatedAt: stamp }));

  const rawSoundboard = await listSoundboard(db);
  const soundboard: TimestampedSlot[] = rawSoundboard.map((s) => ({ ...s, updatedAt: stamp }));

  const config: Record<string, Versioned<string>> = {};
  for (const key of CONFIG_KEYS_TO_SYNC) {
    const value = await getConfig(db, key);
    if (value !== undefined && value !== null) {
      config[key] = { value: String(value), updatedAt: stamp };
    }
  }

  const npcHistoryRaw = await getConfig(db, "dm_name_history");
  let npcEntries: string[] = [];
  if (npcHistoryRaw) {
    try {
      const parsed = JSON.parse(npcHistoryRaw) as Array<{ first: string; last: string }>;
      npcEntries = parsed.map((n) => `${n.first}${n.last ? ` ${n.last}` : ""}`);
    } catch {
      /* swallow */
    }
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
    npcHistory: { entries: npcEntries, updatedAt: stamp },
    config,
  };
}

export type ApplyResult = {
  gradesApplied: number;
  gradesSkipped: number;
  scenesReplaced: number;
  soundboardSlotsReplaced: number;
  configKeysSet: number;
};

export async function applySyncBlob(db: Db, blobIn: AnySyncBlob): Promise<ApplyResult> {
  if (blobIn.version !== 1 && blobIn.version !== 2) {
    // Defensive — TS catches mismatched calls but JSON imports might smuggle anything.
    throw new Error(
      `Unsupported sync blob version: ${(blobIn as { version: number }).version}`,
    );
  }
  const blob = ensureV2(blobIn);

  // Grades — look up local tracks by trackKey, apply.
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

  // Scenes — replace wholesale (strip the sync `updatedAt` envelope).
  const existingScenes = await listScenes(db);
  for (const s of existingScenes) {
    await deleteScene(db, s.id);
  }
  for (const ts of blob.scenes) {
    const { updatedAt: _updatedAt, ...s } = ts;
    void _updatedAt;
    await saveScene(db, s as Scene);
  }

  // Soundboard — replace wholesale.
  const existingSlots = await listSoundboard(db);
  for (const s of existingSlots) {
    await clearSlot(db, s.page, s.slot);
  }
  for (const ts of blob.soundboard) {
    const { updatedAt: _updatedAt, ...s } = ts;
    void _updatedAt;
    await upsertSlot(db, s as SoundboardSlot);
  }

  // Config — overwrite each known key from the blob.
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
    scenesReplaced: blob.scenes.length,
    soundboardSlotsReplaced: blob.soundboard.length,
    configKeysSet,
  };
}

// Re-exports for convenience.
export type { Scene, SoundboardSlot };
