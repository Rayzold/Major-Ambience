// Mobile track picker — bottom-sheet modal with a searchable, filtered
// FlatList of the library. Mirrors apps/desktop/src/layout/TrackPickerOverlay.tsx
// in role (no drag/drop on mobile, so this IS the binding affordance).
//
// Used by:
//   - Encounters: bind a track to an encounter entry.
//   - Timers: bind a stinger to a countdown timer.

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY, FONT_MONO } from "../tokens";
import { Glyph } from "../Glyph";
import { getDb } from "../data/db";
import { listTracks } from "../data/tracks-repo";

export type TrackPickerOverlayProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onPick: (track: Track) => void;
  onDismiss: () => void;
};

const LIMIT = 200;

export function TrackPickerOverlay({
  visible,
  title,
  subtitle,
  onPick,
  onDismiss,
}: TrackPickerOverlayProps) {
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const db = await getDb();
        const list = await listTracks(db);
        if (!cancelled) {
          setAllTracks(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("TrackPicker load failed:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Reset search every time the picker is reopened.
  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return allTracks.slice(0, LIMIT);
    const terms = q.split(/\s+/).filter(Boolean);
    return allTracks
      .filter((t) => {
        const hay = `${t.title} ${t.pack ?? ""}`.toLowerCase();
        return terms.every((term) => hay.includes(term));
      })
      .slice(0, LIMIT);
  }, [query, allTracks]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: T.rule,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              {title ? (
                <Text
                  style={{
                    fontSize: 10,
                    color: T.ink3,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  {title}
                </Text>
              ) : null}
              <Text
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: "600",
                  color: T.ink,
                  fontStyle: "italic",
                  marginTop: 2,
                }}
              >
                Pick a track
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: T.ink2,
                    marginTop: 6,
                    lineHeight: 18,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onDismiss}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? T.bgCard : "transparent",
              })}
            >
              <Glyph name="close" size={18} color={T.ink2} />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: T.bgChip,
              borderWidth: 1,
              borderColor: T.rule,
            }}
          >
            <Glyph name="search" size={16} color={T.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search title or pack…"
              placeholderTextColor={T.ink3}
              autoFocus
              style={{
                flex: 1,
                color: T.ink,
                fontSize: 14,
                paddingVertical: 0,
              }}
            />
          </View>
        </View>

        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color={T.gold} />
          </View>
        ) : filtered.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: T.ink3,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              {allTracks.length === 0
                ? "No tracks imported yet — open the Library tab to import audio first."
                : "No matches."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TrackRow track={item} onPress={() => onPick(item)} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function TrackRow({ track, onPress }: { track: Track; onPress: () => void }) {
  const meta = CATEGORIES.find((c) => c.id === track.category);
  const color = meta?.color ?? T.gold;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: pressed ? T.bgCard : "transparent",
        borderBottomWidth: 1,
        borderBottomColor: T.rule,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          backgroundColor: `${color}22`,
          borderWidth: 1,
          borderColor: `${color}44`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Glyph name={meta?.glyph ?? "spark"} size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: "500", color: T.ink }}
        >
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}
        >
          {track.pack || "—"}
          {track.subcategory ? ` · ${track.subcategory}` : ""}
        </Text>
      </View>
      {track.grade ? (
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 4,
            backgroundColor: T.bgChip,
            color: T.ink2,
          }}
        >
          {track.grade}
        </Text>
      ) : null}
    </Pressable>
  );
}
