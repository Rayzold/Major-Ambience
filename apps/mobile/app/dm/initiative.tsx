// Initiative tracker — add combatants with name + init + HP/AC + condition;
// sort descending; cycle turns. Persists combatants under dm_combatants
// (matching the desktop key). Current-turn index stays local — combat is
// a session thing and the desktop drops it too on reload.
//
// "Roll all" rolls d20 + each combatant's `initiativeMod` and re-sorts —
// the second-battle workflow. Per-combatant modifier is set once via the
// small chip under the big init number; future battles are one tap of
// the dice button in the turn-controls row. Mirror of desktop PR #64.
//
// Turn-sound (the speaker glyph on desktop) is deferred to PR-3 with
// the track-picker overlay.

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
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { getJsonConfig, setJsonConfig } from "../../src/data/config-repo";

type Combatant = {
  id: string;
  name: string;
  initiative: number;
  /**
   * d20 modifier used by "Roll all" (next-battle re-roll). Optional —
   * older persisted combatants (pre-mobile-mirror) won't have it;
   * treated as 0 when rolling.
   */
  initiativeMod?: number;
  condition: string;
  hp?: number;
  maxHp?: number;
  ac?: number;
};

const CONFIG_KEY = "dm_combatants";

/** Roll a d20. Module-level so tests can spy / replace if needed. */
function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

