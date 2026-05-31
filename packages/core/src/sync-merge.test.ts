// Coverage matrix for the per-record LWW merge. The cases below pin down
// the contract that the cloud transport (PR-4 of docs/CLOUD_SYNC.md)
// will rely on; if any of these flip, the docs lie.

import { describe, expect, it } from "vitest";
import type {
  Scene,
  SoundboardSlot,
  SyncBlobV1,
  SyncBlobV2,
  TimestampedScene,
  TimestampedSlot,
  Versioned,
} from "./index.js";
import {
  ensureV2,
  mergeSyncBlobs,
  mergeTimestampedById,
  mergeVersionedMap,
  migrateV1ToV2,
  SYNC_BLOB_VERSION,
} from "./index.js";

function v<T>(value: T, updatedAt: number): Versioned<T> {
  return { value, updatedAt };
}

function scene(id: string, updatedAt: number, name = id): TimestampedScene {
  const s: Scene = {
    id,
    name,
    primaryCategory: "combat",
    accentCategories: [],
    trackIds: [],
    soundboardPage: "A",
    fadeMs: 800,
    duckingPct: 0.4,
    volumes: {},
    createdAt: 0,
  };
  return { ...s, updatedAt };
}

function slot(
  page: SoundboardSlot["page"],
  n: SoundboardSlot["slot"],
  updatedAt: number,
  trackId = `track-${page}-${n}`,
): TimestampedSlot {
  return {
    page,
    slot: n,
    trackId,
    loop: false,
    volume: 1,
    updatedAt,
  };
}

function emptyV2(overrides: Partial<SyncBlobV2> = {}): SyncBlobV2 {
  return {
    version: 2,
    updatedAt: 0,
    deviceId: "local",
    grades: {},
    notes: {},
    scenes: [],
    soundboard: [],
    npcHistory: { entries: [], updatedAt: 0 },
    config: {},
    ...overrides,
  };
}

describe("SYNC_BLOB_VERSION", () => {
  it("is 2 — bump in lockstep with the writer", () => {
    expect(SYNC_BLOB_VERSION).toBe(2);
  });
});

describe("mergeVersionedMap", () => {
  it("keeps local-only keys", () => {
    const out = mergeVersionedMap({ a: v("A", 1) }, {});
    expect(out).toEqual({ a: v("A", 1) });
  });

  it("keeps remote-only keys", () => {
    const out = mergeVersionedMap({}, { b: v("B", 1) });
    expect(out).toEqual({ b: v("B", 1) });
  });

  it("higher updatedAt wins on overlap", () => {
    const out = mergeVersionedMap(
      { a: v("local", 10) },
      { a: v("remote", 20) },
    );
    expect(out.a).toEqual(v("remote", 20));
  });

  it("higher updatedAt wins regardless of side", () => {
    const out = mergeVersionedMap(
      { a: v("local", 30) },
      { a: v("remote", 20) },
    );
    expect(out.a).toEqual(v("local", 30));
  });

  it("ties prefer remote — deterministic tiebreak", () => {
    const out = mergeVersionedMap(
      { a: v("local", 10) },
      { a: v("remote", 10) },
    );
    expect(out.a).toEqual(v("remote", 10));
  });

  it("merge is associative across three+ inputs", () => {
    const a = { x: v("a", 1) };
    const b = { x: v("b", 2) };
    const c = { x: v("c", 3) };
    const ab_c = mergeVersionedMap(mergeVersionedMap(a, b), c);
    const a_bc = mergeVersionedMap(a, mergeVersionedMap(b, c));
    expect(ab_c).toEqual(a_bc);
    expect(ab_c.x).toEqual(v("c", 3));
  });
});

