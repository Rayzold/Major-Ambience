// Bottom transport bar — track tile, prev/play/next, scrubber, VU, volume, fade.
// Ported from prototype/app/desktop.jsx DesktopTransport with real wiring.

import { useRef } from "react";
import type { Grade, Track } from "@mc/core";
import { findCategory, Glyph, GRADE_COLOR, T, Visualizer } from "@mc/ui";

const GRADES: Array<Exclude<Grade, null>> = ["S", "A", "B", "C", "D", "F"];

export type DesktopTransportProps = {
  track: Track | undefined;
  currentSec: number;
  durationSec: number;
  playing: boolean;
  fadeMs: number;
  masterVolume: number;
  duckingPct: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onCycleGrade: () => void;
  onSetFadeMs: (ms: number) => void;
  onSetVolume: (v: number) => void;
  onSetDuckingPct: (pct: number) => void;
};

export function DesktopTransport({
  track,
  currentSec,
  durationSec,
  playing,
  fadeMs,
  masterVolume,
  duckingPct,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onCycleGrade,
  onSetFadeMs,
  onSetVolume,
  onSetDuckingPct,
}: DesktopTransportProps) {
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const c = track ? findCategory(track.category) : undefined;
  const accent = c?.color ?? T.gold;
  const dark = c?.dark ?? T.bgRaise;
  const pct = durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubRef.current || durationSec <= 0) return;
    const rect = scrubRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * durationSec);
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 5,
        flexShrink: 0,
        height: 88,
        borderTop: `1px solid ${T.rule}`,
        background: T.chromeBg,
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
      }}
    >
      {/* Track info + grade pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: 280, minWidth: 0 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 11,
            flexShrink: 0,
            background: `linear-gradient(140deg, ${accent}, ${dark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.ink,
            boxShadow: `inset 0 -8px 16px rgba(0,0,0,0.3), 0 0 0 1px ${accent}33`,
          }}
        >
          <Glyph name={c?.glyph ?? "library"} size={22} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {track?.title ?? "—"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: T.ink2,
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c ? (
              <>
                <span style={{ color: accent }}>{c.name.toUpperCase()}</span>
                {" · "}
                {track?.pack ?? ""}
              </>
            ) : (
              "Open a folder to begin"
            )}
          </div>
          {track ? (
            <button
              onClick={onCycleGrade}
              data-mc-tour="grade-pills"
              title="Click to cycle grade"
              style={{
                display: "inline-flex",
                gap: 3,
                marginTop: 4,
                background: "transparent",
                padding: 0,
              }}
            >
              {GRADES.map((g) => {
                const on = g === track.grade;
                return (
                  <span
                    key={g}
                    style={{
                      fontSize: 9,
                      padding: "1px 4px",
                      borderRadius: 3,
                      background: on ? GRADE_COLOR[g] + "40" : "transparent",
                      color: on ? GRADE_COLOR[g] : T.ink3,
                      fontFamily: "Geist Mono, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {g}
                  </span>
                );
              })}
            </button>
          ) : null}
        </div>
      </div>

      {/* Center transport */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "0 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <FadeSlider fadeMs={fadeMs} onChange={onSetFadeMs} />
          <DuckSlider pct={duckingPct} onChange={onSetDuckingPct} />
          <button
            onClick={onPrev}
            disabled={!track}
            style={{ color: track ? T.ink : T.ink3 }}
            title="Previous in queue"
          >
            <Glyph name="prev" size={20} />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!track}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: T.ink,
              color: dark,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px ${accent}55`,
              opacity: track ? 1 : 0.4,
              cursor: track ? "pointer" : "not-allowed",
            }}
          >
            <Glyph name={playing ? "pause" : "play"} size={16} />
          </button>
          <button
            onClick={onNext}
            disabled={!track}
            style={{ color: track ? T.ink : T.ink3 }}
            title="Next in queue"
          >
            <Glyph name="next" size={20} />
          </button>
          <button
            disabled
            title="Loop — Phase 2"
            style={{ color: T.ink3, cursor: "not-allowed" }}
          >
            <Glyph name="loop" size={16} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            maxWidth: 540,
          }}
        >
          <span
            className="mc-mono"
            style={{ fontSize: 10, color: T.ink2, width: 32, textAlign: "right" }}
          >
            {mins(currentSec)}
          </span>
          <div
            ref={scrubRef}
            onClick={handleScrubClick}
            style={{
              flex: 1,
              position: "relative",
              height: 4,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 2,
              cursor: durationSec > 0 ? "pointer" : "default",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                background: accent,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 10,
                height: 10,
                borderRadius: 999,
                background: T.ink,
                opacity: track ? 1 : 0,
              }}
            />
          </div>
          <span className="mc-mono" style={{ fontSize: 10, color: T.ink2, width: 32 }}>
            {mins(durationSec)}
          </span>
        </div>
      </div>

      {/* VU + Volume */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          width: 240,
          justifyContent: "flex-end",
        }}
      >
        <div style={{ color: accent, opacity: track ? 0.85 : 0.2 }}>
          <Visualizer color={accent} bars={12} height={26} playing={playing} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.ink2 }}>
          <Glyph name="speaker" size={14} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => onSetVolume(Number(e.currentTarget.value))}
            style={{ width: 84, accentColor: T.gold }}
            title={`Volume ${Math.round(masterVolume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
}

function DuckSlider({
  pct,
  onChange,
}: {
  pct: number;
  onChange: (pct: number) => void;
}) {
  return (
    <label
      data-mc-tour="duck-slider"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: T.ink3,
        fontSize: 10,
      }}
      title="Music ducking — drop music level while soundboard plays"
    >
      <Glyph name="duck" size={14} />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={pct}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={{ width: 64, accentColor: "#5cc4d9" }}
      />
      <span className="mc-mono" style={{ width: 30 }}>
        {Math.round(pct * 100)}%
      </span>
    </label>
  );
}

function FadeSlider({
  fadeMs,
  onChange,
}: {
  fadeMs: number;
  onChange: (ms: number) => void;
}) {
  return (
    <label
      data-mc-tour="fade-slider"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: T.ink3,
        fontSize: 10,
      }}
      title="Crossfade duration"
    >
      <Glyph name="fade" size={14} />
      <input
        type="range"
        min={0}
        max={10000}
        step={250}
        value={fadeMs}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={{ width: 64, accentColor: T.gold }}
      />
      <span className="mc-mono" style={{ width: 30 }}>
        {(fadeMs / 1000).toFixed(fadeMs % 1000 === 0 ? 0 : 1)}s
      </span>
    </label>
  );
}

function mins(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
