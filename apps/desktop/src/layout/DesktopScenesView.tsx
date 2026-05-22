// Scenes tab — grid of saved snapshots. Port of prototype/app/screens.jsx
// ScenesScreen + SceneCardLarge.

import { useState } from "react";
import type { Scene } from "@mc/core";
import { CategoryGradient, findCategory, Glyph, T } from "@mc/ui";

export type DesktopScenesViewProps = {
  scenes: Scene[];
  activeSceneId: string | undefined;
  canSave: boolean;
  onOpenSave: () => void;
  onRestore: (s: Scene) => void;
  onDelete: (s: Scene) => void;
  dmMode: boolean;
};

export function DesktopScenesView({
  scenes,
  activeSceneId,
  canSave,
  onOpenSave,
  onRestore,
  onDelete,
  dmMode,
}: DesktopScenesViewProps) {
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
      <CategoryGradient cat="horror" height={280} intensity={0.35} />

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
        <div style={{ flex: 1 }}>
          <div className="mc-eyebrow">Snapshots</div>
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
            <span style={{ fontStyle: "italic", color: T.gold }}>Scenes</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.ink2, maxWidth: 560, lineHeight: 1.45 }}>
            Snapshot the current category, queue, fade, and volume. Tap to
            restore everything in one move.
          </p>
        </div>
        {dmMode ? null : (
          <button
            onClick={onOpenSave}
            disabled={!canSave}
            title={canSave ? "Save the current view as a scene" : "Open a folder first"}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: canSave ? T.gold : T.bgChip,
              color: canSave ? "#1a1108" : T.ink3,
              fontWeight: 600,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: canSave ? "pointer" : "not-allowed",
              flexShrink: 0,
            }}
          >
            <Glyph name="plus" size={14} /> Save current scene
          </button>
        )}
      </div>

      {scenes.length === 0 ? (
        <div
          style={{
            position: "relative",
            padding: "60px 32px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 14,
            textAlign: "center",
            maxWidth: 480,
            margin: "20px auto 0",
            lineHeight: 1.5,
          }}
        >
          No scenes yet. Pick a category, set a fade and volume you like, then
          hit <span style={{ color: T.gold, fontStyle: "normal" }}>Save current scene</span>.
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            padding: "24px 32px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {scenes.map((s) => (
            <SceneCardLarge
              key={s.id}
              scene={s}
              isActive={s.id === activeSceneId}
              onTap={() => onRestore(s)}
              onDelete={() => onDelete(s)}
              dmMode={dmMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneCardLarge({
  scene,
  isActive,
  onTap,
  onDelete,
  dmMode,
}: {
  scene: Scene;
  isActive: boolean;
  onTap: () => void;
  onDelete: () => void;
  dmMode: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const primary = findCategory(scene.primaryCategory);
  if (!primary) return null;
  const trackN = scene.trackIds.length;
  const created = new Date(scene.createdAt).toLocaleDateString();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        height: 200,
        background: `linear-gradient(155deg, ${primary.color}33 0%, ${primary.dark}cc 60%, ${T.bgCard} 100%)`,
        border: `1px solid ${isActive ? primary.color : primary.color + "33"}`,
        boxShadow: isActive ? `0 0 0 1px ${primary.color}55, 0 6px 20px ${primary.color}33` : undefined,
      }}
    >
      <button
        onClick={onTap}
        style={{
          position: "absolute",
          inset: 0,
          padding: 16,
          textAlign: "left",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -22,
            top: -16,
            color: primary.color,
            opacity: 0.22,
          }}
        >
          <Glyph name={scene.glyph ?? primary.glyph} size={140} stroke={1.1} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div className="mc-eyebrow" style={{ color: primary.color, fontSize: 9 }}>
            {isActive ? "Active scene" : "Scene"}
          </div>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: T.ink2,
              fontWeight: 600,
            }}
          >
            {scene.soundboardPage}
          </div>
        </div>
        <div
          className="mc-display"
          style={{
            marginTop: 8,
            fontSize: 24,
            lineHeight: 1.05,
            color: T.ink,
            fontWeight: 600,
            position: "relative",
          }}
        >
          {scene.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.ink2,
            marginTop: 6,
            lineHeight: 1.35,
            position: "relative",
          }}
        >
          {primary.name}
          {scene.accentCategories.length > 0
            ? ` + ${scene.accentCategories
                .map((id) => findCategory(id)?.name ?? id)
                .join(", ")}`
            : ""}
          {" · "}
          {trackN > 0 ? `${trackN} tracks` : "shuffles category"}
          {" · "}
          {(scene.fadeMs / 1000).toFixed(scene.fadeMs % 1000 === 0 ? 0 : 1)}s fade
        </div>
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {[scene.primaryCategory, ...scene.accentCategories]
              .slice(0, 4)
              .map((id) => {
                const c = findCategory(id);
                if (!c) return null;
                return (
                  <div
                    key={id}
                    style={{
                      width: 22,
                      height: 5,
                      borderRadius: 2.5,
                      background: c.color,
                    }}
                  />
                );
              })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, color: T.ink3 }}>{created}</div>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: primary.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: primary.dark,
              }}
            >
              <Glyph name="play" size={11} />
            </div>
          </div>
        </div>
      </button>
      {hovered && !dmMode ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete scene"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            width: 24,
            height: 24,
            borderRadius: 999,
            background: "rgba(0,0,0,0.5)",
            color: T.ink2,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${T.rule}`,
            cursor: "pointer",
          }}
        >
          <Glyph name="close" size={12} />
        </button>
      ) : null}
    </div>
  );
}
