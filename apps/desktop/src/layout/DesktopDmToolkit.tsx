// DM Toolkit tab — eight tools (Names · Dice · Initiative · Encounter
// tables · Tension countdown · Generators · XP ledger · Recap) shown
// one at a time. The mode-aware sidebar (DesktopDmSidebar) drives which
// one is active; this component is purely the right-pane renderer.

import type { CategoryId, Track } from "@mc/core";
import { T } from "@mc/ui";
import { DiceRoller } from "./dm/DiceRoller.js";
import { NameGenerator } from "./dm/NameGenerator.js";
import { InitiativeTracker } from "./dm/InitiativeTracker.js";
import { EncounterTables } from "./dm/EncounterTables.js";
import { TensionCountdown } from "./dm/TensionCountdown.js";
import { Generators } from "./dm/Generators.js";
import { XpLedger } from "./dm/XpLedger.js";
import { RecapComposer } from "./dm/RecapComposer.js";
import type { Combatant } from "./dm/InitiativeTracker.js";
import type { RolledName } from "./dm/NameGenerator.js";
import type { EncounterTable } from "./dm/EncounterTables.js";
import type { CountdownTimer } from "./dm/TensionCountdown.js";
import type { XpLedgerState } from "./dm/XpLedger.js";
import type { RecapMoment } from "./dm/RecapComposer.js";
import type { RollResult } from "@mc/core/dm";

export type DmTool =
  | "initiative"
  | "names"
  | "dice"
  | "encounters"
  | "timers"
  | "generators"
  | "ledger"
  | "recap";

export type DesktopDmToolkitProps = {
  /** Active sub-tool. Sidebar owns the write side; this component renders. */
  tool: DmTool;
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
  encounterTables: EncounterTable[];
  onEncounterTables: (next: EncounterTable[]) => void;
  /** Open the track-picker to bind a track to an encounter entry. */
  onPickEntryTrack: (tableId: string, entryId: string, x: number, y: number) => void;
  /** Fire a bound track (single play) from a rolled encounter entry. */
  onPlayTrack: (trackId: string) => void;
  /** Fire a bound category (weighted shuffle) from a rolled encounter entry. */
  onPlayCategory: (categoryId: CategoryId) => void;
  countdownTimers: CountdownTimer[];
  onCountdownTimers: (next: CountdownTimer[]) => void;
  /** Open the track-picker to bind a stinger to a countdown timer. */
  onPickStinger: (timerId: string, x: number, y: number) => void;
  /** Fire a timer's stinger (soundboard bus, ducks music) at zero. */
  onFireStinger: (trackId: string) => void;
  xpLedger: XpLedgerState;
  onXpLedger: (next: XpLedgerState) => void;
  recapMoments: RecapMoment[];
  onRecapMoments: (next: RecapMoment[]) => void;
  /** Title of the currently-playing track, captured when a moment is pinned. */
  nowPlayingLabel?: string;
};

export function DesktopDmToolkit({
  tool,
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
  encounterTables,
  onEncounterTables,
  onPickEntryTrack,
  onPlayTrack,
  onPlayCategory,
  countdownTimers,
  onCountdownTimers,
  onPickStinger,
  onFireStinger,
  xpLedger,
  onXpLedger,
  recapMoments,
  onRecapMoments,
  nowPlayingLabel,
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
        {/* The title block stays so the active surface is named even when
            the sidebar is collapsed or off-screen on small windows. */}
        <h1
          className="mc-display"
          style={{
            margin: "0 0 4px",
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
        ) : tool === "dice" ? (
          <DiceRoller history={rollHistory} onHistory={onRollHistory} />
        ) : tool === "encounters" ? (
          <EncounterTables
            tables={encounterTables}
            onTables={onEncounterTables}
            tracksById={tracksById}
            onPickEntryTrack={onPickEntryTrack}
            onPlayTrack={onPlayTrack}
            onPlayCategory={onPlayCategory}
          />
        ) : tool === "timers" ? (
          <TensionCountdown
            timers={countdownTimers}
            onTimers={onCountdownTimers}
            tracksById={tracksById}
            onPickStinger={onPickStinger}
            onFireStinger={onFireStinger}
          />
        ) : tool === "generators" ? (
          <Generators />
        ) : tool === "ledger" ? (
          <XpLedger ledger={xpLedger} onLedger={onXpLedger} />
        ) : (
          <RecapComposer
            moments={recapMoments}
            onMoments={onRecapMoments}
            {...(nowPlayingLabel ? { nowPlayingLabel } : {})}
          />
        )}
      </div>
    </div>
  );
}
