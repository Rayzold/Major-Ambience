import type { CategoryId } from "@mc/core";
import { findCategory } from "./categories.js";
import { Glyph } from "./Glyph.js";

export type CatChipProps = {
  catId: CategoryId;
  size?: "sm" | "md";
};

export function CatChip({ catId, size = "sm" }: CatChipProps) {
  const c = findCategory(catId);
  if (!c) return null;
  const small = size === "sm";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 5 : 7,
        padding: small ? "3px 8px 3px 6px" : "5px 10px 5px 8px",
        borderRadius: 999,
        background: c.color + "1f",
        border: `1px solid ${c.color}33`,
        color: c.color,
        fontSize: small ? 10 : 12,
        fontWeight: 500,
        letterSpacing: 0.04,
        lineHeight: 1,
      }}
    >
      <Glyph name={c.glyph} size={small ? 11 : 13} stroke={1.6} />
      <span style={{ textTransform: "uppercase" }}>{c.name}</span>
    </div>
  );
}
