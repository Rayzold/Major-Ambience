// Design tokens. DESIGN.md § 5.1.
//
// T values are CSS custom property references so swapping a theme is one
// class flip on <html> rather than a re-render cascade. The actual values
// per theme live in themes.ts and get emitted by installGlobalStyles().

export const T = {
  // surfaces
  bg: "var(--mc-bg)",
  bgRaise: "var(--mc-bgRaise)",
  bgCard: "var(--mc-bgCard)",
  bgChip: "var(--mc-bgChip)",
  // ink (warm parchment by default)
  ink: "var(--mc-ink)",
  ink2: "var(--mc-ink2)",
  ink3: "var(--mc-ink3)",
  // accent
  gold: "var(--mc-gold)",
  goldSoft: "var(--mc-goldSoft)",
  goldEdge: "var(--mc-goldEdge)",
  // dividers
  rule: "var(--mc-rule)",
  // chrome / overlays (theme-aware translucent backgrounds)
  chromeBg: "var(--mc-chromeBg)",
  popoverBg: "var(--mc-popoverBg)",
  modalBackdrop: "var(--mc-modalBackdrop)",
} as const;

export const FONT_DISPLAY =
  '"Cormorant Garamond", "Cormorant", "Iowan Old Style", Georgia, serif';
export const FONT_UI =
  '"Geist", "Inter", -apple-system, system-ui, sans-serif';
export const FONT_MONO = '"Geist Mono", ui-monospace, monospace';

export const EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)";

export const GRADE_COLOR = {
  S: "#e3b66a",
  A: "#6fbf7a",
  B: "#5ca0d9",
  C: "#d9c25c",
  D: "#d99860",
  F: "#d96666",
} as const;
