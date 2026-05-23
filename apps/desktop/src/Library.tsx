// Library orchestrator — holds playback state, coordinates layout pieces.
// Layout components live under src/layout/ and stay dumb-visual.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { CategoryId, Grade, Scene, SoundboardSlot, Track, TrackHandle } from "@mc/core";
import { crossfade, weightedShuffle } from "@mc/core";
import {
  bumpPlayCount,
  clearSlot,
  deleteScene,
  deleteTracksNotIn,
  getConfig,
  getConfigNumber,
  getDb,
  insertTracks,
  listScenes,
  listSoundboard,
  listTracks,
  saveScene,
  searchTracks,
  setConfig,
  setCategory as persistCategory,
  setDuration,
  setGrade as persistGrade,
  setGrades as persistGrades,
  setNote as persistNote,
  upsertSlot,
} from "@mc/data";
import { applyTheme, CATEGORIES, findCategory, type ThemeId } from "@mc/ui";
import { scanFolderToTracks } from "./lib/scan.js";
import { getAudioBackend } from "./lib/audio.js";
import { DesktopDmToolkit } from "./layout/DesktopDmToolkit.js";
import { DesktopHeader } from "./layout/DesktopHeader.js";
import { DesktopSidebar } from "./layout/DesktopSidebar.js";
import { DesktopLibraryView } from "./layout/DesktopLibraryView.js";
import { DesktopRightRail } from "./layout/DesktopRightRail.js";
import { DesktopScenesView } from "./layout/DesktopScenesView.js";
import { DesktopSoundboardView } from "./layout/DesktopSoundboardView.js";
import { DesktopTransport } from "./layout/DesktopTransport.js";
import type { Combatant } from "./layout/dm/InitiativeTracker.js";
import type { RolledName } from "./layout/dm/NameGenerator.js";
import type { RollResult } from "./lib/dm-dice.js";
import { KeyboardHelpOverlay } from "./layout/KeyboardHelpOverlay.js";
import { PinToSlotMenu } from "./layout/PinToSlotMenu.js";
import { SaveSceneDialog } from "./layout/SaveSceneDialog.js";
import { SearchOverlay } from "./layout/SearchOverlay.js";
import { SelectionBar } from "./layout/SelectionBar.js";
import { SyncImportConfirm } from "./layout/SyncImportConfirm.js";
import { TrackPickerOverlay } from "./layout/TrackPickerOverlay.js";
import { Tutorial } from "./layout/Tutorial.js";
import { TutorialsMenu } from "./layout/TutorialsMenu.js";
import { TUTORIALS } from "./layout/tutorials.js";
import type { SyncBlob } from "@mc/core";
import { applyLoadedBlob, exportSyncBlob, pickAndLoadSyncBlob } from "./lib/sync.js";
import { useKeyboardShortcuts } from "./lib/keyboard.js";
import {
  firePad,
  isPadPlaying,
  setDuckingPct as setPadDuckingPct,
  setPadVolume,
  stopAllPads,
  stopPad,
  subscribePadState,
} from "./lib/pad-audio.js";

const DEFAULT_FADE_MS = 2000;
const DEFAULT_VOLUME = 0.85;
const DEFAULT_DUCKING = 0.4;
const DEFAULT_THEME: ThemeId = "gold-dark";
const KNOWN_THEMES: readonly ThemeId[] = ["gold-dark", "parchment", "arcane"];
const GRADE_CYCLE: Grade[] = ["S", "A", "B", "C", "D", "F", null];

type PlaybackState = {
  trackId: string;
  handle: TrackHandle;
  startedAt: number;
};

