// Recap composer for the DM Toolkit.
//
// Pin notable moments during play; each captures what was playing at the
// time. "Copy recap" flattens the lot into a paste-ready block for the
// next session's chat. Fully controlled by the parent (persists via
// dm_recap).

import { useState } from "react";
import { Glyph, T } from "@mc/ui";

export type RecapMoment = {
  id: string;
  text: string;
  /** Title of whatever was playing when the moment was pinned. */
  track?: string;
  at: number;
};

export type RecapComposerProps = {
  moments: RecapMoment[];
  onMoments: (next: RecapMoment[]) => void;
  /** Title of the currently-playing track, captured on pin. */
  nowPlayingLabel?: string;
};

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function recapText(moments: RecapMoment[]): string {
  // Oldest-first reads like a story; the list shows newest-first.
  const lines = [...moments]
    .sort((a, b) => a.at - b.at)
    .map((m) => `• ${m.text}${m.track ? `  (♪ ${m.track})` : ""}`);
  return `Session recap\n\n${lines.join("\n")}`;
}

export function RecapComposer({ moments, onMoments, nowPlayingLabel }: RecapComposerProps) {
  const [input, setInput] = useState("");

  function pin() {
    const text = input.trim();
    if (!text) return;
    const moment: RecapMoment = {
      id: rid(),
      text,
      at: Date.now(),
      ...(nowPlayingLabel ? { track: nowPlayingLabel } : {}),
    };
    onMoments([moment, ...moments]);
    setInput("");
  }

  function editText(id: string, text: string) {
    onMoments(moments.map((m) => (m.id === id ? { ...m, text } : m)));
  }

  function remove(id: string) {
    onMoments(moments.filter((m) => m.id !== id));
  }

  function clearAll() {
    onMoments([]);
  }

  function copyRecap() {
    if (moments.length === 0) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(recapText(moments));
    }
  }

  return (
    <Panel
      title="Recap"
      eyebrow="Session moments"
      action={
        <button
          onClick={copyRecap}
          disabled={moments.length === 0}
          title={moments.length === 0 ? "Pin a moment first" : "Copy the recap to clipboard"}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: moments.length === 0 ? T.bgChip : T.gold,
            color: moments.length === 0 ? T.ink3 : "#1a1108",
            fontWeight: 600,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: moments.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Glyph name="note" size={13} /> Copy recap
        </button>
      }
    >
      {/* Pin a moment */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.rule}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") pin();
            }}
            placeholder="What just happened?"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 8,
              background: T.bgChip,
              border: `1px solid ${T.rule}`,
              color: T.ink,
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={pin}
            disabled={input.trim().length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: input.trim().length === 0 ? T.bgChip : T.gold,
              color: input.trim().length === 0 ? T.ink3 : "#1a1108",
              fontWeight: 600,
              fontSize: 12,
              cursor: input.trim().length === 0 ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Glyph name="pin" size={12} /> Pin
          </button>
        </div>
        {nowPlayingLabel ? (
          <div style={{ fontSize: 10, color: T.ink3, marginTop: 6 }}>
            Will tag with ♪ <span style={{ color: T.ink2 }}>{nowPlayingLabel}</span>
          </div>
        ) : null}
      </div>

      {moments.length === 0 ? (
        <div
          style={{
            padding: "30px 16px",
            color: T.ink3,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Pin a moment when something memorable happens. Each one tags the
          track that was playing — copy the recap at the end of the session.
        </div>
      ) : (
        <>
          {moments.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "9px 14px",
                borderBottom: `1px solid ${T.rule}`,
              }}
            >
              <span
                className="mc-mono"
                style={{ fontSize: 10, color: T.ink3, marginTop: 3, flexShrink: 0 }}
              >
                {clockTime(m.at)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={m.text}
                  onChange={(e) => editText(m.id, e.currentTarget.value)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: 0,
                    outline: "none",
                    color: T.ink,
                    fontSize: 13,
                    padding: 0,
                  }}
                />
                {m.track ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: T.ink3,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    ♪ {m.track}
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => remove(m.id)}
                title="Remove"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "transparent",
                  color: T.ink3,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Glyph name="close" size={11} />
              </button>
            </div>
          ))}
          <div style={{ padding: "10px 14px", textAlign: "right" }}>
            <button
              onClick={clearAll}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: T.bgChip,
                color: T.ink2,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Clear all
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}

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
