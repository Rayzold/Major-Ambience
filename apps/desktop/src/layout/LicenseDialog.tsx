// Plan / license dialog (PR-8, docs/IAP.md). Dumb-visual: it owns only the
// key-input draft; applying / clearing routes back to Library, which owns
// the entitlement lib calls and the displayed tier state.
//
// During the beta everything is unlocked regardless of plan (BETA_TIER),
// so this surface is informational + a way to record a purchased license
// ahead of the launch cutover. The "Effective" row shows what's actually
// unlocked right now; "Plan" shows what the stored license grants.

import { useState } from "react";
import { Glyph, T } from "@mc/ui";
import type { Tier } from "@mc/core";

export type LicenseDialogProps = {
  effectiveTier: Tier;
  purchasedTier: Tier;
  email?: string;
  busy: boolean;
  error?: string;
  status?: string;
  onApply: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
};

const TIER_LABEL: Record<Tier, string> = {
  demo: "Demo · free",
  minor: "Minor · $14.99",
  major: "Major · $29.99",
};

export function LicenseDialog({
  effectiveTier,
  purchasedTier,
  email,
  busy,
  error,
  status,
  onApply,
  onClear,
  onClose,
}: LicenseDialogProps) {
  const [key, setKey] = useState("");

  return (
    <div
      onClick={onClose}
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
          width: 460,
          padding: "20px 22px",
          borderRadius: 16,
          background: T.bgRaise,
          border: `1px solid ${T.rule}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          color: T.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
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
            <Glyph name="star" size={16} />
          </div>
          <div>
            <div className="mc-eyebrow">Plan</div>
            <div className="mc-display" style={{ fontSize: 22, fontWeight: 600 }}>
              Your <span style={{ fontStyle: "italic", color: T.gold }}>license</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: T.bgChip,
            border: `1px solid ${T.rule}`,
            borderRadius: 9,
            padding: "10px 12px",
            marginBottom: 12,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <Row label="Unlocked now" value={TIER_LABEL[effectiveTier]} accent />
          <Row label="Licensed plan" value={TIER_LABEL[purchasedTier]} />
          {email ? <Row label="Licensed to" value={email} /> : null}
        </div>

        {effectiveTier !== purchasedTier ? (
          <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.5, marginBottom: 12 }}>
            Everything is unlocked during the beta. Your license is recorded and
            takes over when the free period ends.
          </div>
        ) : null}

        <label style={{ fontSize: 11, color: T.ink3, display: "block", marginBottom: 4 }}>
          License key
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="paste the key from your purchase email"
            spellCheck={false}
            style={{
              flex: 1,
              padding: "9px 11px",
              borderRadius: 9,
              background: T.bgChip,
              border: `1px solid ${T.rule}`,
              color: T.ink,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && key.trim() && !busy) onApply(key);
            }}
          />
          <button
            onClick={() => onApply(key)}
            disabled={!key.trim() || busy}
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              background: !key.trim() || busy ? T.bgChip : T.gold,
              color: !key.trim() || busy ? T.ink3 : "#1a1108",
              fontSize: 13,
              fontWeight: 600,
              cursor: !key.trim() || busy ? "default" : "pointer",
              border: "none",
            }}
          >
            {busy ? "Checking…" : "Apply"}
          </button>
        </div>

        {status ? (
          <div style={{ marginTop: 10, fontSize: 12, color: T.gold }}>{status}</div>
        ) : null}
        {error ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "#d96666",
              background: "rgba(217,102,102,0.08)",
              border: "1px solid #d96666aa",
              borderRadius: 9,
              padding: "8px 11px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button
            onClick={onClear}
            disabled={purchasedTier === "demo"}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              background: "transparent",
              color: purchasedTier === "demo" ? T.ink3 : T.ink2,
              fontSize: 12,
              cursor: purchasedTier === "demo" ? "default" : "pointer",
              border: "none",
            }}
          >
            Remove license
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              background: T.bgChip,
              color: T.ink2,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${T.rule}`,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: T.ink3 }}>{label}</span>
      <span style={{ color: accent ? T.gold : T.ink }}>{value}</span>
    </div>
  );
}
