// Top card on every mode-specific sidebar — same visual treatment as
// the Library mode's folder card so all four sidebar variants share
// the same eye-line. Icon + title + subline, optional trailing action.

import type { ReactNode } from "react";
import { Glyph, T } from "@mc/ui";

export type SidebarHeaderCardProps = {
  glyph: string;
  title: string;
  subline?: string | undefined;
  /** Optional trailing button content (e.g. a "save" glyph). */
  action?: ReactNode | undefined;
};

export function SidebarHeaderCard({
  glyph,
  title,
  subline,
  action,
}: SidebarHeaderCardProps) {
  return (
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
        <Glyph name={glyph} size={16} />
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
          title={title}
        >
          {title}
        </div>
        {subline ? (
          <div className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>
            {subline}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
