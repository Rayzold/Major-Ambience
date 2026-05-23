// Build a SyncBlob from local SQLite state, and apply one back.
//
// Per BUILD_GUIDE § 6.4 the semantics are per-top-level-key
// last-write-wins. For v1 (local file export/import), that translates
// to: import REPLACES the corresponding category of state.
//   * grades, notes — replace any local grade/note for tracks whose
//     trackKey appears in the blob; tracks not in the blob keep their
//     local grade.
//   * scenes — replace local scenes wholesale (drop, insert all).
//   * soundboard — replace wholesale.
//   * config — overwrite each key present in the blob.
//   * npc history — replace wholesale.

import type { Scene, SoundboardSlot, SyncBlob, Track } from "@mc/core";
import { trackKey } from "@mc/core";
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
  const tracks = await listTracks(db);

  const grades: Record<string, string> = {};
  for (const t of tracks) {
    if (t.grade) grades[trackKey(t.title, t.pack)] = t.grade;
  }

  const notes: Record<string, string> = {};
  for (const t of tracks) {
    if (t.note) notes[trackKey(t.title, t.pack)] = t.note;
  }

  const scenes = await listScenes(db);
  const soundboard = await listSoundboard(db);

  const config: Record<string, unknown> = {};
  for (const key of CONFIG_KEYS_TO_SYNC) {
    const value = await getConfig(db, key);
    if (value !== undefined) config[key] = value;
  }

  const npcHistoryRaw = await getConfig(db, "dm_name_history");
  let npcHistory: string[] = [];
  if (npcHistoryRaw) {
    try {
      const parsed = JSON.parse(npcHistoryRaw) as Array<{ first: string; last: string }>;
      npcHistory = parsed.map((n) => `${n.first}${n.last ? ` ${n.last}` : ""}`);
    } catch {
      /* swallow */
    }
  }

  return {
    version: 1,
    updatedAt: Date.now(),
    deviceId: opts.deviceId,
    ...(opts.deviceLabel ? { deviceLabel: opts.deviceLabel } : {}),
    grades: grades as Record<string, SyncBlob["grades"][string]>,
    notes,
    scenes,
    soundboard,
    npcHistory,
    config: config as SyncBlob["config"],
  };
}

export type ApplyResult = {
  gradesApplied: number;
  gradesSkipped: number;
  scenesReplaced: number;
  soundboardSlotsReplaced: number;
  configKeysSet: number;
};

export async function applySyncBlob(db: Db, blob: SyncBlob): Promise<ApplyResult> {
  if (blob.version !== 1) {
    throw new Error(`Unsupported sync blob version: ${blob.version}`);
  }

  // Grades — look up local tracks by trackKey, apply.
  const tracks = await listTracks(db);
  const byKey = new Map<string, Track>();
  for (const t of tracks) byKey.set(trackKey(t.title, t.pack), t);

  let gradesApplied = 0;
  let gradesSkipped = 0;
  for (const [key, grade] of Object.entries(blob.grades)) {
    const target = byKey.get(key);
    if (target) {
      await setGrade(db, target.id, grade);
      gradesApplied++;
    } else {
      gradesSkipped++;
    }
  }

  // Scenes — replace wholesale.
  const existingScenes = await listScenes(db);
  for (const s of existingScenes) {
    await deleteScene(db, s.id);
  }
  for (const s of blob.scenes) {
    await saveScene(db, s);
  }

  // Soundboard — replace wholesale.
  const existingSlots = await listSoundboard(db);
  for (const s of existingSlots) {
    await clearSlot(db, s.page, s.slot);
  }
  for (const s of blob.soundboard) {
    await upsertSlot(db, s);
  }

  // Config — overwrite each known key from the blob.
  let configKeysSet = 0;
  for (const key of CONFIG_KEYS_TO_SYNC) {
    const value = (blob.config as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) {
      await setConfig(db, key, String(value));
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
