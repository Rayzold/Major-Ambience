// Library orchestrator — holds playback state, coordinates layout pieces.
// Layout components live under src/layout/ and stay dumb-visual.

import { useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
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
  setDuration,
  setGrade as persistGrade,
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
import { PinToSlotMenu } from "./layout/PinToSlotMenu.js";
import { SaveSceneDialog } from "./layout/SaveSceneDialog.js";
import { SearchOverlay } from "./layout/SearchOverlay.js";
import { SyncImportConfirm } from "./layout/SyncImportConfirm.js";
import { Tutorial } from "./layout/Tutorial.js";
import { TutorialsMenu } from "./layout/TutorialsMenu.js";
import { TUTORIALS } from "./layout/tutorials.js";
import type { SyncBlob } from "@mc/core";
import { applyLoadedBlob, exportSyncBlob, pickAndLoadSyncBlob } from "./lib/sync.js";
import {
  firePad,
  isPadPlaying,
  setDuckingPct as setPadDuckingPct,
  setPadVolume,
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
  const [activeCategory, setActiveCategory] = useState<CategoryId>("combat");
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

  const categoryTracks = useMemo(
    () =>
      (tracksByCategory.get(activeCategory) ?? [])
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title)),
    [tracksByCategory, activeCategory],
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

  // Ctrl+K focuses the search input from anywhere.
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
  async function handleOpenFolder() {
    setScanStatus("Picking folder…");
    const picked = await openDialog({ directory: true, multiple: false });
    if (!picked || typeof picked !== "string") {
      setScanStatus("");
      return;
    }
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
      await setConfig(db, "root_folder_name", folderName);
      const removedNote = removed > 0 ? ` · removed ${removed} orphan` : "";
      setScanStatus(
        `${fromDb.length.toLocaleString()} tracks · ${tallyCategories(fromDb)}${removedNote}.`,
      );
    } catch (err) {
      console.error("[library] scan failed:", err);
      setScanStatus(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handlePlayTrack(track: Track) {
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
        // Advance queue automatically if there is one.
        const idx = queue.findIndex((t) => t.id === track.id);
        if (idx !== -1 && idx + 1 < queue.length) {
          const upcoming = queue[idx + 1];
          if (upcoming) void handlePlayTrack(upcoming);
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

  function handleSeek(sec: number) {
    if (!playback) return;
    getAudioBackend().seek(playback.handle, sec);
    setCurrentTime(sec);
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
          onSelect={setActiveCategory}
          totalTrackCount={tracks.length}
          countByCategory={countByCategory}
          rootFolderName={rootFolderName}
        />

        {tab === "library" ? (
          <DesktopLibraryView
            activeCategory={activeCategory}
            categoryTracks={categoryTracks}
            playingTrackId={playback?.trackId}
            onPlayTrack={(t) => void handlePlayTrack(t)}
            onShuffleCategory={() => void handleShuffleCategory()}
            onTrackContextMenu={(t, x, y) =>
              dmMode ? undefined : setPinMenu({ track: t, x, y })
            }
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
