// Cloud-sync settings modal (PR-5 of docs/CLOUD_SYNC.md). Dumb-visual:
// it owns only the text-input drafts and the "link sent" stage flag; every
// real action (request link / verify / sync / sign out / set base URL)
// routes back to Library through callbacks, which own the sync client and
// all persisted state.

import { useState } from "react";
import { Glyph, T } from "@mc/ui";
import { requiredTier } from "@mc/core";

export type SyncSettingsProps = {
  signedIn: boolean;
  accountEmail?: string;
  deviceLabel?: string;
  baseUrl: string;
  lastSyncedAt?: number;
  syncing: boolean;
  error?: string;
  onRequestLink: (email: string) => void;
  onVerify: (code: string) => void;
  onSyncNow: () => void;
  onSignOut: () => void;
  onSetBaseUrl: (url: string) => void;
  onSetDeviceLabel: (label: string) => void;
  onClose: () => void;
};

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  background: T.bgChip,
  border: `1px solid ${T.rule}`,
  color: T.ink,
  fontSize: 13,
  outline: "none",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 16px",
    borderRadius: 9,
    background: disabled ? T.bgChip : T.gold,
    color: disabled ? T.ink3 : "#1a1108",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    border: "none",
  };
}

const ghostBtn: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 9,
  background: T.bgChip,
  color: T.ink2,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  border: `1px solid ${T.rule}`,
};

