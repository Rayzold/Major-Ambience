// Repository for the soundboard table. Slots persist as JSON in the payload
// column, keyed by (page, slot).

import type { SoundboardSlot } from "@mc/core";
import type { Db } from "./db.js";

type Row = { page: string; slot: number; payload: string };

export async function listSoundboard(db: Db): Promise<SoundboardSlot[]> {
  const rows = await db.select<Row[]>(
    "SELECT page, slot, payload FROM soundboard ORDER BY page, slot",
  );
  return rows
    .map((r) => safeParse(r.payload))
    .filter((s): s is SoundboardSlot => s !== null);
}

export async function upsertSlot(db: Db, slot: SoundboardSlot): Promise<void> {
  await db.execute(
    "INSERT INTO soundboard (page, slot, payload) VALUES ($1, $2, $3) ON CONFLICT(page, slot) DO UPDATE SET payload = excluded.payload",
    [slot.page, slot.slot, JSON.stringify(slot)],
  );
}

export async function clearSlot(
  db: Db,
  page: "A" | "B" | "C",
  slot: number,
): Promise<void> {
  await db.execute("DELETE FROM soundboard WHERE page = $1 AND slot = $2", [page, slot]);
}

function safeParse(payload: string): SoundboardSlot | null {
  try {
    const obj = JSON.parse(payload) as SoundboardSlot;
    return obj && typeof obj === "object" && typeof obj.page === "string"
      ? obj
      : null;
  } catch {
    return null;
  }
}
