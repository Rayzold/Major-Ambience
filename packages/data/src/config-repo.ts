// Tiny key/value store backed by the `config` table.

import type { Db } from "./db.js";

type ConfigRow = { value: string };

export async function getConfig(db: Db, key: string): Promise<string | undefined> {
  const rows = await db.select<ConfigRow[]>(
    "SELECT value FROM config WHERE key = $1",
    [key],
  );
  return rows[0]?.value;
}

export async function setConfig(db: Db, key: string, value: string): Promise<void> {
  await db.execute(
    "INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export async function getConfigNumber(
  db: Db,
  key: string,
  fallback: number,
): Promise<number> {
  const v = await getConfig(db, key);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
