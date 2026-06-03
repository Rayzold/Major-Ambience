// Worker contract tests. These pin down the server side of the same wire
// contract that packages/sync/src/client.test.ts pins down on the client
// side — the two suites meet in the middle at the HTTP boundary.
//
// No Workers runtime needed: `handle()` is pure (request + env + deps), so
// a plain in-memory KV fake and deterministic deps cover everything.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { handle } from "../src/index.js";
import { verifySession } from "../src/jwt.js";
import type { Deps, Env, KVNamespace } from "../src/types.js";

// ── Fakes ──────────────────────────────────────────────────────────────

/** In-memory KV with TTL honoured against an injectable clock. */
class FakeKV {
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  constructor(private clock: () => number) {}

  async get(key: string, type?: "text" | "json"): Promise<unknown> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= this.clock()) {
      this.store.delete(key);
      return null;
    }
    return type === "json" ? JSON.parse(entry.value) : entry.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const expiresAt =
      options?.expirationTtl != null
        ? this.clock() + options.expirationTtl * 1000
        : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const SECRET = "test-secret-please-rotate";

type Harness = {
  env: Env;
  deps: Deps;
  sentEmails: Array<{ to: string; token: string }>;
  setNow: (ms: number) => void;
};

function harness(): Harness {
  let now = 1_700_000_000_000; // fixed epoch for determinism
  const clock = () => now;
  const sentEmails: Array<{ to: string; token: string }> = [];
  let counter = 0;

  const env: Env = {
    BLOBS: new FakeKV(clock) as unknown as KVNamespace,
    AUTH: new FakeKV(clock) as unknown as KVNamespace,
    JWT_SECRET: SECRET,
    // RESEND_API_KEY intentionally unset — exercises the dev path, but we
    // override sendEmail below anyway so nothing is logged.
  };

  const deps: Deps = {
    now: clock,
    randomToken: () => `nonce-${++counter}`,
    sendEmail: async (_env, to, token) => {
      sentEmails.push({ to, token });
    },
  };

  return { env, deps, sentEmails, setNow: (ms) => (now = ms) };
}

