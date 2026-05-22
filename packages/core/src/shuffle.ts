// Weighted shuffle for the library.
//
// Weights (DESIGN.md "Tonight's Score" — pure, no side effects):
//   S → 6x   A → 4x   B → 2x   C → 1x   D → 1x   Ungraded → 1x   F → 0 (excluded)
//
// `weightedShuffle` produces a full permutation; `pickWeighted` returns one track.
// Both accept an optional RNG so tests can be deterministic.

import type { Grade, Track } from "./types.js";

export type RNG = () => number;

const WEIGHTS = {
  S: 6,
  A: 4,
  B: 2,
  C: 1,
  D: 1,
  F: 0,
} as const;

export function weightForGrade(grade: Grade): number {
  if (grade === null) return 1;
  return WEIGHTS[grade];
}

/**
 * Weighted shuffle without replacement. Returns a new array;
 * does not mutate the input. F-graded tracks are excluded.
 *
 * Uses the A-Res "key = u^(1/w)" trick: assign each track a key, sort
 * descending, and the resulting order is a valid weighted permutation.
 */
export function weightedShuffle(tracks: readonly Track[], rng: RNG = Math.random): Track[] {
  const keyed: Array<{ track: Track; key: number }> = [];
  for (const t of tracks) {
    const w = weightForGrade(t.grade);
    if (w <= 0) continue;
    const u = clampOpen01(rng());
    // u^(1/w). Equivalent to Math.log(u) / w in log-space (more stable).
    const key = Math.log(u) / w;
    keyed.push({ track: t, key });
  }
  // Larger key first (log(u) is negative; smaller magnitude = larger value).
  keyed.sort((a, b) => b.key - a.key);
  return keyed.map((k) => k.track);
}

/**
 * Pick one track at random, weighted by grade. Returns undefined when the
 * input is empty or contains only F-graded tracks.
 */
export function pickWeighted(tracks: readonly Track[], rng: RNG = Math.random): Track | undefined {
  let total = 0;
  for (const t of tracks) total += weightForGrade(t.grade);
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (const t of tracks) {
    const w = weightForGrade(t.grade);
    if (w <= 0) continue;
    r -= w;
    if (r <= 0) return t;
  }
  // Floating-point drift fallback: return the last graded track.
  for (let i = tracks.length - 1; i >= 0; i--) {
    if (weightForGrade(tracks[i]!.grade) > 0) return tracks[i];
  }
  return undefined;
}

/**
 * Mulberry32 PRNG. Deterministic given a seed; sufficient for tests
 * and for "I want the same shuffle order on this device" scenarios.
 */
export function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Clamp into (0, 1) so log(u) never blows up at the boundary.
function clampOpen01(u: number): number {
  if (u <= 0) return Number.EPSILON;
  if (u >= 1) return 1 - Number.EPSILON;
  return u;
}
