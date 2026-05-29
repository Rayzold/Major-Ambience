// Tension countdown timers for the DM Toolkit.
//
// A GM juggles several offscreen clocks — "the ritual completes in 5 min",
// "reinforcements arrive in 3" — so this supports multiple independent
// named timers. Each can bind a stinger track that fires (on the
// soundboard bus, auto-ducking the music) when the clock hits zero.
//
// Timer *configs* (name, duration, stinger) persist via the parent; the
// running state (remaining seconds, ticking) is component-local and
// resets on reload — a countdown shouldn't resume mid-flight after a
// restart.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@mc/core";
import { Glyph, T } from "@mc/ui";

export type CountdownTimer = {
  id: string;
  name: string;
  durationSec: number;
  /** Optional stinger fired (soundboard bus, ducks music) at zero. */
  stingerTrackId?: string;
};

export type TensionCountdownProps = {
  timers: CountdownTimer[];
  onTimers: (next: CountdownTimer[]) => void;
  tracksById: ReadonlyMap<string, Track>;
  /** Open the track picker to bind a stinger to (timerId). */
  onPickStinger: (timerId: string, x: number, y: number) => void;
  /** Fire the bound stinger when a timer reaches zero. */
  onFireStinger: (trackId: string) => void;
};

type Runtime = { remaining: number; running: boolean };

