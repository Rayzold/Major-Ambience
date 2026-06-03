// Desktop entitlement wiring — the IAP seam (PR-8, docs/IAP.md).
//
// `@mc/core`'s `currentTier()` reads from a resolver we register here. The
// resolver returns `maxTier(BETA_TIER, purchasedTier)`: during the beta
// BETA_TIER is "major" so nothing is gated yet (docs/CLOUD_SYNC.md D3); at
// the launch cutover BETA_TIER drops to "demo" and the purchased tier — set
// by a verified license key — takes over with no change to this file.
//
// Desktop monetization is the "buy on the web → emailed license key" path:
// the user pastes a key, we verify it offline against the embedded issuer
// public key, and persist the unlocked tier. iOS/Android entitle through
// StoreKit / Play Billing instead (see docs/IAP.md), which is why this
// lives in the desktop app and not in @mc/core.

import {
  BETA_TIER,
  maxTier,
  setTierResolver,
  verifyLicenseKey,
  type LicenseClaims,
  type Tier,
} from "@mc/core";
import { getConfig, getDb, setConfig } from "@mc/data";

const TIER_KEY = "entitlement_tier";
const LICENSE_KEY_KEY = "entitlement_license_key";
const EMAIL_KEY = "entitlement_email";

/**
 * Public half of the issuer keypair. PLACEHOLDER — replace with the real
 * exported JWK when the Stripe issuer is stood up (docs/IAP.md "Issuer").
 * Until then every key fails verification (the invalid modulus throws on
 * import, which `verifyLicenseKey` swallows to `null`), so no license can
 * be applied — correct, since none can be legitimately issued yet either.
 */
const ISSUER_PUBLIC_JWK: JsonWebKey = {
  kty: "RSA",
  n: "REPLACE_WITH_ISSUER_PUBLIC_KEY_MODULUS",
  e: "AQAB",
  alg: "RS256",
  ext: true,
};

const KNOWN_TIERS: readonly Tier[] = ["demo", "minor", "major"];

let _purchasedTier: Tier = "demo";

/** Read the persisted tier and register the resolver. Call once at boot. */
export async function loadEntitlement(): Promise<void> {
  try {
    const stored = (await getConfig(await getDb(), TIER_KEY)) as Tier | undefined;
    _purchasedTier = stored && KNOWN_TIERS.includes(stored) ? stored : "demo";
  } catch (err) {
    console.error("[entitlement] load failed:", err);
    _purchasedTier = "demo";
  }
  setTierResolver(() => maxTier(BETA_TIER, _purchasedTier));
}

/** The tier the user has actually paid for (independent of the beta grant). */
export function purchasedTier(): Tier {
  return _purchasedTier;
}

export async function getLicenseEmail(): Promise<string | undefined> {
  return (await getConfig(await getDb(), EMAIL_KEY)) || undefined;
}

export type ApplyLicenseResult =
  | { ok: true; claims: LicenseClaims }
  | { ok: false; reason: string };

/** Verify a pasted license key and, if valid, persist the unlocked tier. */
export async function applyLicenseKey(key: string): Promise<ApplyLicenseResult> {
  const claims = await verifyLicenseKey(key.trim(), ISSUER_PUBLIC_JWK);
  if (!claims) {
    return { ok: false, reason: "That license key isn't valid for this app." };
  }
  const db = await getDb();
  await setConfig(db, TIER_KEY, claims.tier);
  await setConfig(db, LICENSE_KEY_KEY, key.trim());
  if (claims.email) await setConfig(db, EMAIL_KEY, claims.email);
  _purchasedTier = claims.tier;
  return { ok: true, claims };
}

/** Forget a stored license (e.g. moving the license to another machine). */
export async function clearLicense(): Promise<void> {
  const db = await getDb();
  await setConfig(db, TIER_KEY, "demo");
  await setConfig(db, LICENSE_KEY_KEY, "");
  await setConfig(db, EMAIL_KEY, "");
  _purchasedTier = "demo";
}
