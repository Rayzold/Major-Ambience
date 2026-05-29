// Soundboard — 3 pages (A/B/C) × 8 pads for instant SFX triggers.
// Each pad can hold a track, play it on tap, and has per-pad volume/loop.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { SoundboardSlot, Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { listSoundboard, upsertSlot, clearSlot } from "../../src/data/soundboard-repo";
import { listTracks } from "../../src/data/tracks-repo";
import { playPad, stopPad, isPadPlaying, useSoundboard } from "../../src/audio/soundboard-store";

type Page = "A" | "B" | "C";
type PadData = {
  slot: SoundboardSlot;
  track?: Track;
};

export default function SoundboardScreen() {
  const [activePage, setActivePage] = useState<Page>("A");
  const [pads, setPads] = useState<Map<string, PadData>>(new Map());
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickingFor, setPickingFor] = useState<{ page: Page; slot: number } | null>(null);
  const [editingPad, setEditingPad] = useState<PadData | null>(null);
  const soundboard = useSoundboard();

  const refresh = useCallback(async () => {
    try {
      const db = await getDb();
      const [slots, tracks] = await Promise.all([
        listSoundboard(db),
        listTracks(db),
      ]);

      const padMap = new Map<string, PadData>();
      for (const slot of slots) {
        const track = tracks.find((t) => t.id === slot.trackId);
        padMap.set(`${slot.page}-${slot.slot}`, { slot, track });
      }
      setPads(padMap);
      setAllTracks(tracks);
    } catch (err) {
      console.error("Soundboard refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleAssignTrack = useCallback(
    async (page: Page, slot: number, track: Track) => {
      try {
        const db = await getDb();
        const newSlot: SoundboardSlot = {
          page,
          slot: slot as SoundboardSlot["slot"],
          trackId: track.id,
          loop: false,
          volume: 1,
        };
        await upsertSlot(db, newSlot);
        await refresh();
        setPickingFor(null);
      } catch (err) {
        Alert.alert("Failed to assign", err instanceof Error ? err.message : String(err));
      }
    },
    [refresh],
  );

  const handleClearPad = useCallback(
    async (page: Page, slot: number) => {
      try {
        const db = await getDb();
        await clearSlot(db, page, slot);
        await refresh();
        setEditingPad(null);
      } catch (err) {
        Alert.alert("Failed to clear", err instanceof Error ? err.message : String(err));
      }
    },
    [refresh],
  );

  const handleUpdatePad = useCallback(
    async (updated: SoundboardSlot) => {
      try {
        const db = await getDb();
        await upsertSlot(db, updated);
        await refresh();
        setEditingPad(null);
      } catch (err) {
        Alert.alert("Failed to update", err instanceof Error ? err.message : String(err));
      }
    },
    [refresh],
  );

  const renderPad = (slotNum: number) => {
    const key = `${activePage}-${slotNum}`;
    const padData = pads.get(key);

    if (!padData || !padData.track) {
      return (
        <EmptyPad
          page={activePage}
          slot={slotNum}
          onPress={() => setPickingFor({ page: activePage, slot: slotNum })}
        />
      );
    }

    return (
      <AssignedPad
        key={key}
        padData={padData}
        isPlaying={isPadPlaying(activePage, slotNum)}
        onPress={() => {
          if (isPadPlaying(activePage, slotNum)) {
            void stopPad(activePage, slotNum);
          } else {
            void playPad(padData.slot, padData.track!);
          }
        }}
        onLongPress={() => setEditingPad(padData)}
      />
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={T.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
            INSTANT TRIGGERS
          </Text>
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 38,
              fontWeight: "600",
              color: "#5cc4d9",
              marginTop: 2,
              fontStyle: "italic",
            }}
          >
            Soundboard
          </Text>
        </View>

        {/* Page switcher */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          {(["A", "B", "C"] as const).map((page) => (
            <Pressable
              key={page}
              onPress={() => setActivePage(page)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor:
                  activePage === page
                    ? "#5cc4d9"
                    : pressed
                      ? T.bgCard
                      : T.bgRaise,
                borderWidth: 1,
                borderColor:
                  activePage === page ? "#5cc4d9" : T.rule,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: activePage === page ? T.bg : T.ink2,
                  fontFamily: "monospace",
                }}
              >
                {page}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 8-pad grid (4×2) */}
        <View style={{ paddingHorizontal: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
              <View key={slot} style={{ width: "48%", aspectRatio: 1.5 }}>
                {renderPad(slot)}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Track picker modal */}
      {pickingFor && (
        <TrackPickerModal
          visible={true}
          tracks={allTracks}
          onSelect={(track) => {
            void handleAssignTrack(pickingFor.page, pickingFor.slot, track);
          }}
          onClose={() => setPickingFor(null)}
        />
      )}

      {/* Pad settings modal */}
      {editingPad && (
        <PadSettingsModal
          padData={editingPad}
          onUpdate={handleUpdatePad}
          onClear={() => {
            void handleClearPad(editingPad.slot.page, editingPad.slot.slot);
          }}
          onClose={() => setEditingPad(null)}
        />
      )}
    </View>
  );
}

function EmptyPad({
  page,
  slot,
  onPress,
}: {
  page: Page;
  slot: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: pressed ? T.ink3 : T.rule,
        backgroundColor: pressed ? T.bgCard : T.bgRaise,
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      })}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: T.ink3,
          fontFamily: "monospace",
          marginBottom: 4,
        }}
      >
        {slot}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: T.ink3,
          textAlign: "center",
        }}
      >
        Tap to assign
      </Text>
    </Pressable>
  );
}

