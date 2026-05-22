import type { CategoryId } from "@mc/core";
import { findCategory } from "./categories.js";
import { T } from "./tokens.js";

export type CategoryGradientProps = {
  cat: CategoryId;
  height?: number;
  intensity?: number;
};

export function CategoryGradient({
  cat,
  height = 360,
  intensity = 0.55,
}: CategoryGradientProps) {
  const c = findCategory(cat)?.color ?? T.gold;
  const alphaHex = Math.round(intensity * 255)
    .toString(16)
    .padStart(2, "0");
  return (
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto 0",
        height,
        pointerEvents: "none",
        background: `radial-gradient(120% 100% at 50% 0%, ${c}${alphaHex} 0%, transparent 70%)`,
      }}
    >
      <div className="mc-grain" />
    </div>
  );
}
