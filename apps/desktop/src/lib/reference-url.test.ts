import { describe, expect, it } from "vitest";
import { parseReferenceUrl } from "./reference-url";

describe("parseReferenceUrl", () => {
  describe("empty + malformed", () => {
    it("returns other/empty for the empty string", () => {
      expect(parseReferenceUrl("")).toEqual({
        kind: "other",
        suggestedTitle: "",
      });
    });

    it("trims whitespace before classifying", () => {
      expect(parseReferenceUrl("   ")).toEqual({
        kind: "other",
        suggestedTitle: "",
      });
    });

    it("returns other/empty for a non-URL string", () => {
      expect(parseReferenceUrl("not a url")).toEqual({
        kind: "other",
        suggestedTitle: "",
      });
    });

    it("returns other/empty for an http URL on an unknown host", () => {
      expect(parseReferenceUrl("https://example.com/song")).toEqual({
        kind: "other",
        suggestedTitle: "",
      });
    });
  });

  describe("YouTube", () => {
    it("recognises a classic watch URL with no title hint", () => {
      expect(
        parseReferenceUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      ).toEqual({ kind: "youtube", suggestedTitle: "" });
    });

    it("recognises a youtu.be short link", () => {
      expect(parseReferenceUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
        kind: "youtube",
        suggestedTitle: "",
      });
    });

    it("extracts the search query as a title hint (DnD-guide form)", () => {
      const result = parseReferenceUrl(
        "https://www.youtube.com/results?search_query=One+Winged+Angel+Nobuo+Uematsu",
      );
      expect(result).toEqual({
        kind: "youtube",
        suggestedTitle: "One Winged Angel Nobuo Uematsu",
      });
    });

    it("decodes percent-encoded characters in the search query", () => {
      const result = parseReferenceUrl(
        "https://www.youtube.com/results?search_query=He%27s+a+Pirate+Hans+Zimmer",
      );
      expect(result).toEqual({
        kind: "youtube",
        suggestedTitle: "He's a Pirate Hans Zimmer",
      });
    });

    it("accepts host variants (m.youtube.com)", () => {
      expect(
        parseReferenceUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
      ).toEqual({ kind: "youtube", suggestedTitle: "" });
    });
  });

  describe("Spotify", () => {
    it("recognises a track URL with no title hint", () => {
      expect(
        parseReferenceUrl(
          "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
        ),
      ).toEqual({ kind: "spotify", suggestedTitle: "" });
    });

    it("recognises a playlist URL", () => {
      expect(
        parseReferenceUrl(
          "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        ),
      ).toEqual({ kind: "spotify", suggestedTitle: "" });
    });

    it("recognises an album URL", () => {
      expect(
        parseReferenceUrl(
          "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
        ),
      ).toEqual({ kind: "spotify", suggestedTitle: "" });
    });

    it("extracts the search query from the guide's /search/<query> form", () => {
      const result = parseReferenceUrl(
        "https://open.spotify.com/search/One+Winged+Angel+Nobuo+Uematsu",
      );
      expect(result).toEqual({
        kind: "spotify",
        suggestedTitle: "One Winged Angel Nobuo Uematsu",
      });
    });

    it("decodes percent-encoded characters in the search path", () => {
      const result = parseReferenceUrl(
        "https://open.spotify.com/search/He%27s+a+Pirate+Hans+Zimmer",
      );
      expect(result).toEqual({
        kind: "spotify",
        suggestedTitle: "He's a Pirate Hans Zimmer",
      });
    });
  });

  describe("falls through cleanly", () => {
    it("returns kind=other for a SoundCloud URL (not specially recognised)", () => {
      expect(
        parseReferenceUrl("https://soundcloud.com/artist/track"),
      ).toEqual({ kind: "other", suggestedTitle: "" });
    });

    it("survives a malformed percent-encoded sequence without throwing", () => {
      // %ZZ isn't valid hex — decodeURIComponent would throw; the
      // helper's catch path returns the raw (+→space) string instead
      // of letting the URL classification fail.
      const result = parseReferenceUrl(
        "https://www.youtube.com/results?search_query=bad%ZZ+input",
      );
      expect(result.kind).toBe("youtube");
      expect(result.suggestedTitle).toContain("bad");
    });
  });
});
