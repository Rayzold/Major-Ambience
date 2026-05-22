// Floating context menu — right-click a track row, pick a slot, assign.
// Renders at the cursor position, clamped to the viewport.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SoundboardSlot, Track } from "@mc/core";
import { findCategory, Glyph, T } from "@mc/ui";

export type PinToSlotMenuProps = {
  anchor: { x: number; y: number };
  track: Track;
  slots: readonly SoundboardSlot[];
  tracksById: ReadonlyMap<string, Track>;
  onPin: (page: "A" | "B" | "C", slot: number) => void;
  onDismiss: () => void;
};

const PAGES = ["A", "B", "C"] as const;
const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function PinToSlotMenu({
  anchor,
  track,
  slots,
  tracksById,
  onPin,
  onDismiss,
}: PinToSlotMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(anchor);
  const slotMap = new Map<string, SoundboardSlot>();
  for (const s of slots) slotMap.set(`${s.page}-${s.slot}`, s);
  const trackCat = findCategory(track.category);

  // Clamp into viewport after first render (we need the rendered size).
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const margin = 8;
    let x = anchor.x;
    let y = anchor.y;
    if (x + rect.width + margin > window.innerWidth) {
      x = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (y + rect.height + margin > window.innerHeight) {
      y = Math.max(margin, window.innerHeight - rect.height - margin);
    }
    setPosition({ x, y });
  }, [anchor.x, anchor.y]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    }
    function onContext(e: MouseEvent) {
      // Another right-click anywhere also dismisses (a new menu replaces this one).
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 80,
        width: 360,
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
          padding: "10px 12px 8px",
          borderBottom: `1px solid ${T.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {trackCat ? (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: `linear-gradient(140deg, ${trackCat.color}, ${trackCat.dark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.ink,
              flexShrink: 0,
            }}
          >
            <Glyph name={trackCat.glyph} size={14} />
          </div>
        ) : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="mc-eyebrow" style={{ fontSize: 9 }}>
            Pin to soundboard
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: T.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 2,
            }}
          >
            {track.title}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0,
          padding: 8,
        }}
      >
        {PAGES.map((page) => (
          <div key={page} style={{ padding: "0 4px" }}>
            <div
              style={{
                fontSize: 9,
                color: T.ink3,
                fontWeight: 600,
                letterSpacing: 0.16,
                textTransform: "uppercase",
                padding: "4px 6px",
              }}
            >
              Page {page}
            </div>
            {SLOT_NUMBERS.map((n) => {
              const assigned = slotMap.get(`${page}-${n}`);
              const occupant = assigned?.trackId
                ? tracksById.get(assigned.trackId)
                : undefined;
              const occupantCat = occupant ? findCategory(occupant.category) : undefined;
              const replaces = !!occupant;
              return (
                <button
                  key={n}
                  onClick={() => onPin(page, n)}
                  title={
                    occupant
                      ? `Replace: ${occupant.title}`
                      : `Assign to ${page}·${n}`
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "5px 6px",
                    borderRadius: 6,
                    background: "transparent",
                    color: T.ink2,
                    fontSize: 11,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.bgChip;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    className="mc-mono"
                    style={{
                      width: 16,
                      color: occupantCat?.color ?? T.ink3,
                      fontWeight: 600,
                    }}
                  >
                    {n}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: replaces ? T.ink2 : T.ink3,
                      fontStyle: replaces ? "normal" : "italic",
                      fontSize: replaces ? 11 : 10,
                    }}
                  >
                    {occupant ? occupant.title : "empty"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
