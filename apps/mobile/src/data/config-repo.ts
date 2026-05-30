// Mobile config repo — generic key/value store for small bits of state
// that don't deserve their own table. Mirrors the desktop pattern:
// dm_combatants, dm_xp_ledger, and dm_recap are all JSON payloads under
// well-known keys here.

import type { SQLiteDatabase } from "expo-sqlite";

type Row = { value: string };

export async function getConfig(
  db: SQLiteDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<Row>(
    "SELECT value FROM config WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function setConfig(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await db.runAsync(
    "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

/** Read a JSON-encoded config value, with a safe-parse + fallback. */
export async function getJsonConfig<T>(
  db: SQLiteDatabase,
  key: string,
  fallback: T,
): Promise<T> {
  const raw = await getConfig(db, key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJsonConfig<T>(
  db: SQLiteDatabase,
  key: string,
  value: T,
): Promise<void> {
  await setConfig(db, key, JSON.stringify(value));
}
