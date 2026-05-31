// Response helpers + CORS. Centralised so every route emits the same
// headers and the contract (status codes + JSON shape) stays in one place.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function noContent(status = 204): Response {
  return new Response(null, { status, headers: CORS_HEADERS });
}

/** Reply to a CORS preflight. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** A 4xx/5xx with a small JSON `{ error }` body for debuggability. */
export function error(status: number, message: string): Response {
  return json(status, { error: message });
}
