// 24x24 SVG glyph set — currentColor stroked, 1.6px default.
// Faithfully ported from prototype/app/icons.jsx. Do not redesign.
// Add new glyphs here, not via emoji (DESIGN.md § 12 rule 3).

import type { CSSProperties, JSX } from "react";

export type GlyphProps = {
  name: string;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
};

export function Glyph({ name, size = 24, stroke = 1.6, style }: GlyphProps): JSX.Element {
  const s: CSSProperties = { width: size, height: size, display: "block", ...style };
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "swords":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M3 21l5-5 M5 19l2 2 M16 8l5-5 M3 3l8 8 M13 13l8 8 M11 11l2-2 M13 13l-2 2" {...p} />
          <path d="M3 3h3v3" {...p} />
          <path d="M21 3h-3v3" {...p} />
          <path d="M3 21h3v-3" {...p} />
          <path d="M21 21h-3v-3" {...p} />
        </svg>
      );
    case "mug":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M5 8h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8z" {...p} />
          <path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" {...p} />
          <path d="M8 5v-2 M11 5v-2 M14 5v-2" {...p} />
          <path d="M5 8h11" {...p} />
        </svg>
      );
    case "compass":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" {...p} />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M20 4c-9 0-15 5-15 12 0 2 1 4 3 4 7 0 12-6 12-15v-1z" {...p} />
          <path d="M5 20c3-6 7-9 12-11" {...p} />
        </svg>
      );
    case "skull":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M5 11a7 7 0 0 1 14 0v3l1 2-2 1v2a1 1 0 0 1-1 1h-2v-3h-2v3h-2v-3h-2v3h-2a1 1 0 0 1-1-1v-2l-2-1 1-2v-3z" {...p} />
          <circle cx="9" cy="12" r="1.4" fill="currentColor" />
          <circle cx="15" cy="12" r="1.4" fill="currentColor" />
          <path d="M11 16h2" {...p} />
        </svg>
      );
    case "skull-crown":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M4 6l2 3 3-3 3 3 3-3 3 3 2-3v3h-16z" {...p} />
          <path d="M5 13a7 7 0 0 1 14 0v3l1 2-2 1v1a1 1 0 0 1-1 1h-2v-2h-2v2h-2v-2h-2v2h-2a1 1 0 0 1-1-1v-1l-2-1 1-2v-3z" {...p} />
          <circle cx="9" cy="13.5" r="1.2" fill="currentColor" />
          <circle cx="15" cy="13.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" {...p} />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z" {...p} />
        </svg>
      );
    case "mask":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M3 7c0-2 2-3 4-3h10c2 0 4 1 4 3v4c0 5-4 9-9 9s-9-4-9-9V7z" {...p} />
          <path d="M8 11c1 1 2 1 3 0 M13 11c1 1 2 1 3 0" {...p} />
          <path d="M10 15c1 1 3 1 4 0" {...p} />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 2v6 M12 16v6 M2 12h6 M16 12h6 M5 5l4 4 M15 15l4 4 M19 5l-4 4 M9 15l-4 4" {...p} />
        </svg>
      );
    case "rocket":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M14 4c5 0 6 5 6 6-2 0-3 1-4 2l-4 4-4-4 4-4c1-1 2-4 2-4z" {...p} />
          <path d="M9 15l-3 3 3 1 1 3 3-3" {...p} />
          <circle cx="15" cy="9" r="1.5" {...p} />
        </svg>
      );
    case "torch":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 2 0-2-1-3 0-6z" {...p} />
          <path d="M10 14l-3 8h10l-3-8" {...p} />
        </svg>
      );
    case "play":
      return <svg viewBox="0 0 24 24" style={s}><path d="M7 4l13 8-13 8z" fill="currentColor" /></svg>;
    case "pause":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
          <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
        </svg>
      );
    case "prev":
      return <svg viewBox="0 0 24 24" style={s}><path d="M19 5L8 12l11 7zM5 5v14" {...p} /></svg>;
    case "next":
      return <svg viewBox="0 0 24 24" style={s}><path d="M5 5l11 7-11 7zM19 5v14" {...p} /></svg>;
    case "shuffle":
      return <svg viewBox="0 0 24 24" style={s}><path d="M3 7h3l12 10h3 M3 17h3l12-10h3 M18 4l3 3-3 3 M18 14l3 3-3 3" {...p} /></svg>;
    case "loop":
      return <svg viewBox="0 0 24 24" style={s}><path d="M3 12a6 6 0 0 1 6-6h9 M21 12a6 6 0 0 1-6 6H6 M15 3l3 3-3 3 M9 21l-3-3 3-3" {...p} /></svg>;
    case "queue":
      return <svg viewBox="0 0 24 24" style={s}><path d="M4 6h12 M4 12h12 M4 18h8 M18 14v8 M14 18h8" {...p} /></svg>;
    case "fade":
      return <svg viewBox="0 0 24 24" style={s}><path d="M3 18l7-12 M21 18l-7-12 M10 18h4" {...p} /></svg>;
    case "duck":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M11 5a3 3 0 0 0-3 3v2H6a3 3 0 0 0 0 6h2l1 4h6l1-4h2a4 4 0 0 0 0-8h-1c-1-3-3-3-6-3z" {...p} />
          <circle cx="13" cy="8" r="0.5" fill="currentColor" />
        </svg>
      );
    case "mute":
      return <svg viewBox="0 0 24 24" style={s}><path d="M3 10v4h4l5 4V6L7 10H3z M16 9l5 6 M21 9l-5 6" {...p} /></svg>;
    case "speaker":
      return <svg viewBox="0 0 24 24" style={s}><path d="M3 10v4h4l5 4V6L7 10H3z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12" {...p} /></svg>;
    case "search":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7" {...p} /><path d="M16.5 16.5L21 21" {...p} /></svg>;
    case "library":
      return <svg viewBox="0 0 24 24" style={s}><path d="M4 4v16 M9 4v16 M14 6l2-1 4 14-2 1z M14 4v16" {...p} /></svg>;
    case "scenes":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <rect x="3" y="5" width="18" height="14" rx="2" {...p} />
          <path d="M3 9h18 M7 5v-1 M11 5v-1 M15 5v-1 M19 5v-1" {...p} />
        </svg>
      );
    case "soundboard":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" {...p} />
          <rect x="13" y="3" width="8" height="8" rx="1.5" {...p} />
          <rect x="3" y="13" width="8" height="8" rx="1.5" {...p} />
          <rect x="13" y="13" width="8" height="8" rx="1.5" {...p} />
        </svg>
      );
    case "sliders":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M4 6h10 M18 6h2 M4 12h2 M10 12h10 M4 18h14 M18 18h2" {...p} />
          <circle cx="16" cy="6" r="2" {...p} />
          <circle cx="8" cy="12" r="2" {...p} />
          <circle cx="16" cy="18" r="2" {...p} />
        </svg>
      );
    case "plus":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 5v14 M5 12h14" {...p} /></svg>;
    case "close":
      return <svg viewBox="0 0 24 24" style={s}><path d="M6 6l12 12 M18 6L6 18" {...p} /></svg>;
    case "pin":
      return <svg viewBox="0 0 24 24" style={s}><path d="M9 3l6 6-2 1 3 5-9 1-1-9 5 3 1-2z M9 14l-5 6" {...p} /></svg>;
    case "note":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M15 4v4h4 M8 12h7 M8 16h7" {...p} />
        </svg>
      );
    case "star":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" {...p} /></svg>;
    case "clock":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7v5l3 2" {...p} /></svg>;
    case "dice":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 3l9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v10" {...p} /></svg>;
    case "theatre":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="9" cy="11" r="6" {...p} /><circle cx="15" cy="13" r="6" {...p} /></svg>;
    case "caret":
      return <svg viewBox="0 0 24 24" style={s}><path d="M9 5l7 7-7 7" {...p} /></svg>;
    case "down":
      return <svg viewBox="0 0 24 24" style={s}><path d="M5 9l7 7 7-7" {...p} /></svg>;
    case "check":
      return <svg viewBox="0 0 24 24" style={s}><path d="M4 12l5 5 11-12" {...p} /></svg>;
    case "wave":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M2 12c2-4 2 4 4 0s2-6 4 0 2 6 4 0 2-4 4 0 2 6 4 0" {...p} />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <circle cx="12" cy="12" r="3" {...p} />
          <path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M5 19l2-2" {...p} />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" {...p} />
        </svg>
      );
    default:
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="6" {...p} /></svg>;
  }
}
