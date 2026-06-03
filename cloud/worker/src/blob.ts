// Blob storage. The Worker is deliberately dumb: it stores whatever blob
// the client pushes and hands it back on pull. All merge logic lives
// client-side in `@mc/core`'s `mergeSyncBlobs` (the client pulls, merges,
// then pushes the result). The server's only authority is the `updatedAt`
// timestamp — it stamps server-receive time so two clients with skewed
// clocks still agree on ordering (docs/CLOUD_SYNC.md "clock skew" row).
//
//   GET /v1/blob   → 200 { blob, updatedAt } | 404 (no blob yet)
//   PUT /v1/blob   { blob } → 200 { updatedAt }

import { error, json } from "./http.js";
import { verifySession } from "./jwt.js";
import type { BlobRecord, Deps, Env } from "./types.js";

/** Resolve the caller's subject from the Bearer token, or null. */
async function authenticate(
  req: Request,
  env: Env,
  deps: Deps,
): Promise<string | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const claims = await verifySession(token, env.JWT_SECRET, deps.now());
  return claims?.sub ?? null;
}

export async function handleGetBlob(
  req: Request,
  env: Env,
  deps: Deps,
): Promise<Response> {
  const sub = await authenticate(req, env, deps);
  if (!sub) return error(401, "Not signed in.");

  const record = await env.BLOBS.get<BlobRecord>(`blob:${sub}`, "json");
  if (!record) return error(404, "No blob for this account yet.");

  return json(200, { blob: record.blob, updatedAt: record.updatedAt });
}

export async function handlePutBlob(
  req: Request,
  env: Env,
  deps: Deps,
): Promise<Response> {
  const sub = await authenticate(req, env, deps);
  if (!sub) return error(401, "Not signed in.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "Body must be JSON.");
  }
  const blob = (body as { blob?: unknown })?.blob;
  // Light validation only — the server doesn't understand the blob schema,
  // but it must reject obvious garbage so a pull never returns a non-object.
  if (typeof blob !== "object" || blob === null) {
    return error(422, "Body must be { blob: <object> }.");
  }

  const updatedAt = deps.now();
  const record: BlobRecord = { blob, updatedAt };
  await env.BLOBS.put(`blob:${sub}`, JSON.stringify(record));

  return json(200, { updatedAt });
}