function AssignedPad({
  padData,
  isPlaying,
  onPress,
  onLongPress,
}: {
  padData: PadData;
  isPlaying: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { track, slot } = padData;
  if (!track) return null;

  const meta = CATEGORIES.find((c) => c.id === track.category);
  const color = meta?.color ?? T.gold;
  const dark = meta?.dark ?? T.bg;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 12,
        backgroundColor: dark,
        borderWidth: isPlaying ? 3 : 2,
        borderColor: isPlaying ? color : `${color}66`,
        padding: 12,
        opacity: pressed ? 0.8 : 1,
        shadowColor: isPlaying ? color : "transparent",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            backgroundColor: `${color}33`,
            borderWidth: 1,
            borderColor: `${color}66`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Glyph name={meta?.glyph ?? "spark"} size={16} color={color} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: T.ink3,
            fontFamily: "monospace",
          }}
        >
          {slot.slot}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: T.ink,
          lineHeight: 16,
        }}
      >
        {track.title}
      </Text>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {slot.loop && (
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: `${color}22`,
            }}
          >
            <Text style={{ fontSize: 9, color, fontWeight: "600" }}>LOOP</Text>
          </View>
        )}
        {slot.volume < 1 && (
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: T.bgCard,
            }}
          >
            <Text style={{ fontSize: 9, color: T.ink3, fontWeight: "600" }}>
              {Math.round(slot.volume * 100)}%
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function TrackPickerModal({
  visible,
  tracks,
  onSelect,
  onClose,
}: {
  visible: boolean;
  tracks: Track[];
  onSelect: (track: Track) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = tracks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 60,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: T.rule,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 24,
                fontWeight: "600",
                color: T.ink,
              }}
            >
              Pick a Track
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? T.bgCard : "transparent",
              })}
            >
              <Glyph name="close" size={20} color={T.ink2} />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
          {filtered.map((track) => {
            const meta = CATEGORIES.find((c) => c.id === track.category);
            const color = meta?.color ?? T.ink2;
            return (
              <Pressable
                key={track.id}
                onPress={() => onSelect(track)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: pressed ? T.bgCard : "transparent",
                })}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 7,
                    backgroundColor: `${color}22`,
                    borderWidth: 1,
                    borderColor: `${color}33`,
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
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PadSettingsModal({
  padData,
  onUpdate,
  onClear,
  onClose,
}: {
  padData: PadData;
  onUpdate: (slot: SoundboardSlot) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [loop, setLoop] = useState(padData.slot.loop);
  const [volume, setVolume] = useState(padData.slot.volume);

  const handleSave = () => {
    onUpdate({ ...padData.slot, loop, volume });
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: T.bgRaise,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 24,
            paddingBottom: 40,
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              fontWeight: "600",
              color: T.ink,
              marginBottom: 20,
            }}
          >
            Pad Settings
          </Text>

          {/* Loop toggle */}
          <Pressable
            onPress={() => setLoop(!loop)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: T.rule,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Glyph name="loop" size={20} color={T.ink2} />
              <Text style={{ fontSize: 15, color: T.ink }}>Loop</Text>
            </View>
            <View
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: loop ? "#5cc4d9" : T.bgCard,
                padding: 2,
                justifyContent: "center",
                alignItems: loop ? "flex-end" : "flex-start",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: T.ink,
                }}
              />
            </View>
          </Pressable>

          {/* Volume slider */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.rule }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Glyph name="speaker" size={20} color={T.ink2} />
              <Text style={{ fontSize: 15, color: T.ink }}>
                Volume: {Math.round(volume * 100)}%
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0.25, 0.5, 0.75, 1].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setVolume(v)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: volume === v ? "#5cc4d9" : T.bgCard,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: volume === v ? T.bg : T.ink2,
                    }}
                  >
                    {Math.round(v * 100)}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <Pressable
              onPress={onClear}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: pressed ? "#d96a4a" : "transparent",
                borderWidth: 1,
                borderColor: "#d96a4a",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#d96a4a" }}>
                Clear Pad
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: pressed ? "#4cc4d9" : "#5cc4d9",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: T.bg }}>
                Save
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 12,
              marginTop: 8,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: T.ink3 }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
