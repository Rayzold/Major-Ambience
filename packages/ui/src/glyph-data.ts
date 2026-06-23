// Pure data for the @mc/ui glyph set. Two renderers consume this:
//   * Glyph.tsx                 — web/Tauri, renders with <svg> JSX
//   * apps/mobile/src/Glyph.tsx — RN, renders via react-native-svg
//
// Each shape uses currentColor; stroke-* obey the active strokeWidth,
// fill-* always fill solid. ViewBox is always "0 0 24 24".

export type GlyphShape =
  | { kind: "stroke-path"; d: string }
  | { kind: "fill-path"; d: string }
  | { kind: "stroke-circle"; cx: number; cy: number; r: number }
  | { kind: "fill-circle"; cx: number; cy: number; r: number }
  | { kind: "stroke-rect"; x: number; y: number; width: number; height: number; rx?: number }
  | { kind: "fill-rect"; x: number; y: number; width: number; height: number; rx?: number };

export type GlyphDef = readonly GlyphShape[];

const sp = (d: string): GlyphShape => ({ kind: "stroke-path", d });
const fp = (d: string): GlyphShape => ({ kind: "fill-path", d });
const sc = (cx: number, cy: number, r: number): GlyphShape => ({
  kind: "stroke-circle",
  cx,
  cy,
  r,
});
const fc = (cx: number, cy: number, r: number): GlyphShape => ({
  kind: "fill-circle",
  cx,
  cy,
  r,
});
const sr = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx?: number,
): GlyphShape => ({ kind: "stroke-rect", x, y, width, height, ...(rx !== undefined ? { rx } : {}) });
const fr = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx?: number,
): GlyphShape => ({ kind: "fill-rect", x, y, width, height, ...(rx !== undefined ? { rx } : {}) });

