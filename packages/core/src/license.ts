// Offline license-key verification for the desktop "buy on the web →
// emailed license key → app verifies locally" path (docs/IAP.md).
//
// A license key is an RS256-signed token: `<header>.<payload>.<sig>`,
// base64url throughout. The issuer (a Stripe webhook handler) signs with a
// PRIVATE key; the app verifies with the matching embedded PUBLIC key — so
// verification needs no network call and ships no shared secret. Asymmetric
// is the whole point: a symmetric HMAC key in the client could be lifted to
// mint free licenses.
//
// iOS / Android do NOT use this — they entitle through StoreKit / Play
// Billing (docs/IAP.md). This module is platform-neutral pure logic and
// only touches WebCrypto *inside* the functions, so importing it on a
// runtime without `crypto.subtle` (e.g. React Native) is harmless as long
// as it isn't called there.

import type { Tier } from "./entitlements.js";
import { TIERS } from "./entitlements.js";

export type LicenseClaims = {
  /** Tier this license unlocks. */
  tier: Tier;
  /** Email the license was issued to (display + support). */
  email?: string;
  /** Issued-at, ms since epoch. */
  iat: number;
  /** Optional expiry, ms since epoch. Omit for a perpetual license. */
  exp?: number;
};

const ALG = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;
const HEADER = { alg: "RS256", typ: "LIC" } as const;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToB64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64URL[b0 >> 2];
    out += B64URL[((b0 & 0b11) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += B64URL[((b1 & 0b1111) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += B64URL[b2 & 0b111111];
  }
  return out;
}

function b64urlToBytes(s: string): Uint8Array {
  const lookup = new Map<string, number>();
  for (let i = 0; i < B64URL.length; i++) lookup.set(B64URL[i]!, i);
  const out: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const ch of s) {
    const v = lookup.get(ch);
    if (v === undefined) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

const strToB64url = (s: string): string => bytesToB64url(encoder.encode(s));
const b64urlToStr = (s: string): string => decoder.decode(b64urlToBytes(s));

/**
 * Mint a license key. The ISSUER side — needs the RSA private key, so this
 * runs in the Stripe webhook handler (or in tests), never in the shipped
 * app. Exported because it's harmless: a client can't sign without the
 * private key.
 */
export async function issueLicenseKey(
  claims: LicenseClaims,
  privateKey: CryptoKey,
): Promise<string> {
  const headerB64 = strToB64url(JSON.stringify(HEADER));
  const payloadB64 = strToB64url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await crypto.subtle.sign(ALG, privateKey, encoder.encode(signingInput));
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

/**
 * Verify a license key against the embedded public key. Returns the claims
 * on success, or `null` for ANY failure (bad shape, wrong alg, bad
 * signature, malformed/invalid-tier payload, expired, unimportable key).
 * Never throws and never reveals *why* it failed.
 */
export async function verifyLicenseKey(
  key: string,
  publicKeyJwk: JsonWebKey,
  now: number = Date.now(),
): Promise<LicenseClaims | null> {
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

    const header = JSON.parse(b64urlToStr(headerB64)) as { alg?: string };
    if (header.alg !== "RS256") return null;

    const pubKey = await crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      ALG,
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      ALG,
      pubKey,
      b64urlToBytes(sigB64),
      encoder.encode(`${headerB64}.${payloadB64}`),
    );
    if (!ok) return null;

    const claims = JSON.parse(b64urlToStr(payloadB64)) as LicenseClaims;
    if (
      typeof claims?.tier !== "string" ||
      !TIERS.includes(claims.tier) ||
      typeof claims?.iat !== "number"
    ) {
      return null;
    }
    if (typeof claims.exp === "number" && claims.exp <= now) return null;
    return claims;
  } catch {
    return null;
  }
}
