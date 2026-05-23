// Soundboard tab — page A/B/C selector + 4-column pad grid.

import type { SoundboardSlot, Track } from "@mc/core";
import { CategoryGradient, Glyph, T } from "@mc/ui";
import { SoundPad } from "./SoundPad.js";

export type DesktopSoundboardViewProps = {
  page: "A" | "B" | "C";
  onPageChange: (p: "A" | "B" | "C") => void;
  slots: SoundboardSlot[];
  tracksById: Map<string, Track>;
  isPlaying: (page: string, slot: number) => boolean;
  onAssign: (page: "A" | "B" | "C", slot: number, trackId: string) => void;
  onPickRequest: (page: "A" | "B" | "C", slot: number, x: number, y: number) => void;
  onFire: (page: "A" | "B" | "C", slot: number) => void;
  onStop: (page: "A" | "B" | "C", slot: number) => void;
  onClear: (page: "A" | "B" | "C", slot: number) => void;
  onSetLoop: (page: "A" | "B" | "C", slot: number, loop: boolean) => void;
  onSetVolume: (page: "A" | "B" | "C", slot: number, v: number) => void;
  dmMode: boolean;
};

const SFX_TEAL = "#5cc4d9";
const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function DesktopSoundboardView({
  page,
  onPageChange,
  slots,
  tracksById,
  isPlaying,
  onAssign,
  onPickRequest,
  onFire,
  onStop,
  onClear,
  onSetLoop,
  onSetVolume,
  dmMode,
}: DesktopSoundboardViewProps) {
  const slotsByKey = new Map<string, SoundboardSlot>();
  for (const s of slots) slotsByKey.set(`${s.page}-${s.slot}`, s);

  const totalAssigned = slots.length;

  return (
    <div
      className="mc-scroll"
      style={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        overflowY: "auto",
      }}
    >
      <CategoryGradient cat="sfx" height={240} intensity={0.3} />

      <div
        style={{
          position: "relative",
          padding: "24px 32px 0",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div>
          <div className="mc-eyebrow">Instant triggers</div>
          <h1
            className="mc-display"
            style={{
              margin: "4px 0 6px",
              fontSize: 38,
              lineHeight: 1,
              fontWeight: 600,
              color: T.ink,
            }}
          >
            <span style={{ fontStyle: "italic", color: SFX_TEAL }}>Soundboard</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.ink2, maxWidth: 560, lineHeight: 1.45 }}>
            24 slots across pages A / B / C. Click an empty pad to pick a track from your library; click an assigned pad to fire. Loop and per-pad volume on every slot.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["A", "B", "C"] as const).map((p) => {
            const active = page === p;
            const count = slots.filter((s) => s.page === p).length;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: active ? SFX_TEAL + "22" : T.bgChip,
                  color: active ? SFX_TEAL : T.ink2,
                  border: `1px solid ${active ? SFX_TEAL + "66" : T.rule}`,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Page {p}
                <span
                  className="mc-mono"
                  style={{ marginLeft: 6, color: T.ink3, fontSize: 10 }}
                >
                  {count}/8
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          padding: "24px 32px 12px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {SLOT_NUMBERS.map((slotNum) => {
          const assigned = slotsByKey.get(`${page}-${slotNum}`);
          const track = assigned ? tracksById.get(assigned.trackId ?? "") : undefined;
          return (
            <SoundPad
              key={slotNum}
              page={page}
              slot={slotNum}
              assigned={assigned}
              track={track}
              playing={isPlaying(page, slotNum)}
              onAssign={(trackId) => onAssign(page, slotNum, trackId)}
              onPickRequest={(x, y) => onPickRequest(page, slotNum, x, y)}
              onFire={() => onFire(page, slotNum)}
              onStop={() => onStop(page, slotNum)}
              onClear={() => onClear(page, slotNum)}
              onSetLoop={(loop) => onSetLoop(page, slotNum, loop)}
              onSetVolume={(v) => onSetVolume(page, slotNum, v)}
              dmMode={dmMode}
            />
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          padding: "8px 32px 24px",
          fontSize: 11,
          color: T.ink3,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span>
          <Glyph name="speaker" size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          {totalAssigned} of 24 slots assigned
        </span>
        <span style={{ opacity: 0.6 }}>
          SFX layer auto-ducking ships with the next phase.
        </span>
      </div>
    </div>
  );
}
