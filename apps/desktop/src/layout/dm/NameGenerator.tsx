// Race-aware NPC name generator panel.

import { useMemo, useState } from "react";
import { Glyph, T } from "@mc/ui";
import {
  rollNameAvoiding,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  type Race,
  type Gender,
} from "@mc/core/dm";

export type RolledName = {
  first: string;
  last: string;
  race: Exclude<Race, "any">;
  gender?: Exclude<Gender, "any">;
  rolledAt: number;
};

export type NameGeneratorProps = {
  history: RolledName[];
  onHistory: (next: RolledName[]) => void;
};

const HISTORY_LIMIT = 30;
const RACE_GLYPH: Record<Exclude<Race, "any">, string> = {
  human: "compass",
  elf: "leaf",
  dwarf: "swords",
  orc: "skull",
  halfling: "mug",
};

export function NameGenerator({ history, onHistory }: NameGeneratorProps) {
  const [race, setRace] = useState<Race>("any");
  const [gender, setGender] = useState<Gender>("any");

  // Anti-repeat set — every full name we've already rolled this session
  // is off-limits for the next roll. Caps practical "variety" at
  // (first count × last count) per race; rolling a 31st name after
  // already exhausting 30 will reuse the oldest by design.
  const recentSet = useMemo(
    () =>
      new Set(
        history.map((n) => `${n.first}${n.last ? ` ${n.last}` : ""}`.trim()),
      ),
    [history],
  );

  function handleRoll() {
    const next = rollNameAvoiding(race, gender, recentSet);
    const rolled: RolledName = { ...next, rolledAt: Date.now() };
    onHistory([rolled, ...history].slice(0, HISTORY_LIMIT));
  }

  function copy(name: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(name);
    }
  }

  return (
    <Panel
      title="Names"
      eyebrow="NPC generator"
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
          <Glyph name="spark" size={13} /> Roll name
        </button>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "10px 14px 14px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {GENDER_OPTIONS.map((opt) => {
            const active = opt.id === gender;
            return (
              <button
                key={opt.id}
                onClick={() => setGender(opt.id)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: active ? T.goldSoft : T.bgChip,
                  color: active ? T.gold : T.ink2,
                  border: `1px solid ${active ? T.goldEdge : T.rule}`,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {RACE_OPTIONS.map((opt) => {
            const active = opt.id === race;
            return (
              <button
                key={opt.id}
                onClick={() => setRace(opt.id)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: active ? T.goldSoft : T.bgChip,
                  color: active ? T.gold : T.ink2,
                  border: `1px solid ${active ? T.goldEdge : T.rule}`,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
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
          Roll a name to begin.
        </div>
      ) : (
        history.map((n, i) => {
          const full = `${n.first}${n.last ? ` ${n.last}` : ""}`;
          const glyph = RACE_GLYPH[n.race];
          const isLatest = i === 0;
          return (
            <button
              key={`${n.rolledAt}-${i}`}
              onClick={() => copy(full)}
              title="Click to copy"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 14px",
                background: isLatest ? T.goldSoft : "transparent",
                borderBottom: `1px solid ${T.rule}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                color: T.ink,
              }}
              onMouseEnter={(e) => {
                if (!isLatest) e.currentTarget.style.background = T.bgChip;
              }}
              onMouseLeave={(e) => {
                if (!isLatest) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  color: isLatest ? T.gold : T.ink3,
                  flexShrink: 0,
                }}
              >
                <Glyph name={glyph} size={14} />
              </span>
              <span
                className="mc-display"
                style={{
                  flex: 1,
                  fontSize: isLatest ? 18 : 14,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: isLatest ? T.ink : T.ink2,
                }}
              >
                {full}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: T.ink3,
                  textTransform: "uppercase",
                  letterSpacing: 0.12,
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                {n.race}
              </span>
            </button>
          );
        })
      )}
    </Panel>
  );
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
