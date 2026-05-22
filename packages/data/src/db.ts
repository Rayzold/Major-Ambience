// Thin wrapper over tauri-plugin-sql. The plugin's Database type ships from
// @tauri-apps/plugin-sql at runtime; we re-export a single load() entry so
// callers don't need to know about the underlying driver.

import Database from "@tauri-apps/plugin-sql";
import { DB_NAME } from "./schema.js";

let cached: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (!cached) {
    cached = Database.load(DB_NAME);
  }
  return cached;
}

export type Db = Database;