export function Library() {
  // ── State ───────────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<Track[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string | undefined>(undefined);
  const [rootFolderPath, setRootFolderPath] = useState<string | undefined>(undefined);
  const [lastScannedAt, setLastScannedAt] = useState<number | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  /**
   * "off" — track ends, next-in-queue plays (default).
   * "track" — current track loops natively via HTMLAudioElement.loop.
   *           onEnded never fires while this is set, so the queue
   *           doesn't advance until the user changes the mode.
   * "queue" — track ends, advance; when the last queue track ends,
   *           wrap to the first.
   */
  const [loopMode, setLoopMode] = useState<"off" | "track" | "queue">("off");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("combat");
  /**
   * Multi-selected track ids for batch operations (bulk-grade today;
   * later: bulk recategorize). Cleared on Esc, on view switch, and by
   * any non-modifier row click. Range selects use `selectionAnchorId`
   * as the shift-click pivot.
   */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  /**
   * What the center pane is showing. "category" — the activeCategory's
   * tracks (default Library behavior). "favorites" — S/A tracks across
   * all categories. "recent" — last 25 played.
   */
  const [activeView, setActiveView] = useState<"category" | "favorites" | "recent">("category");
  const [tab, setTab] = useState<"library" | "scenes" | "soundboard" | "dm">("library");
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDurationSec, setTrackDurationSec] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [fadeMs, setFadeMs] = useState(DEFAULT_FADE_MS);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_VOLUME);
  const [duckingPct, setDuckingPctState] = useState(DEFAULT_DUCKING);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>(undefined);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [soundboard, setSoundboard] = useState<SoundboardSlot[]>([]);
  const [soundboardPage, setSoundboardPage] = useState<"A" | "B" | "C">("A");
  const [padPlayingTick, setPadPlayingTick] = useState(0);
  const [pinMenu, setPinMenu] = useState<
    { track: Track; x: number; y: number } | null
  >(null);
  const [tutorialsMenu, setTutorialsMenu] = useState<
    { x: number; y: number } | null
  >(null);
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [seenTutorials, setSeenTutorials] = useState<Set<string>>(new Set());
  const [pendingImport, setPendingImport] = useState<
    { blob: SyncBlob; path: string } | null
  >(null);
  /**
   * Track-picker overlay state. The discriminator on `target` controls
   * what the pick callback assigns:
   *   - "pad" → soundboard pad assignment via handlePadAssign
   *   - "turnSound" → combatant turn-sound via handleCombatantsChange
   */
  const [pickerOverlay, setPickerOverlay] = useState<
    | { x: number; y: number; target: { kind: "pad"; page: "A" | "B" | "C"; slot: number } }
    | { x: number; y: number; target: { kind: "turnSound"; combatantId: string } }
    | null
  >(null);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [dmMode, setDmMode] = useState(false);
  const [nameHistory, setNameHistory] = useState<RolledName[]>([]);
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);

  // ── Derived ─────────────────────────────────────────────────────────────
  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === playback?.trackId),
    [tracks, playback],
  );

  const tracksByCategory = useMemo(() => {
    const map = new Map<CategoryId, Track[]>();
    for (const t of tracks) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [tracks]);

  const countByCategory = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const c of CATEGORIES) map.set(c.id, tracksByCategory.get(c.id)?.length ?? 0);
    return map;
  }, [tracksByCategory]);

  /**
   * Tracks visible in the center pane. Switches on `activeView`:
   *   - "category" — alphabetical sort of the active category's tracks.
   *   - "favorites" — S then A tracks across every category, sorted by
   *     grade (S first) then title.
   *   - "recent" — tracks with `lastPlayedAt` set, newest first, top 25.
   *
   * Pseudo-views deliberately skip the subcategory tab filter inside
   * DesktopLibraryView (handled via `isPseudoView` there).
   */
  const categoryTracks = useMemo(() => {
    if (activeView === "favorites") {
      const order: Record<string, number> = { S: 0, A: 1 };
      return tracks
        .filter((t) => t.grade === "S" || t.grade === "A")
        .slice()
        .sort((a, b) => {
          const ga = order[a.grade ?? ""] ?? 9;
          const gb = order[b.grade ?? ""] ?? 9;
          if (ga !== gb) return ga - gb;
          return a.title.localeCompare(b.title);
        });
    }
    if (activeView === "recent") {
      return tracks
        .filter((t) => t.lastPlayedAt !== undefined && t.lastPlayedAt !== null)
        .slice()
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
        .slice(0, 25);
    }
    return (tracksByCategory.get(activeCategory) ?? [])
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [activeView, tracks, tracksByCategory, activeCategory]);

  /** Hero meta for the center pane — real category or synthetic pseudo-view. */
  const viewMeta = useMemo(() => {
    if (activeView === "favorites") {
      return {
        name: "Favorites",
        glyph: "star",
        color: "#e3b66a",
        dark: "#2a200a",
        desc: "S- and A-graded tracks across every category, best first.",
      };
    }
    if (activeView === "recent") {
      return {
        name: "Recently played",
        glyph: "clock",
        color: "#7d92dd",
        dark: "#10142e",
        desc: "Last 25 tracks you played, newest first.",
      };
    }
    return findCategory(activeCategory) ?? CATEGORIES[0]!;
  }, [activeView, activeCategory]);

  // Mirror reactive state into refs so `handlePlayTrack`'s onEnded
  // callback (which closes over the value at subscription time) can
  // read the *current* loop mode / queue when the track actually ends.
  // Otherwise enabling "loop queue" mid-playback never wraps because
  // the original closure still sees loopMode = "off".
  const loopModeRef = useRef(loopMode);
  const queueRef = useRef(queue);
  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  /** Live counts for the Favorites + Recently played sidebar rows. */
  const favoritesCount = useMemo(
    () => tracks.filter((t) => t.grade === "S" || t.grade === "A").length,
    [tracks],
  );
  const recentCount = useMemo(
    () =>
      tracks.filter((t) => t.lastPlayedAt !== undefined && t.lastPlayedAt !== null)
        .length,
    [tracks],
  );

  const upNext = useMemo(() => {
    if (queue.length === 0 || !playback) return [];
    const idx = queue.findIndex((t) => t.id === playback.trackId);
    return idx === -1 ? queue.slice(0, 5) : queue.slice(idx + 1, idx + 6);
  }, [queue, playback]);

  // ── Init: load tracks + config from SQLite ──────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const db = await getDb();
        const existing = await listTracks(db);
        if (existing.length > 0) {
          setTracks(existing);
          setScanStatus(`${existing.length.toLocaleString()} tracks loaded from index.`);
        }
        const fade = await getConfigNumber(db, "fade_ms", DEFAULT_FADE_MS);
        setFadeMs(fade);
        const vol = await getConfigNumber(db, "master_volume", DEFAULT_VOLUME);
        setMasterVolume(vol);
        getAudioBackend().setMasterGain(vol);
        const duck = await getConfigNumber(db, "ducking_pct", DEFAULT_DUCKING);
        setDuckingPctState(duck);
        setPadDuckingPct(duck);
        const root = await getConfig(db, "root_folder_name");
        setRootFolderName(root);
        const loopRaw = (await getConfig(db, "loop_mode")) as
          | "off"
          | "track"
          | "queue"
          | undefined;
        if (loopRaw === "track" || loopRaw === "queue") setLoopMode(loopRaw);
        const rootPath = await getConfig(db, "root_folder_path");
        setRootFolderPath(rootPath);
        const lastScanRaw = await getConfig(db, "last_scanned_at");
        if (lastScanRaw) {
          const n = Number(lastScanRaw);
          if (Number.isFinite(n)) setLastScannedAt(n);
        }
        const loadedScenes = await listScenes(db);
        setScenes(loadedScenes);
        const loadedSlots = await listSoundboard(db);
        setSoundboard(loadedSlots);
        const seenRaw = await getConfig(db, "tutorials_seen");
        if (seenRaw) {
          setSeenTutorials(new Set(seenRaw.split(",").filter(Boolean)));
        }
        const themeRaw = (await getConfig(db, "theme")) as ThemeId | undefined;
        if (themeRaw && KNOWN_THEMES.includes(themeRaw)) {
          setTheme(themeRaw);
          applyTheme(themeRaw);
        } else {
          applyTheme(DEFAULT_THEME);
        }
        const dmRaw = await getConfig(db, "dm_mode");
        if (dmRaw === "true") setDmMode(true);
        const namesRaw = await getConfig(db, "dm_name_history");
        if (namesRaw) {
          try {
            setNameHistory(JSON.parse(namesRaw) as RolledName[]);
          } catch {
            /* swallow */
          }
        }
        const rollsRaw = await getConfig(db, "dm_roll_history");
        if (rollsRaw) {
          try {
            setRollHistory(JSON.parse(rollsRaw) as RollResult[]);
          } catch {
            /* swallow */
          }
        }
        const combRaw = await getConfig(db, "dm_combatants");
        if (combRaw) {
          try {
            setCombatants(JSON.parse(combRaw) as Combatant[]);
          } catch {
            /* swallow */
          }
        }
      } catch (err) {
        console.error("[library] init failed:", err);
      }
    })();
  }, []);

  // Apply master volume changes to the audio bus.
  useEffect(() => {
    getAudioBackend().setMasterGain(masterVolume);
  }, [masterVolume]);

  // Re-render pads when any pad's playback state changes.
  useEffect(() => {
    return subscribePadState(() => setPadPlayingTick((t) => t + 1));
  }, []);

  // Ctrl+K focuses the search input from anywhere. (Modifier-bearing
  // shortcut, so the keyboard hook below leaves it to us.)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Global keyboard shortcuts (space/J/L/G/D/1-0/etc.). Most shortcuts
  // no-op while any overlay is open — see useKeyboardShortcuts for the
  // routing logic. Esc is the one exception: it fires through to
  // handleEscape below so the user can always close the topmost layer.
  const overlayOpen =
    searchOpen ||
    pinMenu !== null ||
    tutorialsMenu !== null ||
    saveDialogOpen ||
    pendingImport !== null ||
    activeTutorialId !== null ||
    helpOpen ||
    pickerOverlay !== null;

  function handleEscape() {
    // Close the topmost overlay. Order mirrors render order — innermost
    // (help / tutorials / sync confirm) wins, then menus, then search.
    if (helpOpen) {
      setHelpOpen(false);
    } else if (activeTutorialId) {
      finishTutorial(false);
    } else if (pendingImport) {
      setPendingImport(null);
    } else if (saveDialogOpen) {
      setSaveDialogOpen(false);
    } else if (pickerOverlay) {
      setPickerOverlay(null);
    } else if (pinMenu) {
      setPinMenu(null);
    } else if (tutorialsMenu) {
      setTutorialsMenu(null);
    } else if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      setSelectionAnchorId(null);
    } else if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  }

  useKeyboardShortcuts(
    {
      onTogglePlay: handleTogglePlay,
      onPrev: handlePrev,
      onNext: handleNext,
      onSeekBack: () => handleSeekRelative(-5),
      onSeekForward: () => handleSeekRelative(5),
      onCycleGrade: handleCycleGrade,
      onShuffleCategory: () => void handleShuffleCategory(),
      onToggleDmMode: () => void handleToggleDmMode(),
      onFocusSearch: () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setSearchOpen(true);
      },
      onToggleHelp: () => setHelpOpen((v) => !v),
      onEscape: handleEscape,
      onJumpToCategory: (id) => {
        setActiveCategory(id);
        setActiveView("category");
        setTab("library");
      },
      onPlayCategoryRandom: (id) => void handlePlayRandomFromCategory(id),
      onPlayBoss: () => void handlePlayBoss(),
      onStopAll: handleStopAll,
      onCycleLoop: () => void handleCycleLoop(),
    },
    { overlayOpen },
  );

  // Track whether anything is making noise — used to enable the Stop All
  // button in the transport. padPlayingTick re-runs this on every pad
  // state change.
  const anyPlaying = useMemo(() => {
    if (playback && isPlaying) return true;
    for (const slot of soundboard) {
      if (slot.trackId && isPadPlaying(slot.page, slot.slot)) return true;
    }
    return false;
    // padPlayingTick is intentionally in deps so subscribePadState fires
    // a refresh — isPadPlaying() reads module-level state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback, isPlaying, soundboard, padPlayingTick]);

  // Debounced FTS5 search. 120ms per BUILD_GUIDE.md § 8.
  useEffect(() => {
    if (!searchOpen) return;
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const db = await getDb();
          const rows = await searchTracks(db, searchQuery, 50);
          setSearchResults(rows);
        } catch (err) {
          console.error("[search] failed:", err);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 120);
    return () => clearTimeout(handle);
  }, [searchQuery, searchOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────
  /**
   * Scan a folder and ingest its tracks. When `forcedPath` is omitted,
   * opens a folder picker; when supplied (rescan + drag-drop), skips the
   * dialog and goes straight to scanning.
   */
  const handleOpenFolder = useCallback(async (forcedPath?: string) => {
    let picked: string | null;
    if (forcedPath) {
      picked = forcedPath;
    } else {
      setScanStatus("Picking folder…");
      const dialogPick = await openDialog({ directory: true, multiple: false });
      if (!dialogPick || typeof dialogPick !== "string") {
        setScanStatus("");
        return;
      }
      picked = dialogPick;
    }

    setIsScanning(true);
    setScanStatus("Scanning…");
    try {
      const scanned = await scanFolderToTracks(picked);
      setScanStatus(`Inserting ${scanned.length.toLocaleString()} tracks…`);
      const db = await getDb();
      await insertTracks(db, scanned);
      const removed = await deleteTracksNotIn(db, scanned.map((t) => t.id));
      const fromDb = await listTracks(db);
      setTracks(fromDb);
      const folderName = picked.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? picked;
      setRootFolderName(folderName);
      setRootFolderPath(picked);
      const scannedAt = Math.floor(Date.now() / 1000);
      setLastScannedAt(scannedAt);
      await setConfig(db, "root_folder_name", folderName);
      await setConfig(db, "root_folder_path", picked);
      await setConfig(db, "last_scanned_at", String(scannedAt));
      const removedNote = removed > 0 ? ` · removed ${removed} orphan` : "";
      setScanStatus(
        `${fromDb.length.toLocaleString()} tracks · ${tallyCategories(fromDb)}${removedNote}.`,
      );
    } catch (err) {
      console.error("[library] scan failed:", err);
      setScanStatus(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Drag a folder onto the window to scan it. Tauri 2 exposes a
  // webview-level drag-drop event that includes the OS path string —
  // bypasses the HTML drop API entirely, so it works regardless of
  // CSS pointer-events / blur effects on top-level chrome.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    void (async () => {
      try {
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          const payload = event.payload;
          if (payload.type === "enter" || payload.type === "over") {
            setDropHover(true);
          } else if (payload.type === "leave") {
            setDropHover(false);
          } else if (payload.type === "drop") {
            setDropHover(false);
            const first = payload.paths[0];
            if (!first) return;
            if (payload.paths.length > 1) {
              setScanStatus(
                "Drop a single folder. Multiple paths aren't supported yet.",
              );
              return;
            }
            void handleOpenFolder(first);
          }
        });
      } catch (err) {
        // Drag-drop events are a nice-to-have; if registration fails we
        // still have the Open Folder button.
        console.warn("[library] onDragDropEvent register failed:", err);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, [handleOpenFolder]);

  /**
   * Play a track. Optionally accepts a `queueContext` — the list of
   * tracks the click came from (e.g. the current filtered library
   * view) — and builds an autoqueue: the clicked track at position 0,
   * everything after it in its original order next, then everything
   * before it (wrapping). When the clicked track ends, onEnded picks
   * up the next entry; "queue" loop mode wraps at the end.
   *
   * Pass an empty array to leave the existing queue alone (used by
   * single-shot plays like the Shuffle button which manages the queue
   * separately).
   */
  async function handlePlayTrack(track: Track, queueContext: Track[] = []) {
    if (queueContext.length > 0) {
      const idx = queueContext.findIndex((t) => t.id === track.id);
      const built =
        idx === -1
          ? [track, ...queueContext]
          : [
              ...queueContext.slice(idx),
              ...queueContext.slice(0, idx),
            ];
      setQueue(built);
    }
    const backend = getAudioBackend();
    const assetUri = convertFileSrc(track.uri);
    try {
      const next = await backend.loadTrack(assetUri);
      backend.setGain(next, 0);

      // Capture and persist real duration on first load.
      const raw = backend.getRawHandle(next);
      const realDurSec = raw?.audio.duration;
      if (raw && Number.isFinite(realDurSec) && realDurSec! > 0) {
        const durMs = Math.round(realDurSec! * 1000);
        if (durMs !== track.durationMs) {
          void setDuration(await getDb(), track.id, durMs);
          setTracks((prev) =>
            prev.map((t) => (t.id === track.id ? { ...t, durationMs: durMs } : t)),
          );
        }
        setTrackDurationSec(realDurSec!);
      }

      // Native looping for "track" mode — HTMLAudioElement.loop replays
      // without firing 'ended', so the queue advance below sits idle until
      // the user changes loopMode. "queue" mode lets the track end naturally
      // and is handled in the onEnded callback.
      if (raw) raw.audio.loop = loopMode === "track";

      const subProgress = backend.onProgress(next, (t) => {
        setCurrentTime(t);
        const r = backend.getRawHandle(next);
        if (r && Number.isFinite(r.audio.duration)) {
          setTrackDurationSec(r.audio.duration);
        }
      });
      const subEnded = backend.onEnded(next, () => {
        subProgress();
        subEnded();
        setIsPlaying(false);
        // Read loopMode + queue from refs — values captured in this
        // closure at subscription time get stale if the user changes
        // loop mode (or the queue) before the track ends.
        const liveQueue = queueRef.current;
        const liveLoopMode = loopModeRef.current;
        const idx = liveQueue.findIndex((t) => t.id === track.id);
        if (idx !== -1 && idx + 1 < liveQueue.length) {
          const upcoming = liveQueue[idx + 1];
          if (upcoming) void handlePlayTrack(upcoming);
        } else if (liveLoopMode === "queue" && liveQueue.length > 0) {
          const first = liveQueue[0];
          if (first) void handlePlayTrack(first);
        }
      });

      backend.play(next);
      backend.setGain(next, 1, fadeMs / 1000);

      const previous = playback;
      if (previous) {
        crossfade(previous.handle, next, fadeMs / 1000, backend);
      }
      setPlayback({ trackId: track.id, handle: next, startedAt: performance.now() });
      setIsPlaying(true);
      setCurrentTime(0);

      const db = await getDb();
      await bumpPlayCount(db, track.id, Math.floor(Date.now() / 1000));
      setTracks((prev) =>
        prev.map((t) =>
          t.id === track.id
            ? { ...t, playCount: t.playCount + 1, lastPlayedAt: Math.floor(Date.now() / 1000) }
            : t,
        ),
      );
    } catch (err) {
      console.error("[library] play failed:", err);
      // Keep the previous playback state coherent — if the new track
      // failed to load, the old handle (if any) is still in `playback`
      // and may still be playing. The user sees the error and the
      // existing track keeps going.
      if (!playback) {
        setIsPlaying(false);
        setCurrentTime(0);
        setTrackDurationSec(0);
      }
      setScanStatus(`Play failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleTogglePlay() {
    if (!playback) return;
    const backend = getAudioBackend();
    if (isPlaying) {
      backend.pause(playback.handle);
      setIsPlaying(false);
    } else {
      backend.play(playback.handle);
      setIsPlaying(true);
    }
  }

  /**
   * Cycle loop mode: off → track → queue → off. Persists to config and
   * applies live to the currently-loaded HTMLAudioElement so the change
   * takes effect without restarting the track.
   *
   * Mode semantics:
   *   - off    HTMLAudioElement.loop = false; onEnded advances or stops.
   *   - track  HTMLAudioElement.loop = true; same track replays natively.
   *   - queue  HTMLAudioElement.loop = false; onEnded wraps queue → first.
   */
  async function handleCycleLoop() {
    const next: "off" | "track" | "queue" =
      loopMode === "off" ? "track" : loopMode === "track" ? "queue" : "off";
    setLoopMode(next);
    // Apply to the currently-playing handle so the user sees the change
    // mid-track without having to re-trigger play.
    if (playback) {
      const raw = getAudioBackend().getRawHandle(playback.handle);
      if (raw) raw.audio.loop = next === "track";
    }
    const db = await getDb();
    await setConfig(db, "loop_mode", next);
  }

  /**
   * Hard stop. Tears down the current music playback handle, halts every
   * soundboard pad (including the turn-sound pseudo-slots), and resets
   * the transport UI to the no-playback baseline.
   *
   * Distinct from togglePlay/pause because pause leaves the track loaded
   * and resumable; this drops the handle entirely. Used for the Z hotkey
   * and the red Stop button next to Next in the transport.
   */
  function handleStopAll() {
    const backend = getAudioBackend();
    if (playback) {
      backend.pause(playback.handle);
      backend.destroy(playback.handle);
    }
    stopAllPads();
    setPlayback(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackDurationSec(0);
    setScanStatus("Stopped.");
  }

  function handleSeek(sec: number) {
    if (!playback) return;
    const clamped = Math.max(0, Math.min(trackDurationSec || Infinity, sec));
    getAudioBackend().seek(playback.handle, clamped);
    setCurrentTime(clamped);
  }

  function handleSeekRelative(deltaSec: number) {
    if (!playback) return;
    handleSeek(currentTime + deltaSec);
  }

  function handlePrev() {
    if (!playback || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === playback.trackId);
    if (idx > 0) {
      const t = queue[idx - 1];
      if (t) void handlePlayTrack(t);
    }
  }

  function handleNext() {
    if (!playback || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === playback.trackId);
    if (idx !== -1 && idx + 1 < queue.length) {
      const t = queue[idx + 1];
      if (t) void handlePlayTrack(t);
    }
  }

  async function handleShuffleCategory() {
    if (categoryTracks.length === 0) return;
    const shuffled = weightedShuffle(categoryTracks);
    if (shuffled.length === 0) return;
    setQueue(shuffled);
    const first = shuffled[0];
    if (first) await handlePlayTrack(first);
  }

  /**
   * Letter-hotkey play. Switches to the matching category, builds a
   * weighted-shuffle queue from its tracks, and plays the first track
   * (which is biased toward the highest-graded by the same weights the
   * Shuffle button uses: S=6×, A=4×, B=2×, C/D/Ungraded=1×, F excluded).
   *
   * Empty-category and all-F-graded cases surface a status note so the
   * user knows why nothing started.
   */
  async function handlePlayRandomFromCategory(id: CategoryId) {
    setTab("library");
    setActiveCategory(id);
    setActiveView("category");
    const pool = tracksByCategory.get(id) ?? [];
    if (pool.length === 0) {
      const meta = findCategory(id);
      setScanStatus(`No tracks in ${meta?.name ?? id} yet.`);
      return;
    }
    const shuffled = weightedShuffle(pool);
    if (shuffled.length === 0) {
      const meta = findCategory(id);
      setScanStatus(`Every ${meta?.name ?? id} track is graded F — nothing eligible.`);
      return;
    }
    setQueue(shuffled);
    const first = shuffled[0];
    if (first) await handlePlayTrack(first);
  }

  /**
   * B-hotkey: play a weighted-random Combat:Boss track. Independent of
   * the active category (always switches to Combat for visual feedback)
   * and falls back gracefully when no Boss-tagged tracks exist.
   */
  async function handlePlayBoss() {
    setTab("library");
    setActiveCategory("combat");
    setActiveView("category");
    const bossPool = (tracksByCategory.get("combat") ?? []).filter(
      (t) => (t.subcategory ?? "").toLowerCase() === "boss",
    );
    if (bossPool.length === 0) {
      setScanStatus(
        "No Combat:Boss tracks in your library. Tag some via the rename hint in the categorize guide.",
      );
      return;
    }
    const shuffled = weightedShuffle(bossPool);
    if (shuffled.length === 0) {
      setScanStatus("All Boss tracks are graded F — nothing eligible.");
      return;
    }
    setQueue(shuffled);
    const first = shuffled[0];
    if (first) await handlePlayTrack(first);
  }

  function handleCycleGrade() {
    if (!currentTrack) return;
    const i = GRADE_CYCLE.indexOf(currentTrack.grade);
    const next = GRADE_CYCLE[(i + 1) % GRADE_CYCLE.length] ?? null;
    void persistGradeChange(currentTrack.id, next);
  }

  function handleSetGrade(g: Grade) {
    if (!currentTrack) return;
    void persistGradeChange(currentTrack.id, g);
  }

  async function persistGradeChange(trackId: string, g: Grade) {
    const db = await getDb();
    await persistGrade(db, trackId, g);
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, grade: g } : t)));
  }

  /**
   * Apply a grade to every currently-selected track in one batch.
   * Used by the SelectionBar — `g === null` clears the grade.
   * Keeps the selection intact afterward so the user can grade the
   * same set differently or move on to recategorize later.
   */
  async function handleBulkGrade(g: Grade) {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const db = await getDb();
    await persistGrades(db, ids, g);
    const idSet = selectedIds;
    setTracks((prev) =>
      prev.map((t) => (idSet.has(t.id) ? { ...t, grade: g } : t)),
    );
    setScanStatus(
      `Graded ${ids.length} track${ids.length === 1 ? "" : "s"} ${g ?? "ungraded"}.`,
    );
  }

  /**
   * Row-click selection logic. Three modes:
   *   - "toggle" (Ctrl/⌘+click): flip this id in/out of the selection,
   *     update the range anchor. Does NOT play the track.
   *   - "range" (Shift+click): if there's an anchor, select everything
   *     between anchor and this id in `visibleTracks`; else seed the
   *     anchor and select just this id. Does NOT play the track.
   *   - "single" (plain click): clear selection, play the track. Library
   *     handles play via the existing onPlayTrack path; this function
   *     just handles selection bookkeeping.
   *
   * `visibleTracks` is the current filtered list — passed in by the row
   * so the range walk respects whatever filter/sort the user has on.
   */
  function handleSelectRow(
    trackId: string,
    mode: "toggle" | "range" | "single",
    visibleTracks: readonly Track[],
  ) {
    if (mode === "single") {
      setSelectedIds(new Set());
      setSelectionAnchorId(trackId);
      return;
    }
    if (mode === "toggle") {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(trackId)) next.delete(trackId);
        else next.add(trackId);
        return next;
      });
      setSelectionAnchorId(trackId);
      return;
    }
    // mode === "range"
    const anchor = selectionAnchorId;
    if (!anchor || anchor === trackId) {
      setSelectedIds(new Set([trackId]));
      setSelectionAnchorId(trackId);
      return;
    }
    const startIdx = visibleTracks.findIndex((t) => t.id === anchor);
    const endIdx = visibleTracks.findIndex((t) => t.id === trackId);
    if (startIdx === -1 || endIdx === -1) {
      setSelectedIds(new Set([trackId]));
      setSelectionAnchorId(trackId);
      return;
    }
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    const range = visibleTracks.slice(lo, hi + 1).map((t) => t.id);
    setSelectedIds(new Set(range));
    // Anchor stays put so subsequent shift-clicks pivot on the same row.
  }

  /**
   * Apply a manual recategorization. Updates both the local track array
   * (so the library view re-buckets immediately) and the SQLite row.
   * Subcategory is stored exactly as supplied — null clears it.
   */
  async function handleSetTrackCategory(
    trackId: string,
    category: CategoryId,
    subcategory: string | null,
  ) {
    const db = await getDb();
    await persistCategory(db, trackId, category, subcategory);
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        // exactOptionalPropertyTypes: drop the key entirely rather than
        // setting subcategory: undefined.
        const { subcategory: _drop, ...rest } = t;
        void _drop;
        return subcategory !== null
          ? { ...rest, category, subcategory }
          : { ...rest, category };
      }),
    );
  }

  async function handleSetTrackNote(trackId: string, note: string) {
    const db = await getDb();
    await persistNote(db, trackId, note);
    const trimmed = note.trim();
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const { note: _drop, ...rest } = t;
        void _drop;
        return trimmed.length > 0 ? { ...rest, note: trimmed } : rest;
      }),
    );
  }

  async function handleSetFade(ms: number) {
    setFadeMs(ms);
    const db = await getDb();
    await setConfig(db, "fade_ms", String(ms));
  }

  async function handleSetVolume(v: number) {
    setMasterVolume(v);
    const db = await getDb();
    await setConfig(db, "master_volume", String(v));
  }

  async function handleSetDucking(pct: number) {
    setDuckingPctState(pct);
    setPadDuckingPct(pct);
    const db = await getDb();
    await setConfig(db, "ducking_pct", String(pct));
  }

  // ── Sync ───────────────────────────────────────────────────────────────
  async function handleExportSync() {
    setTutorialsMenu(null);
    try {
      const result = await exportSyncBlob();
      if (result) {
        const kb = (result.bytes / 1024).toFixed(1);
        setScanStatus(`Exported ${kb} KB to ${result.path.split(/[\\/]/).pop()}.`);
      }
    } catch (err) {
      console.error("[sync] export failed:", err);
      setScanStatus(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleImportSyncPick() {
    setTutorialsMenu(null);
    try {
      const loaded = await pickAndLoadSyncBlob();
      if (loaded) setPendingImport(loaded);
    } catch (err) {
      console.error("[sync] import pick failed:", err);
      setScanStatus(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleImportSyncConfirm() {
    if (!pendingImport) return;
    try {
      const applied = await applyLoadedBlob(pendingImport.blob);
      setPendingImport(null);
      setScanStatus(
        `Imported · ${applied.gradesApplied} grades, ${applied.scenesReplaced} scenes, ${applied.soundboardSlotsReplaced} pads, ${applied.configKeysSet} config keys.`,
      );
      const db = await getDb();
      const fromDb = await listTracks(db);
      setTracks(fromDb);
      const refreshedScenes = await listScenes(db);
      setScenes(refreshedScenes);
      const refreshedSlots = await listSoundboard(db);
      setSoundboard(refreshedSlots);
    } catch (err) {
      console.error("[sync] apply failed:", err);
      setScanStatus(
        `Import apply failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      setPendingImport(null);
    }
  }

  // ── Themes ─────────────────────────────────────────────────────────────
  async function handlePickTheme(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
    const db = await getDb();
    await setConfig(db, "theme", id);
  }

  // ── DM Toolkit ─────────────────────────────────────────────────────────
  async function handleNameHistoryChange(next: RolledName[]) {
    setNameHistory(next);
    const db = await getDb();
    await setConfig(db, "dm_name_history", JSON.stringify(next));
  }

  async function handleRollHistoryChange(next: RollResult[]) {
    setRollHistory(next);
    const db = await getDb();
    await setConfig(db, "dm_roll_history", JSON.stringify(next));
  }

  async function handleCombatantsChange(next: Combatant[]) {
    setCombatants(next);
    const db = await getDb();
    await setConfig(db, "dm_combatants", JSON.stringify(next));
  }

  function handleTurnChange(newIdx: number) {
    setCurrentTurnIdx(newIdx);
    // Fire turn sound through soundboard bus (auto-ducks music).
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    const next = sorted[newIdx];
    if (next?.turnSoundTrackId) {
      const track = tracks.find((t) => t.id === next.turnSoundTrackId);
      if (track) {
        // Reserve a special pseudo-pad slot for turn sounds so it shares the
        // soundboard bus + auto-ducking, but doesn't collide with real pads.
        void firePad("A", 99 + newIdx, track, { loop: false, volume: 0.95 });
      }
    }
  }

  // ── DM Mode ────────────────────────────────────────────────────────────
  async function handleToggleDmMode() {
    const next = !dmMode;
    setDmMode(next);
    // Close any open popovers/menus that are no longer reachable.
    if (next) {
      setPinMenu(null);
      setTutorialsMenu(null);
      setSaveDialogOpen(false);
    }
    const db = await getDb();
    await setConfig(db, "dm_mode", next ? "true" : "false");
  }

  // ── Tutorials ──────────────────────────────────────────────────────────
  const hasUnseenTutorials =
    TUTORIALS.some((t) => !seenTutorials.has(t.id));

  function startTutorial(id: string) {
    setTutorialsMenu(null);
    setActiveTutorialId(id);
  }

  async function markTutorialSeen(id: string) {
    const next = new Set(seenTutorials);
    next.add(id);
    setSeenTutorials(next);
    const db = await getDb();
    await setConfig(db, "tutorials_seen", Array.from(next).join(","));
  }

  function finishTutorial(complete: boolean) {
    const id = activeTutorialId;
    setActiveTutorialId(null);
    // Only mark as "seen" on completion. Dismissed mid-tour still pulses
    // so the user can come back to it.
    if (id && complete) void markTutorialSeen(id);
  }

  // ── Scenes ─────────────────────────────────────────────────────────────
  async function handleSaveScene(name: string) {
    // Top non-primary categories from the active queue become accents.
    const accentCounts = new Map<CategoryId, number>();
    for (const t of queue) {
      if (t.category === activeCategory) continue;
      accentCounts.set(t.category, (accentCounts.get(t.category) ?? 0) + 1);
    }
    const accents = Array.from(accentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id);

    const scene: Scene = {
      id: cryptoRandomId(),
      name,
      primaryCategory: activeCategory,
      accentCategories: accents,
      trackIds: queue.map((t) => t.id),
      soundboardPage: "A",
      fadeMs,
      duckingPct: 40,
      volumes: { [activeCategory]: masterVolume } as Partial<
        Record<CategoryId, number>
      >,
      createdAt: Date.now(),
    };

    const db = await getDb();
    await saveScene(db, scene);
    const refreshed = await listScenes(db);
    setScenes(refreshed);
    setActiveSceneId(scene.id);
    setSaveDialogOpen(false);
    setScanStatus(`Saved scene "${scene.name}".`);
  }

  async function handleRestoreScene(scene: Scene) {
    setActiveCategory(scene.primaryCategory);
    setActiveView("category");
    setFadeMs(scene.fadeMs);
    const db = await getDb();
    await setConfig(db, "fade_ms", String(scene.fadeMs));
    const sceneVol = scene.volumes[scene.primaryCategory];
    if (typeof sceneVol === "number") {
      setMasterVolume(sceneVol);
      await setConfig(db, "master_volume", String(sceneVol));
    }
    setActiveSceneId(scene.id);
    setTab("library");

    // Rebuild the queue: prefer the saved trackIds (in saved order),
    // fall back to a fresh weighted shuffle of the primary category.
    const saved =
      scene.trackIds.length > 0
        ? scene.trackIds
            .map((id) => tracks.find((t) => t.id === id))
            .filter((t): t is Track => t !== undefined)
        : [];
    const restoredQueue =
      saved.length > 0
        ? saved
        : weightedShuffle(tracks.filter((t) => t.category === scene.primaryCategory));
    setQueue(restoredQueue);
    const first = restoredQueue[0];
    if (first) {
      await handlePlayTrack(first);
    }
    setScanStatus(`Restored scene "${scene.name}".`);
  }

  // ── Soundboard ─────────────────────────────────────────────────────────
  const tracksById = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of tracks) m.set(t.id, t);
    return m;
  }, [tracks]);

  async function handlePadAssign(
    page: "A" | "B" | "C",
    slot: number,
    trackId: string,
  ) {
    const existing = soundboard.find((s) => s.page === page && s.slot === slot);
    const next: SoundboardSlot = {
      page,
      slot: slot as SoundboardSlot["slot"],
      trackId,
      loop: existing?.loop ?? false,
      volume: existing?.volume ?? 0.8,
    };
    const db = await getDb();
    await upsertSlot(db, next);
    setSoundboard((prev) => {
      const without = prev.filter((s) => !(s.page === page && s.slot === slot));
      return [...without, next];
    });
  }

  async function handlePadFire(page: "A" | "B" | "C", slot: number) {
    const assigned = soundboard.find((s) => s.page === page && s.slot === slot);
    if (!assigned?.trackId) return;
    const track = tracksById.get(assigned.trackId);
    if (!track) return;
    await firePad(page, slot, track, {
      loop: assigned.loop,
      volume: assigned.volume,
    });
  }

  function handlePadStop(page: "A" | "B" | "C", slot: number) {
    stopPad(page, slot);
  }

  async function handlePadClear(page: "A" | "B" | "C", slot: number) {
    stopPad(page, slot);
    const db = await getDb();
    await clearSlot(db, page, slot);
    setSoundboard((prev) =>
      prev.filter((s) => !(s.page === page && s.slot === slot)),
    );
  }

  async function handlePadSetLoop(
    page: "A" | "B" | "C",
    slot: number,
    loop: boolean,
  ) {
    const existing = soundboard.find((s) => s.page === page && s.slot === slot);
    if (!existing) return;
    const next: SoundboardSlot = { ...existing, loop };
    const db = await getDb();
    await upsertSlot(db, next);
    setSoundboard((prev) =>
      prev.map((s) => (s.page === page && s.slot === slot ? next : s)),
    );
  }

  async function handlePadSetVolume(
    page: "A" | "B" | "C",
    slot: number,
    volume: number,
  ) {
    const existing = soundboard.find((s) => s.page === page && s.slot === slot);
    if (!existing) return;
    const next: SoundboardSlot = { ...existing, volume };
    setPadVolume(page, slot, volume); // live update if playing
    const db = await getDb();
    await upsertSlot(db, next);
    setSoundboard((prev) =>
      prev.map((s) => (s.page === page && s.slot === slot ? next : s)),
    );
  }

  async function handleDeleteScene(scene: Scene) {
    const db = await getDb();
    await deleteScene(db, scene.id);
    setScenes((prev) => prev.filter((s) => s.id !== scene.id));
    if (activeSceneId === scene.id) setActiveSceneId(undefined);
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="mc-app"
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--mc-bg, #0b0913)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AmbientBackground category={currentTrack?.category ?? activeCategory} />

      <DesktopHeader
        tab={tab}
        onTabChange={setTab}
        trackCount={tracks.length}
        onOpenFolder={handleOpenFolder}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setSearchOpen(true);
        }}
        onSearchFocus={() => setSearchOpen(true)}
        searchInputRef={searchInputRef}
        hasUnseenTutorials={hasUnseenTutorials}
        onOpenTutorials={(anchor) => setTutorialsMenu(anchor)}
        dmMode={dmMode}
        onToggleDmMode={() => void handleToggleDmMode()}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          position: "relative",
        }}
      >
        <DesktopSidebar
          selected={activeCategory}
          activeView={activeView}
          onSelect={(id) => {
            setActiveCategory(id);
            setActiveView("category");
          }}
          onSelectFavorites={() => setActiveView("favorites")}
          onSelectRecent={() => setActiveView("recent")}
          favoritesCount={favoritesCount}
          recentCount={recentCount}
          totalTrackCount={tracks.length}
          countByCategory={countByCategory}
          rootFolderName={rootFolderName}
          lastScannedAt={lastScannedAt}
          isScanning={isScanning}
          onRescan={
            rootFolderPath && !dmMode
              ? () => void handleOpenFolder(rootFolderPath)
              : undefined
          }
        />

        {tab === "library" ? (
          <DesktopLibraryView
            meta={viewMeta}
            categoryTracks={categoryTracks}
            playingTrackId={playback?.trackId}
            onPlayTrack={(t, ctx) => void handlePlayTrack(t, ctx)}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onShuffleCategory={() => void handleShuffleCategory()}
            onTrackContextMenu={(t, x, y) =>
              dmMode ? undefined : setPinMenu({ track: t, x, y })
            }
            isPseudoView={activeView !== "category"}
            dmMode={dmMode}
          />
        ) : tab === "scenes" ? (
          <DesktopScenesView
            scenes={scenes}
            activeSceneId={activeSceneId}
            canSave={tracks.length > 0}
            onOpenSave={() => setSaveDialogOpen(true)}
            onRestore={(s) => void handleRestoreScene(s)}
            onDelete={(s) => void handleDeleteScene(s)}
            dmMode={dmMode}
          />
        ) : tab === "soundboard" ? (
          <DesktopSoundboardView
            key={padPlayingTick}
            page={soundboardPage}
            onPageChange={setSoundboardPage}
            slots={soundboard}
            tracksById={tracksById}
            isPlaying={isPadPlaying}
            onAssign={(p, s, id) => void handlePadAssign(p, s, id)}
            onPickRequest={(page, slot, x, y) =>
              setPickerOverlay({ x, y, target: { kind: "pad", page, slot } })
            }
            onFire={(p, s) => void handlePadFire(p, s)}
            onStop={handlePadStop}
            onClear={(p, s) => void handlePadClear(p, s)}
            onSetLoop={(p, s, l) => void handlePadSetLoop(p, s, l)}
            onSetVolume={(p, s, v) => void handlePadSetVolume(p, s, v)}
            dmMode={dmMode}
          />
        ) : (
          <DesktopDmToolkit
            nameHistory={nameHistory}
            onNameHistory={(next) => void handleNameHistoryChange(next)}
            rollHistory={rollHistory}
            onRollHistory={(next) => void handleRollHistoryChange(next)}
            combatants={combatants}
            currentTurnIdx={currentTurnIdx}
            tracksById={tracksById}
            onCombatantsChange={(next) => void handleCombatantsChange(next)}
            onTurnChange={handleTurnChange}
            onPickTurnSound={(combatantId, x, y) =>
              setPickerOverlay({ x, y, target: { kind: "turnSound", combatantId } })
            }
          />
        )}

        <DesktopRightRail
          track={currentTrack}
          currentSec={currentTime}
          durationSec={trackDurationSec}
          playing={isPlaying}
          onCycleGrade={handleCycleGrade}
          onSetGrade={handleSetGrade}
          upNext={upNext}
          dmMode={dmMode}
        />
      </div>

      {scanStatus ? (
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 380,
            zIndex: 6,
            padding: "6px 12px",
            borderRadius: 999,
            background: "var(--mc-chromeBg)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--mc-goldEdge)",
            color: "var(--mc-gold)",
            fontSize: 11,
            maxWidth: 580,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {scanStatus}
        </div>
      ) : null}

      {tutorialsMenu ? (
        <TutorialsMenu
          tutorials={TUTORIALS}
          seen={seenTutorials}
          anchor={tutorialsMenu}
          currentTheme={theme}
          onPickTheme={(id) => void handlePickTheme(id)}
          onPickTutorial={(id) => startTutorial(id)}
          onExportSync={() => void handleExportSync()}
          onImportSync={() => void handleImportSyncPick()}
          onDismiss={() => setTutorialsMenu(null)}
        />
      ) : null}

      {pendingImport ? (
        <SyncImportConfirm
          blob={pendingImport.blob}
          path={pendingImport.path}
          onConfirm={() => void handleImportSyncConfirm()}
          onCancel={() => setPendingImport(null)}
        />
      ) : null}

      {activeTutorialId ? (() => {
        const tutorial = TUTORIALS.find((t) => t.id === activeTutorialId);
        if (!tutorial) return null;
        return (
          <Tutorial
            key={tutorial.id}
            steps={tutorial.steps}
            onComplete={() => finishTutorial(true)}
            onDismiss={() => finishTutorial(false)}
          />
        );
      })() : null}

      {pinMenu ? (
        <PinToSlotMenu
          anchor={{ x: pinMenu.x, y: pinMenu.y }}
          track={pinMenu.track}
          slots={soundboard}
          tracksById={tracksById}
          combatants={combatants}
          onPin={(page, slot) => {
            void handlePadAssign(page, slot, pinMenu.track.id);
            setPinMenu(null);
            setScanStatus(
              `Pinned "${pinMenu.track.title}" to ${page}·${slot}.`,
            );
          }}
          onSetTurnSound={(combatantId) => {
            const target = combatants.find((c) => c.id === combatantId);
            if (!target) {
              setPinMenu(null);
              return;
            }
            void handleCombatantsChange(
              combatants.map((c) =>
                c.id === combatantId
                  ? { ...c, turnSoundTrackId: pinMenu.track.id }
                  : c,
              ),
            );
            setPinMenu(null);
            setScanStatus(
              `Set "${pinMenu.track.title}" as turn sound for ${target.name}.`,
            );
          }}
          onSetCategory={(category, subcategory) => {
            const trackTitle = pinMenu.track.title;
            const fromName = findCategory(pinMenu.track.category)?.name ?? pinMenu.track.category;
            const toName = findCategory(category)?.name ?? category;
            void handleSetTrackCategory(pinMenu.track.id, category, subcategory);
            const subNote = subcategory ? ` · ${subcategory}` : "";
            const msg =
              pinMenu.track.category === category
                ? `Updated "${trackTitle}" subcategory${subNote || " → none"}.`
                : `Moved "${trackTitle}" ${fromName} → ${toName}${subNote}.`;
            setScanStatus(msg);
            // Keep menu open so the user can fine-tune subcategory after
            // switching category. They dismiss with Esc / outside click.
          }}
          onSetNote={(note) => {
            void handleSetTrackNote(pinMenu.track.id, note);
            setScanStatus(
              note.trim().length > 0
                ? `Saved note for "${pinMenu.track.title}".`
                : `Cleared note for "${pinMenu.track.title}".`,
            );
          }}
          onDismiss={() => setPinMenu(null)}
        />
      ) : null}

      {saveDialogOpen ? (
        <SaveSceneDialog
          primaryCategory={activeCategory}
          queueLength={queue.length}
          fadeMs={fadeMs}
          masterVolume={masterVolume}
          onSave={(name) => void handleSaveScene(name)}
          onCancel={() => setSaveDialogOpen(false)}
        />
      ) : null}

      {helpOpen ? (
        <KeyboardHelpOverlay onDismiss={() => setHelpOpen(false)} />
      ) : null}

      {pickerOverlay ? (
        <TrackPickerOverlay
          anchor={{ x: pickerOverlay.x, y: pickerOverlay.y }}
          tracks={tracks}
          title={
            pickerOverlay.target.kind === "pad"
              ? `Pad ${pickerOverlay.target.page}·${pickerOverlay.target.slot}`
              : "Turn sound"
          }
          subtitle={
            pickerOverlay.target.kind === "pad"
              ? "Pick a track to assign to this soundboard pad."
              : (() => {
                  const t = pickerOverlay.target;
                  if (t.kind !== "turnSound") return "";
                  const target = combatants.find((c) => c.id === t.combatantId);
                  return target
                    ? `Fires automatically when it's ${target.name}'s turn.`
                    : "Fires automatically on this combatant's turn.";
                })()
          }
          onPick={(track) => {
            const target = pickerOverlay.target;
            if (target.kind === "pad") {
              void handlePadAssign(target.page, target.slot, track.id);
              setScanStatus(
                `Pinned "${track.title}" to ${target.page}·${target.slot}.`,
              );
            } else {
              const next = combatants.map((c) =>
                c.id === target.combatantId
                  ? { ...c, turnSoundTrackId: track.id }
                  : c,
              );
              void handleCombatantsChange(next);
              const target_name =
                combatants.find((c) => c.id === target.combatantId)?.name ?? "combatant";
              setScanStatus(
                `Set "${track.title}" as turn sound for ${target_name}.`,
              );
            }
            setPickerOverlay(null);
          }}
          onDismiss={() => setPickerOverlay(null)}
        />
      ) : null}

      {dropHover ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 90,
            pointerEvents: "none",
            background: "var(--mc-goldEdge, rgba(227,182,106,0.18))",
            border: "2px dashed var(--mc-gold, #e3b66a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="mc-display"
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "var(--mc-gold, #e3b66a)",
              textShadow: "0 4px 24px rgba(0,0,0,0.6)",
            }}
          >
            Drop folder to scan
          </div>
        </div>
      ) : null}

      {searchOpen ? (
        <SearchOverlay
          query={searchQuery}
          results={searchResults}
          loading={searchLoading}
          playingTrackId={playback?.trackId}
          onPlay={(t) => {
            void handlePlayTrack(t);
            setSearchOpen(false);
            setSearchQuery("");
            searchInputRef.current?.blur();
          }}
          onContextMenu={(t, x, y) => {
            // Close the search overlay so the pin menu isn't covered by it,
            // but keep the query around so re-opening search lands on the
            // same results.
            setSearchOpen(false);
            searchInputRef.current?.blur();
            if (!dmMode) setPinMenu({ track: t, x, y });
          }}
          onDismiss={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
        />
      ) : null}

      {selectedIds.size > 0 && tab === "library" && !dmMode ? (
        <SelectionBar
          count={selectedIds.size}
          onSetGrade={(g) => void handleBulkGrade(g)}
          onClearGrade={() => void handleBulkGrade(null)}
          onClear={() => {
            setSelectedIds(new Set());
            setSelectionAnchorId(null);
          }}
        />
      ) : null}

      <DesktopTransport
        track={currentTrack}
        currentSec={currentTime}
        durationSec={trackDurationSec}
        playing={isPlaying}
        fadeMs={fadeMs}
        masterVolume={masterVolume}
        duckingPct={duckingPct}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onCycleGrade={handleCycleGrade}
        onSetFadeMs={(ms) => void handleSetFade(ms)}
        onSetVolume={(v) => void handleSetVolume(v)}
        onSetDuckingPct={(p) => void handleSetDucking(p)}
        onStopAll={handleStopAll}
        anyPlaying={anyPlaying}
        loopMode={loopMode}
        onCycleLoop={() => void handleCycleLoop()}
        dmMode={dmMode}
      />
    </div>
  );
}

function AmbientBackground({ category }: { category: CategoryId }) {
  const c = findCategory(category);
  if (!c) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.6,
        background:
          `radial-gradient(60% 50% at 75% 0%, ${c.color}22 0%, transparent 60%),` +
          `radial-gradient(40% 40% at 0% 100%, #e3b66a11 0%, transparent 60%)`,
        zIndex: 0,
      }}
    />
  );
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function tallyCategories(tracks: Track[]): string {
  const counts = new Map<CategoryId, number>();
  for (const t of tracks) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n]) => `${n} ${findCategory(c)?.name ?? c}`)
    .join(", ");
}