export const GLYPHS: Record<string, GlyphDef> = {
  swords: [
    sp("M3 21l5-5 M5 19l2 2 M16 8l5-5 M3 3l8 8 M13 13l8 8 M11 11l2-2 M13 13l-2 2"),
    sp("M3 3h3v3"),
    sp("M21 3h-3v3"),
    sp("M3 21h3v-3"),
    sp("M21 21h-3v-3"),
  ],
  mug: [
    sp("M5 8h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8z"),
    sp("M16 11h2a2.5 2.5 0 0 1 0 5h-2"),
    sp("M8 5v-2 M11 5v-2 M14 5v-2"),
    sp("M5 8h11"),
  ],
  compass: [sc(12, 12, 9), sp("M15.5 8.5l-2 5-5 2 2-5 5-2z")],
  leaf: [
    sp("M20 4c-9 0-15 5-15 12 0 2 1 4 3 4 7 0 12-6 12-15v-1z"),
    sp("M5 20c3-6 7-9 12-11"),
  ],
  skull: [
    sp(
      "M5 11a7 7 0 0 1 14 0v3l1 2-2 1v2a1 1 0 0 1-1 1h-2v-3h-2v3h-2v-3h-2v3h-2a1 1 0 0 1-1-1v-2l-2-1 1-2v-3z",
    ),
    fc(9, 12, 1.4),
    fc(15, 12, 1.4),
    sp("M11 16h2"),
  ],
  "skull-crown": [
    sp("M4 6l2 3 3-3 3 3 3-3 3 3 2-3v3h-16z"),
    sp(
      "M5 13a7 7 0 0 1 14 0v3l1 2-2 1v1a1 1 0 0 1-1 1h-2v-2h-2v2h-2v-2h-2v2h-2a1 1 0 0 1-1-1v-1l-2-1 1-2v-3z",
    ),
    fc(9, 13.5, 1.2),
    fc(15, 13.5, 1.2),
  ],
  bolt: [sp("M13 2L4 14h6l-1 8 9-12h-6l1-8z")],
  moon: [sp("M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z")],
  mask: [
    sp("M3 7c0-2 2-3 4-3h10c2 0 4 1 4 3v4c0 5-4 9-9 9s-9-4-9-9V7z"),
    sp("M8 11c1 1 2 1 3 0 M13 11c1 1 2 1 3 0"),
    sp("M10 15c1 1 3 1 4 0"),
  ],
  spark: [
    sp("M12 2v6 M12 16v6 M2 12h6 M16 12h6 M5 5l4 4 M15 15l4 4 M19 5l-4 4 M9 15l-4 4"),
  ],
  rocket: [
    sp("M14 4c5 0 6 5 6 6-2 0-3 1-4 2l-4 4-4-4 4-4c1-1 2-4 2-4z"),
    sp("M9 15l-3 3 3 1 1 3 3-3"),
    sc(15, 9, 1.5),
  ],
  torch: [
    sp("M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 2 0-2-1-3 0-6z"),
    sp("M10 14l-3 8h10l-3-8"),
  ],
  play: [fp("M7 4l13 8-13 8z")],
  pause: [fr(6, 4, 4, 16, 1), fr(14, 4, 4, 16, 1)],
  prev: [sp("M19 5L8 12l11 7zM5 5v14")],
  next: [sp("M5 5l11 7-11 7zM19 5v14")],
  shuffle: [sp("M3 7h3l12 10h3 M3 17h3l12-10h3 M18 4l3 3-3 3 M18 14l3 3-3 3")],
  loop: [sp("M3 12a6 6 0 0 1 6-6h9 M21 12a6 6 0 0 1-6 6H6 M15 3l3 3-3 3 M9 21l-3-3 3-3")],
  queue: [sp("M4 6h12 M4 12h12 M4 18h8 M18 14v8 M14 18h8")],
  fade: [sp("M3 18l7-12 M21 18l-7-12 M10 18h4")],
  duck: [
    sp("M11 5a3 3 0 0 0-3 3v2H6a3 3 0 0 0 0 6h2l1 4h6l1-4h2a4 4 0 0 0 0-8h-1c-1-3-3-3-6-3z"),
    fc(13, 8, 0.5),
  ],
  mute: [sp("M3 10v4h4l5 4V6L7 10H3z M16 9l5 6 M21 9l-5 6")],
  speaker: [sp("M3 10v4h4l5 4V6L7 10H3z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12")],
  search: [sc(11, 11, 7), sp("M16.5 16.5L21 21")],
  library: [sp("M4 4v16 M9 4v16 M14 6l2-1 4 14-2 1z M14 4v16")],
  scenes: [
    sr(3, 5, 18, 14, 2),
    sp("M3 9h18 M7 5v-1 M11 5v-1 M15 5v-1 M19 5v-1"),
  ],
  soundboard: [
    sr(3, 3, 8, 8, 1.5),
    sr(13, 3, 8, 8, 1.5),
    sr(3, 13, 8, 8, 1.5),
    sr(13, 13, 8, 8, 1.5),
  ],
  sliders: [
    sp("M4 6h10 M18 6h2 M4 12h2 M10 12h10 M4 18h14 M18 18h2"),
    sc(16, 6, 2),
    sc(8, 12, 2),
    sc(16, 18, 2),
  ],
  plus: [sp("M12 5v14 M5 12h14")],
  close: [sp("M6 6l12 12 M18 6L6 18")],
  trash: [
    sp("M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14 M10 11v6 M14 11v6"),
  ],
  undo: [
    sp("M9 14l-5-5 5-5 M4 9h10a6 6 0 0 1 0 12h-4"),
  ],
  pin: [sp("M9 3l6 6-2 1 3 5-9 1-1-9 5 3 1-2z M9 14l-5 6")],
  note: [
    sp("M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M15 4v4h4 M8 12h7 M8 16h7"),
  ],
  star: [sp("M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z")],
  clock: [sc(12, 12, 9), sp("M12 7v5l3 2")],
  dice: [sp("M12 3l9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v10")],
  theatre: [sc(9, 11, 6), sc(15, 13, 6)],
  caret: [sp("M9 5l7 7-7 7")],
  down: [sp("M5 9l7 7 7-7")],
  check: [sp("M4 12l5 5 11-12")],
  wave: [sp("M2 12c2-4 2 4 4 0s2-6 4 0 2 6 4 0 2-4 4 0 2 6 4 0")],
  settings: [
    sc(12, 12, 3),
    sp("M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M5 19l2-2"),
  ],
  folder: [
    sp("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"),
  ],
  monitor: [sr(3, 4, 18, 12, 2), sp("M9 20h6 M12 16v4")],
  // Bookmark — classic saved-item shape: tall rectangle with a
  // triangular notch cut from the bottom. Used by the DM Toolkit
  // References tab; reads as "saved for later" vs `spark` which is
  // reserved for the discover/import affordances inside that panel.
  bookmark: [sp("M7 3h10v18l-5-4-5 4z")],
};

export const FALLBACK_GLYPH: GlyphDef = [sc(12, 12, 6)];
