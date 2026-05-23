// SyncBlob — the wire format for cross-device sync.
// Spec: docs/BUILD_GUIDE.md § 6.3.
//
// Audio files stay on the device. Only this JSON blob travels — grades,
// scenes, soundboard layouts, config, NPC name history. Sized for free
// Cloudflare KV (under 100 KB even for a power user) and small enough to
// reasonably email between machines as a v1 manual sync.
//
// Track keys are content-based — hash(title + pack) — so the same audio
// on a different device picks up the same grade.

import type { AppConfig, Grade, Scene, SoundboardSlot } from "./types.js";

export type SyncBlob = {
  version: 1;
  /** ms since epoch when this blob was built. */
  updatedAt: number;
  /** Stable device identifier — for future conflict UIs. */
  deviceId: string;
  /** Optional human-readable name for the device that exported this. */
  deviceLabel?: string;

  /** Map of trackKey → grade. trackKey = hash(title + pack). */
  grades: Record<string, Grade>;
  /** Map of trackKey → free-form note. */
  notes: Record<string, string>;

  scenes: Scene[];
  soundboard: SoundboardSlot[];
  npcHistory: string[];
  config: Partial<AppConfig>;
};

export const SYNC_BLOB_VERSION = 1 as const;

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
