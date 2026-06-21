// useDMToolkit — second slice of the Library.tsx god-component
// extraction (BACKLOG #2, slice 2/3). Owns every piece of DM Toolkit
// state that round-trips to SQLite via the `config` key/value table,
// plus the persisters that wrap each set+save.
//
// What lives in here:
//   - combatants, encounter tables, countdown timers, XP ledger, recap
//   - name + roll history (DM-only generators)
//   - dmMode flag (sidebar/layout toggle)
//   - dmTool (active tool selection — ephemeral, not persisted)
//   - currentTurnIdx (ephemeral)
//
// What stays in Library.tsx (deliberately):
//   - handleTurnChange — composes DM state with `tracks` + `firePad`
//     (pad-audio side effect), which would over-widen this hook's API.
//   - handleToggleDmMode wrapper — closes non-DM dialog flags
//     (pinMenu, tutorialsMenu, saveDialogOpen) when entering DM mode.
//
// Cross-cutting note: `dmMode` and `nameHistory` are part of the
// syncable inputs for useCloudSync. After this extraction Library
// reads them from the hook and threads them into useCloudSync; the
// cloud-merge reload path calls `dm.reloadFromDb()` to re-hydrate
// DM state without duplicating the SQLite plumbing.

import { useCallback, useEffect, useState } from "react";
import {
  getConfig,
  getDb,
  setConfig,
} from "@mc/data";
import type { Combatant } from "../layout/dm/InitiativeTracker.js";
import type { RolledName } from "../layout/dm/NameGenerator.js";
import type { EncounterTable } from "../layout/dm/EncounterTables.js";
import type { CountdownTimer } from "../layout/dm/TensionCountdown.js";
import { EMPTY_LEDGER, type XpLedgerState } from "../layout/dm/XpLedger.js";
import type { RecapMoment } from "../layout/dm/RecapComposer.js";
import type { DmTool } from "../layout/DesktopDmToolkit.js";
import type { RollResult } from "@mc/core/dm";

export type UseDMToolkitReturn = {
  // Tool selection (ephemeral).
  dmTool: DmTool;
  setDmTool: (t: DmTool) => void;

  // dmMode persists; setter writes to SQLite. Library wraps this with
  // the dialog-close logic — calling setDmMode directly just flips the
  // flag + persists.
  dmMode: boolean;
  setDmMode: (v: boolean) => Promise<void>;

  // Persisted lists.
  nameHistory: RolledName[];
  setNameHistory: (next: RolledName[]) => Promise<void>;

  rollHistory: RollResult[];
  setRollHistory: (next: RollResult[]) => Promise<void>;

  combatants: Combatant[];
  setCombatants: (next: Combatant[]) => Promise<void>;

  encounterTables: EncounterTable[];
  setEncounterTables: (next: EncounterTable[]) => Promise<void>;

  countdownTimers: CountdownTimer[];
  setCountdownTimers: (next: CountdownTimer[]) => Promise<void>;

  xpLedger: XpLedgerState;
  setXpLedger: (next: XpLedgerState) => Promise<void>;

  recapMoments: RecapMoment[];
  setRecapMoments: (next: RecapMoment[]) => Promise<void>;

  // Turn pointer is ephemeral (not persisted — current turn resets per
  // session). Library composes the turn-sound side effect on top.
  currentTurnIdx: number;
  setCurrentTurnIdx: (n: number) => void;

  /** Re-load every persisted slice from SQLite. Called from
   *  Library's `refreshSyncableFromDb` after a cloud merge. Same load
   *  path as the boot effect — single source of truth. */
  reloadFromDb: () => Promise<void>;
};

