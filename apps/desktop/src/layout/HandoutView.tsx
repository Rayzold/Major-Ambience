// Player-facing "handout" window — opened from the main app's header and
// dragged onto a second screen / projector for the table to see. Shows the
// currently-playing track on a big, calm, control-free display. It runs in
// its own Tauri window (a separate React root via `?view=handout`) and
// mirrors the main window's state over the `mc:nowplaying` Tauri event.

import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import type { CategoryId } from "@mc/core";
import { applyTheme, findCategory, OrbVisualizer, T, type ThemeId } from "@mc/ui";

/** Payload the main window emits on `mc:nowplaying`. `null` = nothing playing. */
export type HandoutPayload = {
  title: string;
  pack: string;
  categoryId: CategoryId;
  playing: boolean;
  currentSec: number;
  durationSec: number;
  theme: ThemeId;
} | null;

export const HANDOUT_EVENT = "mc:nowplaying";
/** Emitted by the handout on mount so the main window pushes current state. */
export const HANDOUT_READY_EVENT = "mc:handout-ready";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function HandoutView() {
  const [np, setNp] = useState<HandoutPayload>(null);

  // The handout window is a fresh document — apply a theme so the CSS vars
  // resolve. Start on the canonical theme; each event re-applies the main
  // window's current theme so the two surfaces stay in sync.
  useEffect(() => {
    applyTheme("gold-dark");
    const unlisten = listen<HandoutPayload>(HANDOUT_EVENT, (e) => {
      setNp(e.payload);
      if (e.payload?.theme) applyTheme(e.payload.theme);
    });
    // Ask the main window to push current state so we're not blank on open
    // (the periodic now-playing emit only fires on change).
    void emit(HANDOUT_READY_EVENT);
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const cat = np ? findCategory(np.categoryId) : undefined;
  const color = cat?.color ?? T.gold;
  const pct =
    np && np.durationSec > 0
      ? Math.min(100, Math.max(0, (np.currentSec / np.durationSec) * 100))
      : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: `radial-gradient(80% 80% at 50% 30%, ${color}22 0%, ${T.bg} 70%)`,
        color: T.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 48,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {np === null ? (
        <div style={{ textAlign: "center", color: T.ink3 }}>
          <div
            className="mc-display"
            style={{ fontSize: 40, fontStyle: "italic", color: T.gold }}
          >
            Major Ambience
          </div>
          <div style={{ marginTop: 10, fontSize: 15 }}>Standing by…</div>
        </div>
      ) : (
        <>
          {/* Category orb */}
          <OrbVisualizer color={color} size={220} playing={np.playing} />

          <div style={{ textAlign: "center", maxWidth: "80vw" }}>
            <div
              className="mc-eyebrow"
              style={{ color, fontSize: 13, letterSpacing: 0.2 }}
            >
              {cat?.name ?? "Now playing"}
            </div>
            <div
              className="mc-display"
              style={{
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1.1,
                marginTop: 8,
                color: T.ink,
              }}
            >
              {np.title}
            </div>
            {np.pack ? (
              <div style={{ fontSize: 18, color: T.ink2, marginTop: 8 }}>{np.pack}</div>
            ) : null}
          </div>

          {/* Progress */}
          <div style={{ width: "min(620px, 80vw)" }}>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: T.rule,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  transition: "width 0.25s linear",
                }}
              />
            </div>
            <div
              className="mc-mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: T.ink3,
                marginTop: 8,
              }}
            >
              <span>{fmt(np.currentSec)}</span>
              <span>{fmt(np.durationSec)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
