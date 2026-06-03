// Cloud-sync wiring for the mobile app — the PR-6 parallel to the desktop
// glue in apps/desktop/src/lib/cloud-sync.ts. Same shape: a SessionStore,
// a client factory, auth helpers, and the pull→merge→apply→push round-trip.
//
// ── Session-token storage ────────────────────────────────────────────────
// Backed by the local SQLite `config` table, matching the desktop decision
// (PR-5). expo-secure-store would be the hardening upgrade — it's a native
// module that needs Expo-version-matched install + config, and the token is
// a bearer JWT for a single-user local tool, so it isn't on the critical
// path for shipping sync. The `SessionStore` interface stays the seam:
// swapping in SecureStore later touches only this file.

import { SyncClient, type SessionStore } from "@mc/sync";
import { mergeSyncBlobs, type SyncBlob } from "@mc/core";
import { getDb } from "../data/db";
import { getConfig, setConfig } from "../data/config-repo";
import { applySyncBlob, buildSyncBlob } from "../data/sync-repo";

const BASE_URL_KEY = "sync_base_url";
const SESSION_KEY = "sync_session_token";
const ACCOUNT_KEY = "sync_account_email";
const DEVICE_ID_KEY = "device_id";
const DEVICE_LABEL_KEY = "sync_device_label";
const LAST_SYNCED_KEY = "sync_last_synced_at";

/** Default endpoint — override from the settings "Advanced" field. */
export const DEFAULT_SYNC_BASE_URL =
  "https://major-ambience-sync.example.workers.dev";

class ConfigSessionStore implements SessionStore {
  async read(): Promise<string | null> {
    const token = await getConfig(await getDb(), SESSION_KEY);
    return token ? token : null;
  }
  async write(token: string): Promise<void> {
    await setConfig(await getDb(), SESSION_KEY, token);
  }
  async clear(): Promise<void> {
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

export async function requestMagicLink(email: string): Promise<void> {
  await (await getClient()).signIn(email);
  await setConfig(await getDb(), ACCOUNT_KEY, email.trim().toLowerCase());
}

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
  updatedAt: number;
  merged: boolean;
};

/**
 * One full sync: build local → pull remote → per-record LWW merge → apply
 * the merge back to SQLite → push. Throws the typed `@mc/sync` errors
 * (SyncAuthError on 401/403; SyncServerError/Transport on transient).
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
    await applySyncBlob(db, merged);
  }

  const pushed = await client.push(merged);
  await setConfig(db, LAST_SYNCED_KEY, String(pushed.updatedAt));
  return { updatedAt: pushed.updatedAt, merged: remote.blob !== null };
}
