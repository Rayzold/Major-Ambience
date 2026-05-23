// Modal cheatsheet of keyboard shortcuts. Triggered by "?" or via
// Settings → Tutorials. Dismiss with Esc / click outside / ?.

import { useEffect, useRef } from "react";
import { Glyph, T } from "@mc/ui";
import { SHORTCUTS_REFERENCE } from "../lib/keyboard.js";

export type KeyboardHelpOverlayProps = {
  onDismiss: () => void;
};

export function KeyboardHelpOverlay({ onDismiss }: KeyboardHelpOverlayProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onDismiss();
      }
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
        aria-label="Keyboard shortcuts"
        style={{
          width: 420,
          maxHeight: "78vh",
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
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 18px",
            borderBottom: `1px solid ${T.rule}`,
          }}
        >
          <span style={{ color: T.gold }}>
            <Glyph name="spark" size={16} />
          </span>
          <div className="mc-eyebrow" style={{ fontSize: 9 }}>
            Keyboard
          </div>
          <h2
            className="mc-display"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: T.ink,
              flex: 1,
            }}
          >
            Shortcuts
          </h2>
          <button
            onClick={onDismiss}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "transparent",
              color: T.ink3,
            }}
            title="Close (Esc)"
          >
            <Glyph name="close" size={14} />
          </button>
        </div>

        <div
          className="mc-scroll"
          style={{ overflowY: "auto", padding: "8px 10px 12px" }}
        >
          {SHORTCUTS_REFERENCE.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 10px",
                borderRadius: 8,
              }}
            >
              <KeyCap label={s.keys} />
              <div style={{ flex: 1, fontSize: 13, color: T.ink2 }}>
                {s.description}
              </div>
            </div>
          ))}
          <div
            style={{
              padding: "10px 10px 4px",
              fontSize: 11,
              color: T.ink3,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            Shortcuts are disabled when typing in a search or text field.
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyCap({ label }: { label: string }) {
  return (
    <span
      className="mc-mono"
      style={{
        minWidth: 88,
        textAlign: "center",
        fontSize: 11,
        padding: "4px 8px",
        borderRadius: 6,
        background: T.bgChip,
        border: `1px solid ${T.rule}`,
        color: T.ink,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
