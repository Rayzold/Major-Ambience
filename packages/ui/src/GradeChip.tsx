import type { Grade } from "@mc/core";
import { GRADE_COLOR, T } from "./tokens.js";

export type GradeChipProps = {
  grade: Grade;
  size?: number;
};

export function GradeChip({ grade, size = 22 }: GradeChipProps) {
  if (!grade) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          border: `1px dashed ${T.ink3}`,
          opacity: 0.5,
        }}
      />
    );
  }
  const color = GRADE_COLOR[grade];
  return (
    <div
      className="mc-mono"
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: color + "22",
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.55,
        fontWeight: 600,
        border: `1px solid ${color}55`,
      }}
    >
      {grade}
    </div>
  );
}
