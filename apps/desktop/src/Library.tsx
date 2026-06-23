// Library orchestrator — holds playback state, coordinates layout pieces.
// Layout components live under src/layout/ and stay dumb-visual.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { CategoryId, Grade, Scene, SoundboardSlot, Track } from "@mc/core";
import { categorize, currentTier, weightedShuffle, type Tier } from "@mc/core";
import {
  clearSlot,
  deleteReference,
  deleteScene,
  deleteTracksNotIn,
  getConfig,
  getDb,
  insertTracks,
  listReferences,
  listScenes,
  listSoundboard,
  listTracks,
  saveScene,
  searchTracks,
  seedReferences,
  setConfig,
  setCategory as persistCategory,
  setDuration,
  setGrade as persistGrade,
  setGrades as persistGrades,
  setNote as persistNote,
  setReferenceOwned,
  type TrackReference,
  upsertReference,
  upsertSlot,
} from "@mc/data";
import { applyTheme, CATEGORIES, findCategory, type ThemeId } from "@mc/ui";
import { scanFolderToTracks } from "./lib/scan.js";
import { scanDurations, tracksMissingDuration } from "./lib/duration-scan.js";
import { DesktopDmToolkit } from "./layout/DesktopDmToolkit.js";
import { DesktopHeader } from "./layout/DesktopHeader.js";
import { DesktopSidebar } from "./layout/DesktopSidebar.js";
import { DesktopDmSidebar } from "./layout/DesktopDmSidebar.js";
import { DesktopScenesSidebar } from "./layout/DesktopScenesSidebar.js";
import { DesktopSoundboardSidebar } from "./layout/DesktopSoundboardSidebar.js";
import { DesktopLibraryView } from "./layout/DesktopLibraryView.js";
import { DesktopRightRail } from "./layout/DesktopRightRail.js";
import { DesktopScenesView } from "./layout/DesktopScenesView.js";
import { DesktopSoundboardView } from "./layout/DesktopSoundboardView.js";
import { DesktopTransport } from "./layout/DesktopTransport.js";
import {
  HANDOUT_EVENT,
  HANDOUT_READY_EVENT,
  type HandoutPayload,
} from "./layout/HandoutView.js";
import { KeyboardHelpOverlay } from "./layout/KeyboardHelpOverlay.js";
import { PinToSlotMenu } from "./layout/PinToSlotMenu.js";
import { SaveSceneDialog } from "./layout/SaveSceneDialog.js";
import { SceneEditDialog } from "./layout/SceneEditDialog.js";
import { SearchOverlay } from "./layout/SearchOverlay.js";
import { SelectionBar } from "./layout/SelectionBar.js";
import { SyncImportConfirm } from "./layout/SyncImportConfirm.js";
import { TrackPickerOverlay } from "./layout/TrackPickerOverlay.js";
import { Tutorial } from "./layout/Tutorial.js";
import { TutorialsMenu } from "./layout/TutorialsMenu.js";
import { TUTORIALS } from "./layout/tutorials.js";
import type { AnySyncBlob } from "@mc/core";
import { applyLoadedBlob, exportSyncBlob, pickAndLoadSyncBlob } from "./lib/sync.js";
import { SyncSettings } from "./layout/SyncSettings.js";
import { LicenseDialog } from "./layout/LicenseDialog.js";
import {
  applyLicenseKey,
  clearLicense,
  getLicenseEmail,
  purchasedTier as readPurchasedTier,
} from "./lib/entitlement.js";
import { useAudioSettings } from "./hooks/useAudioSettings.js";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { useDMToolkit } from "./hooks/useDMToolkit.js";
import { usePlayback } from "./hooks/usePlayback.js";
import { useKeyboardShortcuts } from "./lib/keyboard.js";
import { getBugReportUrl, getDiagnosticsText } from "./lib/diag.js";
import { DND_MUSIC_GUIDE_SEEDS } from "./lib/dnd-music-guide.js";
import {
  readTelemetryEnabled,
  setTelemetryEnabled,
} from "./lib/telemetry.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  firePad,
  isPadPlaying,
  setPadVolume,
  stopPad,
  subscribePadState,
} from "./lib/pad-audio.js";
const DEFAULT_THEME: ThemeId = "gold-dark";
const KNOWN_THEMES: readonly ThemeId[] = ["gold-dark", "parchment", "arcane"];
const GRADE_CYCLE: Grade[] = ["S", "A", "B", "C", "D", "F", null];