export function SyncSettings({
  signedIn,
  accountEmail,
  deviceLabel,
  baseUrl,
  lastSyncedAt,
  syncing,
  error,
  onRequestLink,
  onVerify,
  onSyncNow,
  onSignOut,
  onSetBaseUrl,
  onSetDeviceLabel,
  onClose,
}: SyncSettingsProps) {
  const [email, setEmail] = useState(accountEmail ?? "");
  const [code, setCode] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [baseDraft, setBaseDraft] = useState(baseUrl);
  const [labelDraft, setLabelDraft] = useState(deviceLabel ?? "");

  const emailValid = email.trim().includes("@");
  const tier = requiredTier("cloud_sync");

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
        {/* Header */}
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
            <Glyph name="spark" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="mc-eyebrow">Sync</div>
            <div className="mc-display" style={{ fontSize: 22, fontWeight: 600 }}>
              Cloud <span style={{ fontStyle: "italic", color: T.gold }}>sync</span>
            </div>
          </div>
          {tier ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "capitalize",
                padding: "3px 8px",
                borderRadius: 999,
                background: T.goldSoft,
                border: `1px solid ${T.goldEdge}`,
                color: T.gold,
              }}
              title="Included in the Major plan (free during the beta)."
            >
              {tier} plan
            </span>
          ) : null}
        </div>

        {signedIn ? (
          <SignedInBody
            accountEmail={accountEmail}
            lastSyncedAt={lastSyncedAt}
            syncing={syncing}
            labelDraft={labelDraft}
            onLabelDraft={setLabelDraft}
            onCommitLabel={() => onSetDeviceLabel(labelDraft)}
            onSyncNow={onSyncNow}
            onSignOut={onSignOut}
          />
        ) : (
          <SignedOutBody
            email={email}
            onEmail={setEmail}
            emailValid={emailValid}
            code={code}
            onCode={setCode}
            linkSent={linkSent}
            onSendLink={() => {
              onRequestLink(email);
              setLinkSent(true);
            }}
            onVerify={() => onVerify(code)}
          />
        )}

        {error ? (
          <div
            style={{
              marginTop: 12,
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

        {/* Advanced — endpoint override */}
        <div style={{ marginTop: 14, borderTop: `1px solid ${T.rule}`, paddingTop: 12 }}>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              background: "transparent",
              border: "none",
              color: T.ink3,
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Glyph
              name="caret"
              size={11}
              style={{ transform: showAdvanced ? "rotate(0deg)" : "rotate(-90deg)" }}
            />
            Advanced
          </button>
          {showAdvanced ? (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11, color: T.ink3, display: "block", marginBottom: 4 }}>
                Sync server URL
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={baseDraft}
                  onChange={(e) => setBaseDraft(e.target.value)}
                  spellCheck={false}
                  style={{ ...inputStyle, fontSize: 12 }}
                />
                <button
                  onClick={() => onSetBaseUrl(baseDraft)}
                  disabled={baseDraft.trim() === baseUrl.trim()}
                  style={primaryBtn(baseDraft.trim() === baseUrl.trim())}
                >
                  Save
                </button>
              </div>
              <div style={{ fontSize: 10, color: T.ink3, marginTop: 6, lineHeight: 1.4 }}>
                Point this at your deployed Cloudflare Worker. Changing it signs
                you out of the current server.
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={ghostBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SignedOutBody(props: {
  email: string;
  onEmail: (v: string) => void;
  emailValid: boolean;
  code: string;
  onCode: (v: string) => void;
  linkSent: boolean;
  onSendLink: () => void;
  onVerify: () => void;
}) {
  const { email, onEmail, emailValid, code, onCode, linkSent, onSendLink, onVerify } = props;
  return (
    <div>
      <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, marginBottom: 12 }}>
        Sync your grades, scenes, soundboard, and notes across devices. Your
        audio files stay on this machine — only the small config blob travels.
        Sign in with a one-time link sent to your email.
      </div>

      <label style={{ fontSize: 11, color: T.ink3, display: "block", marginBottom: 4 }}>
        Email
      </label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="you@example.com"
          spellCheck={false}
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === "Enter" && emailValid) onSendLink();
          }}
        />
        <button onClick={onSendLink} disabled={!emailValid} style={primaryBtn(!emailValid)}>
          {linkSent ? "Resend" : "Send link"}
        </button>
      </div>

      {linkSent ? (
        <div
          style={{
            background: T.bgChip,
            border: `1px solid ${T.rule}`,
            borderRadius: 9,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.5, marginBottom: 8 }}>
            Check your inbox and paste the code from the email below.
          </div>
          <label style={{ fontSize: 11, color: T.ink3, display: "block", marginBottom: 4 }}>
            Sign-in code
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={code}
              onChange={(e) => onCode(e.target.value)}
              placeholder="paste code"
              spellCheck={false}
              style={{ ...inputStyle, fontFamily: "ui-monospace, monospace" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.trim()) onVerify();
              }}
            />
            <button onClick={onVerify} disabled={!code.trim()} style={primaryBtn(!code.trim())}>
              Verify
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignedInBody(props: {
  accountEmail: string | undefined;
  lastSyncedAt: number | undefined;
  syncing: boolean;
  labelDraft: string;
  onLabelDraft: (v: string) => void;
  onCommitLabel: () => void;
  onSyncNow: () => void;
  onSignOut: () => void;
}) {
  const {
    accountEmail,
    lastSyncedAt,
    syncing,
    labelDraft,
    onLabelDraft,
    onCommitLabel,
    onSyncNow,
    onSignOut,
  } = props;
  return (
    <div>
      <div
        style={{
          background: T.bgChip,
          border: `1px solid ${T.rule}`,
          borderRadius: 9,
          padding: "10px 12px",
          marginBottom: 12,
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        <div>
          <span style={{ color: T.ink3 }}>Signed in</span>{" "}
          <span style={{ color: T.ink }}>{accountEmail ?? "(this account)"}</span>
        </div>
        <div>
          <span style={{ color: T.ink3 }}>Last synced</span>{" "}
          <span style={{ color: T.ink }}>
            {lastSyncedAt !== undefined ? formatRelative(lastSyncedAt) : "never"}
          </span>
        </div>
      </div>

      <label style={{ fontSize: 11, color: T.ink3, display: "block", marginBottom: 4 }}>
        Device name
      </label>
      <input
        value={labelDraft}
        onChange={(e) => onLabelDraft(e.target.value)}
        onBlur={onCommitLabel}
        placeholder="e.g. Studio PC"
        spellCheck={false}
        style={{ ...inputStyle, marginBottom: 14 }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommitLabel();
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSyncNow}
          disabled={syncing}
          style={{
            ...primaryBtn(syncing),
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Glyph name="spark" size={13} /> {syncing ? "Syncing…" : "Sync now"}
        </button>
        <button onClick={onSignOut} style={ghostBtn}>
          Sign out
        </button>
      </div>
    </div>
  );
}
