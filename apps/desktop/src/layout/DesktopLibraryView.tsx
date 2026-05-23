// Main center pane — category hero, subcategory tabs, grade filter, track table.
// Ported from prototype/app/desktop.jsx DesktopLibraryView + DesktopTrackRow.

import { useMemo, useState } from "react";
import type { CategoryId, Grade, Track } from "@mc/core";
import { CATEGORIES, findCategory, Glyph, GradeChip, T, Visualizer } from "@mc/ui";

const GRADES_INCLUDING_ALL: Array<"All" | Grade> = ["All", "S", "A", "B", "C", "D", "F"];

export type DesktopLibraryViewProps = {
  activeCategory: CategoryId;
  categoryTracks: Track[];
  playingTrackId: string | undefined;
  onPlayTrack: (track: Track) => void;
  onShuffleCategory: () => void;
  onTrackContextMenu: (track: Track, x: number, y: number) => void;
  dmMode: boolean;
};

export function DesktopLibraryView({
  activeCategory,
  categoryTracks,
  playingTrackId,
  onPlayTrack,
  onShuffleCategory,
  onTrackContextMenu,
  dmMode,
}: DesktopLibraryViewProps) {
  const cat = findCategory(activeCategory) ?? CATEGORIES[0]!;
  const [gradeFilter, setGradeFilter] = useState<"All" | Grade>("All");
  const [activeSubcat, setActiveSubcat] = useState<string>("All");

  const subcats = useMemo<readonly string[]>(() => {
    if (!cat.subcats) return ["All"];
    return ["All", ...cat.subcats];
  }, [cat]);

  const filteredTracks = useMemo(() => {
    return categoryTracks.filter((t) => {
      if (gradeFilter !== "All" && t.grade !== gradeFilter) return false;
      if (activeSubcat !== "All") {
        const wanted = activeSubcat.toLowerCase();
        if ((t.subcategory ?? "").toLowerCase() !== wanted) return false;
      }
      return true;
    });
  }, [categoryTracks, gradeFilter, activeSubcat]);

  return (
    <div
      className="mc-scroll"
      style={{ flex: 1, minWidth: 0, position: "relative", overflowY: "auto" }}
    >
      {/* Hero */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "24px 32px 20px",
          background: `linear-gradient(180deg, ${cat.dark}88, transparent 100%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(60% 100% at 100% 0%, ${cat.color}33 0%, transparent 60%)`,
          }}
        />
        <div className="mc-grain" />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 22 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 22,
              flexShrink: 0,
              background: `linear-gradient(140deg, ${cat.color}, ${cat.dark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.ink,
              boxShadow: `inset 0 -18px 32px rgba(0,0,0,0.4), 0 14px 32px ${cat.color}55`,
            }}
          >
            <Glyph name={cat.glyph} size={52} stroke={1.4} />
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div className="mc-eyebrow" style={{ color: cat.color }}>
              Category
            </div>
            <h1
              className="mc-display"
              style={{
                margin: "4px 0 4px",
                fontSize: 46,
                lineHeight: 1,
                fontWeight: 600,
                color: T.ink,
              }}
            >
              {cat.name}
            </h1>
            <div style={{ fontSize: 13, color: T.ink2, maxWidth: 540 }}>{cat.desc}</div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <button
                onClick={onShuffleCategory}
                disabled={categoryTracks.length === 0}
                data-mc-tour="shuffle-button"
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: cat.color,
                  color: cat.dark,
                  fontWeight: 600,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: `0 6px 18px ${cat.color}55`,
                  opacity: categoryTracks.length === 0 ? 0.45 : 1,
                  cursor: categoryTracks.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                <Glyph name="shuffle" size={14} /> Shuffle weighted
              </button>
              {dmMode ? null : (
                <button
                  disabled
                  title="Save current as a scene — coming in next phase"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    background: T.bgChip,
                    color: T.ink3,
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "not-allowed",
                  }}
                >
                  <Glyph name="plus" size={14} /> Save as scene
                </button>
              )}
              <div className="mc-mono" style={{ fontSize: 11, color: T.ink3 }}>
                {categoryTracks.length.toLocaleString()} tracks
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory tabs + grade filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px 10px",
          borderBottom: `1px solid ${T.rule}`,
          gap: 18,
        }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          {subcats.map((s) => {
            const active = s === activeSubcat;
            const count =
              s === "All"
                ? categoryTracks.length
                : categoryTracks.filter(
                    (t) => (t.subcategory ?? "").toLowerCase() === s.toLowerCase(),
                  ).length;
            return (
              <button
                key={s}
                onClick={() => setActiveSubcat(s)}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  paddingBottom: 8,
                  color: active ? cat.color : T.ink3,
                  borderBottom: `2px solid ${active ? cat.color : "transparent"}`,
                  background: "transparent",
                }}
              >
                {s}{" "}
                <span className="mc-mono" style={{ color: T.ink3, marginLeft: 4 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="mc-eyebrow" style={{ marginRight: 4 }}>
            Grade
          </span>
          {GRADES_INCLUDING_ALL.map((g) => {
            const active = gradeFilter === g;
            const label = g ?? "—";
            return (
              <button
                key={String(g)}
                onClick={() => setGradeFilter(g)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: active ? cat.color + "22" : T.bgChip,
                  color: active ? cat.color : T.ink2,
                  fontWeight: 600,
                  fontSize: 11,
                  fontFamily: "Geist Mono, monospace",
                  border: active
                    ? `1px solid ${cat.color}55`
                    : `1px solid transparent`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 240px 70px 60px 60px",
          padding: "8px 32px",
          fontSize: 10,
          color: T.ink3,
          textTransform: "uppercase",
          letterSpacing: 0.12,
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <div>#</div>
        <div>Title</div>
        <div>Pack</div>
        <div>{dmMode ? "" : "Plays"}</div>
        <div>{dmMode ? "" : "Grade"}</div>
        <div>Time</div>
      </div>

      <div data-mc-tour="track-table">
      {filteredTracks.length === 0 ? (
        <div
          style={{
            padding: "40px 32px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 13,
          }}
        >
          {categoryTracks.length === 0
            ? "No tracks here yet. Open a folder, or pick another category."
            : "No tracks match this filter."}
        </div>
      ) : (
        filteredTracks.map((t, i) => (
          <DesktopTrackRow
            key={t.id}
            track={t}
            index={i + 1}
            isPlaying={t.id === playingTrackId}
            onTap={() => onPlayTrack(t)}
            onContextMenu={(x, y) => onTrackContextMenu(t, x, y)}
            dmMode={dmMode}
          />
        ))
      )}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}

function DesktopTrackRow({
  track,
  index,
  isPlaying,
  onTap,
  onContextMenu,
  dmMode,
}: {
  track: Track;
  index: number;
  isPlaying: boolean;
  onTap: () => void;
  onContextMenu: (x: number, y: number) => void;
  dmMode: boolean;
}) {
  const c = findCategory(track.category);
  if (!c) return null;
  return (
    <button
      className="mc-row-tap"
      onClick={onTap}
      onContextMenu={dmMode ? undefined : (e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY);
      }}
      draggable={!dmMode}
      onDragStart={dmMode ? undefined : (e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("application/x-mc-track", track.id);
        e.dataTransfer.setData("text/plain", track.title);
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 240px 70px 60px 60px",
        padding: "10px 32px",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${T.rule}`,
        background: isPlaying
          ? `linear-gradient(90deg, ${c.color}14, transparent 40%)`
          : "transparent",
        width: "100%",
        textAlign: "left",
        cursor: "grab",
      }}
    >
      <div style={{ color: isPlaying ? c.color : T.ink3, fontSize: 12 }}>
        {isPlaying ? <Visualizer color={c.color} bars={4} height={14} /> : index}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            flexShrink: 0,
            background: `linear-gradient(140deg, ${c.color}66, ${c.dark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.ink,
          }}
        >
          <Glyph name={c.glyph} size={14} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: isPlaying ? c.color : T.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {track.title}
            </div>
            {track.subcategory ? (
              <span
                className="mc-mono"
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: `${c.color}1f`,
                  color: c.color,
                  border: `1px solid ${c.color}33`,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {track.subcategory}
              </span>
            ) : null}
          </div>
          {track.lastPlayedAt ? (
            <div
              className="mc-mono"
              style={{ fontSize: 10, color: T.ink3, marginTop: 2 }}
            >
              Last played {relativePlayed(track.lastPlayedAt)}
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          color: T.ink2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {track.pack}
      </div>
      <div className="mc-mono" style={{ fontSize: 11, color: T.ink3 }}>
        {dmMode ? "" : `${track.playCount}×`}
      </div>
      {dmMode ? (
        <div />
      ) : (
        <GradeChip grade={track.grade} size={22} />
      )}
      <div className="mc-mono" style={{ fontSize: 12, color: T.ink2 }}>
        {formatMs(track.durationMs)}
      </div>
    </button>
  );
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Mirror of DesktopSidebar.relativeTime, slightly shorter labels. */
function relativePlayed(epochSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const delta = Math.max(0, nowSec - epochSec);
  if (delta < 60) return "now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 86400 * 30) return `${Math.floor(delta / 86400)}d ago`;
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
