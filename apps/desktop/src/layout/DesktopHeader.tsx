// Top toolbar — ported from prototype/app/desktop.jsx.
// Library tab is functional; Scenes / Soundboard are visual placeholders
// (out of scope for DESIGN.md § 2).

import type { CSSProperties, Ref } from "react";
import { Glyph, T } from "@mc/ui";

type Tab = "library" | "scenes" | "soundboard";

export type DesktopHeaderProps = {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  trackCount: number;
  onOpenFolder: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchFocus: () => void;
  searchInputRef?: Ref<HTMLInputElement>;
};

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "library", label: "Library", icon: "library" },
  { id: "scenes", label: "Scenes", icon: "scenes" },
  { id: "soundboard", label: "Soundboard", icon: "soundboard" },
];

const iconBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  background: "transparent",
  color: T.ink2,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export function DesktopHeader({
  tab,
  onTabChange,
  trackCount,
  onOpenFolder,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  searchInputRef,
}: DesktopHeaderProps) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        flexShrink: 0,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        borderBottom: `1px solid ${T.rule}`,
        background: "rgba(11,9,19,0.6)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: 244 }}>
        <h1
          className="mc-display"
          style={{ margin: 0, fontSize: 22, fontWeight: 600, color: T.ink }}
        >
          Major <span style={{ fontStyle: "italic", color: T.gold }}>Ambience</span>
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          borderRadius: 12,
          background: T.bgChip,
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 14px",
                borderRadius: 9,
                background: active ? T.gold + "26" : "transparent",
                color: active ? T.gold : T.ink2,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Glyph name={t.icon} size={15} stroke={active ? 1.9 : 1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: 360,
          justifyContent: "flex-end",
        }}
      >
        <div
          data-mc-search-input
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            background: T.bgCard,
            border: `1px solid ${searchQuery ? T.goldEdge : T.rule}`,
            width: 200,
            color: T.ink2,
          }}
        >
          <Glyph name="search" size={14} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            onFocus={onSearchFocus}
            placeholder={
              trackCount > 0 ? `Search ${trackCount.toLocaleString()} tracks…` : "Search…"
            }
            disabled={trackCount === 0}
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: 0,
              outline: 0,
              fontSize: 12,
              color: T.ink,
            }}
          />
          <span
            className="mc-mono"
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 4,
              background: T.bgChip,
              border: `1px solid ${T.rule}`,
              color: T.ink3,
              flexShrink: 0,
            }}
          >
            Ctrl K
          </span>
        </div>
        <button
          onClick={onOpenFolder}
          title="Open folder"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 9,
            background: T.goldSoft,
            border: `1px solid ${T.goldEdge}`,
            color: T.gold,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Glyph name="folder" size={14} />
          Open Folder
        </button>
        <button style={iconBtn} title="DM Toolkit — coming in Phase 2">
          <Glyph name="dice" size={16} />
        </button>
        <button style={iconBtn} title="DM mode — coming in Phase 2">
          <Glyph name="theatre" size={16} />
        </button>
        <button style={iconBtn} title="Settings">
          <Glyph name="settings" size={16} />
        </button>
      </div>
    </div>
  );
}
