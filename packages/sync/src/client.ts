// SyncClient — HTTP transport for cloud sync. Pure TypeScript so it
// runs identically on desktop (Tauri renderer) and mobile (Expo).
//
// Wire contract (matches docs/CLOUD_SYNC.md PR-2/PR-3):
//
//   POST  /v1/auth/request   { email }                  → 204
//   GET   /v1/auth/callback?token=...                   → 200 { sessionToken }
//   GET   /v1/blob                                      → 200 { blob, updatedAt }
//                                                       → 404 (signed-in user has no blob yet)
//   PUT   /v1/blob           { blob }                   → 200 { updatedAt }
//
// All authenticated endpoints expect `Authorization: Bearer <jwt>`.
// On 401/403 the client clears the stored token and throws
// SyncAuthError so the caller can route back to signIn.
//
// Merge is upstream of this layer: the desktop/mobile app calls
// `mergeSyncBlobs(local, remote)` from @mc/core before pushing.
// The transport itself is dumb: pull whole blob, push whole blob.

import type { AnySyncBlob, SyncBlob } from "@mc/core";
import {
  SyncAuthError,
  SyncClientError,
  SyncServerError,
  SyncTransportError,
} from "./errors.js";
import type { SessionStore } from "./storage.js";

/** Subset of the global fetch we depend on. Lets tests inject a fake. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type SyncClientOptions = {
  /**
   * Base URL of the cloud worker, no trailing slash.
   * Example: `https://sync.majorambience.app`
   */
  baseUrl: string;
  /** Where the session JWT lives between calls. */
  sessionStore: SessionStore;
  /**
   * Override the global `fetch`. Used by tests; defaults to `globalThis.fetch`
   * which exists on both Node 18+ (vitest) and every supported runtime.
   */
  fetch?: FetchLike;
};

export type PullResult =
  | { blob: SyncBlob; updatedAt: number }
  | { blob: null; updatedAt: null };

export type PushResult = { updatedAt: number };

export type SignInResult = { status: "magic-link-sent" };
export type VerifyResult = { status: "ok" };
export type AuthStatus = "signed-in" | "signed-out";

export class SyncClient {
  private readonly baseUrl: string;
  private readonly sessionStore: SessionStore;
  private readonly fetch: FetchLike;

  constructor(opts: SyncClientOptions) {
    // Strip trailing slash so concatenation stays simple.
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.sessionStore = opts.sessionStore;
    const f = opts.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error(
        "SyncClient: no fetch available — pass one via options.fetch.",
      );
    }
    // Re-bind so calls don't lose `this` when fetch is the global one.
    this.fetch = f.bind(globalThis) as FetchLike;
  }

  /** True iff a session token is currently stored. */
  async status(): Promise<AuthStatus> {
    const token = await this.sessionStore.read();
    return token ? "signed-in" : "signed-out";
  }

  /**
   * Kick off magic-link sign-in. Server mails the user a one-time
   * verification token; the user pastes/opens it back into the app and
   * we exchange it via `verifyMagicLink` for a session JWT.
   */
  async signIn(email: string): Promise<SignInResult> {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      throw new SyncClientError(0, "signIn requires a valid email address.");
    }
    await this.request("POST", "/v1/auth/request", {
      body: { email: trimmed },
      requireAuth: false,
    });
    return { status: "magic-link-sent" };
  }

  /**
   * Exchange a one-time verification token (from the magic-link email)
   * for a long-lived session JWT, and persist it via the SessionStore.
   */
  async verifyMagicLink(verificationToken: string): Promise<VerifyResult> {
    const t = verificationToken.trim();
    if (!t) throw new SyncClientError(0, "verifyMagicLink: empty token.");
    const data = await this.request<{ sessionToken: string }>(
      "GET",
      `/v1/auth/callback?token=${encodeURIComponent(t)}`,
      { requireAuth: false },
    );
    if (!data?.sessionToken || typeof data.sessionToken !== "string") {
      throw new SyncServerError(
        200,
        "verifyMagicLink: server response missing sessionToken.",
      );
    }
    await this.sessionStore.write(data.sessionToken);
    return { status: "ok" };
  }

  /**
   * Clear the local session token. Does not currently hit the server —
   * sessions are stateless JWTs, so revocation would require a denylist.
   * The plan defers that to a later PR if multi-device session
   * management becomes a real concern.
   */
  async signOut(): Promise<void> {
    await this.sessionStore.clear();
  }

  /**
   * Fetch the latest blob for the signed-in user. Returns `{ blob: null }`
   * when the server has no blob yet (first-ever pull). 401/403 throws
   * SyncAuthError after clearing the stored token.
   */
  async pull(): Promise<PullResult> {
    const data = await this.request<{
      blob: AnySyncBlob;
      updatedAt: number;
    }>("GET", "/v1/blob", { requireAuth: true, allow404: true });
    if (data === null) return { blob: null, updatedAt: null };
    if (!data.blob || typeof data.updatedAt !== "number") {
      throw new SyncServerError(200, "pull: malformed server response.");
    }
    // We deliberately don't migrate v1 → v2 here; the caller does that
    // through ensureV2 + mergeSyncBlobs so the migration happens in one
    // documented place. Cast is safe — the wire contract guarantees the
    // shape; the caller normalises.
    return { blob: data.blob as SyncBlob, updatedAt: data.updatedAt };
  }

  /**
   * Upload a fully-merged blob. Caller is responsible for running
   * `mergeSyncBlobs` against the latest `pull()` first — the server
   * is dumb-blob storage and will overwrite whatever's there.
   */
  async push(blob: SyncBlob): Promise<PushResult> {
    const data = await this.request<{ updatedAt: number }>(
      "PUT",
      "/v1/blob",
      { body: { blob }, requireAuth: true },
    );
    if (!data || typeof data.updatedAt !== "number") {
      throw new SyncServerError(200, "push: malformed server response.");
    }
    return { updatedAt: data.updatedAt };
  }

  // ── Internals ──────────────────────────────────────────────────────

  private async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    opts: {
      body?: unknown;
      requireAuth: boolean;
      /** When true, return null on 404 instead of throwing. */
      allow404?: boolean;
    },
  ): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (opts.requireAuth) {
      const token = await this.sessionStore.read();
      if (!token) {
        throw new SyncAuthError("Not signed in.");
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method,
      headers,
      ...(opts.body !== undefined
        ? { body: JSON.stringify(opts.body) }
        : {}),
    };

    let res: Response;
    try {
      res = await this.fetch(url, init);
    } catch (err) {
      throw new SyncTransportError(
        `Network error calling ${method} ${path}`,
        err,
      );
    }

    if (opts.allow404 && res.status === 404) return null;

    if (res.status === 401 || res.status === 403) {
      // Clear the stored token so the next `status()` reflects reality.
      // We swallow any failure from the store — the caller still needs
      // to know auth failed; storage cleanup is best-effort.
      try {
        await this.sessionStore.clear();
      } catch {
        /* swallow */
      }
      throw new SyncAuthError();
    }

    if (res.status >= 500) {
      throw new SyncServerError(res.status);
    }
    if (res.status >= 400) {
      throw new SyncClientError(res.status);
    }

    // 204 No Content is success with no body — return null so the caller
    // doesn't accidentally `.foo` on undefined parsed JSON.
    if (res.status === 204) return null;

    try {
      return (await res.json()) as T;
    } catch (err) {
      throw new SyncServerError(
        res.status,
        `Response from ${method} ${path} was not valid JSON.`,
      );
    }
  }
}
