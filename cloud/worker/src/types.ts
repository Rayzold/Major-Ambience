// Ambient + binding types for the sync Worker.
//
// We deliberately declare a *narrow* `KVNamespace` (only the methods this
// Worker actually calls) rather than depending on `@cloudflare/workers-types`.
// Structural typing means the real KV binding satisfies it at runtime, and
// keeping the surface small lets the unit tests substitute a plain in-memory
// fake without pulling the whole Workers type tree into the test runner.

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  get(key: string, type: "text"): Promise<string | null>;
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

/** The subset of Cloudflare's `ExecutionContext` we touch. */
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** Bindings + secrets, configured in `wrangler.toml` / `wrangler secret put`. */
export interface Env {
  /** Per-user sync blobs. Key: `blob:<sub>`. */
  BLOBS: KVNamespace;
  /** Pending magic-link nonces, short TTL. Key: `magic:<token>`. */
  AUTH: KVNamespace;

  /** HMAC secret for signing session JWTs. Set via `wrangler secret put`. */
  JWT_SECRET: string;
  /** Resend API key. Unset ⇒ dev fallback (logs the code instead of mailing). */
  RESEND_API_KEY?: string;
  /** From address, e.g. `Major Ambience <login@majorambience.app>`. */
  MAIL_FROM?: string;
  /** Public origin of this Worker, used to build the link in the email. */
  PUBLIC_BASE_URL?: string;
}

/**
 * Injectable side-effecting dependencies. Production values live in
 * `index.ts`; tests pass deterministic fakes. Mirrors the `fetch`-injection
 * pattern used by `@mc/sync`'s `SyncClient`.
 */
export interface Deps {
  /** Wall clock, ms since epoch. The server is the only monotonic clock. */
  now: () => number;
  /** Opaque, unguessable magic-link token. */
  randomToken: () => string;
  /** Deliver the magic-link email (or log it in dev). */
  sendEmail: (env: Env, to: string, token: string) => Promise<void>;
}

/** Stored shape of a user's blob record in KV. */
export interface BlobRecord {
  blob: unknown;
  updatedAt: number;
}

/** Decoded session-JWT payload. */
export interface SessionClaims {
  /** Subject — the user's email (normalised to lower-case). */
  sub: string;
  /** Issued-at, seconds. */
  iat: number;
  /** Expiry, seconds. */
  exp: number;
}
