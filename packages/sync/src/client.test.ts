// Coverage matrix for the SyncClient. The transport is the thinnest
// possible layer over fetch — these tests pin down the contract that
// the worker (PR-2/PR-3) needs to satisfy and that desktop/mobile
// callers (PR-5/PR-6) will rely on.

import { describe, expect, it } from "vitest";
import type { SyncBlob } from "@mc/core";
import {
  MemorySessionStore,
  SyncAuthError,
  SyncClient,
  SyncClientError,
  SyncServerError,
  SyncTransportError,
  type FetchLike,
} from "./index.js";

const BASE = "https://sync.example.test";

function emptyBlob(overrides: Partial<SyncBlob> = {}): SyncBlob {
  return {
    version: 2,
    updatedAt: 0,
    deviceId: "test",
    grades: {},
    notes: {},
    scenes: [],
    soundboard: [],
    npcHistory: { entries: [], updatedAt: 0 },
    config: {},
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

/**
 * Tiny fetch double — records each call and returns a queued response.
 * Tests are explicit about the per-call response so it's easy to read
 * what each one is asserting.
 */
function mockFetch(responses: Array<Response | Error>): {
  fetch: FetchLike;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  let i = 0;
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const r = responses[i++];
    if (!r) throw new Error("mockFetch: no more queued responses");
    if (r instanceof Error) throw r;
    return r;
  };
  return { fetch: fn, calls };
}

describe("SyncClient — basic shape", () => {
  it("strips trailing slash from baseUrl", async () => {
    const store = new MemorySessionStore();
    const { fetch, calls } = mockFetch([emptyResponse(204)]);
    const client = new SyncClient({
      baseUrl: `${BASE}/`,
      sessionStore: store,
      fetch,
    });
    await client.signIn("a@b.co");
    expect(calls[0]?.url).toBe(`${BASE}/v1/auth/request`);
  });

  it("status() reflects stored token", async () => {
    const store = new MemorySessionStore();
    const client = new SyncClient({
      baseUrl: BASE,
      sessionStore: store,
      fetch: mockFetch([]).fetch,
    });
    expect(await client.status()).toBe("signed-out");
    await store.write("jwt-xyz");
    expect(await client.status()).toBe("signed-in");
  });
});

describe("SyncClient.signIn", () => {
  it("rejects non-email input without hitting the network", async () => {
    const store = new MemorySessionStore();
    const { fetch, calls } = mockFetch([]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await expect(client.signIn("nope")).rejects.toBeInstanceOf(SyncClientError);
    expect(calls).toHaveLength(0);
  });

  it("POSTs the email and returns magic-link-sent", async () => {
    const store = new MemorySessionStore();
    const { fetch, calls } = mockFetch([emptyResponse(204)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    const result = await client.signIn(" user@example.com ");
    expect(result).toEqual({ status: "magic-link-sent" });
    expect(calls[0]?.url).toBe(`${BASE}/v1/auth/request`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      email: "user@example.com",
    });
  });

  it("does not send Authorization header (sign-in is unauthenticated)", async () => {
    const store = new MemorySessionStore();
    await store.write("stale-jwt");
    const { fetch, calls } = mockFetch([emptyResponse(204)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await client.signIn("x@y.co");
    const headers = calls[0]?.init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });
});

describe("SyncClient.verifyMagicLink", () => {
  it("stores the returned sessionToken", async () => {
    const store = new MemorySessionStore();
    const { fetch, calls } = mockFetch([
      jsonResponse(200, { sessionToken: "jwt-new" }),
    ]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    const result = await client.verifyMagicLink("verif-token");
    expect(result).toEqual({ status: "ok" });
    expect(await store.read()).toBe("jwt-new");
    expect(calls[0]?.url).toBe(
      `${BASE}/v1/auth/callback?token=verif-token`,
    );
  });

  it("URL-encodes the verification token", async () => {
    const store = new MemorySessionStore();
    const { fetch, calls } = mockFetch([
      jsonResponse(200, { sessionToken: "x" }),
    ]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await client.verifyMagicLink("ab cd&ef");
    expect(calls[0]?.url).toBe(
      `${BASE}/v1/auth/callback?token=ab%20cd%26ef`,
    );
  });

  it("throws SyncServerError when response lacks sessionToken", async () => {
    const store = new MemorySessionStore();
    const { fetch } = mockFetch([jsonResponse(200, { ok: true })]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await expect(client.verifyMagicLink("v")).rejects.toBeInstanceOf(
      SyncServerError,
    );
  });
});

describe("SyncClient.signOut", () => {
  it("clears the stored token", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const client = new SyncClient({
      baseUrl: BASE,
      sessionStore: store,
      fetch: mockFetch([]).fetch,
    });
    await client.signOut();
    expect(await store.read()).toBeNull();
  });
});

describe("SyncClient.pull", () => {
  it("requires a stored session token", async () => {
    const store = new MemorySessionStore();
    const client = new SyncClient({
      baseUrl: BASE,
      sessionStore: store,
      fetch: mockFetch([]).fetch,
    });
    await expect(client.pull()).rejects.toBeInstanceOf(SyncAuthError);
  });

  it("returns parsed blob + updatedAt on 200", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const blob = emptyBlob({ updatedAt: 100 });
    const { fetch, calls } = mockFetch([
      jsonResponse(200, { blob, updatedAt: 100 }),
    ]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    const result = await client.pull();
    expect(result.blob).toEqual(blob);
    expect(result.updatedAt).toBe(100);
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt");
  });

  it("returns { blob: null } on 404 (first pull, no blob yet)", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const { fetch } = mockFetch([emptyResponse(404)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    const result = await client.pull();
    expect(result.blob).toBeNull();
    expect(result.updatedAt).toBeNull();
  });
});

describe("SyncClient.push", () => {
  it("sends the blob as JSON body, returns updatedAt", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const blob = emptyBlob({ updatedAt: 42 });
    const { fetch, calls } = mockFetch([
      jsonResponse(200, { updatedAt: 42 }),
    ]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    const result = await client.push(blob);
    expect(result.updatedAt).toBe(42);
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ blob });
  });

  it("throws SyncServerError when response lacks updatedAt", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const { fetch } = mockFetch([jsonResponse(200, { ok: true })]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await expect(client.push(emptyBlob())).rejects.toBeInstanceOf(
      SyncServerError,
    );
  });
});

describe("SyncClient — error mapping", () => {
  it("401 throws SyncAuthError AND clears the stored token", async () => {
    const store = new MemorySessionStore();
    await store.write("expired-jwt");
    const { fetch } = mockFetch([emptyResponse(401)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await expect(client.pull()).rejects.toBeInstanceOf(SyncAuthError);
    expect(await store.read()).toBeNull();
  });

  it("403 behaves the same as 401", async () => {
    const store = new MemorySessionStore();
    await store.write("forbidden-jwt");
    const { fetch } = mockFetch([emptyResponse(403)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await expect(client.pull()).rejects.toBeInstanceOf(SyncAuthError);
    expect(await store.read()).toBeNull();
  });

  it("5xx throws SyncServerError with status preserved", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const { fetch } = mockFetch([emptyResponse(503)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    try {
      await client.pull();
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SyncServerError);
      expect((err as SyncServerError).status).toBe(503);
    }
  });

  it("non-401 4xx throws SyncClientError", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const { fetch } = mockFetch([emptyResponse(422)]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    try {
      await client.pull();
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SyncClientError);
      expect((err as SyncClientError).status).toBe(422);
    }
  });

  it("network failure throws SyncTransportError with cause", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const boom = new Error("ENETUNREACH");
    const { fetch } = mockFetch([boom]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    try {
      await client.pull();
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SyncTransportError);
      expect((err as SyncTransportError).cause).toBe(boom);
    }
  });

  it("non-JSON success response throws SyncServerError", async () => {
    const store = new MemorySessionStore();
    await store.write("jwt");
    const { fetch } = mockFetch([
      new Response("<html>oops</html>", { status: 200 }),
    ]);
    const client = new SyncClient({ baseUrl: BASE, sessionStore: store, fetch });
    await expect(client.pull()).rejects.toBeInstanceOf(SyncServerError);
  });
});

describe("SyncClient — constructor edge cases", () => {
  it("throws when no fetch is available", () => {
    const store = new MemorySessionStore();
    // Strip the real global fetch for the duration of this test.
    const original = globalThis.fetch;
    // @ts-expect-error — deliberately removing for the test
    delete globalThis.fetch;
    try {
      expect(
        () => new SyncClient({ baseUrl: BASE, sessionStore: store }),
      ).toThrow(/no fetch available/i);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("MemorySessionStore", () => {
  it("round-trips a token", async () => {
    const s = new MemorySessionStore();
    expect(await s.read()).toBeNull();
    await s.write("hello");
    expect(await s.read()).toBe("hello");
    await s.clear();
    expect(await s.read()).toBeNull();
  });
});
