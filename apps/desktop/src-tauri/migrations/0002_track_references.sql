-- Major Ambience — track-references table
-- Wishlist / bookmark surface for songs the user discovers elsewhere
-- (YouTube, Spotify, curated guides). NOT playable from the app —
-- these are reference rows the user follows externally and optionally
-- adds to their local library later. See apps/desktop/src/layout/dm/
-- References.tsx for the UI.

CREATE TABLE IF NOT EXISTS track_references (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  -- Freeform mood/scene label (e.g. "Boss Battle", "Tavern & City").
  -- Not constrained to our internal CategoryId — these come from
  -- external sources with their own taxonomies.
  category TEXT,
  notes TEXT,
  -- Primary URL when the user pastes one. Optional because seeded
  -- entries (dnd-music-guide) carry per-platform URLs instead.
  url TEXT,
  youtube_url TEXT,
  spotify_url TEXT,
  -- Provenance: "manual" | "dnd-music-guide" | future seeds.
  source TEXT NOT NULL DEFAULT 'manual',
  added_at INTEGER NOT NULL,
  -- 0/1 bool: have you added this to your local library yet?
  owned INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_track_references_category
  ON track_references(category);
CREATE INDEX IF NOT EXISTS idx_track_references_source
  ON track_references(source);
CREATE INDEX IF NOT EXISTS idx_track_references_owned
  ON track_references(owned);
