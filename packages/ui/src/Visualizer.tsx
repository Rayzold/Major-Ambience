import { useMemo } from "react";
import { T } from "./tokens.js";

export type VisualizerProps = {
  color?: string;
  bars?: number;
  height?: number;
  playing?: boolean;
};

export function Visualizer({
  color = T.gold,
  bars = 16,
  height = 28,
  playing = true,
}: VisualizerProps) {
  const hs = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const v = (Math.sin(i * 1.7) + 1) / 2;
        return 0.3 + v * 0.7;
      }),
    [bars],
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {hs.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: "100%",
            borderRadius: 1.5,
            background: color,
            opacity: 0.85,
            transformOrigin: "bottom",
            transform: `scaleY(${h})`,
            animation: playing
              ? `mc-bar ${0.5 + (i % 4) * 0.17}s ease-in-out ${i * 0.04}s infinite`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