const PRESETS: Array<{ label: string; sec: number }> = [
  { label: "1m", sec: 60 },
  { label: "3m", sec: 180 },
  { label: "5m", sec: 300 },
  { label: "10m", sec: 600 },
];

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function TensionCountdown({
  timers,
  onTimers,
  tracksById,
  onPickStinger,
  onFireStinger,
}: TensionCountdownProps) {
  // Runtime (remaining + running) keyed by timer id, separate from the
  // persisted config in `timers`.
  const [runtime, setRuntime] = useState<Record<string, Runtime>>({});

  // Refs the 1Hz tick reads so it never closes over stale values. Assigned
  // during render — a supported React pattern for "latest value" refs.
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  const timersRef = useRef(timers);
  timersRef.current = timers;
  const onFireRef = useRef(onFireStinger);
  onFireRef.current = onFireStinger;

  // Ensure every configured timer has a runtime entry; prune removed ones.
  useEffect(() => {
    setRuntime((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const t of timers) {
        if (!next[t.id]) {
          next[t.id] = { remaining: t.durationSec, running: false };
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!timers.some((t) => t.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [timers]);

  const anyRunning = useMemo(
    () => Object.values(runtime).some((r) => r.running),
    [runtime],
  );

  // Single 1Hz interval, mounted only while at least one timer runs.
  useEffect(() => {
    if (!anyRunning) return undefined;
    const iv = setInterval(() => {
      const cur = runtimeRef.current;
      const next: Record<string, Runtime> = { ...cur };
      const zeroed: string[] = [];
      let changed = false;
      for (const id of Object.keys(cur)) {
        const r = cur[id]!;
        if (!r.running) continue;
        changed = true;
        const rem = r.remaining - 1;
        if (rem <= 0) {
          next[id] = { remaining: 0, running: false };
          zeroed.push(id);
        } else {
          next[id] = { remaining: rem, running: true };
        }
      }
      for (const id of zeroed) {
        const t = timersRef.current.find((x) => x.id === id);
        if (t?.stingerTrackId) onFireRef.current(t.stingerTrackId);
      }
      if (changed) setRuntime(next);
    }, 1000);
    return () => clearInterval(iv);
  }, [anyRunning]);

  // ── Config ops (persisted) ──────────────────────────────────────────────
  function addTimer() {
    onTimers([...timers, { id: rid(), name: "Timer", durationSec: 60 }]);
  }

  function patchTimer(id: string, patch: Partial<CountdownTimer>) {
    onTimers(timers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function clearStinger(id: string) {
    onTimers(
      timers.map((t) => {
        if (t.id !== id) return t;
        const { stingerTrackId: _s, ...rest } = t;
        void _s;
        return rest;
      }),
    );
  }

  function deleteTimer(id: string) {
    onTimers(timers.filter((t) => t.id !== id));
  }

  function setPreset(t: CountdownTimer, sec: number) {
    patchTimer(t.id, { durationSec: sec });
    setRuntime((prev) => ({ ...prev, [t.id]: { remaining: sec, running: false } }));
  }

  // ── Runtime ops (local) ──────────────────────────────────────────────────
  function toggle(t: CountdownTimer) {
    setRuntime((prev) => {
      const r = prev[t.id] ?? { remaining: t.durationSec, running: false };
      // Starting from a finished clock restarts it from the full duration.
      if (!r.running && r.remaining <= 0) {
        return { ...prev, [t.id]: { remaining: t.durationSec, running: true } };
      }
      return { ...prev, [t.id]: { ...r, running: !r.running } };
    });
  }

  function reset(t: CountdownTimer) {
    setRuntime((prev) => ({
      ...prev,
      [t.id]: { remaining: t.durationSec, running: false },
    }));
  }

  function addThirty(t: CountdownTimer) {
    setRuntime((prev) => {
      const r = prev[t.id] ?? { remaining: t.durationSec, running: false };
      return { ...prev, [t.id]: { ...r, remaining: r.remaining + 30 } };
    });
  }

  return (
    <Panel
      title="Timers"
      eyebrow="Tension countdown"
      action={
        <button
          onClick={addTimer}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: T.gold,
            color: "#1a1108",
            fontWeight: 600,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <Glyph name="plus" size={13} /> Add timer
        </button>
      }
    >
      {timers.length === 0 ? (
        <div
          style={{
            padding: "30px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Add a timer to track an offscreen clock — a ritual, reinforcements,
          a collapsing dungeon. Bind a stinger to mark zero.
        </div>
      ) : (
        timers.map((t) => {
          const r = runtime[t.id] ?? { remaining: t.durationSec, running: false };
          const done = r.remaining <= 0;
          const stinger = t.stingerTrackId ? tracksById.get(t.stingerTrackId) : undefined;
          return (
            <div
              key={t.id}
              style={{
                padding: "12px 14px",
                borderBottom: `1px solid ${T.rule}`,
                background: done ? "#d9666622" : "transparent",
              }}
            >
              {/* Name + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  value={t.name}
                  onChange={(e) => patchTimer(t.id, { name: e.target.value })}
                  placeholder="Timer name"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: T.bgChip,
                    border: `1px solid ${T.rule}`,
                    borderRadius: 6,
                    padding: "5px 8px",
                    color: T.ink,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <button
                  onClick={() => deleteTimer(t.id)}
                  title="Delete timer"
                  style={{
                    width: 26,
                    height: 26,
                    background: "transparent",
                    border: "none",
                    color: T.ink3,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Glyph name="close" size={12} />
                </button>
              </div>

              {/* Clock + transport */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div
                  className="mc-display"
                  style={{
                    fontSize: 34,
                    fontWeight: 700,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    color: done ? "#e08a8a" : r.running ? T.gold : T.ink,
                    minWidth: 96,
                  }}
                >
                  {fmt(r.remaining)}
                </div>
                <button
                  onClick={() => toggle(t)}
                  title={r.running ? "Pause" : "Start"}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: T.ink,
                    color: "#1a1108",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Glyph name={r.running ? "pause" : "play"} size={15} />
                </button>
                <button
                  onClick={() => reset(t)}
                  title="Reset to full duration"
                  style={ctrlStyle}
                >
                  <Glyph name="loop" size={14} />
                </button>
                <button onClick={() => addThirty(t)} title="Add 30 seconds" style={ctrlStyle}>
                  +30s
                </button>
              </div>

              {/* Presets + stinger */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                {PRESETS.map((p) => {
                  const active = t.durationSec === p.sec;
                  return (
                    <button
                      key={p.sec}
                      onClick={() => setPreset(t, p.sec)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: active ? T.goldSoft : T.bgChip,
                        color: active ? T.gold : T.ink3,
                        border: `1px solid ${active ? T.goldEdge : T.rule}`,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <div style={{ flex: 1 }} />
                <button
                  onClick={(e) => onPickStinger(t.id, e.clientX, e.clientY)}
                  title={stinger ? `Stinger: ${stinger.title}` : "Bind a stinger for zero"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    maxWidth: 150,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: t.stingerTrackId ? T.goldSoft : T.bgChip,
                    border: `1px solid ${t.stingerTrackId ? T.goldEdge : T.rule}`,
                    color: t.stingerTrackId ? T.gold : T.ink3,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  <Glyph name="spark" size={11} />
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stinger ? stinger.title : t.stingerTrackId ? "(missing)" : "Stinger"}
                  </span>
                </button>
                {t.stingerTrackId ? (
                  <button
                    onClick={() => clearStinger(t.id)}
                    title="Clear stinger"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: T.ink3,
                      cursor: "pointer",
                      fontSize: 10,
                      padding: "3px 4px",
                    }}
                  >
                    clear
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </Panel>
  );
}

const ctrlStyle: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  borderRadius: 7,
  background: "transparent",
  border: `1px solid ${T.rule}`,
  color: T.ink2,
  cursor: "pointer",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: T.bgCard,
        border: `1px solid ${T.rule}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${T.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div className="mc-eyebrow" style={{ fontSize: 9 }}>
            {eyebrow}
          </div>
          <div
            className="mc-display"
            style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.05, marginTop: 2 }}
          >
            <span style={{ fontStyle: "italic", color: T.gold }}>{title}</span>
          </div>
        </div>
        {action}
      </div>
      <div className="mc-scroll" style={{ overflowY: "auto", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
