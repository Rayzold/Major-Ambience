// Favorites pseudo-view — every S- or A-graded track across all
// categories, "removed" excluded. Sorted S-first, then alphabetically.
// Mirrors apps/desktop/src/Library.tsx's `favorites` view.

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY, FONT_MONO } from "../src/tokens";
import { Glyph } from "../src/Glyph";
import { getDb } from "../src/data/db";
import { listFavorites } from "../src/data/tracks-repo";
import { playTrack, usePlayer } from "../src/audio/store";

export default function FavoritesScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { nowPlaying } = usePlayer();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const list = await listFavorites(db);
          if (!cancelled) {
            setTracks(list);
            setLoading(false);
          }
        } catch (err) {
          console.error("favorites load failed:", err);
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: T.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={T.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: `${T.gold}22`,
              borderWidth: 1,
              borderColor: `${T.gold}66`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph name="spark" size={22} color={T.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 24,
                fontWeight: "600",
                color: T.ink,
              }}
            >
              Favorites
            </Text>
            <Text style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
              Every S- and A-graded track · {tracks.length}
            </Text>
          </View>
        </View>
      </View>

      {tracks.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: T.ink3,
              fontStyle: "italic",
              lineHeight: 19,
              fontSize: 13,
            }}
          >
            Nothing yet — grade a track S or A from a category view and it'll
            land here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <FavoriteRow
              track={item}
              active={nowPlaying?.id === item.id}
              onPress={() => {
                void playTrack(item, tracks);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function FavoriteRow({
  track,
  active,
  onPress,
}: {
  track: Track;
  active: boolean;
  onPress: () => void;
}) {
  const meta = CATEGORIES.find((c) => c.id === track.category);
  const accent = meta?.color ?? T.gold;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: active
          ? `${accent}14`
          : pressed
            ? T.bgCard
            : "transparent",
        borderLeftColor: active ? accent : "transparent",
        borderLeftWidth: 3,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: `${accent}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Glyph name={meta?.glyph ?? "spark"} size={14} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            color: active ? accent : T.ink,
            fontSize: 14,
            fontWeight: active ? "600" : "500",
          }}
        >
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ color: T.ink3, fontSize: 11, marginTop: 2 }}
        >
          {meta?.name ?? "Unknown"}
          {track.pack ? ` · ${track.pack}` : ""}
        </Text>
      </View>
      {track.grade && (
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: "700",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 5,
            backgroundColor: `${T.gold}22`,
            color: T.gold,
            borderWidth: 1,
            borderColor: `${T.gold}55`,
          }}
        >
          {track.grade}
        </Text>
      )}
    </Pressable>
  );
}
