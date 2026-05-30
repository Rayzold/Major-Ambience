// DM Toolkit tab — three tools (Names · Dice · Initiative) in their own
// sub-tabs so each gets the full pane width. Earlier 3-column layout
// squashed combatant names (and dice modifiers) on standard 1280-wide
// windows; tabbing trades simultaneity for legibility.

import { useState } from "react";
import type { CategoryId, Track } from "@mc/core";
import { Glyph, T } from "@mc/ui";
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
import type { RollResult } from "../lib/dm-dice.js";

type DmTool =
  | "initiative"
  | "names"
  | "dice"
  | "encounters"
  | "timers"
  | "generators"
  | "ledger"
  | "recap";

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

const TOOLS: Array<{ id: DmTool; label: string; glyph: string; eyebrow: string }> = [
  { id: "initiative", label: "Initiative", glyph: "swords", eyebrow: "Tracker" },
  { id: "names", label: "Names", glyph: "mask", eyebrow: "NPCs" },
  { id: "dice", label: "Dice", glyph: "dice", eyebrow: "Roller" },
  { id: "encounters", label: "Encounters", glyph: "compass", eyebrow: "Random tables" },
  { id: "timers", label: "Timers", glyph: "clock", eyebrow: "Countdown" },
  { id: "generators", label: "Generators", glyph: "note", eyebrow: "Roll tables" },
  { id: "ledger", label: "Ledger", glyph: "star", eyebrow: "XP & loot" },
  { id: "recap", label: "Recap", glyph: "theatre", eyebrow: "Session log" },
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
        {/* The "Add-on" eyebrow above the title read like a debug label.
            Removed — the tabs and content below make the section's role
            obvious on their own. */}
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
          display: "flex",
          flexWrap: "wrap",
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
                // Match the main-header tab pattern: transparent inactive,
                // gold-tint + inset bottom underline + 600-weight active.
                // Reads more native to the dark theme than the previous
                // outlined-chip style.
                background: active ? T.gold + "33" : "transparent",
                color: active ? T.gold : T.ink2,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                border: "1px solid transparent",
                boxShadow: active ? `inset 0 -2px 0 ${T.gold}` : "none",
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
                    background: active ? T.gold + "40" : T.bgChip,
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
