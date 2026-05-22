// Dice roller panel — preset polyhedrals, modifier, adv/dis on d20, history.

import { useState } from "react";
import { Glyph, T } from "@mc/ui";
import {
  DICE,
  formatSpec,
  rollDice,
  type Advantage,
  type Die,
  type RollResult,
  type RollSpec,
} from "../../lib/dm-dice.js";

export type DiceRollerProps = {
  history: RollResult[];
  onHistory: (next: RollResult[]) => void;
};

const HISTORY_LIMIT = 30;

export function DiceRoller({ history, onHistory }: DiceRollerProps) {
  const [die, setDie] = useState<Die>(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [advantage, setAdvantage] = useState<Advantage>("none");

  function handleRoll() {
    const spec: RollSpec = { die, count, modifier, advantage };
    const result = rollDice(spec);
    onHistory([result, ...history].slice(0, HISTORY_LIMIT));
  }

  return (
    <Panel
      title="Dice"
      eyebrow="Roller"
      action={
        <button
          onClick={handleRoll}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: T.gold,
            color: "#1a1108",
            fontWeight: 600,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <Glyph name="dice" size={13} /> Roll {formatSpec({ die, count, modifier, advantage })}
        </button>
      }
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${T.rule}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {DICE.map((d) => {
          const active = d === die;
          return (
            <button
              key={d}
              onClick={() => setDie(d)}
              style={{
                width: 44,
                height: 36,
                borderRadius: 8,
                background: active ? T.goldSoft : T.bgChip,
                color: active ? T.gold : T.ink2,
                border: `1px solid ${active ? T.goldEdge : T.rule}`,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Geist Mono, monospace",
                cursor: "pointer",
              }}
            >
              d{d}
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${T.rule}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="mc-eyebrow" style={{ fontSize: 9 }}>
            Count
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(20, Number(e.currentTarget.value) || 1)))
            }
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="mc-eyebrow" style={{ fontSize: 9 }}>
            Modifier
          </span>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(Number(e.currentTarget.value) || 0)}
            style={inputStyle}
          />
        </label>
        {die === 20 ? (
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
            {(["none", "advantage", "disadvantage"] as Advantage[]).map((a) => {
              const active = a === advantage;
              return (
                <button
                  key={a}
                  onClick={() => setAdvantage(a)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: active ? T.goldSoft : T.bgChip,
                    color: active ? T.gold : T.ink2,
                    border: `1px solid ${active ? T.goldEdge : T.rule}`,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {a === "none" ? "Straight" : a}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div
          style={{
            padding: "30px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          No rolls yet.
        </div>
      ) : (
        history.map((r, i) => <DiceRollRow key={`${r.rolledAt}-${i}`} result={r} latest={i === 0} />)
      )}
    </Panel>
  );
}

function DiceRollRow({ result, latest }: { result: RollResult; latest: boolean }) {
  const accent =
    result.crit === "nat20"
      ? "#6fbf7a"
      : result.crit === "nat1"
        ? "#d96666"
        : latest
          ? T.gold
          : T.ink2;
  return (
    <div
      style={{
        padding: "9px 14px",
        borderBottom: `1px solid ${T.rule}`,
        background: latest ? T.goldSoft : "transparent",
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="mc-mono" style={{ fontSize: 11, color: T.ink3 }}>
          {formatSpec(result.spec)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.ink2,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {result.rolls
            .map((v, idx) => {
              const kept = result.kept.includes(idx);
              return kept ? `${v}` : `(${v})`;
            })
            .join(" + ")}
          {result.spec.modifier !== 0
            ? ` ${result.spec.modifier > 0 ? "+" : "−"} ${Math.abs(result.spec.modifier)}`
            : ""}
        </div>
      </div>
      <div
        className="mc-display"
        style={{
          fontSize: latest ? 28 : 22,
          fontWeight: 600,
          color: accent,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {result.total}
      </div>
      {result.crit ? (
        <span
          style={{
            fontSize: 9,
            fontFamily: "Geist Mono, monospace",
            color: accent,
            border: `1px solid ${accent}66`,
            background: `${accent}1a`,
            padding: "2px 5px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: 0.12,
          }}
        >
          {result.crit === "nat20" ? "Nat 20" : "Nat 1"}
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  background: T.bgChip,
  border: `1px solid ${T.rule}`,
  color: T.ink,
  fontSize: 13,
  outline: "none",
  fontFamily: "Geist Mono, monospace",
};

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
