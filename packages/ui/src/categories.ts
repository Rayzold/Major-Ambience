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
  /**
   * Single-letter hotkey for jump-and-play. Case-insensitive. Picked so
   * the letter appears in the category name where possible (combat → C,
   * tenSion → S, sciFi → F). Renderers use `letterIndexInName(meta)` to
   * underline the matching character.
   */
  shortcut: string;
};

/**
 * The "removed" pseudo-category. Kept OUT of `CATEGORIES` so it doesn't
 * leak into the sidebar's Categories section, the Scene editor, the
 * Pin-to-slot menu, or letter / number hotkeys — all of which iterate
 * `CATEGORIES`. Track-row rendering still finds it via `findCategory`
 * because the lookup checks this constant after the main list. Access
 * is via a dedicated "Removed" entry in the Library section of the
 * sidebar, similar to Favorites and Recently played.
 */
export const REMOVED_CATEGORY: CategoryMeta = {
  id: "removed",
  name: "Removed",
  glyph: "trash",
  color: "#888",
  dark: "#1a1a1a",
  desc: "Tracks you've hidden from the library. Restore from this view to send them back to a real category.",
  shortcut: "_", // unreachable — keyboard handler only allows /[a-zA-Z]/
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
    shortcut: "C",
  },
  {
    id: "tavern",
    name: "Tavern",
    glyph: "mug",
    color: "#e2a154",
    dark: "#3a1f0a",
    desc: "Folk, jigs and reels for the smoke-warm hearth.",
    shortcut: "T",
  },
  {
    id: "exploration",
    name: "Exploration",
    glyph: "compass",
    color: "#bcae54",
    dark: "#2a2810",
    desc: "Journey, march, and the open road.",
    shortcut: "E",
  },
  {
    id: "ambient",
    name: "Ambient",
    glyph: "leaf",
    color: "#6fbfa6",
    dark: "#0f2a26",
    desc: "Atmospheric, melancholic, dreamlike beds.",
    shortcut: "A",
  },
  {
    id: "horror",
    name: "Horror",
    glyph: "skull",
    color: "#9a6ed1",
    dark: "#1a0f2e",
    desc: "Terror, undead, jump-scare stingers.",
    shortcut: "H",
  },
  {
    id: "tension",
    name: "Tension",
    glyph: "bolt",
    color: "#d27a4a",
    dark: "#2e160a",
    desc: "Suspense, pursuit, dread. Something is wrong.",
    shortcut: "S",
  },
  {
    id: "rest",
    name: "Rest",
    glyph: "moon",
    color: "#7d92dd",
    dark: "#10142e",
    desc: "Sacred, hymns, the long recovery.",
    shortcut: "R",
  },
  {
    id: "voices",
    name: "Voices",
    glyph: "mask",
    color: "#c084c0",
    dark: "#26102a",
    desc: "Voice packs, narration, monster sounds.",
    shortcut: "V",
  },
  {
    id: "sfx",
    name: "SFX",
    glyph: "spark",
    color: "#5cc4d9",
    dark: "#0a2630",
    desc: "Weather, weapons, ambience.",
    shortcut: "X",
  },
  {
    id: "scifi",
    name: "Sci‑Fi",
    glyph: "rocket",
    color: "#6e8be0",
    dark: "#0e1830",
    desc: "Use sparingly. The stars between.",
    shortcut: "F",
  },
];

export function findCategory(id: CategoryId): CategoryMeta | undefined {
  if (id === "removed") return REMOVED_CATEGORY;
  return CATEGORIES.find((c) => c.id === id);
}

/**
 * Index of the shortcut letter within `meta.name` (case-insensitive),
 * or -1 if the letter isn't present (the sidebar then renders the
 * letter separately as a kbd-style chip instead of underlining
 * in-place). Used by both desktop and mobile renderers.
 */
export function letterIndexInName(meta: CategoryMeta): number {
  return meta.name.toLowerCase().indexOf(meta.shortcut.toLowerCase());
}

/**
 * Lookup by case-insensitive shortcut letter. Returns the matching
 * category or undefined if no category claims this letter.
 */
export function findCategoryByShortcut(letter: string): CategoryMeta | undefined {
  const upper = letter.toUpperCase();
  return CATEGORIES.find((c) => c.shortcut === upper);
}
