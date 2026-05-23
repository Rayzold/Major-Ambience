// Search tab. Live FTS5 prefix search across the imported library —
// same query shape as the desktop spotlight overlay.

import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { searchTracks } from "../../src/data/tracks-repo";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const db = await getDb();
        const found = await searchTracks(db, query, 80);
        if (!cancelled) setResults(found);
      } catch (err) {
        console.error("Search failed:", err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
          FIND
        </Text>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 38,
            fontWeight: "600",
            color: T.ink,
            marginTop: 2,
          }}
        >
          Search
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, pack, or notes…"
          placeholderTextColor={T.ink3}
          autoCorrect={false}
          autoCapitalize="none"
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            backgroundColor: T.bgCard,
            borderColor: T.rule,
            borderWidth: 1,
            color: T.ink,
            fontSize: 15,
          }}
        />
      </View>

      {query.trim().length < 2 ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 12, color: T.ink3, fontStyle: "italic", lineHeight: 18 }}>
            Type at least 2 letters. Search uses the same FTS5 prefix-match
            as desktop — multi-word queries AND together.
          </Text>
        </View>
      ) : null}

      {searching && results.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 12, color: T.ink3 }}>Searching…</Text>
        </View>
      ) : null}

      {!searching && query.trim().length >= 2 && results.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 12, color: T.ink3 }}>No matches.</Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        renderItem={({ item }) => <ResultRow track={item} />}
      />
    </View>
  );
}

function ResultRow({ track }: { track: Track }) {
  const meta = CATEGORIES.find((c) => c.id === track.category);
  const color = meta?.color ?? T.ink2;
  const glyph = meta?.glyph ?? "spark";
  return (
    <Pressable
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 10,
        marginVertical: 3,
        backgroundColor: pressed ? T.bgCard : "transparent",
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: `${color}22`,
          borderWidth: 1,
          borderColor: `${color}44`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Glyph name={glyph} size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ color: T.ink, fontSize: 14, fontWeight: "500" }}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text
          style={{ color: T.ink3, fontSize: 11, marginTop: 2 }}
          numberOfLines={1}
        >
          {track.pack || "—"}
          {track.subcategory ? ` · ${track.subcategory}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}
