// Best-effort URL classifier for the References panel. Pasted URL →
// {kind, suggestedTitle?}. No network calls; pure parsing of the URL
// path / query. Heuristic only — the user can always edit the title
// after paste.
//
// Supported recognition:
//   - YouTube watch links (youtube.com/watch?v=…, youtu.be/…,
//     youtube.com/results?search_query=… — used by the DnD guide).
//   - Spotify open URLs (open.spotify.com/track/…, /playlist/…,
//     /album/…, and the guide's /search/… form).
//   - Anything else falls through to "other"; the row still saves
//     with the URL intact.

export type ReferenceUrlKind = "youtube" | "spotify" | "other";

export type ParsedReferenceUrl = {
  kind: ReferenceUrlKind;
  /** Best-effort title hint. May be empty — caller should treat as
   *  a placeholder, not authoritative. */
  suggestedTitle: string;
};

export function parseReferenceUrl(input: string): ParsedReferenceUrl {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "other", suggestedTitle: "" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: "other", suggestedTitle: "" };
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("youtube.com") || host === "youtu.be") {
    // results?search_query=... is the form the DnD guide uses; the
    // query itself is the closest thing to a human-readable title.
    const search = url.searchParams.get("search_query");
    if (search) {
      return { kind: "youtube", suggestedTitle: prettify(search) };
    }
    // /watch?v=… → no inline title; user fills it in.
    return { kind: "youtube", suggestedTitle: "" };
  }

  if (host.includes("spotify.com")) {
    // /search/<query> → grab the query off the path.
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "search" && parts[1]) {
      return { kind: "spotify", suggestedTitle: prettify(parts[1]) };
    }
    return { kind: "spotify", suggestedTitle: "" };
  }

  return { kind: "other", suggestedTitle: "" };
}

/** Convert a URL-encoded search query into something readable.
 *  "One+Winged+Angel+Nobuo+Uematsu" → "One Winged Angel Nobuo Uematsu". */
function prettify(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " ")).trim();
  } catch {
    return s.replace(/\+/g, " ").trim();
  }
}
