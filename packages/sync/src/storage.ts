// Abstraction over session-token persistence. Three implementations
// will plug in:
//
//   - Tauri (desktop) — apps/desktop wires tauri-plugin-stronghold (or
//     a simple secure-string store) behind this interface in PR-5.
//   - Expo (mobile) — apps/mobile wires expo-secure-store in PR-6.
//   - Tests — `MemorySessionStore` below.

export interface SessionStore {
  /** Returns the stored token or null if signed out. */
  read(): Promise<string | null>;
  /** Persist a token. Overwrites any existing token. */
  write(token: string): Promise<void>;
  /** Remove any stored token. Safe to call when none exists. */
  clear(): Promise<void>;
}

/**
 * In-memory store. Used by vitest cases and as a fallback when secure
 * storage is unavailable (e.g. a desktop dev build without Stronghold).
 * Not suitable for production — tokens live only for the process.
 */
export class MemorySessionStore implements SessionStore {
  private token: string | null = null;

  async read(): Promise<string | null> {
    return this.token;
  }

  async write(token: string): Promise<void> {
    this.token = token;
  }

  async clear(): Promise<void> {
    this.token = null;
  }
}
