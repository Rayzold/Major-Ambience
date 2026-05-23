// Left sidebar — folder summary, Library section, Categories section.

import type { ReactNode } from "react";
import type { CategoryId } from "@mc/core";
import { CATEGORIES, Glyph, T } from "@mc/ui";

export type DesktopSidebarProps = {
  selected: CategoryId;
  onSelect: (c: CategoryId) => void;
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
  onSelect,
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
        <SidebarRow icon="star" label="Favorites" count={countFavorites(countByCategory)} muted />
        <SidebarRow icon="clock" label="Recently played" count={0} muted />
      </SidebarSection>

      <SidebarSection title="Categories">
        <div data-mc-tour="sidebar-categories">
        {CATEGORIES.map((c) => {
          const active = selected === c.id;
          const count = countByCategory.get(c.id) ?? 0;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
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
                {c.name}
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
  muted,
}: {
  icon: string;
  label: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <button
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 9,
        color: muted ? T.ink3 : T.ink2,
        fontSize: 13,
        fontWeight: 500,
        cursor: muted ? "default" : "pointer",
      }}
      disabled={muted}
      title={muted ? "Coming in Phase 2" : undefined}
    >
      <Glyph name={icon} size={15} />
      <span style={{ flex: 1 }}>{label}</span>
      <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
        {count}
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

function countFavorites(byCategory: ReadonlyMap<CategoryId, number>): number {
  // Placeholder until favorites is wired (Phase 2). The sidebar shows it
  // either way; we just use category sum so the slot is non-empty.
  let total = 0;
  for (const n of byCategory.values()) total += n;
  return Math.min(total, 99);
}
