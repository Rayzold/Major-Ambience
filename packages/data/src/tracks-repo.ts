// Repository for the tracks table.

import type { Grade, Track } from "@mc/core";
import type { Db } from "./db.js";
import type { TrackRow } from "./schema.js";

export async function insertTracks(db: Db, tracks: readonly Track[]): Promise<void> {
  // No BEGIN/COMMIT here — tauri-plugin-sql v2 returns a different pool
  // connection per execute(), so a JS-level transaction would lock the DB
  // (SQLITE_BUSY, code 5). Per-row inserts are fast enough for the library
  // sizes we care about. INSERT OR REPLACE keeps re-scans idempotent.
  for (const t of tracks) {
    await db.execute(
      `INSERT OR REPLACE INTO tracks
       (id, uri, title, pack, category, subcategory, duration_ms, grade, play_count, last_played_at, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        t.id,
        t.uri,
        t.title,
        t.pack,
        t.category,
        t.subcategory ?? null,
        t.durationMs,
        t.grade,
        t.playCount,
        t.lastPlayedAt ?? null,
        t.note ?? null,
      ],
    );
  }
}

export async function listTracks(db: Db): Promise<Track[]> {
  const rows = await db.select<TrackRow[]>("SELECT * FROM tracks ORDER BY title");
  return rows.map(rowToTrack);
}

/**
 * Full-text search across title / pack / note via the `tracks_fts` FTS5 table.
 * `query` is raw user input; we sanitize and turn it into a prefix-match
 * AND-chain so "mighty seas" matches "mighty*" AND "seas*".
 */
export async function searchTracks(
  db: Db,
  query: string,
  limit = 50,
): Promise<Track[]> {
  const fts = buildFtsQuery(query);
  if (!fts) return [];
  const rows = await db.select<TrackRow[]>(
    `SELECT t.* FROM tracks t
     JOIN tracks_fts f ON t.rowid = f.rowid
     WHERE tracks_fts MATCH $1
     ORDER BY rank
     LIMIT $2`,
    [fts, limit],
  );
  return rows.map(rowToTrack);
}

function buildFtsQuery(input: string): string {
  // Strip everything FTS5 might interpret, keep alphanumerics + apostrophe,
  // then prefix-match each surviving word ≥2 chars.
  const tokens = input
    .replace(/[^a-zA-Z0-9'\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `${t}*`).join(" ");
}

export async function listTracksByCategory(db: Db, category: string): Promise<Track[]> {
  const rows = await db.select<TrackRow[]>(
    "SELECT * FROM tracks WHERE category = $1 ORDER BY title",
    [category],
  );
  return rows.map(rowToTrack);
}

export async function countTracks(db: Db): Promise<number> {
  const rows = await db.select<Array<{ n: number }>>("SELECT COUNT(*) AS n FROM tracks");
  return rows[0]?.n ?? 0;
}

export async function bumpPlayCount(db: Db, trackId: string, playedAt: number): Promise<void> {
  await db.execute(
    "UPDATE tracks SET play_count = play_count + 1, last_played_at = $1 WHERE id = $2",
    [playedAt, trackId],
  );
}

export async function setGrade(db: Db, trackId: string, grade: Grade): Promise<void> {
  await db.execute("UPDATE tracks SET grade = $1 WHERE id = $2", [grade, trackId]);
}

export async function setDuration(db: Db, trackId: string, durationMs: number): Promise<void> {
  await db.execute("UPDATE tracks SET duration_ms = $1 WHERE id = $2", [durationMs, trackId]);
}

/**
 * Delete rows whose id is not in `keepIds`. Used after a folder rescan to
 * drop tracks that no longer exist on disk (renamed, moved, or junk like
 * macOS `._` files indexed before the scanner filtered them).
 *
 * Chunked because SQLite's default SQLITE_MAX_VARIABLE_NUMBER is 999.
 */
export async function deleteTracksNotIn(db: Db, keepIds: readonly string[]): Promise<number> {
  if (keepIds.length === 0) {
    const before = await countTracks(db);
    await db.execute("DELETE FROM tracks");
    return before;
  }
  // Build a temp table of ids to keep, then delete the complement. Safer
  // than 5,000 placeholders in a single statement.
  await db.execute("CREATE TEMP TABLE IF NOT EXISTS keep_ids (id TEXT PRIMARY KEY)");
  await db.execute("DELETE FROM keep_ids");
  for (const id of keepIds) {
    await db.execute("INSERT OR IGNORE INTO keep_ids (id) VALUES ($1)", [id]);
  }
  const beforeRows = await db.select<Array<{ n: number }>>(
    "SELECT COUNT(*) AS n FROM tracks WHERE id NOT IN (SELECT id FROM keep_ids)",
  );
  const removed = beforeRows[0]?.n ?? 0;
  await db.execute("DELETE FROM tracks WHERE id NOT IN (SELECT id FROM keep_ids)");
  await db.execute("DROP TABLE keep_ids");
  return removed;
}

function rowToTrack(row: TrackRow): Track {
  return {
    id: row.id,
    uri: row.uri,
    title: row.title,
    pack: row.pack ?? "",
    category: row.category as Track["category"],
    ...(row.subcategory !== null ? { subcategory: row.subcategory } : {}),
    durationMs: row.duration_ms ?? 0,
    grade: row.grade as Grade,
    playCount: row.play_count,
    ...(row.last_played_at !== null ? { lastPlayedAt: row.last_played_at } : {}),
    ...(row.note !== null ? { note: row.note } : {}),
  };
}
