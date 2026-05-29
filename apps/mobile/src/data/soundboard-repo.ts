// Mobile soundboard repository using expo-sqlite.

import type { SoundboardSlot } from "@mc/core";
import type { SQLiteDatabase } from "expo-sqlite";

type Row = { page: string; slot: number; payload: string };

export async function listSoundboard(
  db: SQLiteDatabase,
): Promise<SoundboardSlot[]> {
  const rows = await db.getAllAsync<Row>(
    "SELECT page, slot, payload FROM soundboard ORDER BY page, slot",
  );
  return (rows ?? [])
    .map((r) => safeParse(r.payload))
    .filter((s): s is SoundboardSlot => s !== null);
}

export async function upsertSlot(
  db: SQLiteDatabase,
  slot: SoundboardSlot,
): Promise<void> {
  await db.runAsync(
    "INSERT INTO soundboard (page, slot, payload) VALUES (?, ?, ?) ON CONFLICT(page, slot) DO UPDATE SET payload = excluded.payload",
    [slot.page, slot.slot, JSON.stringify(slot)],
  );
}

export async function clearSlot(
  db: SQLiteDatabase,
  page: "A" | "B" | "C",
  slot: number,
): Promise<void> {
  await db.runAsync(
    "DELETE FROM soundboard WHERE page = ? AND slot = ?",
    [page, slot],
  );
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
