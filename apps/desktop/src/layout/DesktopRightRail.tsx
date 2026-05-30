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
  dmMode: boolean;
};

const GRADES: Array<Exclude<Grade, null>> = ["S", "A", "B", "C", "D", "F"];

export function DesktopRightRail({
  track,
  currentSec,
  durationSec,
  playing,
  onSetGrade,
  upNext,
  dmMode,
}: DesktopRightRailProps) {
  if (!track) {
    const LETTERS = ["C", "T", "E", "A", "H", "S", "R", "V", "X", "F"];
    const kbdStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 18,
      height: 18,
      padding: "0 4px",
      borderRadius: 4,
      background: T.bgChip,
      border: `1px solid ${T.rule}`,
      color: T.gold,
      fontFamily: "Geist Mono, monospace",
      fontSize: 10,
      fontWeight: 600,
    };
    return (
      <div
        className="mc-scroll"
        style={{
          flexShrink: 0,
          width: 360,
          borderLeft: `1px solid ${T.rule}`,
          padding: 22,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="mc-eyebrow" style={{ marginBottom: 16 }}>
          Now Playing
        </div>

        {/* Standing-by panel — calmer than a bare paragraph. The gold orb
            ring + display type read as identity, not absence. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "28px 0 22px",
            borderRadius: 16,
            background: T.bgCard,
            border: `1px solid ${T.rule}`,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${T.gold}33, transparent 70%)`,
              border: `1px solid ${T.gold}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Glyph name="library" size={28} style={{ color: T.gold }} />
          </div>
          <div
            className="mc-display"
            style={{
              fontSize: 22,
              fontStyle: "italic",
              fontWeight: 600,
              color: T.gold,
              lineHeight: 1.1,
            }}
          >
            Standing by
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: T.ink3 }}>
            Pick a track to begin.
          </div>
        </div>

        {/* Quick start — uniformly chip-styled keys so the shortcut row
            reads consistently instead of mixing plain + code spans. */}
        <div
          style={{
            marginTop: 18,
            padding: "14px 14px 16px",
            borderRadius: 12,
            background: T.bgChip,
          }}
        >
          <div className="mc-eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>
            Quick start
          </div>
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.55 }}>
            Click any track row, hit a category letter
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0" }}>
              {LETTERS.map((l) => (
                <span key={l} style={kbdStyle}>
                  {l}
                </span>
              ))}
            </div>
            or press <span style={kbdStyle}>?</span> for the full cheatsheet.
          </div>
        </div>
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
              {dmMode ? "" : `${track.playCount}× played`}
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

          {dmMode ? null : (
          <div
            data-mc-tour="grade-row"
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
          )}
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
              lineHeight: 1.5,
            }}
          >
            Tap a track row, hit Shuffle, or press a category letter
            (C / T / E / A / H / S / R / V / X / F) to fill the queue.
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

    </div>
  );
}

function mins(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
