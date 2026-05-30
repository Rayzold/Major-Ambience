// Main center pane — category hero, subcategory tabs, grade filter, track table.
// Ported from prototype/app/desktop.jsx DesktopLibraryView + DesktopTrackRow.

import { useMemo, useState } from "react";
import type { Grade, Track } from "@mc/core";
import { CATEGORIES, findCategory, Glyph, GradeChip, T, Visualizer, type CategoryMeta } from "@mc/ui";

const GRADES_INCLUDING_ALL: Array<"All" | Grade> = ["All", "S", "A", "B", "C", "D", "F"];

/**
 * Duration filter buckets. Matches the spec the user reaches for when
 * picking music for a scene: stingers, short loops, full ambient beds,
 * cinematic long-form. "Any" disables the filter; everything else
 * hides tracks whose duration falls outside the bucket *or* hasn't
 * been probed yet — the auto-scanner usually has it ready by then.
 */
type DurationBucket = "Any" | "<1m" | "1–3m" | "3–5m" | "5m+";
const DURATION_BUCKETS: readonly DurationBucket[] = ["Any", "<1m", "1–3m", "3–5m", "5m+"];

function bucketContains(bucket: DurationBucket, durationMs: number): boolean {
  if (bucket === "Any") return true;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
  const sec = durationMs / 1000;
  switch (bucket) {
    case "<1m":
      return sec < 60;
    case "1–3m":
      return sec >= 60 && sec < 180;
    case "3–5m":
      return sec >= 180 && sec < 300;
    case "5m+":
      return sec >= 300;
  }
}

/**
 * Hero shape — same fields as `CategoryMeta` but with optional id so we
 * can render pseudo-views (Favorites, Recently played) that aren't real
 * categories. Real categories still satisfy this type.
 */
export type ViewMeta = Pick<CategoryMeta, "name" | "glyph" | "color" | "dark" | "desc" | "subcats">;

export type DesktopLibraryViewProps = {
  /** The view's hero metadata. May be a real category or a synthetic Favorites/Recent view. */
  meta: ViewMeta;
  /**
   * Already-filtered list of tracks for the current view. Library handles
   * the favorites/recent semantics upstream (S/A only, last-25, etc.).
   */
  categoryTracks: Track[];
  playingTrackId: string | undefined;
  /**
   * Called when the user picks a track. The second arg is the visible
   * filtered list at the time of the click — Library uses it to
   * autoqueue what comes after the clicked track (with wrap-around).
   * Empty list means "no autoqueue context", treated as a one-shot play.
   */
  onPlayTrack: (track: Track, queueContext: Track[]) => void;
  /**
   * Multi-select state. selectedIds drives the row highlight; onSelectRow
   * receives the click intent (single / toggle / range) and the visible
   * filtered list (so range select can walk it).
   */
  selectedIds: ReadonlySet<string>;
  onSelectRow: (
    trackId: string,
    mode: "single" | "toggle" | "range",
    visibleTracks: readonly Track[],
  ) => void;
  onShuffleCategory: () => void;
  onTrackContextMenu: (track: Track, x: number, y: number) => void;
  /**
   * Soft-delete: send a track to the "removed" category. Shown as a
   * trash icon on every row in normal categories. The Removed view
   * itself shows the inverse — see `onRestoreTrack`.
   */
  onRemoveTrack: (track: Track) => void;
  /**
   * Inverse of remove — re-categorize (via the existing auto-classifier)
   * and pull the track back out of "removed". Only relevant in the
   * Removed view; rows there get an undo icon in place of the trash.
   */
  onRestoreTrack: (track: Track) => void;
  dmMode: boolean;
};

