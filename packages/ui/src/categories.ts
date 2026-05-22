// Category metadata. Mirrors prototype/app/data.js CATEGORIES and
// DESIGN.md § 5.2 palette.

import type { CategoryId } from "@mc/core";

export type CategoryMeta = {
  id: CategoryId;
  name: string;
  glyph: string;
  color: string;
  dark: string;
  desc: string;
  subcats?: readonly string[];
};

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: "combat",
    name: "Combat",
    glyph: "swords",
    color: "#d96a4a",
    dark: "#3b0f0a",
    desc: "Battle, boss, and skirmish music for the heat of war.",
    subcats: ["Battle", "Boss", "Skirmish"],
  },
  {
    id: "tavern",
    name: "Tavern",
    glyph: "mug",
    color: "#e2a154",
    dark: "#3a1f0a",
    desc: "Folk, jigs and reels for the smoke-warm hearth.",
  },
  {
    id: "exploration",
    name: "Exploration",
    glyph: "compass",
    color: "#bcae54",
    dark: "#2a2810",
    desc: "Journey, march, and the open road.",
  },
  {
    id: "ambient",
    name: "Ambient",
    glyph: "leaf",
    color: "#6fbfa6",
    dark: "#0f2a26",
    desc: "Atmospheric, melancholic, dreamlike beds.",
  },
  {
    id: "horror",
    name: "Horror",
    glyph: "skull",
    color: "#9a6ed1",
    dark: "#1a0f2e",
    desc: "Terror, undead, jump-scare stingers.",
  },
  {
    id: "tension",
    name: "Tension",
    glyph: "bolt",
    color: "#d27a4a",
    dark: "#2e160a",
    desc: "Suspense, pursuit, dread. Something is wrong.",
  },
  {
    id: "rest",
    name: "Rest",
    glyph: "moon",
    color: "#7d92dd",
    dark: "#10142e",
    desc: "Sacred, hymns, the long recovery.",
  },
  {
    id: "voices",
    name: "Voices",
    glyph: "mask",
    color: "#c084c0",
    dark: "#26102a",
    desc: "Voice packs, narration, monster sounds.",
  },
  {
    id: "sfx",
    name: "SFX",
    glyph: "spark",
    color: "#5cc4d9",
    dark: "#0a2630",
    desc: "Weather, weapons, ambience.",
  },
  {
    id: "scifi",
    name: "Sci‑Fi",
    glyph: "rocket",
    color: "#6e8be0",
    dark: "#0e1830",
    desc: "Use sparingly. The stars between.",
  },
];

export function findCategory(id: CategoryId): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
