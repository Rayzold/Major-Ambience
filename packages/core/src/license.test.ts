// License-key verification + the entitlement resolver seam (PR-8).

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  BETA_TIER,
  currentTier,
  maxTier,
  setTierOverride,
  setTierResolver,
  tierRank,
  type Tier,
} from "./entitlements.js";
import { issueLicenseKey, verifyLicenseKey, type LicenseClaims } from "./license.js";

// A throwaway keypair for the suite. `issueLicenseKey` plays the issuer
// (Stripe webhook); `verifyLicenseKey` plays the shipped app.
let privateKey: CryptoKey;
let publicJwk: JsonWebKey;
let wrongPublicJwk: JsonWebKey;

async function genKeypair() {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  return pair as CryptoKeyPair;
}

beforeAll(async () => {
  const pair = await genKeypair();
  privateKey = pair.privateKey;
  publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const other = await genKeypair();
  wrongPublicJwk = await crypto.subtle.exportKey("jwk", other.publicKey);
});

afterEach(() => {
  setTierOverride(null);
  setTierResolver(null);
});

describe("license keys — happy path", () => {
  it("verifies a freshly issued key and returns the claims", async () => {
    const claims: LicenseClaims = { tier: "major", email: "gm@example.com", iat: 1000 };
    const key = await issueLicenseKey(claims, privateKey);
    const out = await verifyLicenseKey(key, publicJwk);
    expect(out).toEqual(claims);
  });

  it("accepts a perpetual license (no exp)", async () => {
    const key = await issueLicenseKey({ tier: "minor", iat: 1 }, privateKey);
    expect(await verifyLicenseKey(key, publicJwk)).not.toBeNull();
  });

  it("accepts a not-yet-expired license", async () => {
    const key = await issueLicenseKey({ tier: "major", iat: 0, exp: 10_000 }, privateKey);
    expect(await verifyLicenseKey(key, publicJwk, 9_999)).not.toBeNull();
  });
});

describe("license keys — rejection", () => {
  it("rejects a tampered payload", async () => {
    const key = await issueLicenseKey({ tier: "demo", iat: 1 }, privateKey);
    const [h, , s] = key.split(".");
    // Swap the payload for a forged 'major' grant; signature no longer matches.
    const forged = btoa(JSON.stringify({ tier: "major", iat: 1 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyLicenseKey(`${h}.${forged}.${s}`, publicJwk)).toBeNull();
  });

  it("rejects a key signed by a different issuer", async () => {
    const key = await issueLicenseKey({ tier: "major", iat: 1 }, privateKey);
    expect(await verifyLicenseKey(key, wrongPublicJwk)).toBeNull();
  });

  it("rejects an expired license", async () => {
    const key = await issueLicenseKey({ tier: "major", iat: 0, exp: 5_000 }, privateKey);
    expect(await verifyLicenseKey(key, publicJwk, 5_001)).toBeNull();
  });

  it("rejects an unknown tier", async () => {
    const key = await issueLicenseKey(
      { tier: "epic" as Tier, iat: 1 },
      privateKey,
    );
    expect(await verifyLicenseKey(key, publicJwk)).toBeNull();
  });

  it("rejects garbage / wrong-shape input without throwing", async () => {
    expect(await verifyLicenseKey("not-a-key", publicJwk)).toBeNull();
    expect(await verifyLicenseKey("a.b.c", publicJwk)).toBeNull();
    expect(await verifyLicenseKey("", publicJwk)).toBeNull();
  });
});

describe("entitlement resolver seam", () => {
  it("falls back to BETA_TIER when no resolver is set", () => {
    expect(currentTier()).toBe(BETA_TIER);
  });

  it("reads from the registered resolver", () => {
    setTierResolver(() => "minor");
    expect(currentTier()).toBe("minor");
  });

  it("falls back to BETA_TIER when the resolver returns null", () => {
    setTierResolver(() => null);
    expect(currentTier()).toBe(BETA_TIER);
  });

  it("test override beats the resolver", () => {
    setTierResolver(() => "demo");
    setTierOverride("major");
    expect(currentTier()).toBe("major");
  });
});

describe("tier ordering", () => {
  it("ranks demo < minor < major", () => {
    expect(tierRank("demo")).toBeLessThan(tierRank("minor"));
    expect(tierRank("minor")).toBeLessThan(tierRank("major"));
  });

  it("maxTier picks the more-unlocked tier", () => {
    expect(maxTier("demo", "major")).toBe("major");
    expect(maxTier("minor", "demo")).toBe("minor");
    expect(maxTier("major", "major")).toBe("major");
  });
});
