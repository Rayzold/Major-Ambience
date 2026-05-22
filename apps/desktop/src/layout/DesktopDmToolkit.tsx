// DM Toolkit tab — 3-column layout: Names · Dice · Initiative.

import type { Track } from "@mc/core";
import { T } from "@mc/ui";
import { DiceRoller } from "./dm/DiceRoller.js";
import { NameGenerator } from "./dm/NameGenerator.js";
import { InitiativeTracker } from "./dm/InitiativeTracker.js";
import type { Combatant } from "./dm/InitiativeTracker.js";
import type { RolledName } from "./dm/NameGenerator.js";
import type { RollResult } from "../lib/dm-dice.js";

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
};

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
}: DesktopDmToolkitProps) {
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
          flex: 1,
          minHeight: 0,
          padding: "12px 24px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.1fr",
          gap: 14,
        }}
      >
        <NameGenerator history={nameHistory} onHistory={onNameHistory} />
        <DiceRoller history={rollHistory} onHistory={onRollHistory} />
        <InitiativeTracker
          combatants={combatants}
          currentTurnIdx={currentTurnIdx}
          tracksById={tracksById}
          onChange={onCombatantsChange}
          onTurnChange={onTurnChange}
        />
      </div>
    </div>
  );
}