export function Library() {
  // ── State ───────────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<Track[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string | undefined>(undefined);
  const [rootFolderPath, setRootFolderPath] = useState<string | undefined>(undefined);
  const [lastScannedAt, setLastScannedAt] = useState<number | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  // loopMode + the transport state live in usePlayback; instantiated
  // below once tracks + audio + tracksByCategory are in scope.
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
  // playback / isPlaying / currentTime / trackDurationSec / queue all
  // live in usePlayback — instantiated below.
  const [scanStatus, setScanStatus] = useState<string>("");
  /**
   * True while the background duration scanner is filling in missing
   * `durationMs` values for the current library. Disables the manual
   * "Scan durations" button and gates concurrent runs.
   */
  const [isScanningDurations, setIsScanningDurations] = useState(false);
  // Audio settings (fadeMs / masterVolume / duckingPct) + their
  // persisters live in useAudioSettings; instantiated below.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>(undefined);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  /** Scene being edited via the SceneEditDialog. null when closed. */
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [soundboard, setSoundboard] = useState<SoundboardSlot[]>([]);
  const [soundboardPage, setSoundboardPage] = useState<"A" | "B" | "C">("A");
  // DM Toolkit state (dmTool, dmMode, combatants, encounter tables,
  // countdown timers, XP ledger, recap, name/roll history, currentTurnIdx)
  // and its SQLite persisters live in useDMToolkit; instantiated below.
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
    { blob: AnySyncBlob; path: string } | null
  >(null);
  // Cloud sync (PR-5) — state + handlers extracted to useCloudSync; the
  // hook is instantiated below once the syncable inputs are in scope.
  // Mirror of the persisted Sentry opt-in so the Help toggle reflects
  // the saved state. Source of truth lives in lib/telemetry.ts; this
  // is just the render-side mirror.
  const [telemetryEnabled, setTelemetryEnabledState] = useState(false);
  // References (DM Toolkit wishlist) — wishlist rows persisted to
  // SQLite. Loaded once at boot; handlers re-list after every mutation.
  const [references, setReferences] = useState<TrackReference[]>([]);
  // ── Plan / license (PR-8) ──
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseEffective, setLicenseEffective] = useState<Tier>("demo");
  const [licensePurchased, setLicensePurchased] = useState<Tier>("demo");
  const [licenseEmail, setLicenseEmail] = useState<string | undefined>(undefined);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseError, setLicenseError] = useState<string | undefined>(undefined);
  const [licenseStatus, setLicenseStatus] = useState<string | undefined>(undefined);
  /**
   * Track-picker overlay state. The discriminator on `target` controls
   * what the pick callback assigns:
   *   - "pad" → soundboard pad assignment via handlePadAssign
   *   - "turnSound" → combatant turn-sound via handleCombatantsChange
   *   - "encounterEntry" → encounter-table entry track binding
   *   - "timerStinger" → countdown-timer stinger binding
   */
  const [pickerOverlay, setPickerOverlay] = useState<
    | { x: number; y: number; target: { kind: "pad"; page: "A" | "B" | "C"; slot: number } }
    | { x: number; y: number; target: { kind: "turnSound"; combatantId: string } }
    | {
        x: number;
        y: number;
        target: { kind: "encounterEntry"; tableId: string; entryId: string };
      }
    | { x: number; y: number; target: { kind: "timerStinger"; timerId: string } }
    | null
  >(null);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  // DM Toolkit slice — owns dmMode / dmTool / combatants / encounter
  // tables / countdown timers / XP ledger / recap moments / name + roll
  // history / currentTurnIdx, plus the persisters + a reloadFromDb()
  // call we hand to refreshSyncableFromDb after a cloud merge.
  const dm = useDMToolkit();

  // Audio settings slice — fadeMs / masterVolume / duckingPct, their
  // persisters, the "apply master gain to backend" side effect, and a
  // reloadFromDb() also called from refreshSyncableFromDb.
  const audio = useAudioSettings();

  // Tracks-by-category map, lifted above usePlayback so playNext's
  // category-pool fallback (queue exhausted → shuffle current track's
  // category) can read it without a circular dep.
  const tracksByCategory = useMemo(() => {
    const map = new Map<CategoryId, Track[]>();
    for (const t of tracks) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [tracks]);

  // Playback / transport slice — owns playback state, the playTrack
  // closure (crossfade + onEnded queue advancement + loop self-crossfade),
  // togglePlay / prev / next / seek / seekRelative / stopAll / cycleLoop,
  // plus the loopMode + queue refs that fix the stale-closure bug.
  const {
    playback,
    isPlaying,
    currentTime,
    trackDurationSec,
    queue,
    loopMode,
    setQueue,
    playTrack,
    togglePlay,
    prev: playPrev,
    next: playNext,
    seek,
    seekRelative,
    stopAll,
    cycleLoop,
    reloadFromDb: reloadPlaybackFromDb,
  } = usePlayback({
    tracks,
    setTracks,
    fadeMs: audio.fadeMs,
    tracksByCategory,
  });

  // ── Derived ─────────────────────────────────────────────────────────────
  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === playback?.trackId),
    [tracks, playback],
  );

  // ── Player-view (handout) window ─────────────────────────────────────────
  const [playerViewOpen, setPlayerViewOpen] = useState(false);
  const handoutWinRef = useRef<WebviewWindow | null>(null);
  // Latest now-playing payload, mirrored to a ref so the (once-registered)
  // handout-ready listener can reply with current state on open.
  const handoutPayloadRef = useRef<HandoutPayload>(null);

  // Mirror now-playing state to the handout window whenever it moves.
  useEffect(() => {
    const payload: HandoutPayload = currentTrack
      ? {
          title: currentTrack.title,
          pack: currentTrack.pack,
          categoryId: currentTrack.category,
          playing: isPlaying,
          currentSec: currentTime,
          durationSec: trackDurationSec,
          theme,
        }
      : null;
    handoutPayloadRef.current = payload;
    void emit(HANDOUT_EVENT, payload);
  }, [currentTrack, isPlaying, currentTime, trackDurationSec, theme]);

  // A freshly-opened handout announces itself; reply with current state so
  // it isn't blank until the next change (e.g. when paused).
  useEffect(() => {
    const unlisten = listen(HANDOUT_READY_EVENT, () => {
      void emit(HANDOUT_EVENT, handoutPayloadRef.current);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  function handleTogglePlayerView() {
    const existing = handoutWinRef.current;
    if (existing) {
      void existing.close();
      handoutWinRef.current = null;
      setPlayerViewOpen(false);
      return;
    }
    const win = new WebviewWindow("handout", {
      url: "index.html?view=handout",
      title: "Major Ambience — Player View",
      width: 1280,
      height: 720,
      minWidth: 640,
      minHeight: 360,
    });
    handoutWinRef.current = win;
    setPlayerViewOpen(true);
    void win.once("tauri://destroyed", () => {
      handoutWinRef.current = null;
      setPlayerViewOpen(false);
    });
    void win.once("tauri://error", (err) => {
      console.error("[handout] window error:", err);
      handoutWinRef.current = null;
      setPlayerViewOpen(false);
    });
  }

  // tracksByCategory is lifted up next to the usePlayback call site
  // (playNext's fallback needs it).
  const countByCategory = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const c of CATEGORIES) map.set(c.id, tracksByCategory.get(c.id)?.length ?? 0);
    return map;
  }, [tracksByCategory]);

  // Filled-slot count per soundboard page — drives the Soundboard sidebar
  // badges ("Page A · 3 of 8").
  const soundboardSlotCounts = useMemo(() => {
    const counts: Record<"A" | "B" | "C", number> = { A: 0, B: 0, C: 0 };
    for (const s of soundboard) {
      if (s.page === "A" || s.page === "B" || s.page === "C") counts[s.page] += 1;
    }
    return counts;
  }, [soundboard]);

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
        .filter(
          (t) => t.category !== "removed" && (t.grade === "S" || t.grade === "A"),
        )
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
        .filter(
          (t) =>
            t.category !== "removed" &&
            t.lastPlayedAt !== undefined &&
            t.lastPlayedAt !== null,
        )
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

  // The loopMode + queue mirrors that fix playTrack's stale-
  // closure bug live inside usePlayback now.

  // Toast-style auto-dismiss for the scan / status pill. Each new message
  // resets the timer; clearing the message immediately on unmount keeps
  // the React tree consistent.
  useEffect(() => {
    if (!scanStatus) return undefined;
    const id = window.setTimeout(() => setScanStatus(""), 4500);
    return () => window.clearTimeout(id);
  }, [scanStatus]);

  /** Live counts for the Favorites + Recently played + Removed sidebar rows.
   *  Favorites and Recent exclude "removed" tracks so the user's soft-delete
   *  doesn't keep haunting those library shortcuts. The Removed count
   *  obviously *only* counts those. */
  const favoritesCount = useMemo(
    () =>
      tracks.filter(
        (t) => t.category !== "removed" && (t.grade === "S" || t.grade === "A"),
      ).length,
    [tracks],
  );
  const recentCount = useMemo(
    () =>
      tracks.filter(
        (t) =>
          t.category !== "removed" &&
          t.lastPlayedAt !== undefined &&
          t.lastPlayedAt !== null,
      ).length,
    [tracks],
  );
  const removedCount = useMemo(
    () => tracks.filter((t) => t.category === "removed").length,
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
        // Audio settings (fade_ms / master_volume / ducking_pct) hydrate
        // via useAudioSettings's own boot effect.
        const root = await getConfig(db, "root_folder_name");
        setRootFolderName(root);
        // loop_mode hydrates via usePlayback's own boot effect.
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
        // DM Toolkit state hydrates via useDMToolkit's own boot effect.
        // Mirror the persisted Sentry opt-in into UI state so the
        // Help toggle shows the right initial position. initTelemetry
        // (in main.tsx) reads the same flag and starts the client
        // with `enabled` matching it.
        setTelemetryEnabledState(await readTelemetryEnabled());
        setReferences(await listReferences(db));
      } catch (err) {
        console.error("[library] init failed:", err);
      }
    })();
  }, []);

  // Reload everything a remote merge could have touched, straight from
  // SQLite. Mirrors the manual-import refresh but also pulls the config-
  // driven UI bits (theme/fade/volume/ducking/DM mode/NPC history) since a
  // cloud merge can change those too.
  const refreshSyncableFromDb = useCallback(async () => {
    const db = await getDb();
    setTracks(await listTracks(db));
    setScenes(await listScenes(db));
    setSoundboard(await listSoundboard(db));
    const themeRaw = (await getConfig(db, "theme")) as ThemeId | undefined;
    if (themeRaw && KNOWN_THEMES.includes(themeRaw)) {
      setTheme(themeRaw);
      applyTheme(themeRaw);
    }
    // Audio settings + DM-managed slices + playback's loop_mode reload
    // through their hooks so the SQLite plumbing lives in one place each.
    await audio.reloadFromDb();
    await dm.reloadFromDb();
    await reloadPlaybackFromDb();
  }, [audio, dm, reloadPlaybackFromDb]);

  // Cloud sync — the hook owns boot-load, runSync, the 4s debounced
  // background push, the sync signature, and the user-facing handlers.
  // Library passes the syncable inputs plus the DB refresh callback so
  // the wider library state can re-hydrate after a remote merge.
  const cloud = useCloudSync({
    syncable: {
      tracks,
      scenes,
      soundboard,
      theme,
      fadeMs: audio.fadeMs,
      masterVolume: audio.masterVolume,
      duckingPct: audio.duckingPct,
      dmMode: dm.dmMode,
      nameHistory: dm.nameHistory,
    },
    refreshSyncableFromDb,
    setScanStatus,
  });

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
    editingScene !== null ||
    pendingImport !== null ||
    cloud.cloudSyncOpen ||
    licenseOpen ||
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
    } else if (cloud.cloudSyncOpen) {
      cloud.closeCloudSync();
    } else if (licenseOpen) {
      setLicenseOpen(false);
    } else if (saveDialogOpen) {
      setSaveDialogOpen(false);
    } else if (editingScene) {
      setEditingScene(null);
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
      onTogglePlay: togglePlay,
      onPrev: playPrev,
      onNext: playNext,
      onSeekBack: () => seekRelative(-5),
      onSeekForward: () => seekRelative(5),
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
      onCycleLoop: () => void cycleLoop(),
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
   *
   * The `typeof` guard is load-bearing: if a caller hands this to a DOM
   * event handler directly (e.g. `onClick={handleOpenFolder}`), React
   * passes the MouseEvent as the first arg. That event would otherwise
   * fall through as a truthy `forcedPath`, hit the Tauri `invoke()`
   * below, and crash inside the IPC serializer with the cryptic
   * "Converting circular structure to JSON ─→ starting at object with
   * constructor 'HTMLButtonElement'" toast. Caught one instance at
   * the DesktopHeader call site; this guard prevents the next one.
   */
  const handleOpenFolder = useCallback(async (forcedPath?: string) => {
    let picked: string | null;
    if (typeof forcedPath === "string" && forcedPath.length > 0) {
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

  /**
   * Fill in missing `durationMs` values for the given tracks (or every
   * track when called with no args). Runs in the background — probes
   * file metadata via a hidden `<audio preload="metadata">`, persists
   * each duration to SQLite as it resolves, and patches the React
   * `tracks` state incrementally so the TIME column fills in live
   * instead of blocking on the whole batch.
   *
   * Re-entry guard: `isScanningDurations` ref-mirrors the state so a
   * second call while one is in flight is a no-op (e.g. the user
   * mashing the manual button or a re-render triggering the effect).
   */
  const handleScanDurations = useCallback(
    async (subset?: readonly Track[]) => {
      if (isScanningDurations) return;
      const db = await getDb();
      // Snapshot the live state via a setter callback so we always
      // scan the freshest list, even if `tracks` in this closure is
      // stale from when the effect captured it.
      const source = subset ?? tracks;
      const todo = tracksMissingDuration(source);
      if (todo.length === 0) return;

      setIsScanningDurations(true);
      try {
        await scanDurations(todo, {
          onProgress: ({ done, total, lastResult }) => {
            if (!lastResult) return;
            // Persist successful probes only — a 0-duration result
            // means the file errored or timed out, leaving the row
            // null so a future retry can pick it up.
            if (lastResult.durationMs > 0) {
              void setDuration(db, lastResult.trackId, lastResult.durationMs);
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === lastResult.trackId
                    ? { ...t, durationMs: lastResult.durationMs }
                    : t,
                ),
              );
            }
            // Light status line so the user knows it's working —
            // skipped after the batch finishes so the next scan-step
            // message can replace it.
            if (done < total) {
              setScanStatus(
                `Reading durations… ${done.toLocaleString()} / ${total.toLocaleString()}`,
              );
            }
          },
        });
        setScanStatus(
          `Read durations for ${todo.length.toLocaleString()} track${todo.length === 1 ? "" : "s"}.`,
        );
      } catch (err) {
        console.error("[library] duration scan failed:", err);
        setScanStatus(
          `Duration scan failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsScanningDurations(false);
      }
    },
    [isScanningDurations, tracks],
  );

  // Auto-scan durations whenever the track list grows (initial load or
  // a fresh folder scan). Fires only when we know there's something to
  // probe so we don't repeatedly walk a fully-probed library on every
  // render. The handler's own re-entry guard makes the double-fire
  // (initial mount + folder scan) safe.
  const lastAutoScanIds = useRef<string>("");
  useEffect(() => {
    const missing = tracksMissingDuration(tracks);
    if (missing.length === 0) {
      lastAutoScanIds.current = "";
      return;
    }
    // Fingerprint the set of missing IDs so we don't re-trigger when a
    // probe lands and `tracks` updates with one fewer null duration —
    // the existing scan picks that up via its own iteration.
    const fingerprint = missing
      .slice(0, 50)
      .map((t) => t.id)
      .join("|") + `:${missing.length}`;
    if (fingerprint === lastAutoScanIds.current) return;
    lastAutoScanIds.current = fingerprint;
    void handleScanDurations(missing);
  }, [tracks, handleScanDurations]);

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
  // Transport handlers live in usePlayback (playTrack, togglePlay,
  // cycleLoop, stopAll, seek, seekRelative, prev, next). The local
  // wrapper handleStopAll exists to add the "Stopped." status toast on
  // top of the hook's primitive.
  function handleStopAll() {
    stopAll();
    setScanStatus("Stopped.");
  }

  async function handleShuffleCategory() {
    if (categoryTracks.length === 0) return;
    const shuffled = weightedShuffle(categoryTracks);
    if (shuffled.length === 0) return;
    setQueue(shuffled);
    const first = shuffled[0];
    if (first) await playTrack(first);
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
    if (first) await playTrack(first);
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
    if (first) await playTrack(first);
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

  /**
   * Soft-delete: move a track into the "removed" pseudo-category.
   * Persists + patches local state. If the track is currently playing
   * it keeps playing — soft-delete only hides it from the library
   * views, the file is untouched on disk.
   */
  async function handleRemoveTrack(track: Track) {
    await handleSetTrackCategory(track.id, "removed", null);
  }

  /**
   * Inverse of remove. Re-runs the auto-categorizer over the track's
   * filename + pack folder so the track lands in its best-guess
   * category, the same way it would on a fresh folder scan. The
   * original pre-removal category isn't stored anywhere, so this is
   * the closest reconstruction we can do without a new schema column.
   */
  async function handleRestoreTrack(track: Track) {
    const result = categorize(track.title, track.pack);
    await handleSetTrackCategory(
      track.id,
      result.category,
      result.subcategory ?? null,
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

  // Audio settings persisters live in useAudioSettings.

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

  // Cloud sync handlers — extracted to useCloudSync.

  // ── Plan / license handlers ──────────────────────────────────────────────
  async function openLicense() {
    setTutorialsMenu(null);
    setLicenseError(undefined);
    setLicenseStatus(undefined);
    setLicenseEffective(currentTier());
    setLicensePurchased(readPurchasedTier());
    setLicenseEmail(await getLicenseEmail());
    setLicenseOpen(true);
  }

  async function handleApplyLicense(key: string) {
    setLicenseBusy(true);
    setLicenseError(undefined);
    setLicenseStatus(undefined);
    try {
      const res = await applyLicenseKey(key);
      if (res.ok) {
        setLicensePurchased(res.claims.tier);
        setLicenseEffective(currentTier());
        setLicenseEmail(await getLicenseEmail());
        setLicenseStatus(`License applied — ${res.claims.tier} plan unlocked.`);
        setScanStatus(`License applied — ${res.claims.tier} plan.`);
      } else {
        setLicenseError(res.reason);
      }
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : String(err));
    } finally {
      setLicenseBusy(false);
    }
  }

  async function handleClearLicense() {
    await clearLicense();
    setLicensePurchased("demo");
    setLicenseEffective(currentTier());
    setLicenseEmail(undefined);
    setLicenseStatus("License removed from this device.");
  }

  // ── Themes ─────────────────────────────────────────────────────────────
  async function handlePickTheme(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
    const db = await getDb();
    await setConfig(db, "theme", id);
  }

  // DM Toolkit persisters live in useDMToolkit.

  function handleTurnChange(newIdx: number) {
    dm.setCurrentTurnIdx(newIdx);
    // Fire turn sound through soundboard bus (auto-ducks music).
    const sorted = [...dm.combatants].sort(
      (a, b) => b.initiative - a.initiative,
    );
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
    const next = !dm.dmMode;
    // Close any open popovers/menus that are no longer reachable when
    // entering DM mode — kept here (not in the hook) since these are
    // non-DM dialog flags.
    if (next) {
      setPinMenu(null);
      setTutorialsMenu(null);
      setSaveDialogOpen(false);
    }
    await dm.setDmMode(next);
  }

  // ── References (DM Toolkit wishlist) ──────────────────────────────────
  // Not extracted to a hook yet — keep here while the surface is small.
  // Promote to useReferences if it grows beyond CRUD + import.
  async function handleAddReference(ref: TrackReference) {
    const db = await getDb();
    await upsertReference(db, ref);
    setReferences(await listReferences(db));
  }

  async function handleDeleteReference(id: string) {
    const db = await getDb();
    await deleteReference(db, id);
    setReferences(await listReferences(db));
  }

  async function handleToggleReferenceOwned(id: string, owned: boolean) {
    const db = await getDb();
    await setReferenceOwned(db, id, owned);
    setReferences(await listReferences(db));
  }

  async function handleImportDndGuide() {
    const db = await getDb();
    const now = Math.floor(Date.now() / 1000);
    const seeds = DND_MUSIC_GUIDE_SEEDS.map((s) => ({
      ...s,
      addedAt: now,
      owned: false,
    }));
    const inserted = await seedReferences(db, seeds);
    setReferences(await listReferences(db));
    setScanStatus(
      inserted > 0
        ? `Imported ${inserted} reference${inserted === 1 ? "" : "s"} from the DnD guide.`
        : "DnD guide already imported — no new entries.",
    );
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
      fadeMs: audio.fadeMs,
      duckingPct: 40,
      volumes: { [activeCategory]: audio.masterVolume } as Partial<
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
    await audio.setFadeMs(scene.fadeMs);
    const sceneVol = scene.volumes[scene.primaryCategory];
    if (typeof sceneVol === "number") {
      await audio.setMasterVolume(sceneVol);
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
      await playTrack(first);
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

  /**
   * Persist edits from the SceneEditDialog. The dialog has already
   * built the new Scene object with whatever fields the user changed;
   * we just write it back. `saveScene` is upsert by id, so it overwrites
   * the existing row.
   */
  async function handleUpdateScene(updated: Scene) {
    const db = await getDb();
    await saveScene(db, updated);
    const refreshed = await listScenes(db);
    setScenes(refreshed);
    setEditingScene(null);
    setScanStatus(`Updated scene "${updated.name}".`);
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
        // Wrap so React's onClick MouseEvent doesn't leak in as
        // `forcedPath`. `onOpenFolder` is typed `() => void` upstream
        // but `handleOpenFolder` takes an optional string — passing
        // the bare reference would propagate the MouseEvent into the
        // Tauri IPC and crash the serializer.
        onOpenFolder={() => void handleOpenFolder()}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setSearchOpen(true);
        }}
        onSearchFocus={() => setSearchOpen(true)}
        searchInputRef={searchInputRef}
        hasUnseenTutorials={hasUnseenTutorials}
        onOpenTutorials={(anchor) => setTutorialsMenu(anchor)}
        dmMode={dm.dmMode}
        onToggleDmMode={() => void handleToggleDmMode()}
        playerViewOpen={playerViewOpen}
        onTogglePlayerView={handleTogglePlayerView}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          position: "relative",
        }}
      >
        {tab === "scenes" ? (
          <DesktopScenesSidebar
            scenes={scenes}
            activeSceneId={activeSceneId}
            canSave={tracks.length > 0}
            onOpenSave={() => setSaveDialogOpen(true)}
            onRestore={(s) => void handleRestoreScene(s)}
          />
        ) : tab === "soundboard" ? (
          <DesktopSoundboardSidebar
            page={soundboardPage}
            onPageChange={setSoundboardPage}
            slotCounts={soundboardSlotCounts}
          />
        ) : tab === "dm" ? (
          <DesktopDmSidebar
            tool={dm.dmTool}
            onToolChange={dm.setDmTool}
            combatantsCount={dm.combatants.length}
          />
        ) : (
          <DesktopSidebar
            selected={activeCategory}
            activeView={activeView}
            onSelect={(id) => {
              setTab("library");
              setActiveCategory(id);
              setActiveView("category");
            }}
            onSelectFavorites={() => {
              setTab("library");
              setActiveView("favorites");
            }}
            onSelectRecent={() => {
              setTab("library");
              setActiveView("recent");
            }}
            onSelectRemoved={() => {
              setTab("library");
              setActiveCategory("removed");
              setActiveView("category");
            }}
            favoritesCount={favoritesCount}
            recentCount={recentCount}
            removedCount={removedCount}
            totalTrackCount={tracks.length}
            countByCategory={countByCategory}
            rootFolderName={rootFolderName}
            lastScannedAt={lastScannedAt}
            isScanning={isScanning}
            onRescan={
              rootFolderPath && !dm.dmMode
                ? () => void handleOpenFolder(rootFolderPath)
                : undefined
            }
          />
        )}

        {tab === "library" ? (
          <DesktopLibraryView
            meta={viewMeta}
            categoryTracks={categoryTracks}
            playingTrackId={playback?.trackId}
            onPlayTrack={(t, ctx) => void playTrack(t, ctx)}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onShuffleCategory={() => void handleShuffleCategory()}
            onTrackContextMenu={(t, x, y) =>
              dm.dmMode ? undefined : setPinMenu({ track: t, x, y })
            }
            onRemoveTrack={(t) => void handleRemoveTrack(t)}
            onRestoreTrack={(t) => void handleRestoreTrack(t)}
            dmMode={dm.dmMode}
          />
        ) : tab === "scenes" ? (
          <DesktopScenesView
            scenes={scenes}
            activeSceneId={activeSceneId}
            canSave={tracks.length > 0}
            onOpenSave={() => setSaveDialogOpen(true)}
            onRestore={(s) => void handleRestoreScene(s)}
            onDelete={(s) => void handleDeleteScene(s)}
            onEdit={(s) => setEditingScene(s)}
            dmMode={dm.dmMode}
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
            dmMode={dm.dmMode}
          />
        ) : (
          <DesktopDmToolkit
            tool={dm.dmTool}
            nameHistory={dm.nameHistory}
            onNameHistory={(next) => void dm.setNameHistory(next)}
            rollHistory={dm.rollHistory}
            onRollHistory={(next) => void dm.setRollHistory(next)}
            combatants={dm.combatants}
            currentTurnIdx={dm.currentTurnIdx}
            tracksById={tracksById}
            onCombatantsChange={(next) => void dm.setCombatants(next)}
            onTurnChange={handleTurnChange}
            onPickTurnSound={(combatantId, x, y) =>
              setPickerOverlay({ x, y, target: { kind: "turnSound", combatantId } })
            }
            encounterTables={dm.encounterTables}
            onEncounterTables={(next) => void dm.setEncounterTables(next)}
            onPickEntryTrack={(tableId, entryId, x, y) =>
              setPickerOverlay({ x, y, target: { kind: "encounterEntry", tableId, entryId } })
            }
            onPlayTrack={(trackId) => {
              const t = tracks.find((tk) => tk.id === trackId);
              if (t) void playTrack(t);
            }}
            onPlayCategory={(categoryId) => void handlePlayRandomFromCategory(categoryId)}
            countdownTimers={dm.countdownTimers}
            onCountdownTimers={(next) => void dm.setCountdownTimers(next)}
            onPickStinger={(timerId, x, y) =>
              setPickerOverlay({ x, y, target: { kind: "timerStinger", timerId } })
            }
            onFireStinger={(trackId) => {
              const t = tracks.find((tk) => tk.id === trackId);
              // Reserved pseudo-pad slot (90) on the soundboard bus so the
              // stinger auto-ducks the music, same mechanism as turn sounds.
              if (t) void firePad("A", 90, t, { loop: false, volume: 0.95 });
            }}
            xpLedger={dm.xpLedger}
            onXpLedger={(next) => void dm.setXpLedger(next)}
            recapMoments={dm.recapMoments}
            onRecapMoments={(next) => void dm.setRecapMoments(next)}
            {...(currentTrack ? { nowPlayingLabel: currentTrack.title } : {})}
            references={references}
            onAddReference={(ref) => void handleAddReference(ref)}
            onDeleteReference={(id) => void handleDeleteReference(id)}
            onToggleReferenceOwned={(id, owned) =>
              void handleToggleReferenceOwned(id, owned)
            }
            onOpenReferenceUrl={(url) => {
              void openUrl(url).catch((err) => {
                setScanStatus(
                  `Open failed: ${err instanceof Error ? err.message : String(err)}`,
                );
              });
            }}
            onImportDndGuide={() => void handleImportDndGuide()}
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
          dmMode={dm.dmMode}
        />
      </div>

      {scanStatus ? (
        <div
          style={{
            // Toast-like — bottom-right, above the transport, so status
            // messages don't sit awkwardly under the search and category hero.
            position: "absolute",
            bottom: 110,
            right: 24,
            zIndex: 6,
            padding: "8px 14px",
            borderRadius: 10,
            background: "var(--mc-chromeBg)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--mc-goldEdge)",
            color: "var(--mc-gold)",
            fontSize: 12,
            maxWidth: 580,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
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
          onOpenLicense={() => void openLicense()}
          onOpenCloudSync={() => {
            setTutorialsMenu(null);
            cloud.openCloudSync();
          }}
          onExportSync={() => void handleExportSync()}
          onImportSync={() => void handleImportSyncPick()}
          onReportBug={() => {
            // Opens a GitHub-issue URL with the recent diag dump
            // pre-filled. URL is built off the diag buffer the user
            // has accumulated this session; they can still edit before
            // submitting. openUrl goes through the system browser via
            // the opener plugin (capability is in default.json).
            void (async () => {
              try {
                await openUrl(getBugReportUrl());
              } catch (err) {
                setScanStatus(
                  `Report failed: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
              setTutorialsMenu(null);
            })();
          }}
          onCopyDiagnostics={() => {
            // Clipboard write is async; the await keeps the toast and
            // the actual copy in lockstep. Failure swallows to a toast
            // rather than throwing — older WebView2 builds gate this
            // behind a user gesture, which menu-click satisfies.
            void (async () => {
              try {
                await navigator.clipboard.writeText(getDiagnosticsText());
                setScanStatus("Diagnostics copied to clipboard.");
              } catch (err) {
                setScanStatus(
                  `Copy failed: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
              setTutorialsMenu(null);
            })();
          }}
          telemetryEnabled={telemetryEnabled}
          onSetTelemetryEnabled={(enabled) => {
            // Fire-and-forget — the persister handles its own errors and
            // flips the live Sentry client immediately so the user can
            // toggle on/off without relaunching.
            void setTelemetryEnabled(enabled).then(() => {
              setTelemetryEnabledState(enabled);
              setScanStatus(
                enabled
                  ? "Anonymous diagnostics enabled."
                  : "Anonymous diagnostics disabled.",
              );
            });
          }}
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

      {cloud.cloudSyncOpen ? (
        <SyncSettings
          signedIn={cloud.signedIn}
          {...(cloud.accountEmail ? { accountEmail: cloud.accountEmail } : {})}
          {...(cloud.deviceLabel ? { deviceLabel: cloud.deviceLabel } : {})}
          baseUrl={cloud.baseUrl}
          {...(cloud.lastSyncedAt !== undefined ? { lastSyncedAt: cloud.lastSyncedAt } : {})}
          syncing={cloud.syncing}
          {...(cloud.error ? { error: cloud.error } : {})}
          {...(cloud.syncResult ? { syncResult: cloud.syncResult } : {})}
          onRequestLink={(email) => void cloud.handleRequestLink(email)}
          onVerify={(code) => void cloud.handleVerify(code)}
          onSyncNow={() => void cloud.runCloudSync(true)}
          onSignOut={() => void cloud.handleSignOut()}
          onSetBaseUrl={(url) => void cloud.handleSetBaseUrl(url)}
          onSetDeviceLabel={(label) => void cloud.handleSetDeviceLabel(label)}
          onClose={() => cloud.closeCloudSync()}
        />
      ) : null}

      {licenseOpen ? (
        <LicenseDialog
          effectiveTier={licenseEffective}
          purchasedTier={licensePurchased}
          {...(licenseEmail ? { email: licenseEmail } : {})}
          busy={licenseBusy}
          {...(licenseError ? { error: licenseError } : {})}
          {...(licenseStatus ? { status: licenseStatus } : {})}
          onApply={(key) => void handleApplyLicense(key)}
          onClear={() => void handleClearLicense()}
          onClose={() => setLicenseOpen(false)}
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
          combatants={dm.combatants}
          onPin={(page, slot) => {
            void handlePadAssign(page, slot, pinMenu.track.id);
            setPinMenu(null);
            setScanStatus(
              `Pinned "${pinMenu.track.title}" to ${page}·${slot}.`,
            );
          }}
          onSetTurnSound={(combatantId) => {
            const target = dm.combatants.find((c) => c.id === combatantId);
            if (!target) {
              setPinMenu(null);
              return;
            }
            void dm.setCombatants(
              dm.combatants.map((c) =>
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
          fadeMs={audio.fadeMs}
          masterVolume={audio.masterVolume}
          onSave={(name) => void handleSaveScene(name)}
          onCancel={() => setSaveDialogOpen(false)}
        />
      ) : null}

      {editingScene ? (
        <SceneEditDialog
          scene={editingScene}
          currentQueue={queue}
          onSave={(updated) => void handleUpdateScene(updated)}
          onCancel={() => setEditingScene(null)}
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
              : pickerOverlay.target.kind === "encounterEntry"
                ? "Encounter track"
                : pickerOverlay.target.kind === "timerStinger"
                  ? "Timer stinger"
                  : "Turn sound"
          }
          subtitle={
            pickerOverlay.target.kind === "pad"
              ? "Pick a track to assign to this soundboard pad."
              : pickerOverlay.target.kind === "encounterEntry"
                ? "Plays when this entry is rolled."
                : pickerOverlay.target.kind === "timerStinger"
                  ? "Fires when this timer hits zero (ducks the music)."
                  : (() => {
                      const t = pickerOverlay.target;
                      if (t.kind !== "turnSound") return "";
                      const target = dm.combatants.find((c) => c.id === t.combatantId);
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
            } else if (target.kind === "encounterEntry") {
              const next = dm.encounterTables.map((tbl) =>
                tbl.id === target.tableId
                  ? {
                      ...tbl,
                      entries: tbl.entries.map((en) =>
                        en.id === target.entryId
                          ? // Binding is exclusive — a track clears any category.
                            (() => {
                              const { categoryId: _c, ...rest } = en;
                              void _c;
                              return { ...rest, trackId: track.id };
                            })()
                          : en,
                      ),
                    }
                  : tbl,
              );
              void dm.setEncounterTables(next);
              setScanStatus(`Bound "${track.title}" to an encounter entry.`);
            } else if (target.kind === "timerStinger") {
              const next = dm.countdownTimers.map((tm) =>
                tm.id === target.timerId ? { ...tm, stingerTrackId: track.id } : tm,
              );
              void dm.setCountdownTimers(next);
              setScanStatus(`Set "${track.title}" as a timer stinger.`);
            } else {
              const next = dm.combatants.map((c) =>
                c.id === target.combatantId
                  ? { ...c, turnSoundTrackId: track.id }
                  : c,
              );
              void dm.setCombatants(next);
              const target_name =
                dm.combatants.find((c) => c.id === target.combatantId)?.name ?? "combatant";
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
            void playTrack(t);
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
            if (!dm.dmMode) setPinMenu({ track: t, x, y });
          }}
          onDismiss={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
        />
      ) : null}

      {selectedIds.size > 0 && tab === "library" && !dm.dmMode ? (
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
        fadeMs={audio.fadeMs}
        masterVolume={audio.masterVolume}
        duckingPct={audio.duckingPct}
        onTogglePlay={togglePlay}
        onPrev={playPrev}
        onNext={playNext}
        onSeek={seek}
        onCycleGrade={handleCycleGrade}
        onSetFadeMs={(ms) => void audio.setFadeMs(ms)}
        onSetVolume={(v) => void audio.setMasterVolume(v)}
        onSetDuckingPct={(p) => void audio.setDuckingPct(p)}
        onStopAll={handleStopAll}
        anyPlaying={anyPlaying}
        loopMode={loopMode}
        onCycleLoop={() => void cycleLoop()}
        dmMode={dm.dmMode}
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
