// Mobile token palette — Gold & Dark theme baked in for now.
// Theme switching on mobile is a follow-up ticket (would mirror the
// CSS-vars-on-html trick from the desktop app, but RN has no CSS vars,
// so the implementation is a Context with the active palette).

export const T = {
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
} as const;

export const FONT_DISPLAY = "serif";
export const FONT_UI = "System";
export const FONT_MONO = "Courier";
