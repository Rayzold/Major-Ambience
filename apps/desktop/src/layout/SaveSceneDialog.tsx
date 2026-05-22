// Tiny modal for naming a new scene at save time.

import { useEffect, useRef, useState } from "react";
import type { CategoryId } from "@mc/core";
import { findCategory, Glyph, T } from "@mc/ui";

export type SaveSceneDialogProps = {
  primaryCategory: CategoryId;
  queueLength: number;
  fadeMs: number;
  masterVolume: number;
  onSave: (name: string) => void;
  onCancel: () => void;
};

export function SaveSceneDialog({
  primaryCategory,
  queueLength,
  fadeMs,
  masterVolume,
  onSave,
  onCancel,
}: SaveSceneDialogProps) {
  const cat = findCategory(primaryCategory);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    onSave(trimmed);
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: T.modalBackdrop,
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: 440,
          padding: "20px 22px",
          borderRadius: 16,
          background: T.bgRaise,
          border: `1px solid ${T.rule}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          color: T.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {cat ? (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: `linear-gradient(140deg, ${cat.color}, ${cat.dark})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.ink,
              }}
            >
              <Glyph name={cat.glyph} size={16} />
            </div>
          ) : null}
          <div>
            <div className="mc-eyebrow">Snapshot</div>
            <div
              className="mc-display"
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.05 }}
            >
              Save <span style={{ fontStyle: "italic", color: T.gold }}>scene</span>
            </div>
          </div>
        </div>

        <label
          style={{ display: "block", fontSize: 11, color: T.ink3, marginBottom: 4 }}
        >
          Scene name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder='e.g. "Final Boss · Dragon"'
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 9,
            background: T.bgCard,
            border: `1px solid ${T.rule}`,
            color: T.ink,
            fontSize: 14,
            outline: "none",
            marginBottom: 14,
          }}
        />

        <div
          style={{
            fontSize: 11,
            color: T.ink2,
            marginBottom: 16,
            lineHeight: 1.45,
            padding: "10px 12px",
            background: T.bgChip,
            borderRadius: 8,
            border: `1px solid ${T.rule}`,
          }}
        >
          <span style={{ color: T.ink3 }}>This snapshot includes</span>
          <br />
          <span style={{ color: cat?.color ?? T.gold }}>{cat?.name ?? primaryCategory}</span>
          {" · "}
          {queueLength > 0 ? `${queueLength}-track queue` : "category-default shuffle"}
          {" · "}
          {(fadeMs / 1000).toFixed(fadeMs % 1000 === 0 ? 0 : 1)}s fade
          {" · "}
          {Math.round(masterVolume * 100)}% volume
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              background: T.bgChip,
              color: T.ink2,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={name.trim().length === 0}
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              background: name.trim().length === 0 ? T.bgChip : T.gold,
              color: name.trim().length === 0 ? T.ink3 : "#1a1108",
              fontSize: 13,
              fontWeight: 600,
              cursor: name.trim().length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Save scene
          </button>
        </div>
      </form>
    </div>
  );
}
