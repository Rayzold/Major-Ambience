// Mode-specific sidebar for the Soundboard tab. Lists pages A / B / C
// as the primary navigation; the center pane still hosts the pad grid
// itself.
//
// State lives in Library.tsx (page + onPageChange are already lifted
// for the center pane).

import { SidebarHeaderCard } from "./SidebarHeaderCard.js";
import { SidebarRow, SidebarSection, SidebarShell } from "./DesktopSidebar.js";

type Page = "A" | "B" | "C";

export type DesktopSoundboardSidebarProps = {
  page: Page;
  onPageChange: (p: Page) => void;
  /** Filled-slot count per page (each page has 8 slots). */
  slotCounts: Readonly<Record<Page, number>>;
};

const PAGES: readonly Page[] = ["A", "B", "C"];
const SLOTS_PER_PAGE = 8;

export function DesktopSoundboardSidebar({
  page,
  onPageChange,
  slotCounts,
}: DesktopSoundboardSidebarProps) {
  const totalFilled = PAGES.reduce((sum, p) => sum + slotCounts[p], 0);

  return (
    <SidebarShell>
      <SidebarHeaderCard
        glyph="spark"
        title="Soundboard"
        subline={`${totalFilled} / ${SLOTS_PER_PAGE * PAGES.length} slots`}
      />
      <SidebarSection title="Pages">
        {PAGES.map((p) => (
          <SidebarRow
            key={p}
            icon="next"
            label={`Page ${p}`}
            active={page === p}
            onClick={() => onPageChange(p)}
            count={`${slotCounts[p]} / ${SLOTS_PER_PAGE}`}
          />
        ))}
      </SidebarSection>
    </SidebarShell>
  );
}