export function DesktopLibraryView({
  meta,
  categoryTracks,
  playingTrackId,
  onPlayTrack,
  selectedIds,
  onSelectRow,
  onShuffleCategory,
  onTrackContextMenu,
  onRemoveTrack,
  onRestoreTrack,
  dmMode,
}: DesktopLibraryViewProps) {
  const cat = (meta as CategoryMeta) ?? CATEGORIES[0]!;
  const [gradeFilter, setGradeFilter] = useState<"All" | Grade>("All");
  const [activeSubcat, setActiveSubcat] = useState<string>("All");
  const [durationFilter, setDurationFilter] = useState<DurationBucket>("Any");

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
      if (!bucketContains(durationFilter, t.durationMs)) return false;
      return true;
    });
  }, [categoryTracks, gradeFilter, activeSubcat, durationFilter]);

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
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
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
              {/* Track count joins the title as a piece of metadata
                  instead of sitting awkwardly between the action buttons. */}
              <span
                className="mc-mono"
                style={{
                  fontSize: 12,
                  color: T.ink2,
                  background: T.bgChip,
                  border: `1px solid ${T.rule}`,
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
                title={`${categoryTracks.length.toLocaleString()} tracks in this view`}
              >
                {categoryTracks.length.toLocaleString()}
              </span>
            </div>
            {/* Description: bumped from `ink2` to `ink` for a clearer
                read at body sizes (closer to WCAG AA over the hero
                gradient). */}
            <div style={{ fontSize: 13, color: T.ink, opacity: 0.9, maxWidth: 540 }}>
              {cat.desc}
            </div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
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
              {/* "Save as scene" used to live here as a disabled
                  placeholder ("coming in next phase"). Scene saving is
                  fully shipped on the Scenes tab now; this disabled stub
                  was just noise next to the primary CTA. */}
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
            // Hide empty subcategory tabs ("Skirmish 0") — they take up
            // space and create a false affordance. "All" always renders so
            // there's at least one tab to anchor the strip.
            if (s !== "All" && count === 0) return null;
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mc-eyebrow" style={{ marginRight: 4, flexShrink: 0 }}>
              Length
            </span>
            {DURATION_BUCKETS.map((b) => {
              const active = durationFilter === b;
              // "Any" gets a little extra width like the All-grade pill;
              // the bucket labels need horizontal padding either way
              // because they're 2-4 chars rather than single letters.
              return (
                <button
                  key={b}
                  onClick={() => setDurationFilter(b)}
                  title={
                    b === "Any"
                      ? "Show tracks of any length"
                      : `Show only tracks ${b === "5m+" ? "5 minutes or longer" : b.replace("–", " to ")}`
                  }
                  style={{
                    minWidth: 26,
                    height: 26,
                    padding: "0 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: active ? cat.color + "22" : T.bgChip,
                    color: active ? cat.color : T.ink2,
                    fontWeight: 600,
                    fontSize: 11,
                    fontFamily: "Geist Mono, monospace",
                    border: active ? `1px solid ${cat.color}55` : `1px solid transparent`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mc-eyebrow" style={{ marginRight: 4, flexShrink: 0 }}>
              Grade
            </span>
            {GRADES_INCLUDING_ALL.map((g) => {
              const active = gradeFilter === g;
              const label = g ?? "—";
              // "All" needs more room than the single-letter chips; everything
              // else fills the 26px minimum exactly so the row stays uniform.
              const isAll = g === "All";
              return (
                <button
                  key={String(g)}
                  onClick={() => setGradeFilter(g)}
                  style={{
                    minWidth: 26,
                    height: 26,
                    padding: isAll ? "0 10px" : 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
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
      </div>

      {/* Column header — sticks to the top of the scroll container so it
          stays readable when the user scrolls into a long category. Opaque
          chrome background so rows scrolling underneath don't show
          through. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 240px 70px 60px 60px 36px",
          padding: "8px 32px",
          fontSize: 10,
          fontWeight: 600,
          color: T.ink2,
          textTransform: "uppercase",
          letterSpacing: 0.16,
          borderBottom: `1px solid ${T.rule}`,
          position: "sticky",
          top: 0,
          zIndex: 1,
          background: T.bg,
        }}
      >
        <div>#</div>
        <div>Title</div>
        <div>Pack</div>
        <div>{dmMode ? "" : "Plays"}</div>
        <div>{dmMode ? "" : "Grade"}</div>
        <div>Time</div>
        <div />
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
            isSelected={selectedIds.has(t.id)}
            onTap={(e) => {
              if (e.shiftKey) {
                onSelectRow(t.id, "range", filteredTracks);
              } else if (e.ctrlKey || e.metaKey) {
                onSelectRow(t.id, "toggle", filteredTracks);
              } else {
                onSelectRow(t.id, "single", filteredTracks);
                onPlayTrack(t, filteredTracks);
              }
            }}
            onContextMenu={(x, y) => onTrackContextMenu(t, x, y)}
            onRemove={() => onRemoveTrack(t)}
            onRestore={() => onRestoreTrack(t)}
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
  isSelected,
  onTap,
  onContextMenu,
  onRemove,
  onRestore,
  dmMode,
}: {
  track: Track;
  index: number;
  isPlaying: boolean;
  isSelected: boolean;
  onTap: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onContextMenu: (x: number, y: number) => void;
  onRemove: () => void;
  onRestore: () => void;
  dmMode: boolean;
}) {
  const c = findCategory(track.category);
  if (!c) return null;
  const isRemoved = track.category === "removed";
  const [hovered, setHovered] = useState(false);
  // Selected rows get a gold-tinted background that wins over the
  // currently-playing tint. Playing-and-selected falls back to a blend
  // of both — gold accents, the playing gradient stays underneath.
  // Hover only kicks in for default rows so it doesn't fight the
  // selected/playing tints.
  const bg = isSelected
    ? T.goldSoft
    : isPlaying
      ? `linear-gradient(90deg, ${c.color}14, transparent 40%)`
      : hovered
        ? T.bgChip
        : "transparent";
  return (
    <button
      className="mc-row-tap"
      onClick={onTap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        gridTemplateColumns: "32px 1fr 240px 70px 60px 60px 36px",
        padding: "10px 32px",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${T.rule}`,
        background: bg,
        borderLeft: `3px solid ${isSelected ? T.gold : "transparent"}`,
        paddingLeft: 29, // 32 - 3 (border) to keep content aligned
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
              title={`Last played ${relativePlayed(track.lastPlayedAt)}`}
              style={{
                fontSize: 10,
                color: T.ink3,
                marginTop: 2,
                // Match the title row's truncation. Without these, the
                // line wraps each word to its own row at narrow widths
                // (e.g. when the new action column eats the title
                // column) and collides visually with the title above.
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {/* Time-first (no "Last played" prefix) so the part that
                  matters survives truncation at narrow widths; the full
                  label lives in the title tooltip above. */}
              {relativePlayed(track.lastPlayedAt)}
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
        {dmMode || track.playCount === 0 ? "" : track.playCount}
      </div>
      {/* Hide the empty box for ungraded tracks — only render the chip
          when a grade actually exists, so a fresh library doesn't read
          as a column of broken UI. */}
      {dmMode || track.grade === null ? (
        <div />
      ) : (
        <GradeChip grade={track.grade} size={22} />
      )}
      <div className="mc-mono" style={{ fontSize: 12, color: T.ink2 }}>
        {formatMs(track.durationMs)}
      </div>
      {/* Action button — trash on normal rows, undo on removed-view rows.
          A <span role="button"> instead of a real <button> because the
          surrounding row already is one and nested buttons are invalid
          HTML. stopPropagation on click + keydown so the row's onTap
          never fires for this control. */}
      <span
        role="button"
        tabIndex={0}
        className="mc-row-action"
        title={isRemoved ? "Restore (re-categorize)" : "Remove from library"}
        onClick={(e) => {
          e.stopPropagation();
          if (isRemoved) onRestore();
          else onRemove();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (isRemoved) onRestore();
            else onRemove();
          }
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 7,
          color: T.ink3,
          cursor: "pointer",
        }}
      >
        <Glyph name={isRemoved ? "undo" : "trash"} size={14} />
      </span>
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
