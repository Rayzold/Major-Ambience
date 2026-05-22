// Theme palettes. DESIGN.md § 5.5 — three themes locked.
//
//   Gold & Dark (default) — deep parchment-black, the canonical look.
//   Parchment             — light cream surface ramp, warm-brown ink.
//   Arcane                — Horror palette repurposed as the surface ramp.
//
// Category palette (combat ember, tavern amber, etc.) is shared across all
// three themes per § 5.5. Gold accent stays too — only surfaces + ink shift.

export type ThemeId = "gold-dark" | "parchment" | "arcane";

export type ThemePalette = {
  bg: string;
  bgRaise: string;
  bgCard: string;
  bgChip: string;
  ink: string;
  ink2: string;
  ink3: string;
  gold: string;
  goldSoft: string;
  goldEdge: string;
  rule: string;
  /** Translucent chrome background (header, transport bar). */
  chromeBg: string;
  /** Solid-ish popover/menu background (search, pin menu, tutorial menu). */
  popoverBg: string;
  /** Backdrop for modals (save-scene dialog). */
  modalBackdrop: string;
};

export const THEMES: Record<ThemeId, ThemePalette> = {
  "gold-dark": {
    bg: "#0b0913",
    bgRaise: "#15121f",
    bgCard: "#1c1828",
    bgChip: "rgba(243,236,217,0.06)",
    ink: "#f3ecd9",
    ink2: "#b6a890",
    ink3: "#6b5f4b",
    gold: "#e3b66a",
    goldSoft: "rgba(227,182,106,0.14)",
    goldEdge: "rgba(227,182,106,0.35)",
    rule: "rgba(243,236,217,0.07)",
    chromeBg: "rgba(11,9,19,0.75)",
    popoverBg: "rgba(21,18,31,0.97)",
    modalBackdrop: "rgba(0,0,0,0.55)",
  },
  parchment: {
    // Light variant — warm cream surface, dark brown ink.
    bg: "#f2ead4",
    bgRaise: "#eadfbf",
    bgCard: "#e0d3aa",
    bgChip: "rgba(42,32,18,0.06)",
    ink: "#2a2012",
    ink2: "#5e503a",
    ink3: "#8a7a5e",
    gold: "#b88a3a", // deeper gold for contrast against cream
    goldSoft: "rgba(184,138,58,0.16)",
    goldEdge: "rgba(184,138,58,0.4)",
    rule: "rgba(42,32,18,0.08)",
    chromeBg: "rgba(242,234,212,0.85)",
    popoverBg: "rgba(234,223,191,0.98)",
    modalBackdrop: "rgba(42,32,18,0.45)",
  },
  arcane: {
    // Reuses Horror category dark (#1a0f2e) as the surface base.
    bg: "#150c24",
    bgRaise: "#221636",
    bgCard: "#2c1d44",
    bgChip: "rgba(243,236,217,0.06)",
    ink: "#f3ecd9", // same warm parchment ink
    ink2: "#b6a890",
    ink3: "#6b5f4b",
    gold: "#e3b66a", // gold accent unchanged
    goldSoft: "rgba(227,182,106,0.16)",
    goldEdge: "rgba(227,182,106,0.4)",
    rule: "rgba(243,236,217,0.07)",
    chromeBg: "rgba(21,12,36,0.78)",
    popoverBg: "rgba(34,22,54,0.97)",
    modalBackdrop: "rgba(0,0,0,0.6)",
  },
};

export const THEME_META: Record<ThemeId, { name: string; blurb: string }> = {
  "gold-dark": {
    name: "Gold & Dark",
    blurb: "Canonical. Warm parchment on deep purple-black.",
  },
  parchment: {
    name: "Parchment",
    blurb: "Light variant. Cream surfaces, deep ink, brass accent.",
  },
  arcane: {
    name: "Arcane",
    blurb: "Deep violet — Horror palette as the surface ramp.",
  },
};

export const THEME_ORDER: readonly ThemeId[] = [
  "gold-dark",
  "parchment",
  "arcane",
];
