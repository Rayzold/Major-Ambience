// Random encounter tables for the DM Toolkit.
//
// Each table is a list of entries. Rolling picks one entry at random,
// highlights it, and — if the entry is bound to a track or a category —
// fires that audio through the main playback engine (single track) or a
// weighted shuffle (category). This is the IDEAS.md "random encounter
// table": the roll outcome is tied to Major Ambience's own library, the
// same way Initiative's turn sounds are.

import { useMemo, useState } from "react";
import type { CategoryId, Track } from "@mc/core";
import { CATEGORIES, findCategory, Glyph, T } from "@mc/ui";

export type EncounterEntry = {
  id: string;
  label: string;
  /** Bound exact track — rolling this entry plays it (single shot). */
  trackId?: string;
  /** Bound category — rolling this entry weighted-shuffles + plays it. */
  categoryId?: CategoryId;
};

export type EncounterTable = {
  id: string;
  name: string;
  entries: EncounterEntry[];
};

export type EncounterTablesProps = {
  tables: EncounterTable[];
  onTables: (next: EncounterTable[]) => void;
  tracksById: ReadonlyMap<string, Track>;
  /** Open the track picker to bind a track to (tableId, entryId). */
  onPickEntryTrack: (tableId: string, entryId: string, x: number, y: number) => void;
  /** Fire a bound track (single play). */
  onPlayTrack: (trackId: string) => void;
  /** Fire a bound category (weighted shuffle). */
  onPlayCategory: (categoryId: CategoryId) => void;
};

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function newTable(): EncounterTable {
  // Seed one blank entry so the editor is immediately usable.
  return { id: rid(), name: "New table", entries: [{ id: rid(), label: "" }] };
}

