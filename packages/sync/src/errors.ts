// Typed error tree the SyncClient throws. Surfaces enough information
// for callers to branch on the failure mode (re-auth vs retry vs
// surface-to-user) without parsing strings.

/** Base class — every error from this package is an instance of this. */
export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

/**
 * Network-layer failure: fetch threw before the server ever responded.
 * Usually offline / DNS / TLS. Caller should retry with backoff.
 */
export class SyncTransportError extends SyncError {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SyncTransportError";
  }
}

/**
 * Server returned a 401/403. The stored session token has been cleared
 * by the client — the caller should route the user back to signIn.
 */
export class SyncAuthError extends SyncError {
  constructor(message = "Authentication failed; session cleared.") {
    super(message);
    this.name = "SyncAuthError";
  }
}

/** Server returned a 5xx. Caller can retry; transient. */
export class SyncServerError extends SyncError {
  constructor(
    public readonly status: number,
    message = `Sync server returned ${status}.`,
  ) {
    super(message);
    this.name = "SyncServerError";
  }
}

/**
 * Server returned a 4xx other than 401/403 — usually a malformed
 * request from the client. Not retryable without code changes.
 */
export class SyncClientError extends SyncError {
  constructor(
    public readonly status: number,
    message = `Sync server rejected the request (${status}).`,
  ) {
    super(message);
    this.name = "SyncClientError";
  }
}
