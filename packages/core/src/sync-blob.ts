// SyncBlob — the wire format for cross-device sync.
// Spec: docs/BUILD_GUIDE.md § 6.3, implementation plan: docs/CLOUD_SYNC.md.
//
// Audio files stay on the device. Only this JSON blob travels — grades,
// scenes, soundboard layouts, config, NPC name history. Sized for free
// Cloudflare KV (under 100 KB even for a power user) and small enough to
// reasonably email between machines as a v1 manual sync.
//
// Track keys are content-based — hash(title + pack) — so the same audio
// on a different device picks up the same grade.
//
// ─── Schema versioning ─────────────────────────────────────────────────
//
// v1 — original snapshot shape. One blob-level `updatedAt`; per-record
//      values are bare (e.g. grades: Record<string, Grade>). Used by the
//      manual file export/import shipped in v0.0.7.
//
// v2 — per-record `updatedAt` on every grade / note / scene / soundboard
//      slot / config entry. Enables per-key last-write-wins merge for
//      cloud sync (docs/CLOUD_SYNC.md decision D1). v1 blobs migrate
//      forward via `migrateV1ToV2` — every record inherits the parent
//      blob's timestamp.
//
// Both versions remain readable for backward compat with previously
// exported files. New emitters write v2.
//
// Known v2 limitation: NO tombstones yet. A scene/slot/grade that exists
// on device A but not in a blob from device B is preserved on merge
// rather than deleted. Tombstone support is tracked as a follow-up to
// PR-1 of docs/CLOUD_SYNC.md before cloud rollout (PR-5).

import type { AppConfig, Grade, Scene, SoundboardSlot } from "./types.js";

/**
 * Generic per-record envelope: pair any value with the unix-ms timestamp
 * of the last edit. The cloud merge resolves conflicts by picking the
 * higher `updatedAt`; ties prefer `remote` (deterministic — see
 * `mergeSyncBlobs` in `sync-merge.ts`).
 */
export type Versioned<T> = {
  readonly value: T;
  readonly updatedAt: number;
};

/** Scene with a sync-only edit timestamp tacked on. Not a Scene shape change. */
export type TimestampedScene = Scene & { readonly updatedAt: number };

/** Slot with a sync-only edit timestamp tacked on. Not a SoundboardSlot shape change. */
export type TimestampedSlot = SoundboardSlot & { readonly updatedAt: number };

// ─── v1 (preserved for file-import backward compat) ─────────────────────

export type SyncBlobV1 = {
  version: 1;
  /** ms since epoch when this blob was built. */
  updatedAt: number;
  /** Stable device identifier — for future conflict UIs. */
  deviceId: string;
  /** Optional human-readable name for the device that exported this. */
  deviceLabel?: string;

  grades: Record<string, Grade>;
  notes: Record<string, string>;
  scenes: Scene[];
  soundboard: SoundboardSlot[];
  npcHistory: string[];
  config: Partial<AppConfig>;
};

// ─── v2 (current) ──────────────────────────────────────────────────────

export type SyncBlobV2 = {
  version: 2;
  /** ms since epoch when this blob was built. UI display only — merge uses per-record timestamps. */
  updatedAt: number;
  deviceId: string;
  deviceLabel?: string;

  /** Map of trackKey → versioned grade. */
  grades: Record<string, Versioned<Grade>>;
  /** Map of trackKey → versioned note. */
  notes: Record<string, Versioned<string>>;

  scenes: TimestampedScene[];
  soundboard: TimestampedSlot[];

  /**
   * NPC names are union-merged across devices rather than LWW'd — every
   * generated name is a distinct fact. The `updatedAt` is the most
   * recent generation timestamp on the emitting device.
   */
  npcHistory: { entries: string[]; updatedAt: number };

  /**
   * Config keys are stored as stringified values (mirrors the sqlite
   * `config(key, value)` table). The blob carries strings; the apply
   * path on each surface casts them back to typed values per key.
   */
  config: Record<string, Versioned<string>>;
};

export type SyncBlob = SyncBlobV2;

/** Latest schema version this codebase writes. Reads accept v1 too. */
export const SYNC_BLOB_VERSION = 2 as const;

/** Either supported version, used by code that reads externally-supplied blobs. */
export type AnySyncBlob = SyncBlobV1 | SyncBlobV2;

/**
 * Forward-migrate a v1 blob to v2 by stamping every record with the
 * parent blob's `updatedAt`. Lossless — round-tripping a v1 through
 * migration → emit-as-v2 → ingest preserves intent.
 */
export function migrateV1ToV2(blob: SyncBlobV1): SyncBlobV2 {
  const stamp = blob.updatedAt;

  const grades: Record<string, Versioned<Grade>> = {};
  for (const [key, value] of Object.entries(blob.grades)) {
    grades[key] = { value, updatedAt: stamp };
  }

  const notes: Record<string, Versioned<string>> = {};
  for (const [key, value] of Object.entries(blob.notes)) {
    notes[key] = { value, updatedAt: stamp };
  }

  const scenes: TimestampedScene[] = blob.scenes.map((s) => ({
    ...s,
    updatedAt: stamp,
  }));

  const soundboard: TimestampedSlot[] = blob.soundboard.map((s) => ({
    ...s,
    updatedAt: stamp,
  }));

  const config: Record<string, Versioned<string>> = {};
  for (const [key, value] of Object.entries(blob.config)) {
    if (value === undefined || value === null) continue;
    config[key] = { value: String(value), updatedAt: stamp };
  }

  return {
    version: 2,
    updatedAt: stamp,
    deviceId: blob.deviceId,
    ...(blob.deviceLabel ? { deviceLabel: blob.deviceLabel } : {}),
    grades,
    notes,
    scenes,
    soundboard,
    npcHistory: { entries: blob.npcHistory.slice(), updatedAt: stamp },
    config,
  };
}

/** Migrate any-version input to v2. Already-v2 is returned as-is. */
export function ensureV2(blob: AnySyncBlob): SyncBlobV2 {
  return blob.version === 2 ? blob : migrateV1ToV2(blob);
}

/**
 * Compute a track key from title + pack. Same hash used on every device
 * so grades follow the content. Uses the same FNV-1a 64-bit as track IDs.
 */
export function trackKey(title: string, pack: string): string {
  const input = `${title.trim().toLowerCase()}|${pack.trim().toLowerCase()}`;
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i) & 0xff);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}
