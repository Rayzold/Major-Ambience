// Left sidebar — folder summary, Library section, Categories section.

import type { CSSProperties, ReactNode } from "react";
import type { CategoryId } from "@mc/core";
import { CATEGORIES, Glyph, letterIndexInName, T, type CategoryMeta } from "@mc/ui";

export type DesktopSidebarProps = {
  selected: CategoryId;
  /** Which view is showing — controls active highlighting on Favorites / Recently played. */
  activeView: "category" | "favorites" | "recent";
  onSelect: (c: CategoryId) => void;
  onSelectFavorites: () => void;
  onSelectRecent: () => void;
  favoritesCount: number;
  recentCount: number;
  totalTrackCount: number;
  countByCategory: ReadonlyMap<CategoryId, number>;
  rootFolderName: string | undefined;
  /** Epoch seconds of the last completed scan, or undefined if never scanned. */
  lastScannedAt?: number | undefined;
  /** True while a scan is in flight — disables Rescan, shows a spinner glyph. */
  isScanning?: boolean;
  /**
   * Called when the user clicks the Rescan button. Library re-runs the
   * scan against the stored root_folder_path. Undefined when no folder
   * has been opened yet (button hides in that case).
   */
  onRescan?: (() => void) | undefined;
};

export function DesktopSidebar({
  selected,
  activeView,
  onSelect,
  onSelectFavorites,
  onSelectRecent,
  favoritesCount,
  recentCount,
  totalTrackCount,
  countByCategory,
  rootFolderName,
  lastScannedAt,
  isScanning,
  onRescan,
}: DesktopSidebarProps) {
  return (
    <div
      className="mc-scroll"
      style={{
        flexShrink: 0,
        width: 244,
        borderRight: `1px solid ${T.rule}`,
        padding: "14px 8px 14px 14px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          marginBottom: 14,
          background: T.bgChip,
        }}
      >
        <span style={{ color: T.gold }}>
          <Glyph name={isScanning ? "spark" : "library"} size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: T.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={rootFolderName ?? "No folder open"}
          >
            {rootFolderName ?? "No folder open"}
          </div>
          <div className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
            {isScanning
              ? "Scanning…"
              : lastScannedAt
                ? `${totalTrackCount.toLocaleString()} · ${relativeTime(lastScannedAt)}`
                : `${totalTrackCount.toLocaleString()} tracks`}
          </div>
        </div>
        {onRescan ? (
          <button
            onClick={onRescan}
            disabled={isScanning}
            title="Rescan folder"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "transparent",
              color: T.ink3,
              border: "1px solid transparent",
              cursor: isScanning ? "not-allowed" : "pointer",
              opacity: isScanning ? 0.4 : 1,
            }}
          >
            <Glyph name="shuffle" size={12} />
          </button>
        ) : null}
      </div>

      <SidebarSection title="Library">
        <SidebarRow
          icon="star"
          label="Favorites"
          count={favoritesCount}
          active={activeView === "favorites"}
          onClick={onSelectFavorites}
          tint={T.gold}
        />
        <SidebarRow
          icon="clock"
          label="Recently played"
          count={recentCount}
          active={activeView === "recent"}
          onClick={onSelectRecent}
          tint="#7d92dd"
        />
      </SidebarSection>

      <SidebarSection title="Categories">
        <div className="mc-eyebrow" style={{ padding: "0 12px 6px", fontSize: 9, color: T.ink3 }}>
          Letter plays · Number jumps
        </div>
        <div data-mc-tour="sidebar-categories">
        {CATEGORIES.map((c) => {
          // A category is "active" only when we're showing its view —
          // not when Favorites or Recently played is up.
          const active = activeView === "category" && selected === c.id;
          const count = countByCategory.get(c.id) ?? 0;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              title={`Press ${c.shortcut} to play a weighted random ${c.name} track`}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 9,
                background: active ? c.color + "20" : "transparent",
                color: active ? c.color : T.ink2,
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 2,
                borderLeft: `2px solid ${active ? c.color : "transparent"}`,
              }}
            >
              <Glyph name={c.glyph} size={15} stroke={active ? 1.9 : 1.5} />
              <span
                style={{
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <CategoryNameWithShortcut meta={c} accent={c.color} active={active} />
              </span>
              <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
        </div>
      </SidebarSection>
    </div>
  );
}

/**
 * Render a category name with its hotkey letter visually highlighted
 * in-place. When the shortcut letter exists in the name we wrap it in
 * an underlined / accent-tinted span; when it doesn't (no current
 * category needs this branch but it's a safety net), we append a small
 * kbd-style chip after the name.
 */
function CategoryNameWithShortcut({
  meta,
  accent,
  active,
}: {
  meta: CategoryMeta;
  accent: string;
  active: boolean;
}) {
  const idx = letterIndexInName(meta);
  const letterStyle: CSSProperties = {
    color: active ? accent : T.gold,
    textDecoration: "underline",
    textDecorationColor: active ? accent : T.gold,
    textDecorationThickness: 1.5,
    textUnderlineOffset: 3,
    fontWeight: 700,
  };
  if (idx === -1) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {meta.name}
        <span
          className="mc-mono"
          style={{
            fontSize: 9,
            padding: "1px 4px",
            borderRadius: 4,
            background: T.bgChip,
            border: `1px solid ${T.rule}`,
            color: T.ink3,
          }}
        >
          {meta.shortcut}
        </span>
      </span>
    );
  }
  return (
    <>
      {meta.name.slice(0, idx)}
      <span style={letterStyle}>{meta.name.charAt(idx)}</span>
      {meta.name.slice(idx + 1)}
    </>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="mc-eyebrow" style={{ padding: "4px 12px 8px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SidebarRow({
  icon,
  label,
  count,
  active,
  onClick,
  tint,
}: {
  icon: string;
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
  /** Accent color when this row is the active view. Defaults to gold. */
  tint?: string;
}) {
  const accent = tint ?? T.gold;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 9,
        background: active ? accent + "20" : "transparent",
        color: active ? accent : T.ink2,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        borderLeft: `2px solid ${active ? accent : "transparent"}`,
        marginBottom: 2,
      }}
    >
      <Glyph name={icon} size={15} stroke={active ? 1.9 : 1.5} />
      <span style={{ flex: 1 }}>{label}</span>
      <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
        {count.toLocaleString()}
      </span>
    </button>
  );
}

/**
 * Compact relative-time formatter for the folder card. Returns short
 * strings like "just now", "5 min", "2h", "3d", "12 May". Avoids the
 * full Intl.RelativeTimeFormat dance because we only need 1 unit.
 */
function relativeTime(epochSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const delta = Math.max(0, nowSec - epochSec);
  if (delta < 30) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 86400 * 30) return `${Math.floor(delta / 86400)}d ago`;
  const d = new Date(epochSec * 1000);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
