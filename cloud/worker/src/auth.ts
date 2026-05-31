// Magic-link auth. Two routes:
//
//   POST /v1/auth/request    { email }            → 204
//   GET  /v1/auth/callback?token=<nonce>          → 200 { sessionToken }
//
// Flow: `request` mints a single-use nonce, stashes it in KV (15-min TTL)
// against the normalised email, and mails it. `callback` redeems the nonce
// (delete-on-read so it can't be replayed) and returns a session JWT.

import { error, json, noContent } from "./http.js";
import { signSession } from "./jwt.js";
import type { Deps, Env } from "./types.js";

/** Magic-link nonces live 15 minutes. */
const NONCE_TTL_SECONDS = 15 * 60;
/** Session tokens live 90 days; the client re-links via email after that. */
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

export async function handleAuthRequest(
  req: Request,
  env: Env,
  deps: Deps,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "Body must be JSON.");
  }
  const email = normaliseEmail((body as { email?: unknown })?.email);
  if (!email) return error(400, "A valid email is required.");

  const token = deps.randomToken();
  await env.AUTH.put(`magic:${token}`, email, {
    expirationTtl: NONCE_TTL_SECONDS,
  });

  // Even if mail delivery fails we don't leak that to the caller beyond a
  // 5xx — but we DO want the nonce gone-on-failure to avoid orphans. Resend
  // failures throw; let them bubble to the top-level 500 handler. The TTL
  // reaps the nonce regardless.
  await deps.sendEmail(env, email, token);

  // 204 regardless of whether the email exists — don't reveal account
  // existence to an unauthenticated caller.
  return noContent(204);
}

export async function handleAuthCallback(
  url: URL,
  env: Env,
  deps: Deps,
): Promise<Response> {
  const token = url.searchParams.get("token");
  if (!token) return error(400, "Missing token.");

  const key = `magic:${token}`;
  const email = await env.AUTH.get(key, "text");
  if (!email) {
    // Unknown / expired / already-redeemed nonce.
    return error(401, "Invalid or expired token.");
  }
  // Single-use: redeem before minting so a replay can't double-spend.
  await env.AUTH.delete(key);

  const sessionToken = await signSession(
    email,
    env.JWT_SECRET,
    deps.now(),
    SESSION_TTL_SECONDS,
  );
  return json(200, { sessionToken });
}
