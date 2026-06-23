// Mode-specific sidebar for the DM Toolkit tab. Replaces the wrapping
// horizontal sub-tab bar that lived at the top of DesktopDmToolkit —
// vertical list reads cleaner at 8 entries than a two-row wrap, and
// stays consistent with the Library sidebar's affordance.
//
// State lives in Library.tsx so this stays a dumb-visual renderer; the
// active tool + the change callback come down as props.

import { SidebarHeaderCard } from "./SidebarHeaderCard.js";
import { SidebarRow, SidebarSection, SidebarShell } from "./DesktopSidebar.js";
import type { DmTool } from "./DesktopDmToolkit.js";

type ToolMeta = { id: DmTool; label: string; glyph: string };

const TOOLS: readonly ToolMeta[] = [
  { id: "initiative", label: "Initiative", glyph: "swords" },
  { id: "names", label: "Names", glyph: "mask" },
  { id: "dice", label: "Dice", glyph: "dice" },
  { id: "encounters", label: "Encounters", glyph: "compass" },
  { id: "timers", label: "Timers", glyph: "clock" },
  { id: "generators", label: "Generators", glyph: "note" },
  { id: "ledger", label: "Ledger", glyph: "star" },
  { id: "recap", label: "Recap", glyph: "theatre" },
  { id: "references", label: "References", glyph: "bookmark" },
];

export type DesktopDmSidebarProps = {
  tool: DmTool;
  onToolChange: (t: DmTool) => void;
  /** Mirrored from the Initiative tracker — drives the row's badge count. */
  combatantsCount: number;
};

export function DesktopDmSidebar({
  tool,
  onToolChange,
  combatantsCount,
}: DesktopDmSidebarProps) {
  return (
    <SidebarShell>
      <SidebarHeaderCard
        glyph="swords"
        title="DM Toolkit"
        subline="At-the-table tools"
      />
      <SidebarSection title="Tools">
        {TOOLS.map((t) => (
          <SidebarRow
            key={t.id}
            icon={t.glyph}
            label={t.label}
            active={tool === t.id}
            onClick={() => onToolChange(t.id)}
            count={
              // Only Initiative has a live count badge — the running
              // total of combatants doubles as session-state at-a-glance.
              t.id === "initiative" && combatantsCount > 0
                ? combatantsCount
                : undefined
            }
          />
        ))}
      </SidebarSection>
    </SidebarShell>
  );
}
