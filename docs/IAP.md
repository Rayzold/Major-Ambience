# In-app purchases — PR-8 plan

> The monetization plan referenced by [`docs/CLOUD_SYNC.md`](CLOUD_SYNC.md) PR-8 and [`DESIGN.md § 6`](../DESIGN.md). Pricing/tiers are locked by DESIGN; the entitlement *shape* is locked by [`packages/core/src/entitlements.ts`](../packages/core/src/entitlements.ts) (PR-7). This doc covers how a real purchase becomes a tier, what's built so far, and what still needs external accounts.

---

## Tiers (DESIGN § 6.1)

| Tier | Price | Grants (cumulative — see `TIER_ENTITLEMENTS`) |
|---|---|---|
| `demo` | free | nothing gated |
| `minor` | $14.99 | user library, grades, favorites/recents, SFX layer |
| `major` | $29.99 | + full soundboard pages, DM Mode, cloud sync, themes, notes, per-category volumes |
| ~~epic~~ | $49.99 | held for v2 — intentionally not in the `Tier` union |

One-time purchase, no subscription (DESIGN non-goal).

---

## Architecture: how a purchase becomes a tier

`currentTier()` in `@mc/core` is the single read point. Precedence:

```
test override  →  registered resolver  →  BETA_TIER
```

`setTierResolver()` (PR-8) is the seam each app wires at boot. The resolver
returns `maxTier(BETA_TIER, purchasedTier)`, so:

- **During the beta** `BETA_TIER = "major"` ⇒ everything is unlocked regardless
  of what's purchased (the "ship free first, gate later" decision, CLOUD_SYNC.md D3).
- **At the launch cutover** flip `BETA_TIER` to `"demo"` in `entitlements.ts`.
  No other code changes — the resolver immediately starts returning the
  purchased tier, and every `hasEntitlement()` / `tierLimits()` consumer gates
  correctly.

Each platform feeds the resolver from a different source of truth:

| Platform | Source of `purchasedTier` | Status |
|---|---|---|
| **Desktop** (Tauri) | Offline-verified **license key** (buy on web → emailed key) | ✅ built (verify + UI + persist); ⚠️ issuer + real public key pending |
| **iOS** | StoreKit 2 entitlement / transaction | ❌ not started (needs native module + App Store Connect) |
| **Android** | Play Billing purchase | ❌ not started (needs native module + Play Console) |

---

## Desktop — license keys (✅ built this PR)

Desktop can't use a mobile store, so it uses a license-key flow:

```
Stripe Checkout ──(webhook)──▶ issuer signs a license token (RS256, private key)
       │                                         │
       └────────── emails key to buyer ◀─────────┘
                          │
            user pastes key into the app
                          ▼
   verifyLicenseKey(key, EMBEDDED_PUBLIC_JWK)  ── offline, no network
                          ▼
        persist tier in config → resolver returns it
```

**Built:**
- [`packages/core/src/license.ts`](../packages/core/src/license.ts) — `verifyLicenseKey` (RS256 via WebCrypto, offline, never throws) + `issueLicenseKey` (issuer/test side). 14 tests in `license.test.ts` (tamper, wrong issuer, expiry, bad tier, garbage).
- [`apps/desktop/src/lib/entitlement.ts`](../apps/desktop/src/lib/entitlement.ts) — `loadEntitlement()` (boot: read persisted tier, register resolver), `applyLicenseKey()`, `clearLicense()`.
- [`apps/desktop/src/layout/LicenseDialog.tsx`](../apps/desktop/src/layout/LicenseDialog.tsx) — paste-a-key UI, reached from the settings menu → "Plan & license…".

**Why asymmetric:** the app ships only the *public* key, so a leaked binary can't mint licenses. A symmetric HMAC secret in the client could.

**Still needed (external):**
1. **Generate the issuer RSA keypair.** Keep the private key in the issuer's secrets; export the public key as JWK and replace `ISSUER_PUBLIC_JWK` in `entitlement.ts` (currently a placeholder that fails all keys).
2. **Stand up the issuer.** Smallest version: extend the existing `cloud/worker` with a Stripe webhook route that, on `checkout.session.completed`, calls `issueLicenseKey({ tier, email, iat })` and emails the key (Resend is already wired there). Needs a Stripe account + webhook secret + price→tier mapping.
3. **Stripe Checkout** links/buttons for the two paid tiers.

---

## iOS / Android (❌ not started — needs accounts + devices)

These can't be built or verified in this environment (native modules, store
accounts, real devices). Outline:

- **iOS — StoreKit 2.** Non-consumable products `major_ambience.minor` / `.major`.
  Read `Transaction.currentEntitlements` at launch, map product → tier, feed the
  resolver. Restore purchases is built in to StoreKit 2. Expo: a config plugin +
  `expo-store-kit` or a custom native module (the repo's `apps/mobile/AGENTS.md`
  insists on the versioned Expo docs — check SDK 56 support before picking).
  **Apple may require Sign in with Apple** if any other login is offered — see
  CLOUD_SYNC.md D2; relevant once sync sign-in ships on iOS.
- **Android — Play Billing.** One-time products, same product ids. Query
  `BillingClient` purchases at launch, acknowledge, map → tier, feed the resolver.
- Both: a thin `apps/mobile/src/lib/entitlement.ts` mirroring desktop's — register
  the resolver from the store entitlement instead of a license key.

---

## External setup checklist

- [ ] Stripe account + products/prices for `minor` / `major`; webhook signing secret.
- [ ] Issuer RSA keypair; private key in issuer secrets; public JWK embedded in the desktop app.
- [ ] Issuer route in `cloud/worker` (Stripe webhook → `issueLicenseKey` → Resend email).
- [ ] App Store Connect: paid app agreement, in-app products, sandbox testers.
- [ ] Play Console: merchant account, in-app products, license testers.
- [ ] **Cutover:** flip `BETA_TIER` `"major"` → `"demo"` in `entitlements.ts` and announce in CHANGELOG.

---

## Verification status

- ✅ `license.ts` + the resolver seam — 14 unit tests, run in CI.
- ✅ Desktop wiring — typecheck + `vite build`.
- ❌ Real purchase flows — blocked on the accounts above; not runtime-verified.
