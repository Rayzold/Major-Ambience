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
  turnSoundTrackId?: string;
};

export type InitiativeTrackerProps = {
  combatants: Combatant[];
  currentTurnIdx: number;
  tracksById: ReadonlyMap<string, Track>;
  onChange: (next: Combatant[]) => void;
  onTurnChange: (newIdx: number) => void;
};

export function InitiativeTracker({
  combatants,
  currentTurnIdx,
  tracksById,
  onChange,
  onTurnChange,
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
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
          display: "grid",
          gridTemplateColumns: "1fr 64px auto",
          gap: 6,
          alignItems: "center",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Combatant name"
          style={inputStyle}
        />
        <input
          value={initiative}
          onChange={(e) => setInitiative(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Init"
          inputMode="numeric"
          style={{ ...inputStyle, fontFamily: "Geist Mono, monospace", textAlign: "center" }}
        />
        <button
          onClick={add}
          disabled={name.trim().length === 0 || initiative === ""}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background:
              name.trim().length === 0 || initiative === "" ? T.bgChip : T.goldSoft,
            color: name.trim().length === 0 || initiative === "" ? T.ink3 : T.gold,
            border: `1px solid ${
              name.trim().length === 0 || initiative === "" ? T.rule : T.goldEdge
            }`,
            fontSize: 12,
            fontWeight: 500,
            cursor:
              name.trim().length === 0 || initiative === "" ? "not-allowed" : "pointer",
          }}
        >
          <Glyph name="plus" size={12} />
        </button>
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
                background: isActive
                  ? `linear-gradient(90deg, ${T.gold}20, transparent 70%)`
                  : "transparent",
                borderLeft: `3px solid ${isActive ? T.gold : "transparent"}`,
                display: "grid",
                gridTemplateColumns: "32px 1fr auto auto",
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
                    color: isActive ? T.gold : T.ink,
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
              <div
                title={
                  ts
                    ? `Turn sound: ${ts.title}`
                    : "Drag a track from the Library onto this row to assign a turn sound"
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
                  cursor: ts ? "pointer" : "default",
                  position: "relative",
                }}
                onClick={ts ? () => clearTurnSound(c.id) : undefined}
              >
                <Glyph name={ts && tsCat ? tsCat.glyph : "speaker"} size={13} />
              </div>
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
            Drop a track onto a row to assign its turn sound.
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

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  background: T.bgChip,
  border: `1px solid ${T.rule}`,
  color: T.ink,
  fontSize: 13,
  outline: "none",
  minWidth: 0,
};

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
