// Mobile scenes repository using expo-sqlite.

import type { Scene } from "@mc/core";
import type { SQLiteDatabase } from "expo-sqlite";

type Row = { id: string; payload: string };

export async function listScenes(db: SQLiteDatabase): Promise<Scene[]> {
  const rows = await db.getAllAsync<Row>(
    "SELECT id, payload FROM scenes ORDER BY json_extract(payload, '$.createdAt') DESC",
  );
  return (rows ?? [])
    .map((r) => safeParse(r.payload))
    .filter((s): s is Scene => s !== null);
}

export async function getScene(
  db: SQLiteDatabase,
  id: string,
): Promise<Scene | null> {
  const row = await db.getFirstAsync<Row>(
    "SELECT id, payload FROM scenes WHERE id = ?",
    [id],
  );
  if (!row) return null;
  return safeParse(row.payload);
}

export async function saveScene(db: SQLiteDatabase, scene: Scene): Promise<void> {
  await db.runAsync(
    "INSERT INTO scenes (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
    [scene.id, JSON.stringify(scene)],
  );
}

export async function deleteScene(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync("DELETE FROM scenes WHERE id = ?", [id]);
}

function safeParse(payload: string): Scene | null {
  try {
    const obj = JSON.parse(payload) as Scene;
    return obj && typeof obj === "object" && typeof obj.id === "string"
      ? obj
      : null;
  } catch {
    return null;
  }
}
