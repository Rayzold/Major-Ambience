// Tracks repository for the mobile expo-sqlite adapter. Intentionally
// parallel to packages/data/src/tracks-repo.ts — same shape, same SQL,
// different driver. Cannot share the desktop file directly because
// tauri-plugin-sql and expo-sqlite have different async APIs
// (`select`/`execute` vs `getAllAsync`/`runAsync`).

import type { Grade, Track } from "@mc/core";
import type { Db } from "./db";
import type { TrackRow } from "./schema";

export async function insertTracks(db: Db, tracks: readonly Track[]): Promise<void> {
  for (const t of tracks) {
    await db.runAsync(
      `INSERT OR REPLACE INTO tracks
       (id, uri, title, pack, category, subcategory, duration_ms, grade, play_count, last_played_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.uri,
        t.title,
        t.pack || null,
        t.category,
        t.subcategory ?? null,
        t.durationMs || null,
        t.grade,
        t.playCount,
        t.lastPlayedAt ?? null,
        t.note ?? null,
      ],
    );
  }
}

export async function listTracks(db: Db): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>("SELECT * FROM tracks ORDER BY title");
  return rows.map(rowToTrack);
}

export async function listTracksByCategory(db: Db, category: string): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>(
    "SELECT * FROM tracks WHERE category = ? ORDER BY title",
    [category],
  );
  return rows.map(rowToTrack);
}

export async function countTracks(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM tracks");
  return row?.n ?? 0;
}

export async function countByCategory(db: Db): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ category: string; n: number }>(
    "SELECT category, COUNT(*) AS n FROM tracks GROUP BY category",
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.category] = r.n;
  return out;
}

/** Full-text search across title / pack / note. Mirrors desktop FTS5 query. */
export async function searchTracks(db: Db, query: string, limit = 50): Promise<Track[]> {
  const fts = buildFtsQuery(query);
  if (!fts) return [];
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT t.* FROM tracks t
     JOIN tracks_fts f ON t.rowid = f.rowid
     WHERE tracks_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
    [fts, limit],
  );
  return rows.map(rowToTrack);
}

function buildFtsQuery(input: string): string {
  const tokens = input
    .replace(/[^a-zA-Z0-9'\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `${t}*`).join(" ");
}

export async function setGrade(db: Db, trackId: string, grade: Grade): Promise<void> {
  await db.runAsync("UPDATE tracks SET grade = ? WHERE id = ?", [grade, trackId]);
}

export async function deleteAllTracks(db: Db): Promise<number> {
  const before = await countTracks(db);
  await db.runAsync("DELETE FROM tracks");
  return before;
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
