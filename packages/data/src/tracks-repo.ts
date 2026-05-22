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
