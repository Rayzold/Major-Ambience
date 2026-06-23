// References panel — the GM's wishlist of external songs.
//
// Songs here are NOT playable in-app. The user pastes a URL (or
// bulk-imports the DnD guide), browses, opens links externally, and
// optionally marks rows as "owned" once they've added the local file
// to their library. Pairs with apps/desktop/src/lib/references-store.ts
// and the `track_references` SQLite table.

import { useMemo, useState } from "react";
import { Glyph, T } from "@mc/ui";
import type { TrackReference } from "@mc/data";
import { parseReferenceUrl } from "../../lib/reference-url.js";

export type ReferencesProps = {
  references: TrackReference[];
  /** Save a new reference. Caller persists + reloads. */
  onAdd: (ref: TrackReference) => void;
  /** Delete by id. Caller persists + reloads. */
  onDelete: (id: string) => void;
  /** Toggle the "owned" flag on a row. */
  onToggleOwned: (id: string, owned: boolean) => void;
  /** Open a URL in the system browser (Tauri opener plugin). */
  onOpenUrl: (url: string) => void;
  /** Run the DnD music guide bulk import. Caller persists + reloads. */
  onImportDndGuide: () => void;
};

type SortMode = "added" | "title" | "category";

export function References({
  references,
  onAdd,
  onDelete,
  onToggleOwned,
  onOpenUrl,
  onImportDndGuide,
}: ReferencesProps) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [hideOwned, setHideOwned] = useState(false);

  // Add-form state.
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [artistInput, setArtistInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  // Distinct categories present in the current references list — used
  // for the filter pill row. "all" always shown first.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of references) {
      if (r.category) set.add(r.category);
    }
    return Array.from(set).sort();
  }, [references]);

  const visible = useMemo(() => {
    let list = references;
    if (activeCategory !== "all") {
      list = list.filter((r) => r.category === activeCategory);
    }
    if (hideOwned) list = list.filter((r) => !r.owned);
    if (sortMode === "title") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === "category") {
      list = [...list].sort((a, b) => {
        const ca = a.category ?? "";
        const cb = b.category ?? "";
        if (ca !== cb) return ca.localeCompare(cb);
        return a.title.localeCompare(b.title);
      });
    }
    // "added" is the default order from listReferences (DESC added_at).
    return list;
  }, [references, activeCategory, sortMode, hideOwned]);

  function handleSubmit() {
    const url = urlInput.trim();
    const title = titleInput.trim();
    if (!title && !url) return;
    const parsed = parseReferenceUrl(url);
    // Auto-fill title from the URL hint if user left it blank.
    const finalTitle = title || parsed.suggestedTitle || "Untitled";
    const ref: TrackReference = {
      id: cryptoId(),
      title: finalTitle,
      artist: artistInput.trim() || null,
      category: categoryInput.trim() || null,
      notes: null,
      url: url || null,
      youtubeUrl: parsed.kind === "youtube" ? url : null,
      spotifyUrl: parsed.kind === "spotify" ? url : null,
      source: "manual",
      addedAt: Math.floor(Date.now() / 1000),
      owned: false,
    };
    onAdd(ref);
    setUrlInput("");
    setTitleInput("");
    setArtistInput("");
    setCategoryInput("");
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* ── Add form ────────────────────────────────────────────── */}
      <div
        style={{
          background: T.bgRaise,
          border: `1px solid ${T.rule}`,
          borderRadius: 10,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div className="mc-eyebrow" style={{ fontSize: 9, color: T.ink3 }}>
          Add a track
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Paste a YouTube or Spotify URL…"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              // Auto-suggest title from the URL if the title field is
              // empty — non-destructive (only fills if blank).
              if (!titleInput) {
                const hint = parseReferenceUrl(e.target.value).suggestedTitle;
                if (hint) setTitleInput(hint);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            style={inputStyle({ flex: 2 })}
          />
          <input
            type="text"
            placeholder="Title"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            style={inputStyle({ flex: 2 })}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Artist (optional)"
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            style={inputStyle({ flex: 2 })}
          />
          <input
            type="text"
            placeholder="Mood / scene (optional)"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            style={inputStyle({ flex: 2 })}
          />
          <button onClick={handleSubmit} style={primaryButtonStyle()}>
            <Glyph name="plus" size={12} /> Add
          </button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <CategoryPill
            label={`All (${references.length})`}
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {categories.map((c) => {
            const count = references.filter((r) => r.category === c).length;
            return (
              <CategoryPill
                key={c}
                label={`${c} (${count})`}
                active={activeCategory === c}
                onClick={() => setActiveCategory(c)}
              />
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: T.ink2,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={hideOwned}
            onChange={(e) => setHideOwned(e.target.checked)}
            style={{ accentColor: T.gold }}
          />
          Hide owned
        </label>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          style={selectStyle()}
        >
          <option value="added">Recently added</option>
          <option value="title">Title</option>
          <option value="category">Category</option>
        </select>
        <button
          onClick={onImportDndGuide}
          title="One-shot import of the curated DnD music guide (70 tracks across 9 categories). Idempotent — re-running won't overwrite edits you've made."
          style={secondaryButtonStyle()}
        >
          <Glyph name="spark" size={12} /> Import DnD guide
        </button>
      </div>

      {/* ── List ────────────────────────────────────────────────── */}
      <div
        className="mc-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          border: `1px solid ${T.rule}`,
          borderRadius: 10,
          background: T.bgRaise,
        }}
      >
        {visible.length === 0 ? (
          <EmptyState
            hasAny={references.length > 0}
            onImport={onImportDndGuide}
          />
        ) : (
          visible.map((r) => (
            <ReferenceRow
              key={r.id}
              ref={r}
              onDelete={() => onDelete(r.id)}
              onToggleOwned={(o) => onToggleOwned(r.id, o)}
              onOpenUrl={onOpenUrl}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ReferenceRow({
  ref,
  onDelete,
  onToggleOwned,
  onOpenUrl,
}: {
  ref: TrackReference;
  onDelete: () => void;
  onToggleOwned: (owned: boolean) => void;
  onOpenUrl: (url: string) => void;
}) {
  const muted = ref.owned;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderBottom: `1px solid ${T.rule}`,
        opacity: muted ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={ref.owned}
        onChange={(e) => onToggleOwned(e.target.checked)}
        title={
          ref.owned
            ? "You marked this as added to your library."
            : "Tick once you've added this to your library."
        }
        style={{ marginTop: 4, accentColor: T.gold, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: T.ink,
              textDecoration: muted ? "line-through" : "none",
            }}
          >
            {ref.title}
          </div>
          {ref.artist ? (
            <div style={{ fontSize: 11, color: T.ink3 }}>
              {ref.artist}
            </div>
          ) : null}
          {ref.category ? (
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.06,
                textTransform: "uppercase",
                color: T.ink3,
                background: T.bgChip,
                border: `1px solid ${T.rule}`,
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              {ref.category}
            </span>
          ) : null}
        </div>
        {ref.notes ? (
          <div
            style={{ fontSize: 11, color: T.ink3, marginTop: 3, lineHeight: 1.4 }}
          >
            {ref.notes}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {ref.youtubeUrl ? (
            <LinkChip label="YouTube" onClick={() => onOpenUrl(ref.youtubeUrl!)} />
          ) : null}
          {ref.spotifyUrl ? (
            <LinkChip label="Spotify" onClick={() => onOpenUrl(ref.spotifyUrl!)} />
          ) : null}
          {ref.url && !ref.youtubeUrl && !ref.spotifyUrl ? (
            <LinkChip label="Open" onClick={() => onOpenUrl(ref.url!)} />
          ) : null}
        </div>
      </div>
      <button
        onClick={onDelete}
        title="Remove from references"
        style={{
          background: "transparent",
          border: "none",
          color: T.ink3,
          cursor: "pointer",
          padding: 4,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          // Combat-red hover — matches the InitiativeTracker's HP-zero
          // tint so the destructive affordance reads consistently.
          e.currentTarget.style.color = "#d96a4a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = T.ink3;
        }}
      >
        <Glyph name="trash" size={14} />
      </button>
    </div>
  );
}

function LinkChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 999,
        background: T.goldSoft,
        border: `1px solid ${T.goldEdge}`,
        color: T.gold,
        cursor: "pointer",
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 999,
        background: active ? T.goldSoft : "transparent",
        border: `1px solid ${active ? T.goldEdge : T.rule}`,
        color: active ? T.gold : T.ink2,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({
  hasAny,
  onImport,
}: {
  hasAny: boolean;
  onImport: () => void;
}) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        color: T.ink3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Glyph name="spark" size={28} />
      <div style={{ fontSize: 14, color: T.ink2 }}>
        {hasAny
          ? "No references in this view. Try a different filter."
          : "Bookmark songs you discover elsewhere."}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, maxWidth: 380 }}>
        Paste a YouTube or Spotify URL above, or start with a curated set of 70
        tracks across 9 D&amp;D scene categories.
      </div>
      {!hasAny ? (
        <button onClick={onImport} style={primaryButtonStyle()}>
          <Glyph name="spark" size={12} /> Import DnD guide
        </button>
      ) : null}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 6,
    background: T.bgChip,
    border: `1px solid ${T.rule}`,
    color: T.ink,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    minWidth: 0,
    ...extra,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 6,
    background: T.bgChip,
    border: `1px solid ${T.rule}`,
    color: T.ink2,
    fontSize: 11,
    fontFamily: "inherit",
    cursor: "pointer",
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 6,
    background: T.goldSoft,
    border: `1px solid ${T.goldEdge}`,
    color: T.gold,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    background: T.bgChip,
    border: `1px solid ${T.rule}`,
    color: T.ink2,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };
}

// ── id ────────────────────────────────────────────────────────────────

function cryptoId(): string {
  // Same shape useDMToolkit and friends use — random_id() isn't in scope
  // here, so generate inline. Not security-sensitive; just collision-
  // avoidant.
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
