// Schema metadata. The actual DDL ships with the Tauri shell at
// apps/desktop/src-tauri/migrations/0001_initial.sql so SQLite migrations
// run on the Rust side of the bridge (see BUILD_GUIDE.md § 5).

export const DB_NAME = "sqlite:major-ambience.db";
export const CURRENT_SCHEMA_VERSION = 1;

// Row shapes as they come out of tauri-plugin-sql (snake_case).
export type TrackRow = {
  id: string;
  uri: string;
  title: string;
  pack: string | null;
  category: string;
  subcategory: string | null;
  duration_ms: number | null;
  grade: string | null;
  play_count: number;
  last_played_at: number | null;
  note: string | null;
};
