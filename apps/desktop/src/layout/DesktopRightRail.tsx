// Right rail — Now Playing card + Up Next + SFX placeholder.
// Ported from prototype/app/desktop.jsx DesktopRightRail.

import type { Grade, Track } from "@mc/core";
import { CatChip, findCategory, Glyph, GRADE_COLOR, OrbVisualizer, T } from "@mc/ui";

export type DesktopRightRailProps = {
  track: Track | undefined;
  currentSec: number;
  durationSec: number;
  playing: boolean;
  onCycleGrade: () => void;
  onSetGrade: (g: Grade) => void;
  upNext: Track[];
};

const GRADES: Array<Exclude<Grade, null>> = ["S", "A", "B", "C", "D", "F"];

export function DesktopRightRail({
  track,
  currentSec,
  durationSec,
  playing,
  onSetGrade,
  upNext,
}: DesktopRightRailProps) {
  if (!track) {
    return (
      <div
        className="mc-scroll"
        style={{
          flexShrink: 0,
          width: 360,
          borderLeft: `1px solid ${T.rule}`,
          padding: 18,
          position: "relative",
          color: T.ink3,
          fontSize: 13,
          fontStyle: "italic",
        }}
      >
        <div className="mc-eyebrow" style={{ marginBottom: 8 }}>
          Now Playing
        </div>
        Pick a track to begin.
      </div>
    );
  }

  const c = findCategory(track.category);
  if (!c) return null;
  const pct = durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

  return (
    <div
      className="mc-scroll"
      style={{
        flexShrink: 0,
        width: 360,
        borderLeft: `1px solid ${T.rule}`,
        padding: 16,
        position: "relative",
        overflowY: "auto",
      }}
    >
      {/* Now Playing card */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 18,
          padding: 18,
          background: `linear-gradient(165deg, ${c.dark} 0%, ${T.bgCard} 100%)`,
          border: `1px solid ${c.color}33`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(100% 80% at 50% 0%, ${c.color}33 0%, transparent 60%)`,
          }}
        />
        <div className="mc-grain" />
        <div style={{ position: "relative" }}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <CatChip catId={track.category} />
            <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
              {track.playCount}× played
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
            <OrbVisualizer color={c.color} size={156} playing={playing} />
          </div>
          <div
            className="mc-display"
            style={{
              textAlign: "center",
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 600,
              color: T.ink,
              padding: "0 4px",
            }}
          >
            {track.title}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: T.ink2, marginTop: 4 }}>
            {track.pack}
          </div>

          <div
            style={{
              marginTop: 14,
              position: "relative",
              height: 3,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                background: c.color,
                borderRadius: 2,
              }}
            />
          </div>
          <div
            className="mc-mono"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: T.ink2,
              marginTop: 6,
            }}
          >
            <span>{mins(currentSec)}</span>
            <span>−{mins(Math.max(0, durationSec - currentSec))}</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              marginTop: 14,
            }}
          >
            {GRADES.map((g) => {
              const active = g === track.grade;
              return (
                <button
                  key={g}
                  onClick={() => onSetGrade(active ? null : g)}
                  title={active ? `Clear grade ${g}` : `Set grade ${g}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: active ? GRADE_COLOR[g] + "26" : "transparent",
                    border: `1px solid ${active ? GRADE_COLOR[g] + "88" : T.rule}`,
                    color: active ? GRADE_COLOR[g] : T.ink3,
                    fontWeight: 600,
                    fontSize: 11,
                    fontFamily: "Geist Mono, monospace",
                    cursor: "pointer",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Glyph name="queue" size={14} />
            <h3
              className="mc-display"
              style={{ margin: 0, fontSize: 16, fontWeight: 600 }}
            >
              Up Next
            </h3>
          </div>
          <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
            {upNext.length} queued
          </span>
        </div>
        {upNext.length === 0 ? (
          <div
            style={{
              padding: "10px 4px",
              fontSize: 11,
              color: T.ink3,
              fontStyle: "italic",
            }}
          >
            Hit Shuffle to fill the queue.
          </div>
        ) : (
          upNext.map((t) => {
            const c2 = findCategory(t.category);
            if (!c2) return null;
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 4px",
                  borderBottom: `1px solid ${T.rule}`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: `linear-gradient(140deg, ${c2.color}66, ${c2.dark})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.ink,
                  }}
                >
                  <Glyph name={c2.glyph} size={12} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: T.ink,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.ink3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.pack}
                  </div>
                </div>
                <div className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
                  {mins(t.durationMs / 1000)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 18, opacity: 0.5 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Glyph name="speaker" size={14} />
            <h3
              className="mc-display"
              style={{ margin: 0, fontSize: 16, fontWeight: 600 }}
            >
              SFX Layer
            </h3>
          </div>
          <span className="mc-eyebrow" style={{ fontSize: 9 }}>
            Phase 2
          </span>
        </div>
        <div style={{ fontSize: 11, color: T.ink3, fontStyle: "italic", padding: "4px" }}>
          Active SFX list lands with the soundboard tab.
        </div>
      </div>
    </div>
  );
}

function mins(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