/** Format a modifier as `+5`, `-1`, `+0`. */
function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export default function InitiativeScreen() {
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [init, setInit] = useState("");

  // Load persisted combatants on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const list = await getJsonConfig<Combatant[]>(db, CONFIG_KEY, []);
          if (!cancelled) {
            setCombatants(Array.isArray(list) ? list : []);
            setLoaded(true);
          }
        } catch (err) {
          console.error("Initiative load failed:", err);
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Persist on every change, after the initial load completes
  useEffect(() => {
    if (!loaded) return;
    void (async () => {
      try {
        const db = await getDb();
        await setJsonConfig(db, CONFIG_KEY, combatants);
      } catch (err) {
        console.error("Initiative save failed:", err);
      }
    })();
  }, [combatants, loaded]);

  const sorted = useMemo(
    () => [...combatants].sort((a, b) => b.initiative - a.initiative),
    [combatants],
  );
  const activeId = sorted[currentTurnIdx]?.id;

  function add() {
    const trimmed = name.trim();
    const initN = Number(init);
    if (trimmed.length === 0 || !Number.isFinite(initN)) return;
    setCombatants((prev) => [
      ...prev,
      {
        id: `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`,
        name: trimmed,
        initiative: initN,
        condition: "",
      },
    ]);
    setName("");
    setInit("");
  }

  function update(id: string, patch: Partial<Combatant>) {
    setCombatants((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function setStat(id: string, key: "hp" | "maxHp" | "ac", raw: string) {
    const v = raw.trim();
    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next: Combatant = { ...c };
        if (v === "") {
          delete next[key];
          return next;
        }
        const n = Number(v);
        return Number.isFinite(n) ? { ...next, [key]: n } : c;
      }),
    );
  }

  function remove(id: string) {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
  }

  function clearAll() {
    Alert.alert("Clear all combatants?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setCombatants([]);
          setCurrentTurnIdx(0);
        },
      },
    ]);
  }

  /**
   * Re-roll initiative for every combatant: d20 + initiativeMod. Used
   * at the start of a new battle so the GM doesn't have to retype the
   * roster. Resets the turn cursor to the new top of the order.
   */
  function rollAll() {
    if (combatants.length === 0) return;
    setCombatants((prev) =>
      prev.map((c) => ({
        ...c,
        initiative: rollD20() + (c.initiativeMod ?? 0),
      })),
    );
    setCurrentTurnIdx(0);
  }

  function next() {
    if (sorted.length === 0) return;
    setCurrentTurnIdx((i) => (i + 1) % sorted.length);
  }
  function prev() {
    if (sorted.length === 0) return;
    setCurrentTurnIdx((i) => (i - 1 + sorted.length) % sorted.length);
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Add form */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={eyebrow}>Add combatant</Text>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 8,
              alignItems: "stretch",
            }}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Combatant name"
              placeholderTextColor={T.ink3}
              returnKeyType="done"
              onSubmitEditing={add}
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: T.bgChip,
                borderWidth: 1,
                borderColor: T.rule,
                color: T.ink,
                fontSize: 14,
              }}
            />
            <TextInput
              value={init}
              onChangeText={setInit}
              placeholder="Init"
              placeholderTextColor={T.ink3}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              onSubmitEditing={add}
              style={{
                width: 64,
                paddingHorizontal: 8,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: T.bgChip,
                borderWidth: 1,
                borderColor: T.rule,
                color: T.ink,
                fontFamily: FONT_MONO,
                fontSize: 14,
                textAlign: "center",
              }}
            />
            <Pressable
              onPress={add}
              disabled={name.trim().length === 0 || init === ""}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor:
                  name.trim().length === 0 || init === ""
                    ? T.bgChip
                    : pressed
                      ? T.goldEdge
                      : T.goldSoft,
                borderWidth: 1,
                borderColor:
                  name.trim().length === 0 || init === "" ? T.rule : T.goldEdge,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Glyph
                name="plus"
                size={18}
                color={name.trim().length === 0 || init === "" ? T.ink3 : T.gold}
              />
            </Pressable>
          </View>
        </View>

        {/* Turn controls */}
        {sorted.length > 0 && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={prev}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: T.bgChip,
                borderWidth: 1,
                borderColor: T.rule,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Glyph name="prev" size={18} color={T.ink2} />
            </Pressable>
            <Pressable
              onPress={next}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: pressed ? T.goldEdge : T.gold,
              })}
            >
              <Glyph name="next" size={18} color={T.bg} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: T.bg }}>
                Next turn
              </Text>
            </Pressable>
            {/* Roll all — re-rolls d20 + each combatant's mod and
                resets the turn cursor. Smaller than "Next turn" since
                it's a per-battle action, not per-turn. */}
            <Pressable
              onPress={rollAll}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                height: 44,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                backgroundColor: pressed ? T.goldEdge : T.goldSoft,
                borderWidth: 1,
                borderColor: T.goldEdge,
              })}
            >
              <Glyph name="dice" size={14} color={T.gold} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: T.gold }}>
                Roll
              </Text>
            </Pressable>
            <Pressable
              onPress={clearAll}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                height: 44,
                borderRadius: 10,
                backgroundColor: T.bgChip,
                borderWidth: 1,
                borderColor: T.rule,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 11, color: T.ink3 }}>Clear</Text>
            </Pressable>
          </View>
        )}

        {/* Roster */}
        {sorted.length === 0 ? (
          <View style={{ paddingHorizontal: 32, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 13,
                color: T.ink3,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              Add combatants to start tracking initiative.
            </Text>
          </View>
        ) : (
          sorted.map((c) => (
            <CombatantRow
              key={c.id}
              c={c}
              active={c.id === activeId}
              onUpdate={(patch) => update(c.id, patch)}
              onStat={(key, raw) => setStat(c.id, key, raw)}
              onRemove={() => remove(c.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function CombatantRow({
  c,
  active,
  onUpdate,
  onStat,
  onRemove,
}: {
  c: Combatant;
  active: boolean;
  onUpdate: (patch: Partial<Combatant>) => void;
  onStat: (key: "hp" | "maxHp" | "ac", raw: string) => void;
  onRemove: () => void;
}) {
  const down = c.hp != null && c.hp <= 0;
  const accent = down ? "#d96666" : active ? T.gold : "transparent";
  const nameColor = down ? "#d98a8a" : active ? T.gold : T.ink;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: down ? "#d9666615" : active ? T.goldSoft : T.bgRaise,
        borderWidth: 1,
        borderColor: active ? T.goldEdge : T.rule,
        borderLeftWidth: 4,
        borderLeftColor: accent === "transparent" ? T.rule : accent,
        overflow: "hidden",
      }}
    >
      {/* Top row: init + mod chip, name, remove */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 12,
        }}
      >
        <View style={{ width: 48, alignItems: "center", gap: 2 }}>
          {/* Big initiative number — editable inline. The TextInput
              keeps numeric-keyboard semantics; a wrapper TextInput
              also commits on blur so the row resorts. */}
          <TextInput
            value={String(c.initiative)}
            onChangeText={(raw) => {
              const n = Number(raw.trim());
              onUpdate({ initiative: Number.isFinite(n) ? n : 0 });
            }}
            keyboardType="numbers-and-punctuation"
            selectTextOnFocus
            style={{
              width: "100%",
              padding: 0,
              fontFamily: FONT_MONO,
              fontSize: 20,
              fontWeight: "700",
              color: active ? T.gold : T.ink2,
              textAlign: "center",
            }}
          />
          {/* Modifier chip — small gold-soft pill that drives Roll all. */}
          <TextInput
            value={formatMod(c.initiativeMod ?? 0)}
            onChangeText={(raw) => {
              // Accept `+5`, `-1`, `5`, `+`, `-`, ``. Strip the sign,
              // parse, default to 0 — keeps the chip stable through
              // mid-edit states.
              const cleaned = raw.replace(/[^\d+-]/g, "");
              const n = Number(cleaned);
              onUpdate({ initiativeMod: Number.isFinite(n) ? n : 0 });
            }}
            keyboardType="numbers-and-punctuation"
            selectTextOnFocus
            style={{
              width: 40,
              paddingVertical: 1,
              paddingHorizontal: 2,
              borderRadius: 4,
              backgroundColor: T.bgChip,
              borderWidth: 1,
              borderColor: T.rule,
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: "600",
              color: T.ink3,
              textAlign: "center",
            }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: "600",
              color: nameColor,
              textDecorationLine: down ? "line-through" : "none",
            }}
          >
            {c.name}
          </Text>
          <TextInput
            value={c.condition}
            onChangeText={(text) => onUpdate({ condition: text })}
            placeholder="condition (poisoned, prone…)"
            placeholderTextColor={T.ink3}
            style={{
              paddingVertical: 0,
              marginTop: 2,
              fontSize: 11,
              fontStyle: "italic",
              color: T.ink3,
            }}
          />
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 28,
            height: 28,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? T.bgChip : "transparent",
          })}
        >
          <Glyph name="close" size={14} color={T.ink3} />
        </Pressable>
      </View>

      {/* Stat row: HP / Max HP / AC */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 12,
          paddingBottom: 12,
        }}
      >
        <StatField
          label="HP"
          value={c.hp}
          color={down ? "#d98a8a" : T.ink}
          onChange={(v) => onStat("hp", v)}
        />
        <StatField
          label="Max"
          value={c.maxHp}
          color={T.ink3}
          onChange={(v) => onStat("maxHp", v)}
        />
        <StatField
          label="AC"
          value={c.ac}
          color={T.ink2}
          onChange={(v) => onStat("ac", v)}
        />
      </View>
    </View>
  );
}

function StatField({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number | undefined;
  color: string;
  onChange: (raw: string) => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: T.bgChip,
        borderWidth: 1,
        borderColor: T.rule,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          color: T.ink3,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value != null ? String(value) : ""}
        onChangeText={onChange}
        keyboardType="numbers-and-punctuation"
        placeholder="—"
        placeholderTextColor={T.ink3}
        style={{
          fontFamily: FONT_MONO,
          fontSize: 16,
          fontWeight: "600",
          color,
          textAlign: "center",
          paddingVertical: 2,
        }}
      />
    </View>
  );
}

const eyebrow = {
  fontSize: 10,
  color: T.ink3,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};
