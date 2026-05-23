// DM Toolkit tab — three tools (Names · Dice · Initiative) in their own
// sub-tabs so each gets the full pane width. Earlier 3-column layout
// squashed combatant names (and dice modifiers) on standard 1280-wide
// windows; tabbing trades simultaneity for legibility.

import { useState } from "react";
import type { Track } from "@mc/core";
import { Glyph, T } from "@mc/ui";
import { DiceRoller } from "./dm/DiceRoller.js";
import { NameGenerator } from "./dm/NameGenerator.js";
import { InitiativeTracker } from "./dm/InitiativeTracker.js";
import type { Combatant } from "./dm/InitiativeTracker.js";
import type { RolledName } from "./dm/NameGenerator.js";
import type { RollResult } from "../lib/dm-dice.js";

type DmTool = "initiative" | "names" | "dice";

export type DesktopDmToolkitProps = {
  nameHistory: RolledName[];
  onNameHistory: (next: RolledName[]) => void;
  rollHistory: RollResult[];
  onRollHistory: (next: RollResult[]) => void;
  combatants: Combatant[];
  currentTurnIdx: number;
  tracksById: ReadonlyMap<string, Track>;
  onCombatantsChange: (next: Combatant[]) => void;
  onTurnChange: (newIdx: number) => void;
  /** Open the track-picker for combatant `id` at the click position. */
  onPickTurnSound: (combatantId: string, x: number, y: number) => void;
};

const TOOLS: Array<{ id: DmTool; label: string; glyph: string; eyebrow: string }> = [
  { id: "initiative", label: "Initiative", glyph: "swords", eyebrow: "Tracker" },
  { id: "names", label: "Names", glyph: "mask", eyebrow: "NPCs" },
  { id: "dice", label: "Dice", glyph: "dice", eyebrow: "Roller" },
];

export function DesktopDmToolkit({
  nameHistory,
  onNameHistory,
  rollHistory,
  onRollHistory,
  combatants,
  currentTurnIdx,
  tracksById,
  onCombatantsChange,
  onTurnChange,
  onPickTurnSound,
}: DesktopDmToolkitProps) {
  // Default to Initiative — most useful at-the-table, and the dynamic
  // counter ("· 2 in combat") changes most often, so the tab badge
  // doubles as live status when the user is on another tool.
  const [tool, setTool] = useState<DmTool>("initiative");

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "20px 24px 4px" }}>
        <div className="mc-eyebrow">Add-on</div>
        <h1
          className="mc-display"
          style={{
            margin: "4px 0 4px",
            fontSize: 30,
            lineHeight: 1.05,
            fontWeight: 600,
            color: T.ink,
          }}
        >
          DM <span style={{ fontStyle: "italic", color: T.gold }}>Toolkit</span>
        </h1>
        <div style={{ fontSize: 12, color: T.ink2, maxWidth: 700 }}>
          Names, dice, and initiative — without leaving Major Ambience. Drop a
          track from the Library onto a combatant to assign a turn sound that
          fires automatically when it&apos;s their turn.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 24px 4px",
        }}
      >
        {TOOLS.map((t) => {
          const active = tool === t.id;
          const badge = t.id === "initiative" ? combatants.length : null;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 9,
                background: active ? T.gold + "26" : T.bgChip,
                color: active ? T.gold : T.ink2,
                fontSize: 13,
                fontWeight: 500,
                border: `1px solid ${active ? T.goldEdge : "transparent"}`,
              }}
            >
              <Glyph name={t.glyph} size={14} stroke={active ? 1.9 : 1.5} />
              {t.label}
              {badge && badge > 0 ? (
                <span
                  className="mc-mono"
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: active ? T.gold + "40" : T.bgCard,
                    color: active ? T.gold : T.ink3,
                  }}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: "8px 24px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {tool === "initiative" ? (
          <InitiativeTracker
            combatants={combatants}
            currentTurnIdx={currentTurnIdx}
            tracksById={tracksById}
            onChange={onCombatantsChange}
            onTurnChange={onTurnChange}
            onPickTurnSound={onPickTurnSound}
          />
        ) : tool === "names" ? (
          <NameGenerator history={nameHistory} onHistory={onNameHistory} />
        ) : (
          <DiceRoller history={rollHistory} onHistory={onRollHistory} />
        )}
      </div>
    </div>
  );
}
