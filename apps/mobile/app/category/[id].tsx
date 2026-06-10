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
import {
  categorize,
  hasEntitlement,
  type CategoryId,
  type Grade,
  type Track,
} from "@mc/core";
import { CATEGORIES, findCategory } from "@mc/ui/categories";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import {
  listTracksByCategory,
  setCategory,
  setGrade,
} from "../../src/data/tracks-repo";
import { playTrack, usePlayer } from "../../src/audio/store";
import { GradeSheet } from "../../src/components/GradeSheet";

type GradeFilter = "All" | NonNullable<Grade>;
const GRADE_PILLS: GradeFilter[] = ["All", "S", "A", "B", "C", "D", "F"];

// Mirrors apps/desktop/src/layout/DesktopLibraryView.tsx — same bucket
// labels, same thresholds, so a sync round-trip of UI prefs is trivial
// if we ever persist the active filter.
type DurationBucket = "Any" | "<1m" | "1–3m" | "3–5m" | "5m+";
const DURATION_BUCKETS: readonly DurationBucket[] = [
  "Any",
  "<1m",
  "1–3m",
  "3–5m",
  "5m+",
];

function bucketContains(bucket: DurationBucket, durationMs: number): boolean {
  if (bucket === "Any") return true;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
  const sec = durationMs / 1000;
  switch (bucket) {
    case "<1m":
      return sec < 60;
    case "1–3m":
      return sec >= 60 && sec < 180;
    case "3–5m":
      return sec >= 180 && sec < 300;
    case "5m+":
      return sec >= 300;
  }
}

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
  const [durationFilter, setDurationFilter] = useState<DurationBucket>("Any");
  const [gradingTrack, setGradingTrack] = useState<Track | null>(null);
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

  // Long-press a row opens the grade sheet. The entitlement check
  // is the documented audit point per packages/core/src/entitlements.ts
  // — during beta `hasEntitlement("grades")` is always true (BETA_TIER
  // is "major"), but the call site is in place for when the gate
  // flips at launch.
  const handleLongPress = useCallback((track: Track) => {
    if (!hasEntitlement("grades")) return;
    setGradingTrack(track);
  }, []);

  const handleSetGrade = useCallback(
    async (grade: Grade) => {
      const target = gradingTrack;
      if (!target) return;
      // Optimistic update — the FlatList row re-renders immediately
      // with the new grade chip. setGrade writes to sqlite which then
      // gets picked up by the next pseudo-view reload (Favorites
      // queries WHERE grade IN ('S','A')).
      setTracks((prev) =>
        prev.map((t) => (t.id === target.id ? { ...t, grade } : t)),
      );
      setGradingTrack(null);
      try {
        const db = await getDb();
        await setGrade(db, target.id, grade);
      } catch (err) {
        console.error("setGrade failed:", err);
        // Roll back the optimistic patch so the row matches DB truth.
        setTracks((prev) =>
          prev.map((t) =>
            t.id === target.id ? { ...t, grade: target.grade } : t,
          ),
        );
      }
    },
    [gradingTrack],
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
      tracks.filter((t) => {
        if (gradeFilter !== "All" && t.grade !== gradeFilter) return false;
        if (!bucketContains(durationFilter, t.durationMs)) return false;
        return true;
      }),
    [tracks, gradeFilter, durationFilter],
  );

  // Per-bucket counts so the row hides buckets that are empty for this
  // category — matches the grade-pill behavior. "Any" is always shown.
  const durationCounts = useMemo(() => {
    const m: Record<DurationBucket, number> = {
      "Any": tracks.length,
      "<1m": 0,
      "1–3m": 0,
      "3–5m": 0,
      "5m+": 0,
    };
    for (const t of tracks) {
      for (const b of DURATION_BUCKETS) {
        if (b === "Any") continue;
        if (bucketContains(b, t.durationMs)) m[b] += 1;
      }
    }
    return m;
  }, [tracks]);

  const visibleDurationBuckets = useMemo(
    () => DURATION_BUCKETS.filter((b) => b === "Any" || durationCounts[b] > 0),
    [durationCounts],
  );

  // Same self-healing as the grade filter — if everything that matched
  // the active bucket disappears (track removed, duration probe
  // re-classifies one), snap back to Any so the list isn't empty for
  // no obvious reason.
  useEffect(() => {
    if (durationFilter === "Any") return;
    if (durationCounts[durationFilter] === 0) setDurationFilter("Any");
  }, [durationFilter, durationCounts]);

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

      {/* Length filter pills — same shape as grade pills, but bucketed
          by track duration. Hidden when nothing in the category has a
          probed duration (otherwise only "Any" would render). */}
      {visibleDurationBuckets.length > 1 && (
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
              Length
            </Text>
            {visibleDurationBuckets.map((b) => {
              const active = durationFilter === b;
              const count = durationCounts[b];
              return (
                <Pressable
                  key={b}
                  onPress={() => setDurationFilter(b)}
                  style={({ pressed }) => ({
                    minHeight: 26,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 6,
                    backgroundColor: active ? `${meta.color}33` : T.bgChip,
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
                    {b}
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
            {emptyFilterCopy(gradeFilter, durationFilter)}
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
              // Removed view doesn't expose grading — restore first.
              onLongPress={isRemoved ? undefined : () => handleLongPress(item)}
              actionGlyph={isRemoved ? "undo" : "trash"}
              onAction={() => {
                void (isRemoved ? handleRestore(item) : handleRemove(item));
              }}
            />
          )}
        />
      )}

      <GradeSheet
        track={gradingTrack}
        accent={meta.color}
        onPick={(g) => void handleSetGrade(g)}
        onDismiss={() => setGradingTrack(null)}
      />
    </View>
  );
}

function emptyFilterCopy(
  grade: GradeFilter,
  duration: DurationBucket,
): string {
  const parts: string[] = [];
  if (grade !== "All") parts.push(`grade ${grade}`);
  if (duration !== "Any") parts.push(`length ${duration}`);
  if (parts.length === 0) return "Nothing here.";
  return `No tracks matching ${parts.join(" + ")} in this category.`;
}

function TrackRow({
  track,
  accent,
  active,
  onPress,
  onLongPress,
  actionGlyph,
  onAction,
}: {
  track: Track;
  accent: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
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
        onLongPress={onLongPress}
        delayLongPress={350}
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

