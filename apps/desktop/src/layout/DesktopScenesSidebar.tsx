// Mode-specific sidebar for the Scenes tab. Lists every saved scene
// for one-click restore; the center pane keeps the editable card grid
// (rename / delete / scene art).
//
// The header card's trailing action is the "Save current state as a
// scene" affordance — same callback the center pane's Save button
// hits, surfaced here so the user can save without scrolling.

import type { Scene } from "@mc/core";
import { findCategory, Glyph, T } from "@mc/ui";
import { SidebarHeaderCard } from "./SidebarHeaderCard.js";
import { SidebarSection, SidebarShell } from "./DesktopSidebar.js";

export type DesktopScenesSidebarProps = {
  scenes: Scene[];
  activeSceneId: string | undefined;
  canSave: boolean;
  onOpenSave: () => void;
  onRestore: (s: Scene) => void;
};

export function DesktopScenesSidebar({
  scenes,
  activeSceneId,
  canSave,
  onOpenSave,
  onRestore,
}: DesktopScenesSidebarProps) {
  return (
    <SidebarShell>
      <SidebarHeaderCard
        glyph="theatre"
        title="Scenes"
        subline={`${scenes.length} saved`}
        action={
          <button
            onClick={onOpenSave}
            disabled={!canSave}
            title={canSave ? "Save current state as a scene" : "Nothing playing to save"}
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "transparent",
              color: canSave ? T.gold : T.ink3,
              border: "1px solid transparent",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph name="plus" size={14} />
          </button>
        }
      />
      <SidebarSection title="Saved scenes">
        {scenes.length === 0 ? (
          <div
            style={{
              padding: "10px 12px",
              fontSize: 12,
              color: T.ink3,
              lineHeight: 1.4,
            }}
          >
            No scenes yet. Play a track and tap the&nbsp;
            <Glyph name="plus" size={10} /> above to snapshot it.
          </div>
        ) : (
          scenes.map((s) => {
            const meta = findCategory(s.primaryCategory);
            const accent = meta?.color ?? T.gold;
            const active = s.id === activeSceneId;
            return (
              <button
                key={s.id}
                onClick={() => onRestore(s)}
                title={`Restore "${s.name}"`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  paddingLeft: 11,
                  borderRadius: 9,
                  background: active ? accent + "33" : "transparent",
                  color: active ? accent : T.ink2,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  borderLeft: `3px solid ${active ? accent : "transparent"}`,
                  marginBottom: 2,
                  border: `1px solid transparent`,
                  borderRightWidth: 0,
                  borderTopWidth: 0,
                  borderBottomWidth: 0,
                }}
              >
                <Glyph
                  name={meta?.glyph ?? "theatre"}
                  size={15}
                  stroke={active ? 1.9 : 1.5}
                />
                <span
                  style={{
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.name}
                </span>
                {meta ? (
                  <span
                    className="mc-mono"
                    style={{ fontSize: 9, color: T.ink3 }}
                    title={meta.name}
                  >
                    {meta.name.slice(0, 4).toUpperCase()}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </SidebarSection>
    </SidebarShell>
  );
}
