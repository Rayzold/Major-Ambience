// Modal confirming a destructive sync import — replaces local scenes,
// soundboard, and config. Grades merge by trackKey so unrelated grades
// survive.

import { useEffect } from "react";
import type { SyncBlob } from "@mc/core";
import { Glyph, T } from "@mc/ui";

export type SyncImportConfirmProps = {
  blob: SyncBlob;
  path: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SyncImportConfirm({
  blob,
  path,
  onConfirm,
  onCancel,
}: SyncImportConfirmProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const fileName = path.split(/[\\/]/).pop() ?? path;
  const exportedAt = new Date(blob.updatedAt).toLocaleString();
  const gradeCount = Object.keys(blob.grades).length;
  const sceneCount = blob.scenes.length;
  const soundboardCount = blob.soundboard.length;

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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          padding: "20px 22px",
          borderRadius: 16,
          background: T.bgRaise,
          border: `1px solid ${T.rule}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          color: T.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: T.goldSoft,
              border: `1px solid ${T.goldEdge}`,
              color: T.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph name="folder" size={16} />
          </div>
          <div>
            <div className="mc-eyebrow">Sync</div>
            <div className="mc-display" style={{ fontSize: 22, fontWeight: 600 }}>
              Import <span style={{ fontStyle: "italic", color: T.gold }}>blob</span>
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: T.ink2,
            background: T.bgChip,
            border: `1px solid ${T.rule}`,
            borderRadius: 9,
            padding: "10px 12px",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          <div>
            <span style={{ color: T.ink3 }}>File</span>{" "}
            <span className="mc-mono" style={{ color: T.ink }}>
              {fileName}
            </span>
          </div>
          <div style={{ marginTop: 2 }}>
            <span style={{ color: T.ink3 }}>Exported</span>{" "}
            <span style={{ color: T.ink }}>{exportedAt}</span>
            {blob.deviceLabel ? (
              <>
                {" "}
                <span style={{ color: T.ink3 }}>from</span>{" "}
                <span style={{ color: T.ink }}>{blob.deviceLabel}</span>
              </>
            ) : null}
          </div>
          <div style={{ marginTop: 6, color: T.ink3 }}>
            Will apply{" "}
            <span style={{ color: T.gold }}>{gradeCount.toLocaleString()}</span> grades ·{" "}
            <span style={{ color: T.gold }}>{sceneCount}</span> scenes ·{" "}
            <span style={{ color: T.gold }}>{soundboardCount}</span> soundboard slots.
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: T.ink2,
            lineHeight: 1.5,
            marginBottom: 16,
            padding: "10px 12px",
            border: `1px solid #d96666aa`,
            borderRadius: 9,
            background: "rgba(217,102,102,0.08)",
          }}
        >
          <span style={{ color: "#d96666", fontWeight: 600 }}>Heads-up.</span>{" "}
          Scenes and soundboard layouts are <em>replaced wholesale</em>. Local
          grades on tracks that aren&apos;t in this blob stay where they are.
          Theme, fade, volume, ducking, and tutorials-seen are all overwritten
          from the file.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
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
            onClick={onConfirm}
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              background: T.gold,
              color: "#1a1108",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Apply import
          </button>
        </div>
      </div>
    </div>
  );
}
