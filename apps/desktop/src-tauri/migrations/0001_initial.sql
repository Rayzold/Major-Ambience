-- Major Ambience — initial SQLite schema
-- See docs/BUILD_GUIDE.md § 5 for the data model.

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  title TEXT NOT NULL,
  pack TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  duration_ms INTEGER,
  grade TEXT,
  play_count INTEGER NOT NULL DEFAULT 0,
  last_played_at INTEGER,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracks_category ON tracks(category);
CREATE INDEX IF NOT EXISTS idx_tracks_grade ON tracks(grade);
CREATE INDEX IF NOT EXISTS idx_tracks_last_played ON tracks(last_played_at);

CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
  title, pack, note,
  content='tracks',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
  INSERT INTO tracks_fts(rowid, title, pack, note)
    VALUES (new.rowid, new.title, new.pack, new.note);
END;

CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
  INSERT INTO tracks_fts(tracks_fts, rowid, title, pack, note)
    VALUES ('delete', old.rowid, old.title, old.pack, old.note);
END;

CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
  INSERT INTO tracks_fts(tracks_fts, rowid, title, pack, note)
    VALUES ('delete', old.rowid, old.title, old.pack, old.note);
  INSERT INTO tracks_fts(rowid, title, pack, note)
    VALUES (new.rowid, new.title, new.pack, new.note);
END;

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS soundboard (
  page TEXT NOT NULL,
  slot INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (page, slot)
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
