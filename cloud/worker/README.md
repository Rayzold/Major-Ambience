# Major Ambience — sync Worker

Cloudflare Worker that backs cloud sync: dumb per-user blob storage plus
magic-link auth. It implements the server half of the wire contract that
[`@mc/sync`](../../packages/sync)'s `SyncClient` already speaks, and stays
deliberately out of the pnpm workspace — different toolchain (Wrangler), its
own dependencies, its own deploy lifecycle.

> Covers PR-2 (Worker + KV) and PR-3 (magic-link auth) of
> [`docs/CLOUD_SYNC.md`](../../docs/CLOUD_SYNC.md).

## Wire contract

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| `POST` | `/v1/auth/request` | — | `{ email }` | `204` |
| `GET` | `/v1/auth/callback?token=<nonce>` | — | — | `200 { sessionToken }` |
| `GET` | `/v1/blob` | Bearer | — | `200 { blob, updatedAt }` / `404` |
| `PUT` | `/v1/blob` | Bearer | `{ blob }` | `200 { updatedAt }` |

- `401/403` on any auth failure (the client clears its token and re-prompts).
- The server is **dumb storage**: it never merges. Clients pull, run
  `mergeSyncBlobs` from `@mc/core`, then push the result. The server's only
  authority is `updatedAt`, which it stamps at receive time so clock-skewed
  devices still order writes consistently.
- Magic-link nonces are single-use (delete-on-redeem) with a 15-minute TTL.
  Session JWTs are HS256, 90-day expiry.

## Local development

This package is **not** part of the pnpm workspace, so install it with `npm`
(pnpm would walk up to the repo root and ignore this `package.json`):

```bash
cd cloud/worker
npm install
npm run dev        # wrangler dev — local Worker + Miniflare KV
```

With no `RESEND_API_KEY` set, `POST /v1/auth/request` logs the magic-link code
to the console instead of mailing it — paste that code into the app (or hit
`/v1/auth/callback?token=<code>` directly) to complete sign-in.

## Tests + typecheck

```bash
npm test           # vitest — full contract suite, no Workers runtime needed
npm run typecheck  # tsc --noEmit
```

The tests drive the pure `handle(request, env, deps)` core with an in-memory
KV fake and a deterministic clock, so they run anywhere Node does.

## First deploy

```bash
# 1. Create the two KV namespaces; paste the returned ids into wrangler.toml.
npx wrangler kv namespace create BLOBS
npx wrangler kv namespace create AUTH

# 2. Secrets (never committed):
npx wrangler secret put JWT_SECRET       # long random string; rotating it logs everyone out
npx wrangler secret put RESEND_API_KEY   # optional — omit to keep the dev console-log path

# 3. Point PUBLIC_BASE_URL / MAIL_FROM in wrangler.toml at your domain, then:
npx wrangler deploy
```

Set the client's `baseUrl` (in the desktop/mobile sync settings, PR-5/PR-6) to
the deployed origin — e.g. `https://major-ambience-sync.<acct>.workers.dev` or a
custom `https://sync.majorambience.app`.

## Not yet here (later PRs)

- **Sign in with Apple** — magic-link only for now (decision D2).
- **Session revocation** — JWTs are stateless; rotating `JWT_SECRET` is the
  only revoke today. A KV denylist can come later if multi-device session
  management becomes a real need.
- **Tombstones / delete propagation** — the merge layer (`@mc/core`) doesn't
  propagate deletes yet; the server stores whatever it's given regardless.
