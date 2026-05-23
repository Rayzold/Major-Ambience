// Library tab. Tile grid keyed to the shared CATEGORIES table, plus an
// Import button in the header that drives the expo-document-picker flow
// (apps/mobile/src/lib/import.ts) and persists tracks via expo-sqlite.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { countByCategory, countTracks } from "../../src/data/tracks-repo";
import { importTracks } from "../../src/lib/import";

export default function LibraryScreen() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    const db = await getDb();
    const [byCat, t] = await Promise.all([countByCategory(db), countTracks(db)]);
    setCounts(byCat);
    setTotal(t);
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      console.error("Library refresh failed:", err);
    });
  }, [refresh]);

  const handleImport = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importTracks();
      if (!result.cancelled && result.imported > 0) {
        await refresh();
        Alert.alert(
          "Imported",
          `${result.imported} track${result.imported === 1 ? "" : "s"} added to your library.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Import failed", message);
    } finally {
      setImporting(false);
    }
  }, [importing, refresh]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
            TONIGHT&apos;S
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
            Library
          </Text>
        </View>
        <ImportButton onPress={handleImport} loading={importing} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 12, color: T.ink2, lineHeight: 18 }}>
          {total === 0
            ? "No tracks yet — tap Import to add audio from Files, iCloud Drive, or Downloads. Categorization happens automatically."
            : `${total} track${total === 1 ? "" : "s"} imported. Tap a category to see what landed there.`}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {CATEGORIES.map((c) => (
          <CategoryTile
            key={c.id}
            color={c.color}
            dark={c.dark}
            name={c.name}
            desc={c.desc}
            glyph={c.glyph}
            count={counts[c.id] ?? 0}
          />
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ImportButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: pressed ? T.goldEdge : T.goldSoft,
        borderColor: T.goldEdge,
        borderWidth: 1,
        opacity: loading ? 0.6 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={T.gold} />
      ) : (
        <Glyph name="folder" size={14} color={T.gold} />
      )}
      <Text style={{ color: T.gold, fontSize: 13, fontWeight: "600" }}>
        {loading ? "Importing…" : "Import"}
      </Text>
    </Pressable>
  );
}

function CategoryTile({
  color,
  dark,
  name,
  desc,
  glyph,
  count,
}: {
  color: string;
  dark: string;
  name: string;
  desc: string;
  glyph: string;
  count: number;
}) {
  return (
    <Pressable
      style={{
        width: "47%",
        backgroundColor: dark,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: `${color}33`,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${color}33`,
            borderWidth: 1,
            borderColor: `${color}66`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Glyph name={glyph} size={20} color={color} />
        </View>
        {count > 0 ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color,
              letterSpacing: 0.5,
            }}
          >
            {count}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: "600",
          color: T.ink,
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: T.ink2,
          marginTop: 4,
          lineHeight: 15,
        }}
        numberOfLines={2}
      >
        {desc}
      </Text>
    </Pressable>
  );
}
