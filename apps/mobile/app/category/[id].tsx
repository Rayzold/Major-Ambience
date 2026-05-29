// Category detail — list of all tracks in this category, tap-to-play.
// Tapping a row hands the full visible list to the player so the next
// track auto-advances when the current one finishes. Mirrors desktop
// row-click-fills-queue behavior.

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import type { Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { listTracksByCategory } from "../../src/data/tracks-repo";
import { playTrack, usePlayer } from "../../src/audio/store";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const meta = useMemo(() => CATEGORIES.find((c) => c.id === id), [id]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { nowPlaying } = usePlayer();

  useEffect(() => {
    if (meta) navigation.setOptions({ title: meta.name });
  }, [meta, navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const db = await getDb();
        const list = await listTracksByCategory(db, id);
        if (!cancelled) {
          setTracks(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("category load failed:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!meta) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, padding: 20 }}>
        <Text style={{ color: T.ink2 }}>Unknown category.</Text>
      </View>
    );
  }

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
        <ActivityIndicator color={meta.color} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: `${meta.color}22`,
              borderWidth: 1,
              borderColor: `${meta.color}66`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph name={meta.glyph} size={22} color={meta.color} />
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
              {meta.name}
            </Text>
            <Text style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
              {tracks.length} track{tracks.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      {tracks.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: T.ink3, fontStyle: "italic" }}>
            Nothing here yet — import audio on the Library tab.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              accent={meta.color}
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

function TrackRow({
  track,
  accent,
  active,
  onPress,
}: {
  track: Track;
  accent: string;
  active: boolean;
  onPress: () => void;
}) {
  const formatDuration = (ms: number | null | undefined): string => {
    if (!ms || ms <= 0) return "";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  };

  const duration = formatDuration(track.durationMs);

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
        <Glyph name={active ? "play" : "next"} size={14} color={accent} />
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
          {track.pack || "—"}
          {track.subcategory ? ` · ${track.subcategory}` : ""}
          {track.grade ? ` · ${track.grade}` : ""}
          {duration ? ` · ${duration}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

