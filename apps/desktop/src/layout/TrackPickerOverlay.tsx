// Searchable track picker — popover for assigning a track to a target
// (combatant turn-sound, soundboard pad) without leaving the current tab.
//
// Why this exists: drag-and-drop from the Library track row → DM Tools
// combatant / Soundboard pad is the documented affordance, but those
// targets live on different tabs from the Library, so the drag can
// never actually happen in the single-pane tabbed UI. This picker is
// the click-driven alternative — same backing dataset, no tab dance.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@mc/core";
import { findCategory, Glyph, T } from "@mc/ui";

export type TrackPickerOverlayProps = {
  /** Where to anchor the popover, in viewport coords (e.g. `e.clientX/Y`). */
  anchor: { x: number; y: number };
  /** Full track index — picker handles filtering internally. */
  tracks: readonly Track[];
  /** Optional heading shown above the search input. */
  title?: string;
  /**
   * Optional one-line description below the title — explains what the
   * pick will do in the caller's context (e.g. "Turn sound for Anna").
   */
  subtitle?: string;
  onPick: (track: Track) => void;
  onDismiss: () => void;
};

const WIDTH = 360;
const MAX_HEIGHT = 460;

export function TrackPickerOverlay({
  anchor,
  tracks,
  title,
  subtitle,
  onPick,
  onDismiss,
}: TrackPickerOverlayProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  // Clamp position to the viewport so the popover always fits.
  const x = Math.max(8, Math.min(anchor.x, window.innerWidth - WIDTH - 8));
  const y = Math.max(8, Math.min(anchor.y, window.innerHeight - MAX_HEIGHT - 8));

  // Local filter — small enough (<5k rows in practice) to keep purely
  // client-side and avoid the FTS5 round-trip for what's already a
  // very narrow popover. Matches title and pack, case-insensitive,
  // requires every whitespace-separated term to hit somewhere.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return tracks.slice(0, 200);
    const terms = q.split(/\s+/).filter(Boolean);
    return tracks
      .filter((t) => {
        const hay = `${t.title} ${t.pack ?? ""}`.toLowerCase();
        return terms.every((term) => hay.includes(term));
      })
      .slice(0, 200);
  }, [query, tracks]);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
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

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: WIDTH,
        maxHeight: MAX_HEIGHT,
        zIndex: 80,
        background: T.popoverBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${T.rule}`,
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px 6px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        {title ? (
          <div className="mc-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div style={{ fontSize: 12, color: T.ink2, marginBottom: 8, lineHeight: 1.3 }}>
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 8,
            background: T.bgCard,
            border: `1px solid ${T.rule}`,
          }}
        >
          <span style={{ color: T.ink3 }}>
            <Glyph name="search" size={13} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search title or pack…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: 0,
              outline: 0,
              color: T.ink,
              fontSize: 12,
            }}
          />
        </div>
      </div>

      <div className="mc-scroll" style={{ overflowY: "auto", flex: 1 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "20px 14px",
              color: T.ink3,
              fontStyle: "italic",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {tracks.length === 0
              ? "No tracks indexed yet — open a folder first."
              : "No matches."}
          </div>
        ) : (
          filtered.map((t) => {
            const c = findCategory(t.category);
            return (
              <button
                key={t.id}
                onClick={() => onPick(t)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "transparent",
                  color: T.ink,
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.rule}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.bgChip)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: c
                      ? `linear-gradient(140deg, ${c.color}66, ${c.dark})`
                      : T.bgChip,
                    color: T.ink,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Glyph name={c?.glyph ?? "spark"} size={12} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.ink3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.pack || "—"}
                    {t.subcategory ? ` · ${t.subcategory}` : ""}
                  </div>
                </div>
                {t.grade ? (
                  <span
                    className="mc-mono"
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: T.bgChip,
                      color: T.ink2,
                      flexShrink: 0,
                    }}
                  >
                    {t.grade}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
