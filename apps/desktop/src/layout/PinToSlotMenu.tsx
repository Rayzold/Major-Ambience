// Floating context menu — right-click a track row. Lets the user
// recategorize, edit the note, pin to a soundboard slot, and set as
// a combatant's turn sound. Renders at the cursor, clamped to viewport.
//
// Name kept as "PinToSlotMenu" for git history continuity; despite the
// name it's now the canonical track-edit popover.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CategoryId, SoundboardSlot, Track } from "@mc/core";
import { CATEGORIES, findCategory, Glyph, T } from "@mc/ui";
import type { Combatant } from "./dm/InitiativeTracker.js";

export type PinToSlotMenuProps = {
  anchor: { x: number; y: number };
  track: Track;
  slots: readonly SoundboardSlot[];
  tracksById: ReadonlyMap<string, Track>;
  combatants: readonly Combatant[];
  onPin: (page: "A" | "B" | "C", slot: number) => void;
  onSetTurnSound: (combatantId: string) => void;
  /**
   * Override the track's category. `subcategory` is set whether or not
   * it has meaning for the category (combat is the only one with
   * subcategories today); pass null to clear.
   */
  onSetCategory: (category: CategoryId, subcategory: string | null) => void;
  /** Save the track's note. Empty string clears it. */
  onSetNote: (note: string) => void;
  onDismiss: () => void;
};

const PAGES = ["A", "B", "C"] as const;
const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function PinToSlotMenu({
  anchor,
  track,
  slots,
  tracksById,
  combatants,
  onPin,
  onSetTurnSound,
  onSetCategory,
  onSetNote,
  onDismiss,
}: PinToSlotMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(anchor);
  // Local note draft so typing doesn't fire onSetNote on every keystroke.
  // Persists on blur / Enter; initial value comes from the track.
  const [noteDraft, setNoteDraft] = useState(track.note ?? "");
  const slotMap = new Map<string, SoundboardSlot>();
  for (const s of slots) slotMap.set(`${s.page}-${s.slot}`, s);
  const trackCat = findCategory(track.category);
  // Subcats only exist on combat today, but the lookup is generic.
  const trackCatSubcats = trackCat?.subcats ?? [];

  function commitNote() {
    const next = noteDraft.trim();
    const current = (track.note ?? "").trim();
    if (next !== current) onSetNote(next);
  }

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
        background: T.popoverBg,
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
            Track
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
            title={track.title}
          >
            {track.title}
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
            {track.pack || "—"}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "8px 12px 10px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div
          className="mc-eyebrow"
          style={{ fontSize: 9, color: T.ink3, padding: "2px 0 6px" }}
        >
          Categorize
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {CATEGORIES.map((c) => {
            const active = c.id === track.category;
            return (
              <button
                key={c.id}
                onClick={() =>
                  onSetCategory(
                    c.id,
                    // Preserve subcategory only if we're staying in the
                    // same category. Switching category drops it because
                    // the value would no longer be meaningful.
                    c.id === track.category ? (track.subcategory ?? null) : null,
                  )
                }
                title={`Move to ${c.name}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: active ? c.color + "22" : T.bgChip,
                  color: active ? c.color : T.ink2,
                  border: `1px solid ${active ? c.color + "55" : "transparent"}`,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Glyph name={c.glyph} size={11} />
                {c.name}
              </button>
            );
          })}
        </div>
        {trackCatSubcats.length > 0 ? (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              alignItems: "center",
            }}
          >
            <span
              className="mc-eyebrow"
              style={{ fontSize: 9, color: T.ink3, marginRight: 4 }}
            >
              {trackCat?.name} sub
            </span>
            <button
              onClick={() => onSetCategory(track.category, null)}
              style={subcatPillStyle(track.subcategory == null, trackCat?.color)}
            >
              none
            </button>
            {trackCatSubcats.map((sub) => {
              const active =
                (track.subcategory ?? "").toLowerCase() === sub.toLowerCase();
              return (
                <button
                  key={sub}
                  onClick={() => onSetCategory(track.category, sub.toLowerCase())}
                  style={subcatPillStyle(active, trackCat?.color)}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        style={{
          padding: "8px 12px 10px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div
          className="mc-eyebrow"
          style={{ fontSize: 9, color: T.ink3, padding: "2px 0 6px" }}
        >
          Notes
        </div>
        <input
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.currentTarget.value)}
          onBlur={commitNote}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitNote();
            }
          }}
          placeholder="Free-form note (saved on blur or Enter)…"
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            background: T.bgCard,
            border: `1px solid ${T.rule}`,
            color: T.ink,
            fontSize: 12,
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          padding: "8px 12px 4px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div
          className="mc-eyebrow"
          style={{ fontSize: 9, color: T.ink3, padding: "2px 0 4px" }}
        >
          Pin to soundboard
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

      {combatants.length > 0 ? (
        <div
          style={{
            borderTop: `1px solid ${T.rule}`,
            padding: "8px 12px 10px",
          }}
        >
          <div
            className="mc-eyebrow"
            style={{ fontSize: 9, color: T.ink3, padding: "4px 4px 6px" }}
          >
            Set as turn sound
          </div>
          {[...combatants]
            .sort((a, b) => b.initiative - a.initiative)
            .map((c) => {
              const existing = c.turnSoundTrackId
                ? tracksById.get(c.turnSoundTrackId)
                : undefined;
              const existingCat = existing ? findCategory(existing.category) : undefined;
              return (
                <button
                  key={c.id}
                  onClick={() => onSetTurnSound(c.id)}
                  title={
                    existing
                      ? `Replace turn sound (currently: ${existing.title})`
                      : `Set ${track.title} as ${c.name}'s turn sound`
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "transparent",
                    color: T.ink2,
                    fontSize: 12,
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
                      width: 22,
                      color: T.ink3,
                      fontSize: 11,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {c.initiative}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: T.ink,
                    }}
                  >
                    {c.name}
                  </span>
                  {existing && existingCat ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        color: existingCat.color,
                        flexShrink: 0,
                      }}
                    >
                      <Glyph name={existingCat.glyph} size={11} />
                      <span
                        style={{
                          maxWidth: 120,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {existing.title}
                      </span>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        color: T.ink3,
                        fontStyle: "italic",
                        flexShrink: 0,
                      }}
                    >
                      empty
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}

function subcatPillStyle(active: boolean, accent: string | undefined): React.CSSProperties {
  const tint = accent ?? T.gold;
  return {
    padding: "3px 8px",
    borderRadius: 999,
    background: active ? tint + "22" : T.bgChip,
    color: active ? tint : T.ink2,
    border: `1px solid ${active ? tint + "55" : "transparent"}`,
    fontSize: 10,
    fontWeight: 500,
    cursor: "pointer",
    textTransform: "capitalize",
  };
}
