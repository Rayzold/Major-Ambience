// One soundboard pad. Empty when nothing assigned (a drop zone); filled
// when a track has been pinned to it.

import { useState } from "react";
import type { SoundboardSlot, Track } from "@mc/core";
import { findCategory, Glyph, T, Visualizer } from "@mc/ui";

export type SoundPadProps = {
  page: "A" | "B" | "C";
  slot: number;
  assigned: SoundboardSlot | undefined;
  track: Track | undefined;
  playing: boolean;
  onAssign: (trackId: string) => void;
  onFire: () => void;
  onStop: () => void;
  onClear: () => void;
  onSetLoop: (loop: boolean) => void;
  onSetVolume: (v: number) => void;
  dmMode: boolean;
};

export function SoundPad({
  slot,
  assigned,
  track,
  playing,
  onAssign,
  onFire,
  onStop,
  onClear,
  onSetLoop,
  onSetVolume,
  dmMode,
}: SoundPadProps) {
  const [dragHover, setDragHover] = useState(false);
  const cat = track ? findCategory(track.category) : undefined;
  const accent = cat?.color ?? T.ink3;
  const dark = cat?.dark ?? T.bgCard;

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (dmMode) return;
    if (e.dataTransfer.types.includes("application/x-mc-track")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    if (dmMode) return;
    setDragHover(false);
    const trackId = e.dataTransfer.getData("application/x-mc-track");
    if (trackId) {
      e.preventDefault();
      onAssign(trackId);
    }
  }

  return (
    <div
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("application/x-mc-track")) setDragHover(true);
      }}
      onDragLeave={() => setDragHover(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: "relative",
        overflow: "hidden",
        height: 132,
        borderRadius: 14,
        background: assigned
          ? `linear-gradient(155deg, ${accent}33 0%, ${dark}cc 60%, ${T.bgCard} 100%)`
          : T.bgChip,
        border: `1px solid ${dragHover ? T.gold : assigned ? accent + "55" : T.rule}`,
        boxShadow:
          playing && cat
            ? `0 0 0 1px ${cat.color}55, 0 4px 16px ${cat.color}33`
            : undefined,
        transition: "border-color 0.12s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          fontFamily: "Geist Mono, monospace",
          fontSize: 10,
          color: T.ink3,
          fontWeight: 600,
        }}
      >
        {slot}
      </div>

      {assigned && track && cat ? (
        <>
          <button
            onClick={playing ? onStop : onFire}
            style={{
              position: "absolute",
              inset: 0,
              padding: "26px 14px 60px",
              textAlign: "left",
              cursor: "pointer",
              background: "transparent",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -16,
                top: -12,
                color: cat.color,
                opacity: 0.22,
              }}
            >
              <Glyph name={cat.glyph} size={92} stroke={1.1} />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: playing ? cat.color : T.ink,
                lineHeight: 1.2,
                position: "relative",
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
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                position: "relative",
              }}
            >
              <span style={{ color: cat.color }}>{cat.name.toUpperCase()}</span>
              {" · "}
              {track.pack}
            </div>
            {playing ? (
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  bottom: 40,
                  color: cat.color,
                }}
              >
                <Visualizer color={cat.color} bars={8} height={16} />
              </div>
            ) : null}
          </button>

          {dmMode ? null : (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetLoop(!assigned.loop);
              }}
              title={assigned.loop ? "Looping" : "Loop off"}
              style={{
                pointerEvents: "auto",
                width: 24,
                height: 24,
                borderRadius: 6,
                background: assigned.loop ? cat.color + "33" : T.bgChip,
                color: assigned.loop ? cat.color : T.ink3,
                border: `1px solid ${assigned.loop ? cat.color + "66" : T.rule}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Glyph name="loop" size={12} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={assigned.volume}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onSetVolume(Number(e.currentTarget.value));
              }}
              title={`${Math.round(assigned.volume * 100)}%`}
              style={{
                pointerEvents: "auto",
                flex: 1,
                accentColor: cat.color,
                minWidth: 0,
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              title="Clear pad"
              style={{
                pointerEvents: "auto",
                width: 24,
                height: 24,
                borderRadius: 6,
                background: T.bgChip,
                color: T.ink3,
                border: `1px solid ${T.rule}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Glyph name="close" size={11} />
            </button>
          </div>
          )}
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: dragHover ? T.gold : T.ink3,
            fontSize: 11,
            fontStyle: "italic",
            pointerEvents: "none",
          }}
        >
          <Glyph name="plus" size={20} stroke={1.4} />
          <div>{dragHover ? "Drop to assign" : "Drag a track here"}</div>
        </div>
      )}
    </div>
  );
}
