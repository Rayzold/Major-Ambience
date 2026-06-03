// Cloud-sync wiring for the desktop app — PR-5 of docs/CLOUD_SYNC.md.
//
// The pure transport (`@mc/sync` SyncClient) and the merge primitives
// (`@mc/core` mergeSyncBlobs) already exist and are unit-tested. This
// module is the desktop-specific glue: where the session token lives, how
// a full sync round-trip is sequenced, and the small config-backed
// accessors the settings UI reads.
//
// ── Session-token storage ────────────────────────────────────────────────
// We back the `SessionStore` with the local SQLite `config` table rather
// than Tauri Stronghold. The token is a bearer JWT for a single-user TTRPG
// tool on the user's own machine; the threat model doesn't warrant the
// Stronghold password/salt ceremony (or the Rust dependency + recompile it
// drags in). The `SessionStore` interface stays the seam — swapping in
// `tauri-plugin-stronghold` later is a drop-in that touches only this file.

import { SyncClient, type SessionStore } from "@mc/sync";
import { mergeSyncBlobs, type SyncBlob } from "@mc/core";
import {
  applySyncBlob,
  buildSyncBlob,
  getConfig,
  getDb,
  setConfig,
} from "@mc/data";

const BASE_URL_KEY = "sync_base_url";
const SESSION_KEY = "sync_session_token";
const ACCOUNT_KEY = "sync_account_email";
const DEVICE_ID_KEY = "device_id";
const DEVICE_LABEL_KEY = "sync_device_label";
const LAST_SYNCED_KEY = "sync_last_synced_at";

/**
 * Default cloud endpoint — the live `*.workers.dev` deploy of `cloud/worker`.
 * Overridable from the settings "Advanced" field; will move to a custom
 * domain (e.g. sync.majorambience.app) once one's wired.
 */
export const DEFAULT_SYNC_BASE_URL =
  "https://major-ambience-sync.markos-stefanou.workers.dev";

class ConfigSessionStore implements SessionStore {
  async read(): Promise<string | null> {
    const token = await getConfig(await getDb(), SESSION_KEY);
    return token ? token : null;
  }
  async write(token: string): Promise<void> {
    await setConfig(await getDb(), SESSION_KEY, token);
  }
  async clear(): Promise<void> {
    // No deleteConfig helper exists; an empty string reads back as
    // signed-out (the client treats falsy tokens as "not signed in").
    await setConfig(await getDb(), SESSION_KEY, "");
  }
}

let _client: SyncClient | null = null;
let _clientBaseUrl: string | null = null;

export async function getBaseUrl(): Promise<string> {
  const stored = await getConfig(await getDb(), BASE_URL_KEY);
  return stored && stored.trim() ? stored.trim() : DEFAULT_SYNC_BASE_URL;
}

export async function setBaseUrl(url: string): Promise<void> {
  await setConfig(await getDb(), BASE_URL_KEY, url.trim());
  // Force a rebuild against the new base on next use.
  _client = null;
  _clientBaseUrl = null;
}

async function getClient(): Promise<SyncClient> {
  const base = await getBaseUrl();
  if (!_client || _clientBaseUrl !== base) {
    _client = new SyncClient({
      baseUrl: base,
      sessionStore: new ConfigSessionStore(),
    });
    _clientBaseUrl = base;
  }
  return _client;
}

async function ensureDeviceId(): Promise<string> {
  const db = await getDb();
  const existing = await getConfig(db, DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
  await setConfig(db, DEVICE_ID_KEY, id);
  return id;
}

// ── Auth ─────────────────────────────────────────────────────────────────

export type CloudAuthStatus = "signed-in" | "signed-out";

export async function getAuthStatus(): Promise<CloudAuthStatus> {
  return (await getClient()).status();
}

export async function getAccountEmail(): Promise<string | undefined> {
  return (await getConfig(await getDb(), ACCOUNT_KEY)) || undefined;
}

/** Send a magic-link email. Persists the address for later display. */
export async function requestMagicLink(email: string): Promise<void> {
  await (await getClient()).signIn(email);
  await setConfig(await getDb(), ACCOUNT_KEY, email.trim().toLowerCase());
}

/** Exchange the emailed code for a session token. */
export async function verifyMagicCode(code: string): Promise<void> {
  await (await getClient()).verifyMagicLink(code);
}

export async function signOutCloud(): Promise<void> {
  await (await getClient()).signOut();
  await setConfig(await getDb(), ACCOUNT_KEY, "");
}

// ── Device label ───────────────────────────────────────────────────────────

export async function getDeviceLabel(): Promise<string | undefined> {
  return (await getConfig(await getDb(), DEVICE_LABEL_KEY)) || undefined;
}

export async function setDeviceLabel(label: string): Promise<void> {
  await setConfig(await getDb(), DEVICE_LABEL_KEY, label.trim());
}

// ── Last-synced ────────────────────────────────────────────────────────────

export async function getLastSyncedAt(): Promise<number | undefined> {
  const raw = await getConfig(await getDb(), LAST_SYNCED_KEY);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

// ── Full sync round-trip ─────────────────────────────────────────────────

export type SyncRunResult = {
  /** Server-stamped timestamp of the pushed blob. */
  updatedAt: number;
  /** True when the server already had a blob that we merged in. */
  merged: boolean;
};

/**
 * One full sync: build local → pull remote → per-record LWW merge → apply
 * the merge back to SQLite → push the merged blob. The server is dumb
 * storage; all conflict resolution happens here via `mergeSyncBlobs`.
 *
 * Merge-fidelity note (carried from `@mc/data`'s sync-repo): `buildSyncBlob`
 * stamps every local record with the blob's build time because SQLite
 * doesn't yet track per-record edit timestamps. So on a *conflicting* key,
 * the freshly-built local value wins; records that exist only on the remote
 * still merge in. Full per-record LWW arrives when grading writes a sidecar
 * timestamp column (tracked alongside tombstones as a pre-rollout follow-up).
 *
 * Throws the typed `@mc/sync` errors: `SyncAuthError` on 401/403 (caller
 * should drop to signed-out and re-prompt); `SyncServerError`/
 * `SyncTransportError` on transient failures (caller may retry).
 */
export async function runSync(): Promise<SyncRunResult> {
  const db = await getDb();
  const client = await getClient();
  const deviceId = await ensureDeviceId();
  const label = await getDeviceLabel();

  const local = await buildSyncBlob(
    db,
    label ? { deviceId, deviceLabel: label } : { deviceId },
  );
  const remote = await client.pull();

  let merged: SyncBlob = local;
  if (remote.blob) {
    merged = mergeSyncBlobs(local, remote.blob);
    // Reflect the merge locally so the device's DB matches what we push.
    await applySyncBlob(db, merged);
  }

  const pushed = await client.push(merged);
  await setConfig(db, LAST_SYNCED_KEY, String(pushed.updatedAt));
  return { updatedAt: pushed.updatedAt, merged: remote.blob !== null };
}
