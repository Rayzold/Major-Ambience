# Handover — cloud sync + IAP work

Context for picking this up in a fresh session. Covers what was built across
the cloud-sync (PR-2→PR-6) and IAP-foundation (PR-8) work, where it lives,
what's verified, and exactly what's left.

> Plan of record: [`docs/CLOUD_SYNC.md`](docs/CLOUD_SYNC.md) (PR sequence + status)
> and [`docs/IAP.md`](docs/IAP.md) (monetization). Read those two first.

---

## Branch / PR state

- **`feat/cloud-sync`** → **PR #51** (open, base `main`): README refresh, CI, the
  Cloudflare Worker backend (PR-2/3), desktop sync wiring (PR-5), mobile sync
  wiring (PR-6).
- **`feat/iap`** (this branch, stacked on `feat/cloud-sync`): the PR-8 IAP
  foundation + `docs/IAP.md` + this handover. Its PR should target
  `feat/cloud-sync` as base (or rebase onto `main` once #51 merges).

`main` is untouched. Nothing is deployed.

---

## What's done

### Cloud sync (PR-1 → PR-6) — all code-complete, see CLOUD_SYNC.md
- **PR-1** merge primitives, **PR-4** `@mc/sync` client, **PR-7** entitlement gate —
  were already in the repo before this work.
- **PR-2/PR-3 — backend:** [`cloud/worker/`](cloud/worker) — Cloudflare Worker,
  magic-link auth (KV nonces → HS256 JWT) + dumb blob storage. 19 tests, run
  without the Workers runtime. **Outside the pnpm workspace** — its own `npm`
  toolchain (`cd cloud/worker && npm install`).
- **PR-5 — desktop:** [`apps/desktop/src/lib/cloud-sync.ts`](apps/desktop/src/lib/cloud-sync.ts),
  [`SyncSettings.tsx`](apps/desktop/src/layout/SyncSettings.tsx), wired in
  `Library.tsx` (boot state + debounced 4s background push off a content
  signature). Opened from the settings (☰) menu.
- **PR-6 — mobile:** [`apps/mobile/src/data/sync-repo.ts`](apps/mobile/src/data/sync-repo.ts)
  (build/apply on expo-sqlite), [`cloud-sync.ts`](apps/mobile/src/lib/cloud-sync.ts),
  [`app/settings.tsx`](apps/mobile/app/settings.tsx) (gear button in the Library header).

### IAP foundation (PR-8) — see IAP.md
- **`@mc/core`:** `setTierResolver` seam in [`entitlements.ts`](packages/core/src/entitlements.ts)
  (`currentTier()` = override → resolver → `BETA_TIER`) + offline license
  verification in [`license.ts`](packages/core/src/license.ts) (RS256/WebCrypto).
  14 tests in `license.test.ts`.
- **Desktop:** [`lib/entitlement.ts`](apps/desktop/src/lib/entitlement.ts) (boot
  resolver `maxTier(BETA_TIER, purchased)`, apply/clear license),
  [`LicenseDialog.tsx`](apps/desktop/src/layout/LicenseDialog.tsx), reached from the
  settings menu → "Plan & license…". `loadEntitlement()` runs in `App.tsx`.

---

## Verification (all green as of handover)

```bash
pnpm install
pnpm -r typecheck         # 6/6 projects
pnpm -r test              # 242 tests (220 @mc/core + 22 @mc/sync)
pnpm --filter @mc/desktop build   # Vite bundle builds

cd cloud/worker && npm install && npm test   # 19 worker tests (separate toolchain)
```

**Not runtime-verified** (no environment for it here): the desktop UI (needs a
Tauri dev shell + Rust), the mobile UI (needs an Expo device/simulator), and any
live server round-trip (needs the Worker deployed).

---

## What's left, in priority order

1. **Deploy the Worker** ([`cloud/worker/README.md`](cloud/worker/README.md)):
   Cloudflare account → `wrangler kv namespace create BLOBS` + `AUTH` (paste ids
   into `wrangler.toml`) → `wrangler secret put JWT_SECRET` (+ optional
   `RESEND_API_KEY`) → `wrangler deploy`. Then set the client `baseUrl` (sync
   settings "Advanced", both apps) to the deployed origin. This lights up the
   whole pull→merge→push path end to end.
2. **Runtime-verify the apps** — desktop `pnpm desktop` (Tauri), mobile
   `pnpm --filter @mc/mobile start` (Expo). Walk sign-in → sync → confirm grades/
   scenes/soundboard round-trip between two devices.
3. **IAP external setup** ([`docs/IAP.md`](docs/IAP.md) checklist): generate the
   issuer RSA keypair, embed the public JWK (replace the placeholder in
   `apps/desktop/src/lib/entitlement.ts`), add the Stripe webhook → `issueLicenseKey`
   → Resend route to `cloud/worker`, then StoreKit (iOS) + Play Billing (Android).
4. **Mobile background sync** — desktop debounces a push off a central mutation
   signature in `Library.tsx`; mobile only does manual + sync-on-verify because it
   has no single orchestrator. Wire debounced sync into the mobile mutation paths.
5. **Launch cutover** — flip `BETA_TIER` `"major"` → `"demo"` in
   `packages/core/src/entitlements.ts`. That single change makes the gate live;
   the resolvers already return the purchased tier.

### Known deferrals (documented, intentional)
- **Session-token storage** is the SQLite `config` table on both apps, behind the
  `SessionStore` seam — NOT Tauri Stronghold / expo-secure-store. Those are the
  hardening upgrade (drop-in; touches only the `cloud-sync.ts` files).
- **No sync tombstones** — deletes don't propagate yet (a record only on device A
  survives a merge from B). Per-record edit timestamps + tombstones are a
  pre-rollout follow-up (noted in `@mc/core/sync-merge.ts` and `sync-blob.ts`).
- **Merge fidelity** — `buildSyncBlob` stamps every record with build time (SQLite
  has no per-record edit time), so a conflicting key resolves to the freshly-built
  local value. Records only on the remote still merge in. Fix needs a sidecar
  timestamp column.

---

## Gotchas for the next session

- **`gh` CLI is not installed** in this environment, and `pnpm`/`wrangler` aren't on
  PATH — invoke via `npx pnpm@11.2.2 …`. The PR for `feat/cloud-sync` (#51) was
  created via the GitHub REST API using the OS git credential (push uses the same).
- **`pnpm install` from inside `cloud/worker` climbs to the workspace root** — that
  package is intentionally outside the workspace; use `npm` there.
- **Mobile/Expo:** `apps/mobile/AGENTS.md` insists on reading the versioned Expo v56
  docs before writing Expo code. `crypto.subtle` / `crypto.randomUUID` may be absent
  on the RN runtime — the cloud-sync `ensureDeviceId` already guards for it.
- **exactOptionalPropertyTypes is on** repo-wide — omit optional props (spread
  guards) rather than passing `undefined`.
- Files were authored with LF; git warns about CRLF on staging — cosmetic.
