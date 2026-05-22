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
  hasUnseenTutorials: boolean;
  onOpenTutorials: (anchor: { x: number; y: number }) => void;
  dmMode: boolean;
  onToggleDmMode: () => void;
};

const DM_RED = "#d96666";

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
  hasUnseenTutorials,
  onOpenTutorials,
  dmMode,
  onToggleDmMode,
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
        background: T.chromeBg,
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: 244 }}>
        <h1
          className="mc-display"
          style={{ margin: 0, fontSize: 22, fontWeight: 600, color: T.ink }}
        >
          Major <span style={{ fontStyle: "italic", color: T.gold }}>Ambience</span>
        </h1>
        {dmMode ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              borderRadius: 999,
              background: DM_RED + "22",
              border: `1px solid ${DM_RED}66`,
              color: DM_RED,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.16,
              textTransform: "uppercase",
              fontFamily: "Geist Mono, monospace",
              boxShadow: `0 0 12px ${DM_RED}44`,
            }}
            title="DM Mode is on — editing affordances hidden"
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: DM_RED,
                boxShadow: `0 0 6px ${DM_RED}`,
              }}
            />
            DM Mode
          </span>
        ) : null}
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
              data-mc-tour={
                t.id === "scenes"
                  ? "scenes-tab"
                  : t.id === "soundboard"
                    ? "soundboard-tab"
                    : undefined
              }
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
        {dmMode ? null : (
          <button
            onClick={onOpenFolder}
            title="Open folder"
            data-mc-tour="open-folder"
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
        )}
        {dmMode ? null : (
          <button style={iconBtn} title="DM Toolkit — coming in Phase 2">
            <Glyph name="dice" size={16} />
          </button>
        )}
        <button
          onClick={onToggleDmMode}
          title={dmMode ? "Exit DM Mode" : "Enter DM Mode — hide editing controls"}
          style={{
            ...iconBtn,
            color: dmMode ? DM_RED : T.ink2,
            background: dmMode ? DM_RED + "1a" : "transparent",
            border: dmMode ? `1px solid ${DM_RED}55` : "1px solid transparent",
          }}
        >
          <Glyph name="theatre" size={16} stroke={dmMode ? 1.9 : 1.5} />
        </button>
        {dmMode ? null : (
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onOpenTutorials({ x: rect.right, y: rect.bottom + 6 });
            }}
            title={hasUnseenTutorials ? "Tutorials available" : "Settings"}
            style={{
              ...iconBtn,
              position: "relative",
              color: hasUnseenTutorials ? T.gold : T.ink2,
            }}
          >
            <Glyph name="settings" size={16} />
            {hasUnseenTutorials ? (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: T.gold,
                  boxShadow: `0 0 6px ${T.gold}`,
                }}
              />
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}
