// Initiative tracker. Add combatants with initiative + condition + optional
// turn-sound track. Sort descending. Cycle turns. On turn advance, the new
// active combatant's turn sound (if any) fires via the soundboard bus.

import { useMemo, useState } from "react";
import type { Track } from "@mc/core";
import { findCategory, Glyph, T } from "@mc/ui";

export type Combatant = {
  id: string;
  name: string;
  initiative: number;
  condition: string;
  /** Current / max hit points + armor class. All optional — older
   *  persisted combatants (pre-0.0.25) simply won't have them. */
  hp?: number;
  maxHp?: number;
  ac?: number;
  turnSoundTrackId?: string;
};

export type InitiativeTrackerProps = {
  combatants: Combatant[];
  currentTurnIdx: number;
  tracksById: ReadonlyMap<string, Track>;
  onChange: (next: Combatant[]) => void;
  onTurnChange: (newIdx: number) => void;
  /**
   * Open the track-picker for combatant `id` at the click position.
   * Library decides what to render (we don't import TrackPickerOverlay
   * here — Library owns the popover so it can sit above the tab content).
   */
  onPickTurnSound: (combatantId: string, x: number, y: number) => void;
};

export function InitiativeTracker({
  combatants,
  currentTurnIdx,
  tracksById,
  onChange,
  onTurnChange,
  onPickTurnSound,
}: InitiativeTrackerProps) {
  const [name, setName] = useState("");
  const [initiative, setInitiative] = useState("");

  const sorted = useMemo(
    () => [...combatants].sort((a, b) => b.initiative - a.initiative),
    [combatants],
  );
  const activeId = sorted[currentTurnIdx]?.id;

  function add() {
    const trimmed = name.trim();
    const init = Number(initiative);
    if (trimmed.length === 0 || !Number.isFinite(init)) return;
    const newComb: Combatant = {
      id: randomId(),
      name: trimmed,
      initiative: init,
      condition: "",
    };
    onChange([...combatants, newComb]);
    setName("");
    setInitiative("");
  }

  function update(id: string, patch: Partial<Combatant>) {
    onChange(combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Numeric stat setter that clears the key when the field is emptied
  // (delete avoids exactOptionalPropertyTypes friction with `undefined`).
  function setStat(id: string, key: "hp" | "maxHp" | "ac", raw: string) {
    const v = raw.trim();
    onChange(
      combatants.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c };
        if (v === "") {
          delete next[key];
          return next;
        }
        const n = Number(v);
        return Number.isFinite(n) ? { ...next, [key]: n } : c;
      }),
    );
  }

  function clearTurnSound(id: string) {
    onChange(
      combatants.map((c) => {
        if (c.id !== id) return c;
        const { turnSoundTrackId: _omit, ...rest } = c;
        void _omit;
        return rest;
      }),
    );
  }

  function remove(id: string) {
    onChange(combatants.filter((c) => c.id !== id));
  }

  function clear() {
    onChange([]);
    onTurnChange(0);
  }

  function next() {
    if (sorted.length === 0) return;
    onTurnChange((currentTurnIdx + 1) % sorted.length);
  }
  function prev() {
    if (sorted.length === 0) return;
    onTurnChange((currentTurnIdx - 1 + sorted.length) % sorted.length);
  }

  return (
    <Panel
      title="Initiative"
      eyebrow={`Tracker · ${sorted.length} in combat`}
      action={
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={prev}
            disabled={sorted.length === 0}
            title="Previous turn"
            style={iconBtnMini(sorted.length === 0)}
          >
            <Glyph name="prev" size={14} />
          </button>
          <button
            onClick={next}
            disabled={sorted.length === 0}
            title="Next turn"
            style={{
              ...iconBtnMini(sorted.length === 0),
              background: sorted.length === 0 ? T.bgChip : T.gold,
              color: sorted.length === 0 ? T.ink3 : "#1a1108",
              border: `1px solid ${sorted.length === 0 ? T.rule : T.goldEdge}`,
            }}
          >
            <Glyph name="next" size={14} />
          </button>
        </div>
      }
    >
      {/* Add-combatant input group — three inputs read as ONE control,
          wrapped in a single bordered shell with thin vertical dividers,
          so the name / init / add affordances stop looking like three
          disconnected widgets. */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        {(() => {
          const disabled = name.trim().length === 0 || initiative === "";
          const groupedInput: React.CSSProperties = {
            background: "transparent",
            border: 0,
            outline: "none",
            color: T.ink,
            fontSize: 13,
            padding: "8px 10px",
            minWidth: 0,
          };
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1px 64px 1px auto",
                alignItems: "stretch",
                background: T.bgChip,
                border: `1px solid ${T.rule}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                placeholder="Combatant name"
                style={groupedInput}
              />
              <div style={{ background: T.rule }} />
              <input
                value={initiative}
                onChange={(e) => setInitiative(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                placeholder="Init"
                inputMode="numeric"
                style={{
                  ...groupedInput,
                  fontFamily: "Geist Mono, monospace",
                  textAlign: "center",
                }}
              />
              <div style={{ background: T.rule }} />
              <button
                onClick={add}
                disabled={disabled}
                title="Add combatant (Enter)"
                style={{
                  padding: "0 14px",
                  background: disabled ? T.bgChip : T.goldSoft,
                  color: disabled ? T.ink3 : T.gold,
                  border: 0,
                  borderLeft: `1px solid ${T.rule}`,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: disabled ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Glyph name="plus" size={13} />
              </button>
            </div>
          );
        })()}
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: "30px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Add combatants to start tracking initiative.
        </div>
      ) : (
        sorted.map((c) => {
          const isActive = c.id === activeId;
          const ts = c.turnSoundTrackId ? tracksById.get(c.turnSoundTrackId) : undefined;
          const tsCat = ts ? findCategory(ts.category) : undefined;
          const down = c.hp != null && c.hp <= 0;
          return (
            <div
              key={c.id}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("application/x-mc-track")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }
              }}
              onDrop={(e) => {
                const trackId = e.dataTransfer.getData("application/x-mc-track");
                if (trackId) {
                  e.preventDefault();
                  update(c.id, { turnSoundTrackId: trackId });
                }
              }}
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${T.rule}`,
                background: down
                  ? "#d9666618"
                  : isActive
                    ? `linear-gradient(90deg, ${T.gold}20, transparent 70%)`
                    : "transparent",
                borderLeft: `3px solid ${
                  down ? "#d96666" : isActive ? T.gold : "transparent"
                }`,
                display: "grid",
                gridTemplateColumns: "30px 1fr 78px 42px 28px 24px",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div
                className="mc-mono"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: isActive ? T.gold : T.ink2,
                  textAlign: "center",
                }}
              >
                {c.initiative}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: down ? "#d98a8a" : isActive ? T.gold : T.ink,
                    textDecoration: down ? "line-through" : "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.name}
                </div>
                <input
                  value={c.condition}
                  onChange={(e) => update(c.id, { condition: e.currentTarget.value })}
                  placeholder="condition (poisoned, prone…)"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: 0,
                    outline: "none",
                    color: T.ink3,
                    fontSize: 10,
                    fontStyle: "italic",
                    marginTop: 1,
                    padding: 0,
                  }}
                />
              </div>
              {/* HP (current / max) */}
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <input
                  value={c.hp ?? ""}
                  onChange={(e) => setStat(c.id, "hp", e.currentTarget.value)}
                  placeholder="HP"
                  inputMode="numeric"
                  title="Current HP"
                  style={statInput(down ? "#d98a8a" : T.ink)}
                />
                <span style={{ color: T.ink3, fontSize: 11 }}>/</span>
                <input
                  value={c.maxHp ?? ""}
                  onChange={(e) => setStat(c.id, "maxHp", e.currentTarget.value)}
                  placeholder="—"
                  inputMode="numeric"
                  title="Max HP"
                  style={statInput(T.ink3)}
                />
              </div>
              {/* AC */}
              <input
                value={c.ac ?? ""}
                onChange={(e) => setStat(c.id, "ac", e.currentTarget.value)}
                placeholder="AC"
                inputMode="numeric"
                title="Armor class"
                style={statInput(T.ink2)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (ts) {
                    // Already assigned — click clears it. Right-click on the
                    // row's broader area is reserved for context menu later.
                    clearTurnSound(c.id);
                  } else {
                    onPickTurnSound(c.id, e.clientX, e.clientY);
                  }
                }}
                onContextMenu={(e) => {
                  // Right-click on the speaker always reopens the picker,
                  // even if a sound is already set — convenient when you
                  // want to swap rather than clear-then-reassign.
                  e.preventDefault();
                  e.stopPropagation();
                  onPickTurnSound(c.id, e.clientX, e.clientY);
                }}
                title={
                  ts
                    ? `Turn sound: ${ts.title}\nClick to clear · right-click to change`
                    : "Click to pick a turn sound for this combatant"
                }
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: ts && tsCat
                    ? `linear-gradient(140deg, ${tsCat.color}66, ${tsCat.dark})`
                    : T.bgChip,
                  border: `1px dashed ${ts ? "transparent" : T.rule}`,
                  color: ts ? T.ink : T.ink3,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <Glyph name={ts && tsCat ? tsCat.glyph : "speaker"} size={13} />
              </button>
              <button
                onClick={() => remove(c.id)}
                title="Remove"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "transparent",
                  color: T.ink3,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.bgChip)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Glyph name="close" size={11} />
              </button>
            </div>
          );
        })
      )}

      {sorted.length > 0 ? (
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: T.ink3,
          }}
        >
          <span>
            Click the speaker on a row to pick its turn sound.
          </span>
          <button
            onClick={clear}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: T.bgChip,
              color: T.ink2,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Clear all
          </button>
        </div>
      ) : null}
    </Panel>
  );
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Compact numeric stat input (HP / AC cells). */
function statInput(color: string): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    padding: "4px 0",
    borderRadius: 6,
    background: T.bgChip,
    border: `1px solid ${T.rule}`,
    color,
    fontSize: 12,
    fontFamily: "Geist Mono, monospace",
    textAlign: "center",
    outline: "none",
  };
}

function iconBtnMini(disabled: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: T.bgChip,
    color: disabled ? T.ink3 : T.ink,
    border: `1px solid ${T.rule}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: T.bgCard,
        border: `1px solid ${T.rule}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${T.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div className="mc-eyebrow" style={{ fontSize: 9 }}>
            {eyebrow}
          </div>
          <div
            className="mc-display"
            style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.05, marginTop: 2 }}
          >
            <span style={{ fontStyle: "italic", color: T.gold }}>{title}</span>
          </div>
        </div>
        {action}
      </div>
      <div className="mc-scroll" style={{ overflowY: "auto", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
