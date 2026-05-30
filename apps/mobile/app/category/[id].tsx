// Category detail — list of all tracks in this category, tap-to-play.
// Tapping a row hands the full visible list to the player so the next
// track auto-advances when the current one finishes. Mirrors desktop
// row-click-fills-queue behavior.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { categorize, type CategoryId, type Grade, type Track } from "@mc/core";
import { CATEGORIES, findCategory } from "@mc/ui/categories";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { listTracksByCategory, setCategory } from "../../src/data/tracks-repo";
import { playTrack, usePlayer } from "../../src/audio/store";

type GradeFilter = "All" | NonNullable<Grade>;
const GRADE_PILLS: GradeFilter[] = ["All", "S", "A", "B", "C", "D", "F"];

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  // findCategory resolves both real categories and the "removed"
  // pseudo-category — needed so the Removed view can render the same
  // header chrome as the others. The route param is a raw string;
  // the cast is bounded by findCategory returning undefined for
  // anything that isn't a known CategoryId.
  const meta = useMemo(
    () => (id ? findCategory(id as CategoryId) : undefined),
    [id],
  );
  const isRemoved = id === "removed";
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("All");
  const { nowPlaying } = usePlayer();

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const db = await getDb();
      const list = await listTracksByCategory(db, id);
      setTracks(list);
    } catch (err) {
      console.error("category reload failed:", err);
    }
  }, [id]);

  const handleRemove = useCallback(
    async (track: Track) => {
      try {
        const db = await getDb();
        await setCategory(db, track.id, "removed", null);
        setTracks((prev) => prev.filter((t) => t.id !== track.id));
      } catch (err) {
        console.error("remove failed:", err);
      }
    },
    [],
  );

  const handleRestore = useCallback(
    async (track: Track) => {
      // Re-run the auto-categorizer over the track's title + pack so
      // it lands in its best-guess category, the same way a fresh
      // folder scan would. The pre-removal category isn't stored
      // anywhere — this matches desktop Library.handleRestoreTrack().
      try {
        const db = await getDb();
        const result = categorize(track.title, track.pack);
        await setCategory(
          db,
          track.id,
          result.category,
          result.subcategory ?? null,
        );
        setTracks((prev) => prev.filter((t) => t.id !== track.id));
      } catch (err) {
        console.error("restore failed:", err);
      }
    },
    [],
  );

  // Per-grade counts drive the chip row — chips with a 0 count are
  // hidden so the row doesn't show every letter for every category
  // (matches the desktop polish from #30).
  const gradeCounts = useMemo(() => {
    const m: Partial<Record<NonNullable<Grade>, number>> = {};
    for (const t of tracks) {
      if (t.grade) m[t.grade] = (m[t.grade] ?? 0) + 1;
    }
    return m;
  }, [tracks]);

  const visiblePills = useMemo(
    () =>
      GRADE_PILLS.filter((g) => g === "All" || (gradeCounts[g] ?? 0) > 0),
    [gradeCounts],
  );

  const filtered = useMemo(
    () =>
      gradeFilter === "All"
        ? tracks
        : tracks.filter((t) => t.grade === gradeFilter),
    [tracks, gradeFilter],
  );

  // If the active grade filter no longer has any tracks (e.g. the user
  // landed on it then deleted/restored rows), snap back to All so the
  // list isn't mysteriously empty.
  useEffect(() => {
    if (gradeFilter === "All") return;
    if ((gradeCounts[gradeFilter] ?? 0) === 0) setGradeFilter("All");
  }, [gradeFilter, gradeCounts]);

  useEffect(() => {
    if (meta) navigation.setOptions({ title: meta.name });
  }, [meta, navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

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

      {/* Grade filter pills — hidden when nothing in the category is
          graded (all chips would be empty), otherwise renders a row
          starting with "All" + every grade that has at least one track. */}
      {visiblePills.length > 1 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, alignItems: "center" }}
          >
            <Text
              style={{
                fontSize: 10,
                color: T.ink3,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginRight: 4,
              }}
            >
              Grade
            </Text>
            {visiblePills.map((g) => {
              const active = gradeFilter === g;
              const label = g === "All" ? "All" : g;
              const count = g === "All" ? tracks.length : gradeCounts[g] ?? 0;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGradeFilter(g)}
                  style={({ pressed }) => ({
                    minHeight: 26,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 6,
                    backgroundColor: active
                      ? `${meta.color}33`
                      : T.bgChip,
                    borderWidth: 1,
                    borderColor: active ? `${meta.color}77` : T.rule,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      fontWeight: "600",
                      color: active ? meta.color : T.ink2,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      color: active ? meta.color : T.ink3,
                      opacity: 0.75,
                    }}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {tracks.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: T.ink3, fontStyle: "italic" }}>
            Nothing here yet — import audio on the Library tab.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: T.ink3, fontStyle: "italic" }}>
            No {gradeFilter}-grade tracks in this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              accent={meta.color}
              active={nowPlaying?.id === item.id}
              onPress={() => {
                // Hand the filtered slice as the queue so auto-advance
                // respects the active filter (same pattern as desktop).
                void playTrack(item, filtered);
              }}
              actionGlyph={isRemoved ? "undo" : "trash"}
              onAction={() => {
                void (isRemoved ? handleRestore(item) : handleRemove(item));
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
  actionGlyph,
  onAction,
}: {
  track: Track;
  accent: string;
  active: boolean;
  onPress: () => void;
  actionGlyph: "trash" | "undo";
  onAction: () => void;
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: active ? `${accent}14` : "transparent",
        borderLeftColor: active ? accent : "transparent",
        borderLeftWidth: 3,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingLeft: 20,
          paddingRight: 8,
          paddingVertical: 12,
          backgroundColor: !active && pressed ? T.bgCard : "transparent",
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
      <Pressable
        onPress={onAction}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          marginRight: 12,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? T.bgChip : "transparent",
          opacity: pressed ? 1 : 0.55,
        })}
      >
        <Glyph name={actionGlyph} size={16} color={T.ink2} />
      </Pressable>
    </View>
  );
}

