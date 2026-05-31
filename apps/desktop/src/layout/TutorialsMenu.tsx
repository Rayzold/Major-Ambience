// Popup from the settings icon. Holds Themes + Tutorials sections.

import { useEffect, useRef } from "react";
import {
  Glyph,
  T,
  THEME_META,
  THEME_ORDER,
  THEMES,
  type ThemeId,
} from "@mc/ui";
import type { TutorialDef } from "./tutorials.js";

export type TutorialsMenuProps = {
  tutorials: readonly TutorialDef[];
  seen: ReadonlySet<string>;
  anchor: { x: number; y: number };
  currentTheme: ThemeId;
  onPickTheme: (id: ThemeId) => void;
  onPickTutorial: (id: string) => void;
  onOpenLicense: () => void;
  onOpenCloudSync: () => void;
  onExportSync: () => void;
  onImportSync: () => void;
  onDismiss: () => void;
};

const WIDTH = 340;

export function TutorialsMenu({
  tutorials,
  seen,
  anchor,
  currentTheme,
  onPickTheme,
  onPickTutorial,
  onOpenLicense,
  onOpenCloudSync,
  onExportSync,
  onImportSync,
  onDismiss,
}: TutorialsMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onDismiss]);

  const x = Math.max(8, Math.min(anchor.x - WIDTH, window.innerWidth - WIDTH - 8));
  const y = anchor.y;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: WIDTH,
        zIndex: 70,
        background: T.popoverBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${T.rule}`,
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        overflow: "hidden",
        maxHeight: "78vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.rule}`,
          flexShrink: 0,
        }}
      >
        <div className="mc-eyebrow" style={{ fontSize: 9 }}>
          Settings
        </div>
      </div>

      <div className="mc-scroll" style={{ overflowY: "auto", padding: 6 }}>
        <SectionHeader title="Theme" />
        {THEME_ORDER.map((id) => {
          const meta = THEME_META[id];
          const palette = THEMES[id];
          const active = id === currentTheme;
          return (
            <button
              key={id}
              onClick={() => onPickTheme(id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 8,
                background: active ? T.goldSoft : "transparent",
                border: `1px solid ${active ? T.goldEdge : "transparent"}`,
                color: T.ink,
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 4,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = T.bgChip;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <ThemeSwatch palette={palette} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: active ? T.gold : T.ink,
                  }}
                >
                  {meta.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink3,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {meta.blurb}
                </div>
              </div>
              {active ? (
                <span style={{ color: T.gold, flexShrink: 0 }}>
                  <Glyph name="check" size={14} />
                </span>
              ) : null}
            </button>
          );
        })}

        <div style={{ height: 6 }} />
        <SectionHeader title="Plan" />
        <div style={{ padding: "0 6px 8px" }}>
          <button
            onClick={onOpenLicense}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              background: T.bgChip,
              border: `1px solid ${T.rule}`,
              color: T.ink,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Glyph name="star" size={13} /> Plan &amp; license…
          </button>
        </div>

        <div style={{ height: 6 }} />
        <SectionHeader title="Sync" />
        <div style={{ padding: "0 6px 8px" }}>
          <button
            onClick={onOpenCloudSync}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              background: T.goldSoft,
              border: `1px solid ${T.goldEdge}`,
              color: T.gold,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Glyph name="spark" size={13} /> Cloud sync…
          </button>
        </div>
        <div
          style={{
            padding: "0 6px 4px",
            fontSize: 10,
            color: T.ink3,
            lineHeight: 1.4,
          }}
        >
          Or carry grades + scenes + soundboard between devices as a JSON file.
        </div>
        <div style={{ display: "flex", gap: 6, padding: "4px 6px 8px" }}>
          <button
            onClick={onExportSync}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              background: T.goldSoft,
              border: `1px solid ${T.goldEdge}`,
              color: T.gold,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Glyph name="folder" size={12} /> Export
          </button>
          <button
            onClick={onImportSync}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              background: T.bgChip,
              border: `1px solid ${T.rule}`,
              color: T.ink2,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Glyph name="folder" size={12} /> Import
          </button>
        </div>

        <div style={{ height: 6 }} />
        <SectionHeader title="Tutorials" />
        {tutorials.map((t) => {
          const isSeen = seen.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onPickTutorial(t.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 8,
                background: "transparent",
                color: T.ink,
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.bgChip;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: isSeen ? T.bgChip : T.goldSoft,
                  border: `1px solid ${isSeen ? T.rule : T.goldEdge}`,
                  color: isSeen ? T.ink3 : T.gold,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Glyph name={isSeen ? "check" : "spark"} size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink3,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {t.blurb}
                </div>
                <div
                  className="mc-mono"
                  style={{ fontSize: 9, color: T.ink3, marginTop: 4 }}
                >
                  {t.durationSeconds}s · {t.steps.length} steps
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      className="mc-eyebrow"
      style={{ padding: "8px 12px 6px", fontSize: 9, color: T.ink3 }}
    >
      {title}
    </div>
  );
}

function ThemeSwatch({ palette }: { palette: { bg: string; bgRaise: string; ink: string; gold: string } }) {
  return (
    <div
      style={{
        width: 38,
        height: 26,
        borderRadius: 6,
        flexShrink: 0,
        background: palette.bg,
        border: `1px solid ${T.rule}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "55%",
          background: palette.bgRaise,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 4,
          top: 4,
          width: 8,
          height: 8,
          borderRadius: 999,
          background: palette.gold,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 5,
          bottom: 5,
          width: 16,
          height: 3,
          borderRadius: 1.5,
          background: palette.ink,
          opacity: 0.85,
        }}
      />
    </div>
  );
}
