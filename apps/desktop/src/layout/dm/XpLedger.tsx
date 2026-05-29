// XP / loot ledger for the DM Toolkit.
//
// A running party XP total with a per-player split, plus a simple loot
// list. Fully controlled by the parent (persists via dm_xp_ledger).

import { useState } from "react";
import { Glyph, T } from "@mc/ui";

export type LootEntry = { id: string; text: string };
export type XpLedgerState = {
  xp: number;
  partySize: number;
  loot: LootEntry[];
};

export const EMPTY_LEDGER: XpLedgerState = { xp: 0, partySize: 4, loot: [] };

export type XpLedgerProps = {
  ledger: XpLedgerState;
  onLedger: (next: XpLedgerState) => void;
};

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function XpLedger({ ledger, onLedger }: XpLedgerProps) {
  const [xpInput, setXpInput] = useState("");
  const [lootInput, setLootInput] = useState("");

  const size = Math.max(1, ledger.partySize || 1);
  const perPlayer = Math.floor((ledger.xp || 0) / size);

  function addXp() {
    const n = Number(xpInput);
    if (!Number.isFinite(n) || n === 0) return;
    onLedger({ ...ledger, xp: Math.max(0, (ledger.xp || 0) + n) });
    setXpInput("");
  }

  function setPartySize(raw: string) {
    const n = Math.max(1, Math.floor(Number(raw) || 1));
    onLedger({ ...ledger, partySize: n });
  }

  function resetXp() {
    onLedger({ ...ledger, xp: 0 });
  }

  function addLoot() {
    const text = lootInput.trim();
    if (!text) return;
    onLedger({ ...ledger, loot: [{ id: rid(), text }, ...ledger.loot] });
    setLootInput("");
  }

  function editLoot(id: string, text: string) {
    onLedger({
      ...ledger,
      loot: ledger.loot.map((l) => (l.id === id ? { ...l, text } : l)),
    });
  }

  function removeLoot(id: string) {
    onLedger({ ...ledger, loot: ledger.loot.filter((l) => l.id !== id) });
  }

  return (
    <Panel title="Ledger" eyebrow="XP & loot">
      {/* XP total */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.rule}` }}>
        <div className="mc-eyebrow" style={{ fontSize: 9 }}>
          Party XP
        </div>
        <div
          className="mc-display"
          style={{
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1,
            color: T.ink,
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {(ledger.xp || 0).toLocaleString()}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 8,
            fontSize: 12,
            color: T.ink2,
          }}
        >
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: T.ink3 }}>Party</span>
            <input
              value={ledger.partySize}
              onChange={(e) => setPartySize(e.currentTarget.value)}
              inputMode="numeric"
              style={{ ...miniInput, width: 44 }}
            />
          </label>
          <span style={{ color: T.ink3 }}>
            ={" "}
            <span style={{ color: T.gold, fontWeight: 600 }}>
              {perPlayer.toLocaleString()}
            </span>{" "}
            / player
          </span>
        </div>

        {/* Add XP */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <input
            value={xpInput}
            onChange={(e) => setXpInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addXp();
            }}
            placeholder="Add XP (e.g. 450, or -100 to correct)"
            inputMode="numeric"
            style={{ ...miniInput, flex: 1, textAlign: "left", fontFamily: "inherit" }}
          />
          <button
            onClick={addXp}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: T.gold,
              color: "#1a1108",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            onClick={resetXp}
            title="Reset XP to 0"
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: T.bgChip,
              color: T.ink3,
              border: `1px solid ${T.rule}`,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loot */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.rule}` }}>
        <div className="mc-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>
          Loot
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={lootInput}
            onChange={(e) => setLootInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLoot();
            }}
            placeholder="Add an item, coin haul, or reward…"
            style={{ ...miniInput, flex: 1, textAlign: "left", fontFamily: "inherit" }}
          />
          <button
            onClick={addLoot}
            disabled={lootInput.trim().length === 0}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: lootInput.trim().length === 0 ? T.bgChip : T.goldSoft,
              color: lootInput.trim().length === 0 ? T.ink3 : T.gold,
              border: `1px solid ${lootInput.trim().length === 0 ? T.rule : T.goldEdge}`,
              fontSize: 12,
              cursor: lootInput.trim().length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Glyph name="plus" size={12} />
          </button>
        </div>
      </div>

      {ledger.loot.length === 0 ? (
        <div
          style={{
            padding: "24px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          No loot logged yet.
        </div>
      ) : (
        ledger.loot.map((l) => (
          <div
            key={l.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderBottom: `1px solid ${T.rule}`,
            }}
          >
            <span style={{ color: T.gold, flexShrink: 0 }}>
              <Glyph name="star" size={13} />
            </span>
            <input
              value={l.text}
              onChange={(e) => editLoot(l.id, e.currentTarget.value)}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: 0,
                outline: "none",
                color: T.ink,
                fontSize: 13,
              }}
            />
            <button
              onClick={() => removeLoot(l.id)}
              title="Remove"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "transparent",
                color: T.ink3,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Glyph name="close" size={11} />
            </button>
          </div>
        ))
      )}
    </Panel>
  );
}

const miniInput: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 8,
  background: T.bgChip,
  border: `1px solid ${T.rule}`,
  color: T.ink,
  fontSize: 12,
  fontFamily: "Geist Mono, monospace",
  textAlign: "center",
  outline: "none",
  minWidth: 0,
};

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
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
        }}
      >
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
      <div className="mc-scroll" style={{ overflowY: "auto", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
