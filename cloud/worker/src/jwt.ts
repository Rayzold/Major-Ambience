// Minimal HS256 JWT, implemented on the Web Crypto API so it runs
// unchanged on the Workers runtime and under Node (vitest). No external
// dependency — a JWT lib would be larger than this and add a supply-chain
// surface for a single algorithm we fully control.

import type { SessionClaims } from "./types.js";

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
    if (v === undefined) continue; // ignore stray padding / whitespace
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function strToB64url(s: string): string {
  return bytesToB64url(encoder.encode(s));
}

function b64urlToStr(s: string): string {
  return decoder.decode(b64urlToBytes(s));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmac(signingInput: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingInput),
  );
  return bytesToB64url(new Uint8Array(sig));
}

/** Length-checked constant-time string compare. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const HEADER_B64 = strToB64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

/**
 * Sign a session token. `sub` is the user's email; the token lives for
 * `ttlSeconds` from `nowMs`.
 */
export async function signSession(
  sub: string,
  secret: string,
  nowMs: number,
  ttlSeconds: number,
): Promise<string> {
  const iat = Math.floor(nowMs / 1000);
  const claims: SessionClaims = { sub, iat, exp: iat + ttlSeconds };
  const payloadB64 = strToB64url(JSON.stringify(claims));
  const signingInput = `${HEADER_B64}.${payloadB64}`;
  const sig = await hmac(signingInput, secret);
  return `${signingInput}.${sig}`;
}

/**
 * Verify a token's signature and expiry. Returns the claims on success,
 * or `null` for any failure (bad shape, bad signature, expired). Callers
 * map `null` to 401 — we never leak *why* verification failed.
 */
export async function verifySession(
  token: string,
  secret: string,
  nowMs: number,
): Promise<SessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sig] = parts as [string, string, string];

  const expected = await hmac(`${headerB64}.${payloadB64}`, secret);
  if (!timingSafeEqual(sig, expected)) return null;

  let claims: SessionClaims;
  try {
    claims = JSON.parse(b64urlToStr(payloadB64)) as SessionClaims;
  } catch {
    return null;
  }
  if (
    typeof claims?.sub !== "string" ||
    typeof claims?.exp !== "number" ||
    typeof claims?.iat !== "number"
  ) {
    return null;
  }
  if (claims.exp * 1000 <= nowMs) return null; // expired
  return claims;
}
