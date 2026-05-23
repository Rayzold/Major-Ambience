// expo-sqlite database singleton. Opens on first call, runs the init
// script, then caches the handle for the rest of the process lifetime.

import * as SQLite from "expo-sqlite";
import { DB_NAME, INIT_SQL } from "./schema";

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type Db = SQLite.SQLiteDatabase;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(INIT_SQL);
      return db;
    })();
  }
  return _dbPromise;
}

/**
 * For tests / dev: close + forget the cached handle. The next `getDb()`
 * call will re-open and re-run the init script. Not wired to any UI.
 */
export async function closeDb(): Promise<void> {
  if (!_dbPromise) return;
  const db = await _dbPromise;
  await db.closeAsync();
  _dbPromise = null;
}
