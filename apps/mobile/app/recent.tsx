// Recently-played pseudo-view — tracks with last_played_at set,
// newest first, capped at 25. "removed" excluded. Mirrors
// apps/desktop/src/Library.tsx's `recent` view.

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
import { T, FONT_DISPLAY } from "../src/tokens";
import { Glyph } from "../src/Glyph";
import { getDb } from "../src/data/db";
import { listRecentlyPlayed } from "../src/data/tracks-repo";
import { playTrack, usePlayer } from "../src/audio/store";

const NOW_SEC = () => Math.floor(Date.now() / 1000);

function relativePlayed(unixSec: number | undefined): string {
  if (!unixSec) return "";
  const diff = NOW_SEC() - unixSec;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 86400 / 7)}w ago`;
}

export default function RecentScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { nowPlaying } = usePlayer();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const list = await listRecentlyPlayed(db, 25);
          if (!cancelled) {
            setTracks(list);
            setLoading(false);
          }
        } catch (err) {
          console.error("recent load failed:", err);
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
              backgroundColor: T.bgChip,
              borderWidth: 1,
              borderColor: T.rule,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph name="clock" size={22} color={T.ink2} />
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
              Recently played
            </Text>
            <Text style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
              Newest first · last {tracks.length}
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
            Nothing yet — play a track and it'll show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <RecentRow
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

function RecentRow({
  track,
  active,
  onPress,
}: {
  track: Track;
  active: boolean;
  onPress: () => void;
}) {
  const meta = CATEGORIES.find((c) => c.id === track.category);
  const accent = meta?.color ?? T.ink2;
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
          {track.lastPlayedAt ? ` · ${relativePlayed(track.lastPlayedAt)}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}
