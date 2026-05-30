// Random encounter tables — named tables of entries, each entry
// optionally bound to either a track (single shot) or a category
// (weighted shuffle). Rolling picks an entry and fires the binding.
// Tables persist under dm_encounter_tables; the rolled state is
// component-local.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { CategoryId, Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { getJsonConfig, setJsonConfig } from "../../src/data/config-repo";
import { listTracks } from "../../src/data/tracks-repo";
import { playCategory, playTrack } from "../../src/audio/store";
import { TrackPickerOverlay } from "../../src/components/TrackPickerOverlay";

type EncounterEntry = {
  id: string;
  label: string;
  trackId?: string;
  categoryId?: CategoryId;
};

type EncounterTable = {
  id: string;
  name: string;
  entries: EncounterEntry[];
};

const CONFIG_KEY = "dm_encounter_tables";

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function newTable(): EncounterTable {
  return { id: rid(), name: "New table", entries: [{ id: rid(), label: "" }] };
}

export default function EncountersScreen() {
  const [tables, setTables] = useState<EncounterTable[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rolled, setRolled] = useState<{ entryId: string; at: number } | null>(
    null,
  );
  const [picking, setPicking] = useState<{ entryId: string } | null>(null);
  const [tracksById, setTracksById] = useState<ReadonlyMap<string, Track>>(
    new Map(),
  );

  // Load persisted tables + the track index on focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const [list, tracks] = await Promise.all([
            getJsonConfig<EncounterTable[]>(db, CONFIG_KEY, []),
            listTracks(db),
          ]);
          if (cancelled) return;
          const safe = Array.isArray(list) ? list : [];
          setTables(safe);
          setActiveId((cur) => cur ?? safe[0]?.id ?? null);
          setTracksById(new Map(tracks.map((t) => [t.id, t])));
          setLoaded(true);
        } catch (err) {
          console.error("Encounters load failed:", err);
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (!loaded) return;
    void (async () => {
      try {
        const db = await getDb();
        await setJsonConfig(db, CONFIG_KEY, tables);
      } catch (err) {
        console.error("Encounters save failed:", err);
      }
    })();
  }, [tables, loaded]);

  const active = useMemo(
    () => tables.find((t) => t.id === activeId) ?? tables[0] ?? null,
    [tables, activeId],
  );

  // ── Table ops ──
  function addTable() {
    const t = newTable();
    setTables((prev) => [...prev, t]);
    setActiveId(t.id);
    setRolled(null);
  }

  function renameTable(name: string) {
    if (!active) return;
    setTables((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, name } : t)),
    );
  }

  function deleteTable() {
    if (!active) return;
    Alert.alert("Delete table?", `"${active.name}" and its entries.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setTables((prev) => {
            const remaining = prev.filter((t) => t.id !== active.id);
            setActiveId(remaining[0]?.id ?? null);
            return remaining;
          });
          setRolled(null);
        },
      },
    ]);
  }

  // ── Entry ops ──
  function patchEntries(
    fn: (entries: EncounterEntry[]) => EncounterEntry[],
  ) {
    if (!active) return;
    setTables((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, entries: fn(t.entries) } : t,
      ),
    );
  }

  function addEntry() {
    patchEntries((es) => [...es, { id: rid(), label: "" }]);
  }

  function setLabel(entryId: string, label: string) {
    patchEntries((es) =>
      es.map((e) => (e.id === entryId ? { ...e, label } : e)),
    );
  }

  function setCategory(entryId: string, categoryId: CategoryId | null) {
    patchEntries((es) =>
      es.map((e) => {
        if (e.id !== entryId) return e;
        const { trackId: _t, categoryId: _c, ...rest } = e;
        void _t;
        void _c;
        return categoryId ? { ...rest, categoryId } : rest;
      }),
    );
  }

  function bindTrack(entryId: string, track: Track) {
    patchEntries((es) =>
      es.map((e) => {
        if (e.id !== entryId) return e;
        const { trackId: _t, categoryId: _c, ...rest } = e;
        void _t;
        void _c;
        return { ...rest, trackId: track.id };
      }),
    );
  }

  function clearBinding(entryId: string) {
    patchEntries((es) =>
      es.map((e) => {
        if (e.id !== entryId) return e;
        const { trackId: _t, categoryId: _c, ...rest } = e;
        void _t;
        void _c;
        return rest;
      }),
    );
  }

  function deleteEntry(entryId: string) {
    patchEntries((es) => es.filter((e) => e.id !== entryId));
  }

  // ── Roll ──
  function roll() {
    if (!active) return;
    const pool = active.entries.filter((e) => e.label.trim().length > 0);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    setRolled({ entryId: pick.id, at: Date.now() });
    if (pick.trackId) {
      const track = tracksById.get(pick.trackId);
      if (track) void playTrack(track, []);
    } else if (pick.categoryId) {
      void playCategory(pick.categoryId);
    }
  }

  const rollableCount =
    active?.entries.filter((e) => e.label.trim().length > 0).length ?? 0;
  const rolledEntry = active?.entries.find((e) => e.id === rolled?.entryId);
  const pickingEntry = active?.entries.find((e) => e.id === picking?.entryId);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Tables strip + add */}
        <View style={{ paddingTop: 14, paddingBottom: 8 }}>
          <Text style={[eyebrow, { paddingHorizontal: 16 }]}>Tables</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              gap: 6,
            }}
          >
            {tables.map((t) => {
              const isActive = t.id === active?.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    setActiveId(t.id);
                    setRolled(null);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: isActive ? T.goldSoft : T.bgChip,
                    borderWidth: 1,
                    borderColor: isActive ? T.goldEdge : T.rule,
                    opacity: pressed ? 0.7 : 1,
                    maxWidth: 180,
                  })}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: isActive ? T.gold : T.ink2,
                    }}
                  >
                    {t.name || "Untitled"}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={addTable}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: T.rule,
                borderStyle: "dashed",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Glyph name="plus" size={12} color={T.ink3} />
              <Text style={{ fontSize: 12, color: T.ink3 }}>Table</Text>
            </Pressable>
          </ScrollView>
        </View>

        {active === null ? (
          <View style={{ paddingHorizontal: 32, paddingTop: 32 }}>
            <Text
              style={{
                fontSize: 13,
                color: T.ink3,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              Create a table to begin. Add entries, bind each to a track or a
              category, then roll.
            </Text>
          </View>
        ) : (
          <>
            {/* Active table name + delete */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 12,
              }}
            >
              <TextInput
                value={active.name}
                onChangeText={renameTable}
                placeholder="Table name"
                placeholderTextColor={T.ink3}
                style={{
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: T.bgChip,
                  borderWidth: 1,
                  borderColor: T.rule,
                  color: T.ink,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              />
              <Pressable
                onPress={deleteTable}
                hitSlop={6}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: T.rule,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Glyph name="trash" size={16} color={T.ink3} />
              </Pressable>
            </View>

            {/* Roll button */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Pressable
                onPress={roll}
                disabled={rollableCount === 0}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor:
                    rollableCount === 0
                      ? T.bgChip
                      : pressed
                        ? T.goldEdge
                        : T.gold,
                })}
              >
                <Glyph
                  name="dice"
                  size={18}
                  color={rollableCount === 0 ? T.ink3 : T.bg}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: rollableCount === 0 ? T.ink3 : T.bg,
                  }}
                >
                  Roll on {active.name || "table"}
                </Text>
              </Pressable>
            </View>

            {/* Roll result banner */}
            {rolledEntry && rolledEntry.label.trim().length > 0 && (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: T.goldSoft,
                  borderWidth: 1,
                  borderColor: T.goldEdge,
                }}
              >
                <Text style={[eyebrow, { color: T.gold }]}>Rolled</Text>
                <Text
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    fontWeight: "600",
                    color: T.ink,
                    marginTop: 4,
                  }}
                >
                  {rolledEntry.label}
                </Text>
                <Text style={{ fontSize: 11, color: T.ink3, marginTop: 4 }}>
                  {bindingLabel(rolledEntry, tracksById)}
                </Text>
              </View>
            )}

            {/* Entries */}
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={[eyebrow, { marginBottom: 8 }]}>Entries</Text>
            </View>
            {active.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                rolled={entry.id === rolled?.entryId}
                tracksById={tracksById}
                onLabel={(v) => setLabel(entry.id, v)}
                onCategory={(c) => setCategory(entry.id, c)}
                onPickTrack={() => setPicking({ entryId: entry.id })}
                onClear={() => clearBinding(entry.id)}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}

            {/* Add entry */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <Pressable
                onPress={addEntry}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: T.rule,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Glyph name="plus" size={14} color={T.ink3} />
                <Text style={{ fontSize: 13, color: T.ink3 }}>Add entry</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <TrackPickerOverlay
        visible={picking !== null}
        title="Encounter binding"
        subtitle={
          pickingEntry?.label
            ? `Bind a track to "${pickingEntry.label}"`
            : "Bind a track to this entry"
        }
        onPick={(track) => {
          if (picking) bindTrack(picking.entryId, track);
          setPicking(null);
        }}
        onDismiss={() => setPicking(null)}
      />
    </View>
  );
}

function EntryRow({
  entry,
  rolled,
  tracksById,
  onLabel,
  onCategory,
  onPickTrack,
  onClear,
  onDelete,
}: {
  entry: EncounterEntry;
  rolled: boolean;
  tracksById: ReadonlyMap<string, Track>;
  onLabel: (v: string) => void;
  onCategory: (c: CategoryId | null) => void;
  onPickTrack: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const boundTrack = entry.trackId ? tracksById.get(entry.trackId) : undefined;
  const boundCat = entry.categoryId
    ? CATEGORIES.find((c) => c.id === entry.categoryId)
    : undefined;
  const hasBinding = !!(entry.trackId || entry.categoryId);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: rolled ? T.goldSoft : T.bgRaise,
        borderWidth: 1,
        borderColor: rolled ? T.goldEdge : T.rule,
        gap: 8,
      }}
    >
      {/* Label + delete */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={entry.label}
          onChangeText={onLabel}
          placeholder="Entry…"
          placeholderTextColor={T.ink3}
          style={{
            flex: 1,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: T.bgChip,
            borderWidth: 1,
            borderColor: T.rule,
            color: T.ink,
            fontSize: 13,
          }}
        />
        <Pressable
          onPress={onDelete}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? T.bgChip : "transparent",
          })}
        >
          <Glyph name="close" size={14} color={T.ink3} />
        </Pressable>
      </View>

      {/* Binding controls */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {/* Category bind: horizontal scroll of category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Pressable
            onPress={() => onCategory(null)}
            style={({ pressed }) => ({
              paddingVertical: 5,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor:
                !entry.categoryId && !entry.trackId ? T.goldSoft : T.bgChip,
              borderWidth: 1,
              borderColor:
                !entry.categoryId && !entry.trackId ? T.goldEdge : T.rule,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 10,
                color:
                  !entry.categoryId && !entry.trackId ? T.gold : T.ink3,
              }}
            >
              None
            </Text>
          </Pressable>
          {CATEGORIES.map((c) => {
            const isActive = c.id === entry.categoryId;
            return (
              <Pressable
                key={c.id}
                onPress={() => onCategory(c.id)}
                style={({ pressed }) => ({
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  borderRadius: 999,
                  backgroundColor: isActive ? `${c.color}33` : T.bgChip,
                  borderWidth: 1,
                  borderColor: isActive ? `${c.color}88` : T.rule,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? c.color : T.ink3,
                  }}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Track bind */}
        <Pressable
          onPress={onPickTrack}
          style={({ pressed }) => ({
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: entry.trackId ? T.goldSoft : T.bgChip,
            borderWidth: 1,
            borderColor: entry.trackId ? T.goldEdge : T.rule,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Glyph
            name="wave"
            size={12}
            color={entry.trackId ? T.gold : T.ink3}
          />
          <Text
            style={{
              fontSize: 10,
              color: entry.trackId ? T.gold : T.ink3,
            }}
          >
            Track
          </Text>
        </Pressable>
      </View>

      {/* Active binding readout */}
      {hasBinding && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingTop: 4,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 11,
              color: T.ink2,
              fontStyle: "italic",
            }}
          >
            {boundTrack
              ? `♪ ${boundTrack.title}`
              : boundCat
                ? `Shuffles ${boundCat.name}`
                : entry.trackId
                  ? "♪ (track missing)"
                  : ""}
          </Text>
          <Pressable onPress={onClear} hitSlop={6}>
            <Text style={{ fontFamily: FONT_MONO, fontSize: 10, color: T.ink3 }}>
              clear
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function bindingLabel(
  entry: EncounterEntry,
  tracksById: ReadonlyMap<string, Track>,
): string {
  if (entry.trackId) {
    const t = tracksById.get(entry.trackId);
    return t ? `♪ ${t.title}` : "♪ (track missing)";
  }
  if (entry.categoryId) {
    const c = CATEGORIES.find((x) => x.id === entry.categoryId);
    return c ? `Shuffling ${c.name}` : "Shuffling category";
  }
  return "No audio bound";
}

const eyebrow = {
  fontSize: 10,
  color: T.ink3,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};
