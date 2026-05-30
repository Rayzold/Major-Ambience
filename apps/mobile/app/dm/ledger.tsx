// XP / loot ledger — running party XP total with a per-player split,
// plus a simple loot list. Persists under dm_xp_ledger (matching desktop).

import { useCallback, useEffect, useState } from "react";
import {
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

type LootEntry = { id: string; text: string };
type XpLedgerState = {
  xp: number;
  partySize: number;
  loot: LootEntry[];
};

const CONFIG_KEY = "dm_xp_ledger";
const EMPTY_LEDGER: XpLedgerState = { xp: 0, partySize: 4, loot: [] };

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function LedgerScreen() {
  const [ledger, setLedger] = useState<XpLedgerState>(EMPTY_LEDGER);
  const [loaded, setLoaded] = useState(false);
  const [xpInput, setXpInput] = useState("");
  const [lootInput, setLootInput] = useState("");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const loaded = await getJsonConfig<XpLedgerState>(
            db,
            CONFIG_KEY,
            EMPTY_LEDGER,
          );
          if (!cancelled) {
            // Defensive: persisted blob may be missing fields if the
            // schema ever evolves. Spread over EMPTY_LEDGER so we get
            // safe defaults for anything the blob doesn't have.
            setLedger({ ...EMPTY_LEDGER, ...loaded });
            setLoaded(true);
          }
        } catch (err) {
          console.error("Ledger load failed:", err);
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
        await setJsonConfig(db, CONFIG_KEY, ledger);
      } catch (err) {
        console.error("Ledger save failed:", err);
      }
    })();
  }, [ledger, loaded]);

  const size = Math.max(1, ledger.partySize || 1);
  const perPlayer = Math.floor((ledger.xp || 0) / size);

  function addXp() {
    const n = Number(xpInput);
    if (!Number.isFinite(n) || n === 0) return;
    setLedger((prev) => ({ ...prev, xp: Math.max(0, (prev.xp || 0) + n) }));
    setXpInput("");
  }

  function setPartySize(raw: string) {
    const n = Math.max(1, Math.floor(Number(raw) || 1));
    setLedger((prev) => ({ ...prev, partySize: n }));
  }

  function resetXp() {
    setLedger((prev) => ({ ...prev, xp: 0 }));
  }

  function addLoot() {
    const text = lootInput.trim();
    if (!text) return;
    setLedger((prev) => ({
      ...prev,
      loot: [{ id: rid(), text }, ...prev.loot],
    }));
    setLootInput("");
  }

  function editLoot(id: string, text: string) {
    setLedger((prev) => ({
      ...prev,
      loot: prev.loot.map((l) => (l.id === id ? { ...l, text } : l)),
    }));
  }

  function removeLoot(id: string) {
    setLedger((prev) => ({
      ...prev,
      loot: prev.loot.filter((l) => l.id !== id),
    }));
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Big XP total */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Text style={eyebrow}>Party XP</Text>
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 56,
              fontWeight: "700",
              color: T.ink,
              marginTop: 4,
            }}
          >
            {(ledger.xp || 0).toLocaleString()}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginTop: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: T.ink3, fontSize: 13 }}>Party</Text>
              <TextInput
                value={String(ledger.partySize)}
                onChangeText={setPartySize}
                keyboardType="number-pad"
                style={{
                  width: 48,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: T.bgChip,
                  borderWidth: 1,
                  borderColor: T.rule,
                  color: T.ink,
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  textAlign: "center",
                }}
              />
            </View>
            <Text style={{ color: T.ink3, fontSize: 13 }}>
              ={" "}
              <Text style={{ color: T.gold, fontWeight: "700" }}>
                {perPlayer.toLocaleString()}
              </Text>{" "}
              / player
            </Text>
          </View>
        </View>

        {/* XP add row */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            flexDirection: "row",
            gap: 8,
          }}
        >
          <TextInput
            value={xpInput}
            onChangeText={setXpInput}
            placeholder="Add XP (450, or -100 to correct)"
            placeholderTextColor={T.ink3}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={addXp}
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
          <Pressable
            onPress={addXp}
            style={({ pressed }) => ({
              paddingHorizontal: 18,
              borderRadius: 10,
              backgroundColor: pressed ? T.goldEdge : T.gold,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: T.bg }}>
              Add
            </Text>
          </Pressable>
          <Pressable
            onPress={resetXp}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: T.bgChip,
              borderWidth: 1,
              borderColor: T.rule,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 12, color: T.ink3 }}>Reset</Text>
          </Pressable>
        </View>

        {/* Loot section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={eyebrow}>Loot</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TextInput
              value={lootInput}
              onChangeText={setLootInput}
              placeholder="Add an item, coin haul, or reward…"
              placeholderTextColor={T.ink3}
              returnKeyType="done"
              onSubmitEditing={addLoot}
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
            <Pressable
              onPress={addLoot}
              disabled={lootInput.trim().length === 0}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor:
                  lootInput.trim().length === 0
                    ? T.bgChip
                    : pressed
                      ? T.goldEdge
                      : T.goldSoft,
                borderWidth: 1,
                borderColor: lootInput.trim().length === 0 ? T.rule : T.goldEdge,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Glyph
                name="plus"
                size={18}
                color={lootInput.trim().length === 0 ? T.ink3 : T.gold}
              />
            </Pressable>
          </View>
        </View>

        {ledger.loot.length === 0 ? (
          <View style={{ paddingHorizontal: 32, paddingTop: 20 }}>
            <Text
              style={{
                fontSize: 13,
                color: T.ink3,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              No loot logged yet.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {ledger.loot.map((l) => (
              <View
                key={l.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: T.bgRaise,
                  borderWidth: 1,
                  borderColor: T.rule,
                }}
              >
                <Glyph name="star" size={16} color={T.gold} />
                <TextInput
                  value={l.text}
                  onChangeText={(text) => editLoot(l.id, text)}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: T.ink,
                    paddingVertical: 0,
                  }}
                />
                <Pressable
                  onPress={() => removeLoot(l.id)}
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
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const eyebrow = {
  fontSize: 10,
  color: T.ink3,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};
