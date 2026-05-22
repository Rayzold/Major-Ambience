// Web/Tauri renderer for the @mc/ui glyph set. Reads pure data from
// glyph-data.ts so mobile (react-native-svg) can render the same set
// from the same source.

import type { CSSProperties, JSX } from "react";
import { FALLBACK_GLYPH, GLYPHS, type GlyphShape } from "./glyph-data.js";

export type GlyphProps = {
  name: string;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
};

export function Glyph({ name, size = 24, stroke = 1.6, style }: GlyphProps): JSX.Element {
  const def = GLYPHS[name] ?? FALLBACK_GLYPH;
  const wrap: CSSProperties = { width: size, height: size, display: "block", ...style };
  const strokeProps = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" style={wrap}>
      {def.map((shape, i) => renderShape(shape, i, strokeProps))}
    </svg>
  );
}

function renderShape(
  shape: GlyphShape,
  key: number,
  strokeProps: {
    fill: "none";
    stroke: string;
    strokeWidth: number;
    strokeLinecap: "round";
    strokeLinejoin: "round";
  },
): JSX.Element {
  switch (shape.kind) {
    case "stroke-path":
      return <path key={key} d={shape.d} {...strokeProps} />;
    case "fill-path":
      return <path key={key} d={shape.d} fill="currentColor" />;
    case "stroke-circle":
      return <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} {...strokeProps} />;
    case "fill-circle":
      return <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} fill="currentColor" />;
    case "stroke-rect":
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...(shape.rx !== undefined ? { rx: shape.rx } : {})}
          {...strokeProps}
        />
      );
    case "fill-rect":
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...(shape.rx !== undefined ? { rx: shape.rx } : {})}
          fill="currentColor"
        />
      );
  }
}