export function EncounterTables({
  tables,
  onTables,
  tracksById,
  onPickEntryTrack,
  onPlayTrack,
  onPlayCategory,
}: EncounterTablesProps) {
  const [activeId, setActiveId] = useState<string | null>(tables[0]?.id ?? null);
  // Last rolled entry (per session) — drives the highlight + result banner.
  const [rolled, setRolled] = useState<{ entryId: string; at: number } | null>(null);

  const active = useMemo(
    () => tables.find((t) => t.id === activeId) ?? tables[0] ?? null,
    [tables, activeId],
  );

  // ── Table ops ──────────────────────────────────────────────────────────
  function addTable() {
    const t = newTable();
    onTables([...tables, t]);
    setActiveId(t.id);
    setRolled(null);
  }

  function renameTable(name: string) {
    if (!active) return;
    onTables(tables.map((t) => (t.id === active.id ? { ...t, name } : t)));
  }

  function deleteTable() {
    if (!active) return;
    const remaining = tables.filter((t) => t.id !== active.id);
    onTables(remaining);
    setActiveId(remaining[0]?.id ?? null);
    setRolled(null);
  }

  // ── Entry ops ──────────────────────────────────────────────────────────
  function patchEntries(fn: (entries: EncounterEntry[]) => EncounterEntry[]) {
    if (!active) return;
    onTables(
      tables.map((t) => (t.id === active.id ? { ...t, entries: fn(t.entries) } : t)),
    );
  }

  function addEntry() {
    patchEntries((es) => [...es, { id: rid(), label: "" }]);
  }

  function setLabel(entryId: string, label: string) {
    patchEntries((es) => es.map((e) => (e.id === entryId ? { ...e, label } : e)));
  }

  function setCategory(entryId: string, categoryId: CategoryId | "") {
    patchEntries((es) =>
      es.map((e) => {
        if (e.id !== entryId) return e;
        // Binding is exclusive — category clears any bound track.
        const { trackId: _t, categoryId: _c, ...rest } = e;
        void _t;
        void _c;
        return categoryId ? { ...rest, categoryId } : rest;
      }),
    );
  }

  function clearBinding(entryId: string) {
    patchEntries((es) =>
      es.map((e) => {
        if (e.id !== entryId) return e;
        const { trackId: _t, categoryId: _c, ...rest } = e;
        void _t;
        void _c;
        return rest;
      }),
    );
  }

  function deleteEntry(entryId: string) {
    patchEntries((es) => es.filter((e) => e.id !== entryId));
  }

  // ── Roll ───────────────────────────────────────────────────────────────
  function roll() {
    if (!active) return;
    const pool = active.entries.filter((e) => e.label.trim().length > 0);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    setRolled({ entryId: pick.id, at: Date.now() });
    if (pick.trackId) onPlayTrack(pick.trackId);
    else if (pick.categoryId) onPlayCategory(pick.categoryId);
  }

  const rollableCount = active?.entries.filter((e) => e.label.trim().length > 0).length ?? 0;
  const rolledEntry = active?.entries.find((e) => e.id === rolled?.entryId) ?? null;

  return (
    <Panel
      title="Encounters"
      eyebrow="Random tables"
      action={
        <button
          onClick={roll}
          disabled={rollableCount === 0}
          title={
            rollableCount === 0
              ? "Add at least one entry to roll"
              : `Roll on ${active?.name ?? "table"}`
          }
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: rollableCount === 0 ? T.bgChip : T.gold,
            color: rollableCount === 0 ? T.ink3 : "#1a1108",
            fontWeight: 600,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: rollableCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Glyph name="dice" size={13} /> Roll
        </button>
      }
    >
      {/* Table selector */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        {tables.map((t) => {
          const isActive = t.id === active?.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveId(t.id);
                setRolled(null);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: isActive ? T.goldSoft : T.bgChip,
                color: isActive ? T.gold : T.ink2,
                border: `1px solid ${isActive ? T.goldEdge : T.rule}`,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                maxWidth: 160,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t.name || "Untitled"}
            </button>
          );
        })}
        <button
          onClick={addTable}
          title="New table"
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            background: "transparent",
            color: T.ink3,
            border: `1px dashed ${T.rule}`,
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Glyph name="plus" size={11} /> Table
        </button>
      </div>

      {active === null ? (
        <div
          style={{
            padding: "30px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Create a table to begin. Add entries, bind each to a track or a
          category, then Roll.
        </div>
      ) : (
        <>
          {/* Active table name + delete */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderBottom: `1px solid ${T.rule}`,
            }}
          >
            <input
              value={active.name}
              onChange={(e) => renameTable(e.target.value)}
              placeholder="Table name"
              style={{
                flex: 1,
                background: T.bgChip,
                border: `1px solid ${T.rule}`,
                borderRadius: 7,
                padding: "6px 10px",
                color: T.ink,
                fontSize: 13,
                fontWeight: 600,
              }}
            />
            <button
              onClick={deleteTable}
              title="Delete this table"
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "transparent",
                color: T.ink3,
                border: `1px solid ${T.rule}`,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Glyph name="close" size={13} />
            </button>
          </div>

          {/* Roll result banner */}
          {rolledEntry && rolledEntry.label.trim().length > 0 ? (
            <div
              style={{
                padding: "12px 14px",
                background: T.goldSoft,
                borderBottom: `1px solid ${T.rule}`,
              }}
            >
              <div className="mc-eyebrow" style={{ fontSize: 9, color: T.gold }}>
                Rolled
              </div>
              <div
                className="mc-display"
                style={{ fontSize: 18, fontWeight: 600, color: T.ink, marginTop: 2 }}
              >
                {rolledEntry.label}
              </div>
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
                {bindingLabel(rolledEntry, tracksById)}
              </div>
            </div>
          ) : null}

          {/* Entries */}
          {active.entries.map((entry) => {
            const isRolled = entry.id === rolled?.entryId;
            const boundTrack = entry.trackId ? tracksById.get(entry.trackId) : undefined;
            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderBottom: `1px solid ${T.rule}`,
                  background: isRolled ? T.goldSoft : "transparent",
                }}
              >
                <input
                  value={entry.label}
                  onChange={(e) => setLabel(entry.id, e.target.value)}
                  placeholder="Entry…"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: T.bgChip,
                    border: `1px solid ${T.rule}`,
                    borderRadius: 6,
                    padding: "5px 8px",
                    color: T.ink,
                    fontSize: 12,
                  }}
                />

                {/* Category bind */}
                <select
                  value={entry.categoryId ?? ""}
                  onChange={(e) => setCategory(entry.id, e.target.value as CategoryId | "")}
                  title="Bind a category (weighted shuffle on roll)"
                  style={{
                    background: entry.categoryId ? T.goldSoft : T.bgChip,
                    border: `1px solid ${entry.categoryId ? T.goldEdge : T.rule}`,
                    borderRadius: 6,
                    padding: "5px 6px",
                    color: entry.categoryId ? T.gold : T.ink3,
                    fontSize: 11,
                    maxWidth: 92,
                  }}
                >
                  <option value="">Category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Track bind */}
                <button
                  onClick={(e) =>
                    onPickEntryTrack(active.id, entry.id, e.clientX, e.clientY)
                  }
                  title={boundTrack ? `Bound: ${boundTrack.title}` : "Bind a specific track"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: entry.trackId ? T.goldSoft : T.bgChip,
                    border: `1px solid ${entry.trackId ? T.goldEdge : T.rule}`,
                    color: entry.trackId ? T.gold : T.ink3,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Glyph name="wave" size={13} />
                </button>

                {/* Clear binding (only when bound) */}
                {entry.trackId || entry.categoryId ? (
                  <button
                    onClick={() => clearBinding(entry.id)}
                    title="Clear audio binding"
                    style={{
                      height: 28,
                      padding: "0 6px",
                      background: "transparent",
                      border: "none",
                      color: T.ink3,
                      cursor: "pointer",
                      fontSize: 10,
                      flexShrink: 0,
                    }}
                  >
                    clear
                  </button>
                ) : null}

                {/* Delete entry */}
                <button
                  onClick={() => deleteEntry(entry.id)}
                  title="Delete entry"
                  style={{
                    width: 24,
                    height: 28,
                    background: "transparent",
                    border: "none",
                    color: T.ink3,
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Glyph name="close" size={12} />
                </button>
              </div>
            );
          })}

          {/* Add entry */}
          <button
            onClick={addEntry}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              background: "transparent",
              border: "none",
              color: T.ink3,
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Glyph name="plus" size={12} /> Add entry
          </button>
        </>
      )}
    </Panel>
  );
}

/** Human-readable description of an entry's audio binding. */
function bindingLabel(entry: EncounterEntry, tracksById: ReadonlyMap<string, Track>): string {
  if (entry.trackId) {
    const t = tracksById.get(entry.trackId);
    return t ? `♪ ${t.title}` : "♪ (track missing)";
  }
  if (entry.categoryId) {
    const c = findCategory(entry.categoryId);
    return c ? `Shuffling ${c.name}` : "Shuffling category";
  }
  return "No audio bound";
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