describe("mergeTimestampedById", () => {
  it("emits sorted output for byte-stable merges", () => {
    const out = mergeTimestampedById(
      [scene("c", 1), scene("a", 1)],
      [scene("b", 1)],
      (s) => s.id,
    );
    expect(out.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("LWW per id", () => {
    const out = mergeTimestampedById(
      [scene("x", 5, "local")],
      [scene("x", 10, "remote")],
      (s) => s.id,
    );
    expect(out[0]?.name).toBe("remote");
  });

  it("preserves both when ids don't overlap (no tombstone semantics)", () => {
    const out = mergeTimestampedById(
      [scene("only-local", 1)],
      [scene("only-remote", 1)],
      (s) => s.id,
    );
    expect(out.map((s) => s.id)).toEqual(["only-local", "only-remote"]);
  });

  it("compound keys work (soundboard page+slot)", () => {
    const out = mergeTimestampedById(
      [slot("A", 1, 1, "old"), slot("A", 2, 5, "local2")],
      [slot("A", 1, 10, "new"), slot("B", 1, 1, "remoteOnly")],
      (s) => `${s.page}-${s.slot}`,
    );
    expect(out).toHaveLength(3);
    const a1 = out.find((s) => s.page === "A" && s.slot === 1);
    expect(a1?.trackId).toBe("new");
    const a2 = out.find((s) => s.page === "A" && s.slot === 2);
    expect(a2?.trackId).toBe("local2");
    const b1 = out.find((s) => s.page === "B" && s.slot === 1);
    expect(b1?.trackId).toBe("remoteOnly");
  });
});

describe("mergeSyncBlobs — npcHistory", () => {
  it("unions entries, locals first then remote-only", () => {
    const local = emptyV2({
      npcHistory: { entries: ["Aragorn", "Bilbo"], updatedAt: 5 },
    });
    const remote = emptyV2({
      npcHistory: { entries: ["Bilbo", "Frodo"], updatedAt: 7 },
    });
    const out = mergeSyncBlobs(local, remote);
    expect(out.npcHistory.entries).toEqual(["Aragorn", "Bilbo", "Frodo"]);
    expect(out.npcHistory.updatedAt).toBe(7);
  });

  it("takes max(updatedAt)", () => {
    const out = mergeSyncBlobs(
      emptyV2({ npcHistory: { entries: [], updatedAt: 100 } }),
      emptyV2({ npcHistory: { entries: [], updatedAt: 50 } }),
    );
    expect(out.npcHistory.updatedAt).toBe(100);
  });
});

describe("mergeSyncBlobs — identity fields", () => {
  it("carries local deviceId + label (merged blob is 'what local should now contain')", () => {
    const local = emptyV2({ deviceId: "DESK", deviceLabel: "Marko's PC" });
    const remote = emptyV2({ deviceId: "PHONE", deviceLabel: "iPhone" });
    const out = mergeSyncBlobs(local, remote);
    expect(out.deviceId).toBe("DESK");
    expect(out.deviceLabel).toBe("Marko's PC");
  });

  it("blob-level updatedAt is max of both inputs", () => {
    const out = mergeSyncBlobs(
      emptyV2({ updatedAt: 10 }),
      emptyV2({ updatedAt: 50 }),
    );
    expect(out.updatedAt).toBe(50);
  });
});

describe("migrateV1ToV2", () => {
  const v1: SyncBlobV1 = {
    version: 1,
    updatedAt: 1_000,
    deviceId: "old",
    deviceLabel: "Legacy",
    grades: { "abc": "S", "def": "A" },
    notes: { "abc": "cool" },
    scenes: [
      {
        id: "s1",
        name: "Battle",
        primaryCategory: "combat",
        accentCategories: [],
        trackIds: [],
        soundboardPage: "A",
        fadeMs: 800,
        duckingPct: 0.4,
        volumes: {},
        createdAt: 100,
      },
    ],
    soundboard: [
      { page: "A", slot: 1, trackId: "t1", loop: false, volume: 1 },
    ],
    npcHistory: ["Gandalf"],
    config: { theme: "gold-dark", fadeMs: 800 },
  };

  it("stamps every record with the parent updatedAt", () => {
    const v2 = migrateV1ToV2(v1);
    expect(v2.version).toBe(2);
    expect(v2.grades.abc).toEqual({ value: "S", updatedAt: 1_000 });
    expect(v2.notes.abc).toEqual({ value: "cool", updatedAt: 1_000 });
    expect(v2.scenes[0]?.updatedAt).toBe(1_000);
    expect(v2.soundboard[0]?.updatedAt).toBe(1_000);
    expect(v2.npcHistory).toEqual({
      entries: ["Gandalf"],
      updatedAt: 1_000,
    });
  });

  it("stringifies config values (sqlite stores strings)", () => {
    const v2 = migrateV1ToV2(v1);
    expect(v2.config.theme).toEqual({ value: "gold-dark", updatedAt: 1_000 });
    // Numbers stringify.
    expect(v2.config.fadeMs).toEqual({ value: "800", updatedAt: 1_000 });
  });

  it("preserves deviceId + deviceLabel", () => {
    const v2 = migrateV1ToV2(v1);
    expect(v2.deviceId).toBe("old");
    expect(v2.deviceLabel).toBe("Legacy");
  });

  it("ensureV2 is idempotent on a v2 blob", () => {
    const v2 = migrateV1ToV2(v1);
    expect(ensureV2(v2)).toBe(v2);
  });
});

describe("mergeSyncBlobs — cross-version", () => {
  it("accepts v1 + v2 inputs; output is v2", () => {
    const v1: SyncBlobV1 = {
      version: 1,
      updatedAt: 100,
      deviceId: "local",
      grades: { "abc": "B" },
      notes: {},
      scenes: [],
      soundboard: [],
      npcHistory: [],
      config: {},
    };
    const v2 = emptyV2({
      updatedAt: 200,
      grades: { "abc": v("S", 200), "def": v("A", 200) },
    });
    const out = mergeSyncBlobs(v1, v2);
    expect(out.version).toBe(2);
    expect(out.grades.abc?.value).toBe("S");
    expect(out.grades.def?.value).toBe("A");
  });
});

describe("mergeSyncBlobs — composite scenario", () => {
  // Two devices: desktop graded Track-X "S" at t=100; mobile graded the
  // same track "A" at t=200 (later, so wins) and added a scene.
  it("realistic two-device convergence", () => {
    const desktop: SyncBlobV2 = emptyV2({
      deviceId: "DESK",
      updatedAt: 100,
      grades: { "track-x": v("S", 100), "track-y": v("B", 100) },
      scenes: [scene("scene-1", 100)],
    });
    const mobile: SyncBlobV2 = emptyV2({
      deviceId: "PHONE",
      updatedAt: 200,
      grades: { "track-x": v("A", 200) },
      scenes: [scene("scene-2", 200)],
    });

    const out = mergeSyncBlobs(desktop, mobile);

    // Grades: track-x newer on mobile, track-y untouched on desktop.
    expect(out.grades["track-x"]).toEqual(v("A", 200));
    expect(out.grades["track-y"]).toEqual(v("B", 100));
    // Scenes: both preserved (no tombstones).
    expect(out.scenes.map((s) => s.id)).toEqual(["scene-1", "scene-2"]);
    // Identity stays local.
    expect(out.deviceId).toBe("DESK");
  });
});