function req(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string } = {},
): Request {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  return new Request(`https://sync.test${path}`, {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

/** Run the full request→callback handshake and return a session token. */
async function signIn(h: Harness, email = "gm@example.com"): Promise<string> {
  const r1 = await handle(
    req("POST", "/v1/auth/request", { body: { email } }),
    h.env,
    h.deps,
  );
  expect(r1.status).toBe(204);
  const token = h.sentEmails.at(-1)!.token;
  const r2 = await handle(
    req("GET", `/v1/auth/callback?token=${encodeURIComponent(token)}`),
    h.env,
    h.deps,
  );
  expect(r2.status).toBe(200);
  const { sessionToken } = (await r2.json()) as { sessionToken: string };
  return sessionToken;
}

// ── auth/request ─────────────────────────────────────────────────────────

describe("POST /v1/auth/request", () => {
  let h: Harness;
  beforeEach(() => (h = harness()));

  it("mails a nonce and returns 204", async () => {
    const res = await handle(
      req("POST", "/v1/auth/request", { body: { email: "GM@Example.com " } }),
      h.env,
      h.deps,
    );
    expect(res.status).toBe(204);
    expect(h.sentEmails).toHaveLength(1);
    // Email is normalised to lower-case + trimmed.
    expect(h.sentEmails[0]!.to).toBe("gm@example.com");
  });

  it("rejects a malformed email without mailing", async () => {
    const res = await handle(
      req("POST", "/v1/auth/request", { body: { email: "nope" } }),
      h.env,
      h.deps,
    );
    expect(res.status).toBe(400);
    expect(h.sentEmails).toHaveLength(0);
  });

  it("rejects a non-JSON body", async () => {
    const bad = new Request("https://sync.test/v1/auth/request", {
      method: "POST",
      body: "not json",
    });
    const res = await handle(bad, h.env, h.deps);
    expect(res.status).toBe(400);
  });
});

// ── auth/callback ──────────────────────────────────────────────────────────

describe("GET /v1/auth/callback", () => {
  let h: Harness;
  beforeEach(() => (h = harness()));

  it("redeems a valid nonce for a verifiable session token", async () => {
    const token = await signIn(h);
    const claims = await verifySession(token, SECRET, h.deps.now());
    expect(claims?.sub).toBe("gm@example.com");
  });

  it("is single-use — a redeemed nonce can't be replayed", async () => {
    await handle(
      req("POST", "/v1/auth/request", { body: { email: "a@b.co" } }),
      h.env,
      h.deps,
    );
    const nonce = h.sentEmails[0]!.token;
    const first = await handle(
      req("GET", `/v1/auth/callback?token=${nonce}`),
      h.env,
      h.deps,
    );
    expect(first.status).toBe(200);
    const second = await handle(
      req("GET", `/v1/auth/callback?token=${nonce}`),
      h.env,
      h.deps,
    );
    expect(second.status).toBe(401);
  });

  it("rejects an unknown token with 401", async () => {
    const res = await handle(
      req("GET", "/v1/auth/callback?token=never-issued"),
      h.env,
      h.deps,
    );
    expect(res.status).toBe(401);
  });

  it("rejects an expired nonce with 401", async () => {
    await handle(
      req("POST", "/v1/auth/request", { body: { email: "a@b.co" } }),
      h.env,
      h.deps,
    );
    const nonce = h.sentEmails[0]!.token;
    h.setNow(h.deps.now() + 16 * 60 * 1000); // past the 15-min TTL
    const res = await handle(
      req("GET", `/v1/auth/callback?token=${nonce}`),
      h.env,
      h.deps,
    );
    expect(res.status).toBe(401);
  });

  it("400s when token query param is missing", async () => {
    const res = await handle(
      req("GET", "/v1/auth/callback"),
      h.env,
      h.deps,
    );
    expect(res.status).toBe(400);
  });
});

// ── blob ───────────────────────────────────────────────────────────────────

describe("/v1/blob auth", () => {
  let h: Harness;
  beforeEach(() => (h = harness()));

  it("401s without a Bearer token", async () => {
    expect((await handle(req("GET", "/v1/blob"), h.env, h.deps)).status).toBe(
      401,
    );
    expect(
      (await handle(req("PUT", "/v1/blob", { body: { blob: {} } }), h.env, h.deps))
        .status,
    ).toBe(401);
  });

  it("401s on a tampered token", async () => {
    const token = (await signIn(h)) + "x";
    const res = await handle(req("GET", "/v1/blob", { token }), h.env, h.deps);
    expect(res.status).toBe(401);
  });

  it("401s on an expired session token", async () => {
    const token = await signIn(h);
    h.setNow(h.deps.now() + 91 * 24 * 60 * 60 * 1000); // past 90-day TTL
    const res = await handle(req("GET", "/v1/blob", { token }), h.env, h.deps);
    expect(res.status).toBe(401);
  });
});

describe("/v1/blob storage", () => {
  let h: Harness;
  beforeEach(() => (h = harness()));

  it("404s before anything is pushed", async () => {
    const token = await signIn(h);
    const res = await handle(req("GET", "/v1/blob", { token }), h.env, h.deps);
    expect(res.status).toBe(404);
  });

  it("round-trips: PUT then GET returns the same blob + server updatedAt", async () => {
    const token = await signIn(h);
    const blob = { version: 2, deviceId: "d1", grades: { foo: 1 } };

    h.setNow(1_700_000_500_000);
    const put = await handle(
      req("PUT", "/v1/blob", { body: { blob }, token }),
      h.env,
      h.deps,
    );
    expect(put.status).toBe(200);
    const putBody = (await put.json()) as { updatedAt: number };
    expect(putBody.updatedAt).toBe(1_700_000_500_000);

    const get = await handle(req("GET", "/v1/blob", { token }), h.env, h.deps);
    expect(get.status).toBe(200);
    const getBody = (await get.json()) as { blob: unknown; updatedAt: number };
    expect(getBody.blob).toEqual(blob);
    expect(getBody.updatedAt).toBe(1_700_000_500_000);
  });

  it("422s when the body has no blob object", async () => {
    const token = await signIn(h);
    const res = await handle(
      req("PUT", "/v1/blob", { body: { blob: "not-an-object" }, token }),
      h.env,
      h.deps,
    );
    expect(res.status).toBe(422);
  });

  it("isolates blobs per user", async () => {
    const tokenA = await signIn(h, "a@example.com");
    const tokenB = await signIn(h, "b@example.com");
    await handle(
      req("PUT", "/v1/blob", { body: { blob: { who: "A" } }, token: tokenA }),
      h.env,
      h.deps,
    );
    const bGet = await handle(
      req("GET", "/v1/blob", { token: tokenB }),
      h.env,
      h.deps,
    );
    expect(bGet.status).toBe(404); // B sees nothing of A's
  });
});

// ── routing / misc ───────────────────────────────────────────────────────

describe("routing", () => {
  let h: Harness;
  beforeEach(() => (h = harness()));

  it("answers CORS preflight with 204 + allow headers", async () => {
    const res = await handle(req("OPTIONS", "/v1/blob"), h.env, h.deps);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("PUT");
  });

  it("health check returns 200", async () => {
    const res = await handle(req("GET", "/health"), h.env, h.deps);
    expect(res.status).toBe(200);
  });

  it("unknown route 404s", async () => {
    const res = await handle(req("GET", "/v1/nope"), h.env, h.deps);
    expect(res.status).toBe(404);
  });

  it("maps an unhandled internal throw to 500", async () => {
    // Force KV.get to blow up to exercise the top-level catch.
    const boom: Env = {
      ...h.env,
      AUTH: {
        get: vi.fn().mockRejectedValue(new Error("kv down")),
        put: vi.fn(),
        delete: vi.fn(),
      } as unknown as KVNamespace,
    };
    const res = await handle(
      req("GET", "/v1/auth/callback?token=x"),
      boom,
      h.deps,
    );
    expect(res.status).toBe(500);
  });
});
