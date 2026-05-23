// Spotlight-style search results panel that drops below the header input.
// Owned by Library; rendered as a fixed-position overlay so it floats above
// the three-pane layout without disturbing flow.

import { useEffect, useRef } from "react";
import type { Track } from "@mc/core";
import { findCategory, Glyph, GradeChip, T, Visualizer } from "@mc/ui";

export type SearchOverlayProps = {
  query: string;
  results: Track[];
  loading: boolean;
  playingTrackId: string | undefined;
  onPlay: (t: Track) => void;
  onContextMenu: (t: Track, x: number, y: number) => void;
  onDismiss: () => void;
};

export function SearchOverlay({
  query,
  results,
  loading,
  playingTrackId,
  onPlay,
  onContextMenu,
  onDismiss,
}: SearchOverlayProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Dismiss on outside click — but ignore clicks on the header search input
  // that owns this overlay (the header has data-mc-search-input).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      const target = e.target as HTMLElement;
      if (ref.current.contains(target)) return;
      if (target.closest("[data-mc-search-input]")) return;
      onDismiss();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onDismiss]);

  // ESC closes from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const empty = query.trim().length === 0;
  const noResults = !empty && !loading && results.length === 0;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: 60,
        right: 86,
        width: 520,
        maxHeight: "70vh",
        zIndex: 50,
        background: T.popoverBg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${T.rule}`,
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
          fontSize: 11,
          color: T.ink3,
          fontFamily: "Geist Mono, monospace",
        }}
      >
        <Glyph name="search" size={12} />
        <span>
          {empty
            ? "Type to search title, pack, or notes"
            : loading
              ? `Searching for "${query}"…`
              : `${results.length.toLocaleString()} result${results.length === 1 ? "" : "s"} for "${query}"`}
        </span>
        <div style={{ flex: 1 }} />
        <span
          className="mc-mono"
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 4,
            background: T.bgChip,
            border: `1px solid ${T.rule}`,
            color: T.ink3,
          }}
        >
          ESC
        </span>
      </div>

      <div
        className="mc-scroll"
        style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}
      >
        {empty ? null : noResults ? (
          <div
            style={{
              padding: "20px 16px",
              color: T.ink3,
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            Nothing matched. Try a shorter query.
          </div>
        ) : (
          results.map((t) => (
            <SearchResultRow
              key={t.id}
              track={t}
              isPlaying={t.id === playingTrackId}
              onPlay={() => onPlay(t)}
              onContextMenu={(x, y) => onContextMenu(t, x, y)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SearchResultRow({
  track,
  isPlaying,
  onPlay,
  onContextMenu,
}: {
  track: Track;
  isPlaying: boolean;
  onPlay: () => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  const c = findCategory(track.category);
  if (!c) return null;
  return (
    <button
      className="mc-row-tap"
      onClick={onPlay}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY);
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 200px 50px 36px",
        gap: 10,
        alignItems: "center",
        padding: "8px 14px",
        width: "100%",
        textAlign: "left",
        background: isPlaying
          ? `linear-gradient(90deg, ${c.color}1f, transparent 60%)`
          : "transparent",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: `linear-gradient(140deg, ${c.color}66, ${c.dark})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: T.ink,
          flexShrink: 0,
        }}
      >
        {isPlaying ? <Visualizer color={T.ink} bars={3} height={12} /> : <Glyph name={c.glyph} size={13} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isPlaying ? c.color : T.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.ink3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginTop: 1,
          }}
        >
          <span style={{ color: c.color }}>{c.name.toUpperCase()}</span>
          {" · "}
          {track.pack}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: T.ink3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {track.pack}
      </div>
      <div className="mc-mono" style={{ fontSize: 10, color: T.ink3, textAlign: "right" }}>
        {formatMs(track.durationMs)}
      </div>
      <GradeChip grade={track.grade} size={18} />
    </button>
  );
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
