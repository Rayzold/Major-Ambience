import { describe, expect, it } from "vitest";
import type { Grade, Track } from "./types.js";
import { mulberry32, pickWeighted, weightForGrade, weightedShuffle } from "./shuffle.js";

function makeTrack(id: string, grade: Grade): Track {
  return {
    id,
    uri: `file:///${id}`,
    title: id,
    pack: "test",
    category: "exploration",
    durationMs: 0,
    grade,
    playCount: 0,
  };
}

describe("weightForGrade", () => {
  it("returns the documented weight per grade", () => {
    expect(weightForGrade("S")).toBe(6);
    expect(weightForGrade("A")).toBe(4);
    expect(weightForGrade("B")).toBe(2);
    expect(weightForGrade("C")).toBe(1);
    expect(weightForGrade("D")).toBe(1);
    expect(weightForGrade(null)).toBe(1);
    expect(weightForGrade("F")).toBe(0);
  });
});

describe("weightedShuffle", () => {
  it("never returns an F-graded track", () => {
    const tracks = [
      makeTrack("a", "S"),
      makeTrack("b", "F"),
      makeTrack("c", "F"),
      makeTrack("d", "A"),
    ];
    const rng = mulberry32(42);
    const out = weightedShuffle(tracks, rng);
    expect(out.map((t) => t.id).sort()).toEqual(["a", "d"]);
  });

  it("returns an empty array when input is empty", () => {
    expect(weightedShuffle([], mulberry32(1))).toEqual([]);
  });

  it("returns an empty array when all tracks are F", () => {
    const tracks = [makeTrack("a", "F"), makeTrack("b", "F")];
    expect(weightedShuffle(tracks, mulberry32(1))).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    const tracks = [
      makeTrack("a", "S"),
      makeTrack("b", "A"),
      makeTrack("c", "B"),
      makeTrack("d", "C"),
      makeTrack("e", null),
    ];
    const orderA = weightedShuffle(tracks, mulberry32(1234)).map((t) => t.id);
    const orderB = weightedShuffle(tracks, mulberry32(1234)).map((t) => t.id);
    expect(orderA).toEqual(orderB);
  });

  it("biases ordering toward higher grades over many samples", () => {
    // 1 S vs 1 ungraded — over many shuffles, S should appear first more often.
    const tracks = [makeTrack("s", "S"), makeTrack("u", null)];
    let sFirst = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const rng = mulberry32(i + 1);
      if (weightedShuffle(tracks, rng)[0]?.id === "s") sFirst++;
    }
    // S has weight 6 vs 1 → expected fraction ≈ 6/7 ≈ 0.857.
    // Allow generous tolerance for the PRNG.
    expect(sFirst / N).toBeGreaterThan(0.80);
    expect(sFirst / N).toBeLessThan(0.92);
  });
});

describe("pickWeighted", () => {
  it("returns undefined for an empty list", () => {
    expect(pickWeighted([], mulberry32(1))).toBeUndefined();
  });

  it("returns undefined when all tracks are F", () => {
    const tracks = [makeTrack("a", "F"), makeTrack("b", "F")];
    expect(pickWeighted(tracks, mulberry32(1))).toBeUndefined();
  });

  it("never returns an F track", () => {
    const tracks = [makeTrack("s", "S"), makeTrack("f", "F"), makeTrack("a", "A")];
    for (let i = 0; i < 200; i++) {
      const picked = pickWeighted(tracks, mulberry32(i + 1));
      expect(picked?.id).not.toBe("f");
    }
  });

  it("respects S=6x, A=4x, B=2x, C=D=Ungraded=1x weights over many samples", () => {
    const tracks: Track[] = [
      makeTrack("S", "S"),
      makeTrack("A", "A"),
      makeTrack("B", "B"),
      makeTrack("C", "C"),
      makeTrack("D", "D"),
      makeTrack("U", null),
    ];
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, U: 0 };
    const N = 30000;
    for (let i = 0; i < N; i++) {
      const picked = pickWeighted(tracks, mulberry32(i + 1));
      if (picked) counts[picked.id] = (counts[picked.id] ?? 0) + 1;
    }
    const totalWeight = 6 + 4 + 2 + 1 + 1 + 1; // 15
    const expectedFraction = (w: number) => w / totalWeight;
    const tol = 0.025;
    expect(counts.S! / N).toBeGreaterThan(expectedFraction(6) - tol);
    expect(counts.S! / N).toBeLessThan(expectedFraction(6) + tol);
    expect(counts.A! / N).toBeGreaterThan(expectedFraction(4) - tol);
    expect(counts.A! / N).toBeLessThan(expectedFraction(4) + tol);
    expect(counts.B! / N).toBeGreaterThan(expectedFraction(2) - tol);
    expect(counts.B! / N).toBeLessThan(expectedFraction(2) + tol);
    // C, D, U all weight 1.
    for (const k of ["C", "D", "U"] as const) {
      expect(counts[k]! / N).toBeGreaterThan(expectedFraction(1) - tol);
      expect(counts[k]! / N).toBeLessThan(expectedFraction(1) + tol);
    }
  });
});

describe("mulberry32", () => {
  it("produces deterministic streams", () => {
    const a = mulberry32(777);
    const b = mulberry32(777);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("returns values in [0, 1)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
