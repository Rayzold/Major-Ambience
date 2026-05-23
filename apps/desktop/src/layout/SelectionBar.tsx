// Floating action bar shown while one or more library tracks are
// multi-selected. Sits above the transport, batches grade changes
// across the whole selection. Esc clears (handled in Library).

import type { Grade } from "@mc/core";
import { Glyph, GRADE_COLOR, T } from "@mc/ui";

const GRADES: Array<Exclude<Grade, null>> = ["S", "A", "B", "C", "D", "F"];

export type SelectionBarProps = {
  count: number;
  onSetGrade: (grade: Grade) => void;
  onClearGrade: () => void;
  onClear: () => void;
};

export function SelectionBar({
  count,
  onSetGrade,
  onClearGrade,
  onClear,
}: SelectionBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 100, // sits above the transport (height 88) with a small gap
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px 8px 14px",
        borderRadius: 14,
        background: T.popoverBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${T.goldEdge}`,
        boxShadow: "0 12px 36px rgba(0,0,0,0.55)",
        color: T.ink,
        fontSize: 12,
      }}
    >
      <span
        className="mc-mono"
        style={{
          color: T.gold,
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {count.toLocaleString()} selected
      </span>

      <span
        className="mc-eyebrow"
        style={{ fontSize: 9, color: T.ink3, letterSpacing: 0.2 }}
      >
        Grade
      </span>

      <div style={{ display: "inline-flex", gap: 4 }}>
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => onSetGrade(g)}
            title={`Grade selection ${g}`}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: GRADE_COLOR[g] + "22",
              color: GRADE_COLOR[g],
              border: `1px solid ${GRADE_COLOR[g]}55`,
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "Geist Mono, monospace",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {g}
          </button>
        ))}
        <button
          onClick={onClearGrade}
          title="Clear grade on selection"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: T.bgChip,
            color: T.ink3,
            border: `1px solid ${T.rule}`,
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          —
        </button>
      </div>

      <span
        style={{ width: 1, height: 22, background: T.rule, marginLeft: 2 }}
      />

      <button
        onClick={onClear}
        title="Clear selection (Esc)"
        style={{
          padding: "5px 10px",
          borderRadius: 7,
          background: "transparent",
          color: T.ink2,
          border: `1px solid ${T.rule}`,
          fontSize: 11,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Glyph name="close" size={11} />
        Clear
      </button>
    </div>
  );
}
