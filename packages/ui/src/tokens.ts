// Design tokens ported from prototype/app/ui.jsx — DESIGN.md § 5.1.
// Treat these values as locked; the prototype is the canonical reference.

export const T = {
  // surfaces
  bg: "#0b0913",
  bgRaise: "#15121f",
  bgCard: "#1c1828",
  bgChip: "rgba(243,236,217,0.06)",
  // ink (warm parchment)
  ink: "#f3ecd9",
  ink2: "#b6a890",
  ink3: "#6b5f4b",
  // accent
  gold: "#e3b66a",
  goldSoft: "rgba(227,182,106,0.14)",
  goldEdge: "rgba(227,182,106,0.35)",
  // dividers
  rule: "rgba(243,236,217,0.07)",
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
