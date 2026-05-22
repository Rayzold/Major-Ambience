// React Native renderer for the @mc/ui glyph set. Reads the same pure
// data as the desktop version (packages/ui/src/glyph-data.ts), just
// uses react-native-svg primitives instead of DOM <svg>.

import type { JSX } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { FALLBACK_GLYPH, GLYPHS, type GlyphShape } from "@mc/ui/glyph-data";

export type GlyphProps = {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
};

export function Glyph({
  name,
  size = 24,
  stroke = 1.6,
  color = "currentColor",
}: GlyphProps): JSX.Element {
  const def = GLYPHS[name] ?? FALLBACK_GLYPH;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {def.map((shape, i) => renderShape(shape, i, color, stroke))}
    </Svg>
  );
}

function renderShape(
  shape: GlyphShape,
  key: number,
  color: string,
  stroke: number,
): JSX.Element {
  switch (shape.kind) {
    case "stroke-path":
      return (
        <Path
          key={key}
          d={shape.d}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "fill-path":
      return <Path key={key} d={shape.d} fill={color} />;
    case "stroke-circle":
      return (
        <Circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
      );
    case "fill-circle":
      return (
        <Circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} fill={color} />
      );
    case "stroke-rect":
      return (
        <Rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...(shape.rx !== undefined ? { rx: shape.rx } : {})}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
      );
    case "fill-rect":
      return (
        <Rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...(shape.rx !== undefined ? { rx: shape.rx } : {})}
          fill={color}
        />
      );
  }
}
