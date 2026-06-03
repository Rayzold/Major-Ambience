// Router + Worker entrypoint. `handle()` is the pure, testable core
// (request + env + injected deps → response); the default export wires the
// production deps and forwards. Top-level try/catch maps any unhandled
// throw (e.g. a Resend or KV failure) to a 500 so the client's retry path
// (SyncServerError) kicks in rather than leaking a stack trace.

import { handleAuthCallback, handleAuthRequest } from "./auth.js";
import { handleGetBlob, handlePutBlob } from "./blob.js";
import { error, preflight } from "./http.js";
import { sendMagicLinkEmail } from "./email.js";
import type { Deps, Env, ExecutionContext } from "./types.js";

export async function handle(
  req: Request,
  env: Env,
  deps: Deps,
): Promise<Response> {
  if (req.method === "OPTIONS") return preflight();

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path === "/v1/auth/request" && req.method === "POST") {
      return await handleAuthRequest(req, env, deps);
    }
    if (path === "/v1/auth/callback" && req.method === "GET") {
      return await handleAuthCallback(url, env, deps);
    }
    if (path === "/v1/blob" && req.method === "GET") {
      return await handleGetBlob(req, env, deps);
    }
    if (path === "/v1/blob" && req.method === "PUT") {
      return await handlePutBlob(req, env, deps);
    }
    // Lightweight liveness probe — handy for uptime checks, leaks nothing.
    if (path === "/" || path === "/health") {
      return new Response("ok", { status: 200 });
    }
    return error(404, "Not found.");
  } catch (err) {
    console.error("unhandled error", err);
    return error(500, "Internal error.");
  }
}

/** Production dependency wiring. */
function productionDeps(): Deps {
  return {
    now: () => Date.now(),
    // 256 bits of entropy, URL-safe (no padding) so it survives a query string.
    randomToken: () => {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      let s = "";
      for (const b of bytes) s += b.toString(16).padStart(2, "0");
      return s;
    },
    sendEmail: sendMagicLinkEmail,
  };
}

export default {
  fetch(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return handle(req, env, productionDeps());
  },
};
