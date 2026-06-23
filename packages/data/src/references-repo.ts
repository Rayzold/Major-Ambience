// Repository for the `track_references` table. Wishlist of external
// tracks the user discovered on YouTube / Spotify / curated guides.
// Not playable in-app — the row stores enough metadata that the user
// can revisit it later and optionally add the local file once they own
// it. See apps/desktop/src/layout/dm/References.tsx for the UI.

import type { Db } from "./db.js";

export type ReferenceSource = "manual" | "dnd-music-guide" | (string & {});

export type TrackReference = {
  id: string;
  title: string;
  artist: string | null;
  /** Freeform mood/scene label — comes from the external source's own
   *  taxonomy, not our internal CategoryId. Empty string allowed. */
  category: string | null;
  notes: string | null;
  /** Primary URL when the user pastes one. */
  url: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  source: ReferenceSource;
  /** Unix seconds. */
  addedAt: number;
  /** True once the user has marked the track as added to their library. */
  owned: boolean;
};

type Row = {
  id: string;
  title: string;
  artist: string | null;
  category: string | null;
  notes: string | null;
  url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  source: string;
  added_at: number;
  owned: number;
};

function rowToRef(r: Row): TrackReference {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    category: r.category,
    notes: r.notes,
    url: r.url,
    youtubeUrl: r.youtube_url,
    spotifyUrl: r.spotify_url,
    source: r.source as ReferenceSource,
    addedAt: r.added_at,
    owned: r.owned === 1,
  };
}

export async function listReferences(db: Db): Promise<TrackReference[]> {
  const rows = await db.select<Row[]>(
    "SELECT id, title, artist, category, notes, url, youtube_url, spotify_url, source, added_at, owned FROM track_references ORDER BY added_at DESC",
  );
  return rows.map(rowToRef);
}

export async function upsertReference(
  db: Db,
  ref: TrackReference,
): Promise<void> {
  await db.execute(
    `INSERT INTO track_references
       (id, title, artist, category, notes, url, youtube_url, spotify_url, source, added_at, owned)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       artist = excluded.artist,
       category = excluded.category,
       notes = excluded.notes,
       url = excluded.url,
       youtube_url = excluded.youtube_url,
       spotify_url = excluded.spotify_url,
       source = excluded.source,
       owned = excluded.owned`,
    [
      ref.id,
      ref.title,
      ref.artist,
      ref.category,
      ref.notes,
      ref.url,
      ref.youtubeUrl,
      ref.spotifyUrl,
      ref.source,
      ref.addedAt,
      ref.owned ? 1 : 0,
    ],
  );
}

/** Bulk insert seeded entries. Uses INSERT OR IGNORE so re-running the
 *  guide import after the user has already imported it (or after
 *  they've edited individual rows) is a no-op rather than overwriting
 *  their state. */
export async function seedReferences(
  db: Db,
  refs: ReadonlyArray<TrackReference>,
): Promise<number> {
  let inserted = 0;
  for (const ref of refs) {
    const res = await db.execute(
      `INSERT OR IGNORE INTO track_references
         (id, title, artist, category, notes, url, youtube_url, spotify_url, source, added_at, owned)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        ref.id,
        ref.title,
        ref.artist,
        ref.category,
        ref.notes,
        ref.url,
        ref.youtubeUrl,
        ref.spotifyUrl,
        ref.source,
        ref.addedAt,
        ref.owned ? 1 : 0,
      ],
    );
    if (res.rowsAffected > 0) inserted += 1;
  }
  return inserted;
}

export async function deleteReference(db: Db, id: string): Promise<void> {
  await db.execute("DELETE FROM track_references WHERE id = $1", [id]);
}

export async function setReferenceOwned(
  db: Db,
  id: string,
  owned: boolean,
): Promise<void> {
  await db.execute(
    "UPDATE track_references SET owned = $1 WHERE id = $2",
    [owned ? 1 : 0, id],
  );
}
