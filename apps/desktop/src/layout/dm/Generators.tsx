// Generators tab — houses all the standalone roll tables (loot, NPC,
// tavern, settlement, weather, crit/fumble, wild magic, trap, quest) under
// one tab with a selector. Pure data + a Generate button + a session
// history; no audio, no persistence. Curated tables — read-only.

import { useMemo, useState } from "react";
import { Glyph, T } from "@mc/ui";
import {
  GENERATORS,
  resultToText,
  rollGenerator,
  type GeneratorResult,
} from "@mc/core/dm";

const HISTORY_LIMIT = 20;

export function Generators() {
  const [activeId, setActiveId] = useState<string>(GENERATORS[0]!.id);
  const [history, setHistory] = useState<GeneratorResult[]>([]);

  const active = useMemo(
    () => GENERATORS.find((g) => g.id === activeId) ?? GENERATORS[0]!,
    [activeId],
  );

  function generate() {
    const result = rollGenerator(active);
    setHistory((prev) => [result, ...prev].slice(0, HISTORY_LIMIT));
  }

  function copy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }

  // Only show history for the active generator so switching tables doesn't
  // mix loot rolls into the tavern list.
  const visible = history.filter((r) => r.generatorId === active.id);

  return (
    <Panel
      title="Generators"
      eyebrow="Roll tables"
      action={
        <button
          onClick={generate}
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
          <Glyph name="dice" size={13} /> Generate
        </button>
      }
    >
      {/* Generator selector */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        {GENERATORS.map((g) => {
          const isActive = g.id === active.id;
          return (
            <button
              key={g.id}
              onClick={() => setActiveId(g.id)}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: isActive ? T.goldSoft : T.bgChip,
                color: isActive ? T.gold : T.ink2,
                border: `1px solid ${isActive ? T.goldEdge : T.rule}`,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {/* Active generator blurb */}
      <div
        style={{
          padding: "8px 14px",
          fontSize: 11,
          color: T.ink3,
          fontStyle: "italic",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        {active.blurb}
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            padding: "30px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Hit Generate to roll on the {active.name} table.
        </div>
      ) : (
        visible.map((r, i) => {
          const isLatest = i === 0;
          const single = r.parts.length === 1;
          return (
            <button
              key={r.at}
              onClick={() => copy(resultToText(r))}
              title="Click to copy"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: isLatest ? T.goldSoft : "transparent",
                borderBottom: `1px solid ${T.rule}`,
                cursor: "pointer",
                color: T.ink,
                display: "block",
              }}
              onMouseEnter={(e) => {
                if (!isLatest) e.currentTarget.style.background = T.bgChip;
              }}
              onMouseLeave={(e) => {
                if (!isLatest) e.currentTarget.style.background = "transparent";
              }}
            >
              {single ? (
                <div
                  className={isLatest ? "mc-display" : undefined}
                  style={{
                    fontSize: isLatest ? 16 : 13,
                    fontWeight: isLatest ? 600 : 500,
                    color: isLatest ? T.ink : T.ink2,
                    lineHeight: 1.3,
                  }}
                >
                  {r.parts[0]!.value}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {r.parts.map((p, j) => (
                    <div
                      key={j}
                      style={{ display: "flex", gap: 8, alignItems: "baseline" }}
                    >
                      <span
                        className="mc-mono"
                        style={{
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          color: T.ink3,
                          minWidth: 58,
                          flexShrink: 0,
                        }}
                      >
                        {p.label}
                      </span>
                      <span
                        style={{
                          fontSize: isLatest ? 14 : 12,
                          fontWeight: isLatest ? 600 : 500,
                          color: isLatest ? T.ink : T.ink2,
                          lineHeight: 1.3,
                        }}
                      >
                        {p.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