// Tolerant JSON parse: swallow on malformed payloads so a broken
// row never blocks the rest of the hydrate. Mirrors the per-slice
// try/catches in the previous inline boot effect.
function parseOrNull<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useDMToolkit(): UseDMToolkitReturn {
  const [dmTool, setDmTool] = useState<DmTool>("initiative");
  const [dmMode, setDmModeState] = useState(false);
  const [nameHistory, setNameHistoryState] = useState<RolledName[]>([]);
  const [rollHistory, setRollHistoryState] = useState<RollResult[]>([]);
  const [combatants, setCombatantsState] = useState<Combatant[]>([]);
  const [encounterTables, setEncounterTablesState] = useState<EncounterTable[]>(
    [],
  );
  const [countdownTimers, setCountdownTimersState] = useState<CountdownTimer[]>(
    [],
  );
  const [xpLedger, setXpLedgerState] = useState<XpLedgerState>(EMPTY_LEDGER);
  const [recapMoments, setRecapMomentsState] = useState<RecapMoment[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);

  // ── Persisters (set + save) ─────────────────────────────────────────
  // Each wraps a setState with a setConfig() write so the slice
  // round-trips through SQLite. Awaited so callers can `void` them
  // and the next render reflects the on-disk truth.

  const setDmMode = useCallback(async (v: boolean) => {
    setDmModeState(v);
    const db = await getDb();
    await setConfig(db, "dm_mode", v ? "true" : "false");
  }, []);

  const setNameHistory = useCallback(async (next: RolledName[]) => {
    setNameHistoryState(next);
    const db = await getDb();
    await setConfig(db, "dm_name_history", JSON.stringify(next));
  }, []);

  const setRollHistory = useCallback(async (next: RollResult[]) => {
    setRollHistoryState(next);
    const db = await getDb();
    await setConfig(db, "dm_roll_history", JSON.stringify(next));
  }, []);

  const setCombatants = useCallback(async (next: Combatant[]) => {
    setCombatantsState(next);
    const db = await getDb();
    await setConfig(db, "dm_combatants", JSON.stringify(next));
  }, []);

  const setEncounterTables = useCallback(async (next: EncounterTable[]) => {
    setEncounterTablesState(next);
    const db = await getDb();
    await setConfig(db, "dm_encounter_tables", JSON.stringify(next));
  }, []);

  const setCountdownTimers = useCallback(async (next: CountdownTimer[]) => {
    setCountdownTimersState(next);
    const db = await getDb();
    await setConfig(db, "dm_countdown_timers", JSON.stringify(next));
  }, []);

  const setXpLedger = useCallback(async (next: XpLedgerState) => {
    setXpLedgerState(next);
    const db = await getDb();
    await setConfig(db, "dm_xp_ledger", JSON.stringify(next));
  }, []);

  const setRecapMoments = useCallback(async (next: RecapMoment[]) => {
    setRecapMomentsState(next);
    const db = await getDb();
    await setConfig(db, "dm_recap", JSON.stringify(next));
  }, []);

  // ── Load all persisted slices in one round-trip. ────────────────────
  const reloadFromDb = useCallback(async () => {
    const db = await getDb();
    setDmModeState((await getConfig(db, "dm_mode")) === "true");

    const names = parseOrNull<RolledName[]>(
      await getConfig(db, "dm_name_history"),
    );
    if (names) setNameHistoryState(names);

    const rolls = parseOrNull<RollResult[]>(
      await getConfig(db, "dm_roll_history"),
    );
    if (rolls) setRollHistoryState(rolls);

    const comb = parseOrNull<Combatant[]>(
      await getConfig(db, "dm_combatants"),
    );
    if (comb) setCombatantsState(comb);

    const enc = parseOrNull<EncounterTable[]>(
      await getConfig(db, "dm_encounter_tables"),
    );
    if (enc) setEncounterTablesState(enc);

    const timers = parseOrNull<CountdownTimer[]>(
      await getConfig(db, "dm_countdown_timers"),
    );
    if (timers) setCountdownTimersState(timers);

    const ledger = parseOrNull<XpLedgerState>(
      await getConfig(db, "dm_xp_ledger"),
    );
    if (ledger) setXpLedgerState({ ...EMPTY_LEDGER, ...ledger });

    const recap = parseOrNull<RecapMoment[]>(
      await getConfig(db, "dm_recap"),
    );
    if (recap) setRecapMomentsState(recap);
  }, []);

  // Boot: hydrate DM state from SQLite. Mirrors the per-slice try/catch
  // behaviour of the previous inline boot block — a malformed config row
  // for one slice never blocks the rest.
  useEffect(() => {
    void (async () => {
      try {
        await reloadFromDb();
      } catch (err) {
        console.error("[dm-toolkit] init failed:", err);
      }
    })();
  }, [reloadFromDb]);

  return {
    dmTool,
    setDmTool,
    dmMode,
    setDmMode,
    nameHistory,
    setNameHistory,
    rollHistory,
    setRollHistory,
    combatants,
    setCombatants,
    encounterTables,
    setEncounterTables,
    countdownTimers,
    setCountdownTimers,
    xpLedger,
    setXpLedger,
    recapMoments,
    setRecapMoments,
    currentTurnIdx,
    setCurrentTurnIdx,
    reloadFromDb,
  };
}
