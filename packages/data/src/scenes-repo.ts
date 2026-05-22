// Repository for the scenes table. Payload stored as JSON blob — Scene type
// from @mc/core defines the shape.

import type { Scene } from "@mc/core";
import type { Db } from "./db.js";

type SceneRow = { id: string; payload: string };

export async function listScenes(db: Db): Promise<Scene[]> {
  const rows = await db.select<SceneRow[]>(
    "SELECT id, payload FROM scenes ORDER BY json_extract(payload, '$.createdAt') DESC",
  );
  return rows
    .map((r) => safeParse(r.payload))
    .filter((s): s is Scene => s !== null);
}

export async function saveScene(db: Db, scene: Scene): Promise<void> {
  await db.execute(
    "INSERT INTO scenes (id, payload) VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
    [scene.id, JSON.stringify(scene)],
  );
}

export async function deleteScene(db: Db, id: string): Promise<void> {
  await db.execute("DELETE FROM scenes WHERE id = $1", [id]);
}

function safeParse(payload: string): Scene | null {
  try {
    const obj = JSON.parse(payload) as Scene;
    return obj && typeof obj === "object" && typeof obj.id === "string" ? obj : null;
  } catch {
    return null;
  }
}
