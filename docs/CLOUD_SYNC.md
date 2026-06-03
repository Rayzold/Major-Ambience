# Cloud sync — Phase 2 implementation plan

> Scoping doc for the "cloud sync proper" line in [`ROADMAP.md`](../ROADMAP.md) Phase 2. The architecture is locked by [`BUILD_GUIDE.md § 6.3 / § 6.4`](BUILD_GUIDE.md) and the pricing/tier shape by [`DESIGN.md § 6`](../DESIGN.md). This doc turns those into PR-sized work, names the few decisions still open, and orders the dependencies.

---

## What already exists

Roughly 30% of the wire-format and apply path is already shipped:

| Layer | Status | Location |
|---|---|---|
| **`SyncBlob` v1 schema** | ✅ | [`packages/core/src/sync-blob.ts`](../packages/core/src/sync-blob.ts) — version, deviceId, grades / notes / scenes / soundboard / npcHistory / config. Content-addressed `trackKey(title, pack)` so grades follow content. |
| **`buildSyncBlob` + `applySyncBlob`** (desktop) | ✅ | [`packages/data/src/sync-repo.ts`](../packages/data/src/sync-repo.ts). Apply is **replace**-style today, not merge. |
| **Manual file export/import** (desktop only) | ✅ | [`apps/desktop/src/lib/sync.ts`](../apps/desktop/src/lib/sync.ts) + `SyncImportConfirm.tsx`. Tauri dialogs → JSON files. |
| **Mobile build/apply** | ✅ | [`apps/mobile/src/data/sync-repo.ts`](../apps/mobile/src/data/sync-repo.ts) — build + apply on the expo-sqlite driver (PR-6). |
| **Cloud transport — client** | ✅ | [`packages/sync`](../packages/sync) — `SyncClient` HTTP transport, PR-4 (#49). |
| **Cloud transport — backend** | ✅ | [`cloud/worker`](../cloud/worker) — Worker + KV blob storage, PR-2. |
| **Auth** | ✅ | Magic-link backend done (PR-3); desktop (PR-5) + mobile (PR-6) sign-in UI + session-token storage done. (SecureStore/Stronghold hardening deferred — see PR-5/PR-6.) |
| **Merge semantics** | ✅ | `mergeSyncBlobs` per-record LWW in `@mc/core`, PR-1 (#48). `applySyncBlob` replace path superseded for the cloud route. |
| **Pro-tier gate** | ⚠️ | Entitlement registry wired (PR-7, #50); still free during beta (`currentTier()` → `major`). |
| **IAP** | ❌ | No StoreKit / Play Billing / Stripe wiring. |

---

## Open decisions (real, not bikeshed)

Pick before PR-1 lands. None of these are "what color is the button"; they shape the data model or the auth/billing surface for years.

### D1 — Merge granularity

`SyncBlob` carries `grades: Record<trackKey, Grade>` and `scenes: Scene[]` as flat top-level fields. BUILD_GUIDE §6.4 says "Last-write-wins per top-level key" — but "key" is ambiguous there: per-blob (one timestamp wins everything) vs per-record (each grade entry has its own `updatedAt`).

- **Per-blob LWW** — simpler server (single `last_updated`); risks losing a recent edit on device B if device A pushes a stale blob.
- **Per-record LWW** — needs per-grade / per-scene `updatedAt` field in the blob (schema bump v1 → v2); much safer with multi-device editing.

**Recommendation:** per-record. The schema bump is cheap now (no real-world data to migrate); doing it later is much harder.

### D2 — Auth provider

BUILD_GUIDE §6.4 specifies magic-link via Resend. Reasonable, but:
- iOS users increasingly expect **Sign in with Apple** (and Apple may require it as an alternative for App Store approval if any third-party login is offered).
- Magic-link works everywhere with one server-side dependency.

**Recommendation:** ship magic-link first (PR-2). Add Sign in with Apple in a follow-up before iOS submission if review flags it.

### D3 — Gate timing

The cloud-sync feature itself is **Pro-tier only** per DESIGN §6.2. We don't have IAP yet. Two paths:

- **Gate from day 1** — IAP must land first; users can't try sync at all without paying.
- **Ship free first, gate later** — sync works for everyone in a beta period, gate flips at launch.

**Recommendation:** ship free first. The beta data is valuable, and we don't want IAP plumbing on the critical path of a sync rollout. Document the cutover date in CHANGELOG.

### D4 — Device naming

`SyncBlob.deviceLabel` is optional. UX question: do we ask the user to name each device on first sign-in (verbose, friendlier conflict surface), auto-derive ("Marko's iPhone" from system hostname, opaque on some platforms), or skip the field?

**Recommendation:** auto-derive with an "Edit" affordance in Settings. Keep `deviceLabel` optional in the schema — server treats nullable.

---

## PR sequence

Eight shippable PRs, ordered by dependency. Each is self-contained and reviewable in isolation.

> **Progress:** PR-1 (#48), PR-4 (#49), and PR-7 (#50) shipped first — the pure-TypeScript, no-infra ends. PR-2 + PR-3 (the Worker backend) are in [`cloud/worker`](../cloud/worker), and PR-5 + PR-6 (desktop + mobile wiring) have landed. Remaining: PR-8 (IAP), then deploy the Worker and point clients at it.

### PR-1 — `@mc/core` sync merge primitives (no backend) — ~1 day ✅ (#48)

Add per-record LWW merge (per D1) to `packages/core`. New `mergeSyncBlobs(local, remote): SyncBlob` function with vitest coverage.

**Files:**
- `packages/core/src/sync-blob.ts` — add `updatedAt` fields per grade/note/scene/soundboard slot. Bump `SYNC_BLOB_VERSION` to `2`; keep a `migrateV1ToV2(blob)` helper.
- `packages/core/src/sync-merge.ts` (new) — `mergeSyncBlobs(local, remote): SyncBlob`.
- `packages/core/src/sync-merge.test.ts` (new) — full coverage of the LWW matrix.
- Update `packages/data/src/sync-repo.ts` `buildSyncBlob` to populate per-record `updatedAt` from existing DB columns.

**Risk:** none. Pure logic + tests, no network.

### PR-2 — Cloudflare Worker scaffolding + KV namespace — ~1 day ✅

> Shipped in [`cloud/worker`](../cloud/worker) — combined with PR-3. Two KV bindings (`BLOBS`, `AUTH`); `GET`/`PUT /v1/blob`; contract tests run without the Workers runtime.

Stand up the Worker at `cloud/worker/` (new top-level dir, outside the pnpm workspace — different toolchain). Routes: `GET /v1/blob` and `PUT /v1/blob`. KV binding `BLOBS`. No auth yet — gated behind a hardcoded shared secret for early dev.

**Files:**
- `cloud/worker/wrangler.toml`
- `cloud/worker/src/index.ts`
- `cloud/worker/README.md` — deploy instructions

**Risk:** infra setup — needs a Cloudflare account + a domain decision (subdomain like `sync.majorambience.app` vs free `*.workers.dev` for v1).

### PR-3 — Magic-link auth (Worker + Resend) — ~2 days ✅

> Shipped in [`cloud/worker`](../cloud/worker). Single-use 15-min nonces in KV; HS256 session JWTs (90-day) signed with a Worker secret; Resend delivery with a console-log dev fallback when no API key is set.

`POST /v1/auth/request` (email → mail magic link), `GET /v1/auth/callback?token=...` (verify, mint JWT, set HttpOnly cookie for web / return token for native). KV stores pending-token nonces with TTL.

**Files:**
- `cloud/worker/src/auth.ts` — routes + JWT signing (HS256 with a Worker secret).
- `cloud/worker/src/email.ts` — Resend client.
- Update `GET/PUT /v1/blob` to require `Authorization: Bearer <jwt>`.

**Risk:** Resend account + domain DNS (SPF/DKIM) for sender deliverability.

### PR-4 — `@mc/sync` client package — ~1 day ✅ (#49)

New workspace package wrapping HTTP transport. Pure TypeScript so desktop + mobile share it.

**Files:**
- `packages/sync/src/client.ts` — `SyncClient { signIn, signOut, push, pull, status }`. Reads/writes a session token via injectable storage (so Tauri Stronghold / Expo SecureStore can plug in).
- `packages/sync/src/storage.ts` — minimal `SessionStore` interface.
- `packages/sync/package.json`, tsconfig, vitest setup.

**Risk:** none — testable with a fake `fetch` and fake storage.

### PR-5 — Desktop sync UI + wiring — ~1 day ✅

Settings panel: email field → magic-link button; once signed in, show device label + "synced 2 min ago" + manual "Sync now" button. Background sync on every grade/scene/soundboard change, debounced 4s.

**Shipped:**
- `apps/desktop/src/layout/SyncSettings.tsx` — the modal (dumb-visual: drafts only).
- `apps/desktop/src/lib/cloud-sync.ts` — session store, client factory, and the pull→merge→apply→push `runSync` round-trip.
- `apps/desktop/src/Library.tsx` — boot state, manual + debounced (4s) background sync via a syncable-state signature, opened from the settings menu.

**Deviation from plan — session-token storage.** Instead of the Tauri Stronghold plugin, the `SessionStore` is backed by the local SQLite `config` table. Rationale: the token is a bearer JWT for a single-user local tool; Stronghold's password/salt ceremony (and the Rust dependency + recompile) isn't warranted, and the `SessionStore` interface stays the seam if we want to harden later. Avoiding the Rust change also keeps this PR verifiable via `typecheck` + `vite build` without a full Tauri compile.

**Not yet runtime-verified:** the live UI needs a Tauri dev shell, and a real round-trip needs the deployed Worker (`cloud/worker`). Verified here: typecheck, the full test suite, and the desktop frontend bundle build.

### PR-6 — Mobile sync support — ~2 days ✅

Two things mobile was missing: build/apply on the mobile driver, and the Settings UI.

**Shipped:**
- [`apps/mobile/src/data/sync-repo.ts`](../apps/mobile/src/data/sync-repo.ts) — `buildSyncBlob` / `applySyncBlob` mirroring `packages/data`, on the expo-sqlite driver. Added `setNote` to the mobile tracks-repo so notes round-trip.
- [`apps/mobile/src/lib/cloud-sync.ts`](../apps/mobile/src/lib/cloud-sync.ts) — the same glue as desktop (`runSync` pull→merge→apply→push).
- [`apps/mobile/app/settings.tsx`](../apps/mobile/app/settings.tsx) — a Settings *stack route* off the Library tab (not a new bottom-tab — that was the risk called out below), reached via a gear button in the Library header.

**Deviations from plan:**
- **Session storage** — SQLite `config` table behind the `SessionStore` seam, same as desktop PR-5. `expo-secure-store` is the hardening upgrade but a native module needing Expo-version-matched install/config; deferred to keep sync off that critical path.
- **No edit-triggered background sync yet.** Desktop debounces a push off a central mutation signature in `Library.tsx`; mobile has no single orchestrator (each screen is self-contained), so mobile does manual "Sync now" plus a sync on verify. Wiring debounced background sync into the mobile screens is a follow-up.

**Not runtime-verified:** needs an Expo dev client / device. Verified here: typecheck (mobile + whole workspace) and the full test suite.

### PR-7 — Pro-tier feature gate (still free; flag wired) — ~1 day ✅ (#50)

Add a `usePro()` hook that reads from a single source of truth (defaults `true` during beta per D3). Surface a "Pro" pill in the sync settings indicating the gate exists. No actual blocking yet.

**Files:**
- `packages/core/src/entitlements.ts` (new) — entitlement names + check helpers.
- `apps/desktop/src/layout/SyncSettings.tsx` — conditional disable based on `usePro()`.
- `apps/mobile/app/(tabs)/settings.tsx` — same.

**Risk:** minimal. Sets up the cut-line we flip in PR-8.

### PR-8 — IAP (deferred — separate plan) — multi-week

StoreKit (iOS), Play Billing (Android), Stripe Checkout or Paddle (desktop web → email license key → desktop verifies on next launch). Separate doc when we get there; depends on App Store Connect / Play Console / Stripe account setup that lives outside the codebase.

---

## Estimated calendar

PR-1 through PR-7 = ~8 working days of code + ~3 days of infra setup (CF + DNS + Resend domain) = roughly **2 calendar weeks** of focused work, single-developer. PR-8 (IAP) is the multi-week one and stands alone.

---

## Risks + rollback story

| Risk | Mitigation |
|---|---|
| Resend deliverability for magic links | Pre-warm sending domain; fall back to a "copy paste this code" path in the email body. |
| KV write-budget overrun on chatty syncs | 4s debounce on the client (PR-5). Free tier covers 1K writes/day — that's ~250 sessions worth of edits, comfortably. |
| Schema bump v1→v2 breaks the existing manual export/import flow | `migrateV1ToV2` (PR-1) keeps round-tripping any JSON file the user has on disk. |
| Auth secret leak | Worker secret rotated via `wrangler secret put`; rotating it invalidates all JWTs — users re-link via email. Acceptable for a single-user TTRPG tool. |
| Mobile / desktop disagree on `updatedAt` clock skew | Both clients sign with `Date.now()` and trust server `received_at` as the tie-breaker — server is the only monotonic clock we have. |

**Rollback per PR:** every PR is independently revertable. PR-1 is the only one that bumps `SYNC_BLOB_VERSION`; if reverted, the v1 → v2 migrator becomes dead code but no data is lost.

---

## What this doc is NOT

- Not a marketing announcement. We don't talk about sync publicly until PR-5 is live and tested.
- Not a billing plan — that's PR-8's separate plan.
- Not a final spec. Comment on the open decisions (D1–D4) before PR-1 lands; everything else is implementation detail that lives in the PRs themselves.
