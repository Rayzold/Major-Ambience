// Library orchestrator — holds playback state, coordinates layout pieces.
// Layout components live under src/layout/ and stay dumb-visual.

import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { CategoryId, Grade, Track, TrackHandle } from "@mc/core";
import { crossfade, weightedShuffle } from "@mc/core";
import {
  bumpPlayCount,
  deleteTracksNotIn,
  getConfig,
  getConfigNumber,
  getDb,
  insertTracks,
  listTracks,
  setConfig,
  setDuration,
  setGrade as persistGrade,
} from "@mc/data";
import { CATEGORIES, findCategory } from "@mc/ui";
import { scanFolderToTracks } from "./lib/scan.js";
import { getAudioBackend } from "./lib/audio.js";
import { DesktopHeader } from "./layout/DesktopHeader.js";
import { DesktopSidebar } from "./layout/DesktopSidebar.js";
import { DesktopLibraryView } from "./layout/DesktopLibraryView.js";
import { DesktopRightRail } from "./layout/DesktopRightRail.js";
import { DesktopTransport } from "./layout/DesktopTransport.js";

const DEFAULT_FADE_MS = 2000;
const DEFAULT_VOLUME = 0.85;
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
  const [tab, setTab] = useState<"library" | "scenes" | "soundboard">("library");
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDurationSec, setTrackDurationSec] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [fadeMs, setFadeMs] = useState(DEFAULT_FADE_MS);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_VOLUME);

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
        const root = await getConfig(db, "root_folder_name");
        setRootFolderName(root);
      } catch (err) {
        console.error("[library] init failed:", err);
      }
    })();
  }, []);

  // Apply master volume changes to the audio bus.
  useEffect(() => {
    getAudioBackend().setMasterGain(masterVolume);
  }, [masterVolume]);

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
          />
        ) : (
          <PlaceholderTab tab={tab} />
        )}

        <DesktopRightRail
          track={currentTrack}
          currentSec={currentTime}
          durationSec={trackDurationSec}
          playing={isPlaying}
          onCycleGrade={handleCycleGrade}
          onSetGrade={handleSetGrade}
          upNext={upNext}
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
            background: "rgba(11,9,19,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(227,182,106,0.25)",
            color: "#e3b66a",
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

      <DesktopTransport
        track={currentTrack}
        currentSec={currentTime}
        durationSec={trackDurationSec}
        playing={isPlaying}
        fadeMs={fadeMs}
        masterVolume={masterVolume}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onCycleGrade={handleCycleGrade}
        onSetFadeMs={(ms) => void handleSetFade(ms)}
        onSetVolume={(v) => void handleSetVolume(v)}
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

function PlaceholderTab({ tab }: { tab: "scenes" | "soundboard" }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
        color: "#b6a890",
        fontStyle: "italic",
        fontSize: 14,
      }}
    >
      <div className="mc-eyebrow">Coming in Phase 2</div>
      <div>
        {tab === "scenes"
          ? "Save and recall multi-category scenes."
          : "A/B/C pages with 24 drag-to-assign pads."}
      </div>
    </div>
  );
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
