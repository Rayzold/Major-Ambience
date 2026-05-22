// Popup listing all available tutorials with seen/unseen state.
// Opens from the settings icon in the header.

import { useEffect, useRef } from "react";
import { Glyph, T } from "@mc/ui";
import type { TutorialDef } from "./tutorials.js";

export type TutorialsMenuProps = {
  tutorials: readonly TutorialDef[];
  seen: ReadonlySet<string>;
  anchor: { x: number; y: number };
  onPick: (id: string) => void;
  onDismiss: () => void;
};

const WIDTH = 320;

export function TutorialsMenu({
  tutorials,
  seen,
  anchor,
  onPick,
  onDismiss,
}: TutorialsMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onDismiss]);

  // Right-align to the anchor since the settings icon sits flush-right.
  const x = Math.max(8, Math.min(anchor.x - WIDTH, window.innerWidth - WIDTH - 8));
  const y = anchor.y;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: WIDTH,
        zIndex: 70,
        background: "rgba(21,18,31,0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${T.rule}`,
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div className="mc-eyebrow" style={{ fontSize: 9 }}>
          Help
        </div>
        <div
          className="mc-display"
          style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}
        >
          Tutorials
        </div>
      </div>
      <div style={{ padding: 6 }}>
        {tutorials.map((t) => {
          const isSeen = seen.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 8,
                background: "transparent",
                color: T.ink,
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.bgChip;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: isSeen ? T.bgChip : T.goldSoft,
                  border: `1px solid ${isSeen ? T.rule : T.goldEdge}`,
                  color: isSeen ? T.ink3 : T.gold,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Glyph name={isSeen ? "check" : "spark"} size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink3,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {t.blurb}
                </div>
                <div
                  className="mc-mono"
                  style={{ fontSize: 9, color: T.ink3, marginTop: 4 }}
                >
                  {t.durationSeconds}s · {t.steps.length} steps
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
