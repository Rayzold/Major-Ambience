// Minimal Library screen for the audio-architecture draft-PR milestone.
// Goal: prove the chain end-to-end —
//   user picks folder → Rust walks → categorize → SQLite insert →
//   render list → click track → WebAudioBackend plays it.
//
// The full three-pane prototype port lands in the next phase (post-review).

import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { CategoryId, Track, TrackHandle } from "@mc/core";
import { crossfade } from "@mc/core";
import {
  CATEGORIES,
  CategoryGradient,
  findCategory,
  Glyph,
  T,
  TrackRow,
  type TrackRowData,
} from "@mc/ui";
import { getDb, insertTracks, listTracks, bumpPlayCount } from "@mc/data";
import { scanFolderToTracks } from "./lib/scan.js";
import { getAudioBackend } from "./lib/audio.js";

const CROSSFADE_SECONDS = 2;

type PlaybackState = {
  trackId: string;
  handle: TrackHandle;
};

export function Library() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("combat");
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load any previously-scanned tracks from SQLite on mount.
  useEffect(() => {
    void (async () => {
      try {
        const db = await getDb();
        const existing = await listTracks(db);
        if (existing.length > 0) {
          setTracks(existing);
          setScanStatus(`${existing.length} tracks loaded from index.`);
        }
      } catch (err) {
        console.error("[library] initial load failed:", err);
      }
    })();
  }, []);

  const tracksByCategory = useMemo(() => {
    const map = new Map<CategoryId, Track[]>();
    for (const t of tracks) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [tracks]);

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
      setScanStatus(`Inserting ${scanned.length} tracks…`);
      const db = await getDb();
      await insertTracks(db, scanned);
      const fromDb = await listTracks(db);
      setTracks(fromDb);
      setScanStatus(`${fromDb.length} tracks categorized into ${tallyCategories(fromDb)}.`);
    } catch (err) {
      console.error("[library] scan failed:", err);
      setScanStatus(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handlePlay(track: Track) {
    const backend = getAudioBackend();
    const assetUri = convertFileSrc(track.uri);
    try {
      const next = await backend.loadTrack(assetUri);
      backend.setGain(next, 0);
      const subProgress = backend.onProgress(next, (t) => {
        setCurrentTime(t);
        const raw = backend.getRawHandle(next);
        if (raw && Number.isFinite(raw.audio.duration)) {
          setDuration(raw.audio.duration);
        }
      });
      const subEnded = backend.onEnded(next, () => {
        subProgress();
        subEnded();
      });
      backend.play(next);
      backend.setGain(next, 1, CROSSFADE_SECONDS);

      const previous = playback;
      if (previous) {
        crossfade(previous.handle, next, CROSSFADE_SECONDS, backend);
      }
      setPlayback({ trackId: track.id, handle: next });

      const db = await getDb();
      await bumpPlayCount(db, track.id, Math.floor(Date.now() / 1000));
    } catch (err) {
      console.error("[library] play failed:", err);
      setScanStatus(`Play failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const activeTracks = tracksByCategory.get(activeCategory) ?? [];
  const activeMeta = findCategory(activeCategory);

  return (
    <div
      className="mc-app"
      style={{
        position: "relative",
        height: "100vh",
        background: T.bg,
        color: T.ink,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        overflow: "hidden",
      }}
    >
      <CategoryGradient cat={activeCategory} height={300} intensity={0.45} />

      <header
        style={{
          position: "relative",
          zIndex: 1,
          padding: "20px 28px 14px",
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1
            className="mc-display"
            style={{ margin: 0, fontSize: 28, fontWeight: 600, color: T.ink }}
          >
            Major <em style={{ color: T.gold }}>Ambience</em>
          </h1>
          <span className="mc-eyebrow" style={{ color: T.ink3 }}>
            Library · pre‑alpha
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleOpenFolder}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: T.goldSoft,
              border: `1px solid ${T.goldEdge}`,
              color: T.gold,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Glyph name="folder" size={16} />
            Open Folder
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: T.ink2, minHeight: 16 }}>
          {scanStatus}
        </div>
      </header>

      <main
        className="mc-scroll"
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: 0,
        }}
      >
        <aside
          style={{
            borderRight: `1px solid ${T.rule}`,
            padding: "16px 0",
            overflowY: "auto",
          }}
        >
          {CATEGORIES.map((c) => {
            const count = tracksByCategory.get(c.id)?.length ?? 0;
            const isActive = c.id === activeCategory;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 20px",
                  width: "100%",
                  textAlign: "left",
                  color: isActive ? c.color : T.ink2,
                  background: isActive
                    ? `linear-gradient(90deg, ${c.color}1a, transparent)`
                    : "transparent",
                  borderLeft: `2px solid ${isActive ? c.color : "transparent"}`,
                }}
              >
                <Glyph name={c.glyph} size={18} stroke={isActive ? 1.9 : 1.5} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                  {c.name}
                </span>
                <span
                  className="mc-mono"
                  style={{ fontSize: 11, color: T.ink3 }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        <section style={{ padding: "8px 0", overflowY: "auto", minHeight: 0 }}>
          {activeMeta ? (
            <div style={{ padding: "12px 28px 14px" }}>
              <div
                className="mc-display"
                style={{ fontSize: 22, fontWeight: 600, color: activeMeta.color }}
              >
                {activeMeta.name}
              </div>
              <div style={{ fontSize: 12, color: T.ink2, marginTop: 2 }}>
                {activeMeta.desc}
              </div>
            </div>
          ) : null}

          {activeTracks.length === 0 ? (
            <div
              style={{
                padding: "40px 28px",
                color: T.ink3,
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              {tracks.length === 0
                ? "No tracks yet. Open a folder to begin."
                : `No tracks in ${activeMeta?.name ?? activeCategory}.`}
            </div>
          ) : (
            activeTracks.map((t, i) => {
              const row: TrackRowData = {
                id: t.id,
                title: t.title,
                pack: t.pack,
                cat: t.category,
                dur: formatDuration(
                  playback?.trackId === t.id ? duration : t.durationMs / 1000,
                ),
                grade: t.grade,
              };
              return (
                <TrackRow
                  key={t.id}
                  track={row}
                  index={i + 1}
                  isPlaying={playback?.trackId === t.id}
                  onTap={() => void handlePlay(t)}
                />
              );
            })
          )}
        </section>
      </main>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: `1px solid ${T.rule}`,
          padding: "10px 28px",
          fontSize: 12,
          color: T.ink3,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span className="mc-mono">{formatDuration(currentTime)}</span>
        <div
          style={{
            flex: 1,
            height: 2,
            background: T.bgChip,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
              height: "100%",
              background: T.gold,
            }}
          />
        </div>
        <span className="mc-mono">{formatDuration(duration)}</span>
      </footer>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function tallyCategories(tracks: Track[]): string {
  const counts = new Map<CategoryId, number>();
  for (const t of tracks) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${n} ${findCategory(c)?.name ?? c}`)
    .join(", ");
}
