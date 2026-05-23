// Edit an existing scene — rename, change primary category, adjust
// fade / ducking / volume, optionally replace its trackIds with the
// current Library queue. Save persists via saveScene (upsert) in the
// Library; Cancel discards the draft and closes.

import { useEffect, useRef, useState } from "react";
import type { CategoryId, Scene, Track } from "@mc/core";
import { CATEGORIES, findCategory, Glyph, T } from "@mc/ui";

export type SceneEditDialogProps = {
  scene: Scene;
  /**
   * The current Library queue — supplied so the "Replace tracks with
   * current queue" button has something to show / copy. Empty array
   * disables that button.
   */
  currentQueue: readonly Track[];
  onSave: (updated: Scene) => void;
  onCancel: () => void;
};

export function SceneEditDialog({
  scene,
  currentQueue,
  onSave,
  onCancel,
}: SceneEditDialogProps) {
  // Local draft — committed to the caller on Save, dropped on Cancel.
  const [name, setName] = useState(scene.name);
  const [primary, setPrimary] = useState<CategoryId>(scene.primaryCategory);
  const [fadeMs, setFadeMs] = useState(scene.fadeMs);
  const [duckingPct, setDuckingPct] = useState(scene.duckingPct);
  // Volume — scenes store per-category volumes; we expose the primary's
  // value as the main slider since that's what feels like "scene volume".
  const initialVolume = scene.volumes[scene.primaryCategory] ?? 0.85;
  const [volume, setVolume] = useState(initialVolume);
  const [trackIds, setTrackIds] = useState(scene.trackIds);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onCancel();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onCancel]);

  function handleSave() {
    const trimmed = name.trim() || scene.name;
    const updated: Scene = {
      ...scene,
      name: trimmed,
      primaryCategory: primary,
      trackIds,
      fadeMs,
      duckingPct,
      // Preserve any other per-category volumes the user had set; just
      // update the primary's slot to the editor's slider.
      volumes: { ...scene.volumes, [primary]: volume } as Partial<
        Record<CategoryId, number>
      >,
    };
    onSave(updated);
  }

  function adoptCurrentQueue() {
    setTrackIds(currentQueue.map((t) => t.id));
  }

  const primaryMeta = findCategory(primary);
  const accent = primaryMeta?.color ?? T.gold;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "var(--mc-modalBackdrop, rgba(0,0,0,0.55))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-label="Edit scene"
        style={{
          width: 480,
          maxHeight: "80vh",
          background: T.popoverBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${T.rule}`,
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${T.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {primaryMeta ? (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(140deg, ${primaryMeta.color}, ${primaryMeta.dark})`,
                color: T.ink,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Glyph name={primaryMeta.glyph} size={16} />
            </div>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mc-eyebrow" style={{ fontSize: 9 }}>
              Edit scene
            </div>
            <h2
              className="mc-display"
              style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.ink }}
            >
              {name || scene.name}
            </h2>
          </div>
          <button
            onClick={onCancel}
            title="Close (Esc)"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "transparent",
              color: T.ink3,
              border: 0,
              cursor: "pointer",
            }}
          >
            <Glyph name="close" size={14} />
          </button>
        </div>

        <div
          className="mc-scroll"
          style={{
            overflowY: "auto",
            padding: "16px 18px 8px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                background: T.bgCard,
                border: `1px solid ${T.rule}`,
                color: T.ink,
                fontSize: 13,
                outline: "none",
              }}
            />
          </Field>

          <Field label="Primary category">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {CATEGORIES.map((c) => {
                const active = c.id === primary;
                return (
                  <button
                    key={c.id}
                    onClick={() => setPrimary(c.id)}
                    title={`Set primary to ${c.name}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: active ? c.color + "22" : T.bgChip,
                      color: active ? c.color : T.ink2,
                      border: `1px solid ${active ? c.color + "55" : "transparent"}`,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <Glyph name={c.glyph} size={11} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="Crossfade"
            value={`${(fadeMs / 1000).toFixed(fadeMs % 1000 === 0 ? 0 : 1)}s`}
          >
            <input
              type="range"
              min={0}
              max={10000}
              step={250}
              value={fadeMs}
              onChange={(e) => setFadeMs(Number(e.currentTarget.value))}
              style={{ width: "100%", accentColor: accent }}
            />
          </Field>

          <Field label="Volume" value={`${Math.round(volume * 100)}%`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.currentTarget.value))}
              style={{ width: "100%", accentColor: accent }}
            />
          </Field>

          <Field
            label="Ducking"
            value={`${Math.round(duckingPct * 100)}%`}
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={duckingPct}
              onChange={(e) => setDuckingPct(Number(e.currentTarget.value))}
              style={{ width: "100%", accentColor: "#5cc4d9" }}
            />
          </Field>

          <Field
            label="Tracks"
            value={
              trackIds.length === 0
                ? "shuffles category on restore"
                : `${trackIds.length} pinned`
            }
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={adoptCurrentQueue}
                disabled={currentQueue.length === 0}
                title={
                  currentQueue.length === 0
                    ? "Play a category first to build a queue, then come back here"
                    : `Replace this scene's tracks with the current queue (${currentQueue.length})`
                }
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background:
                    currentQueue.length === 0 ? T.bgChip : T.goldSoft,
                  color: currentQueue.length === 0 ? T.ink3 : T.gold,
                  border: `1px solid ${
                    currentQueue.length === 0 ? T.rule : T.goldEdge
                  }`,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: currentQueue.length === 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Glyph name="shuffle" size={12} />
                Adopt current queue ({currentQueue.length})
              </button>
              {trackIds.length > 0 ? (
                <button
                  onClick={() => setTrackIds([])}
                  title="Clear pinned tracks (scene will shuffle the primary category on restore)"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: T.bgChip,
                    color: T.ink3,
                    border: `1px solid ${T.rule}`,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </Field>
        </div>

        <div
          style={{
            padding: "10px 18px",
            borderTop: `1px solid ${T.rule}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "transparent",
              color: T.ink2,
              border: `1px solid ${T.rule}`,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: T.gold,
              color: "#1a1108",
              border: 0,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <div
          className="mc-eyebrow"
          style={{ fontSize: 9, color: T.ink3 }}
        >
          {label}
        </div>
        {value ? (
          <div
            className="mc-mono"
            style={{ fontSize: 10, color: T.ink2 }}
          >
            {value}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
