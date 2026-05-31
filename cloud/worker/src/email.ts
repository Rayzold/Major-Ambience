// Magic-link delivery via Resend. When no API key is configured the Worker
// logs the code instead of mailing — that's the documented dev fallback
// (docs/CLOUD_SYNC.md "Risks" row: a copy-paste code path that doesn't
// depend on deliverability).

import type { Env } from "./types.js";

function magicLink(env: Env, token: string): string {
  const base = (env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/v1/auth/callback?token=${encodeURIComponent(token)}`;
}

export async function sendMagicLinkEmail(
  env: Env,
  to: string,
  token: string,
): Promise<void> {
  const link = magicLink(env, token);

  if (!env.RESEND_API_KEY) {
    // Dev fallback. Never log the token in production — guarded by the key.
    console.log(`[dev] magic-link for ${to}: code=${token} link=${link}`);
    return;
  }

  const html = `
    <p>Tap the button to sign in to <strong>Major Ambience</strong> on this device:</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#5b3fa0;color:#fff;border-radius:8px;text-decoration:none">Sign in</a></p>
    <p>Or paste this code into the app:</p>
    <p style="font:600 20px ui-monospace,monospace;letter-spacing:2px">${token}</p>
    <p style="color:#888;font-size:12px">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM ?? "Major Ambience <login@majorambience.app>",
      to,
      subject: "Your Major Ambience sign-in link",
      html,
    }),
  });

  if (!res.ok) {
    // Surface as a 5xx upstream; the client retries transient failures.
    throw new Error(`Resend returned ${res.status}`);
  }
}
