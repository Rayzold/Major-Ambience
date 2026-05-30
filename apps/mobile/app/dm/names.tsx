// NPC name generator — race + gender pills, anti-repeat history.
// Pure logic from @mc/core/dm; this screen is just touch UI + Clipboard.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  rollNameAvoiding,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  type Race,
  type Gender,
} from "@mc/core/dm";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";

type RolledName = {
  first: string;
  last: string;
  race: Exclude<Race, "any">;
  gender?: Exclude<Gender, "any">;
  rolledAt: number;
};

const HISTORY_LIMIT = 30;

const RACE_GLYPH: Record<Exclude<Race, "any">, string> = {
  human: "compass",
  elf: "leaf",
  dwarf: "swords",
  orc: "skull",
  halfling: "mug",
};

export default function NamesScreen() {
  const [race, setRace] = useState<Race>("any");
  const [gender, setGender] = useState<Gender>("any");
  const [history, setHistory] = useState<RolledName[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const recentSet = useMemo(
    () =>
      new Set(
        history.map((n) => `${n.first}${n.last ? ` ${n.last}` : ""}`.trim()),
      ),
    [history],
  );

  function handleRoll() {
    const next = rollNameAvoiding(race, gender, recentSet);
    const rolled: RolledName = { ...next, rolledAt: Date.now() };
    setHistory((prev) => [rolled, ...prev].slice(0, HISTORY_LIMIT));
  }

  function handleCopy(full: string) {
    void Clipboard.setStringAsync(full);
    setCopied(full);
    setTimeout(() => {
      setCopied((cur) => (cur === full ? null : cur));
    }, 1500);
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gender */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
          <Text style={eyebrow}>Gender</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {GENDER_OPTIONS.map((opt) => (
              <Pill
                key={opt.id}
                active={opt.id === gender}
                label={opt.label}
                onPress={() => setGender(opt.id)}
              />
            ))}
          </View>
        </View>

        {/* Race */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={eyebrow}>Race</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {RACE_OPTIONS.map((opt) => (
              <Pill
                key={opt.id}
                active={opt.id === race}
                label={opt.label}
                onPress={() => setRace(opt.id)}
              />
            ))}
          </View>
        </View>

        {/* Roll button */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Pressable
            onPress={handleRoll}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: pressed ? T.goldEdge : T.gold,
            })}
          >
            <Glyph name="spark" size={18} color={T.bg} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: T.bg }}>
              Roll name
            </Text>
          </Pressable>
        </View>

        {/* History */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={eyebrow}>History</Text>
        </View>
        {history.length === 0 ? (
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
              Roll a name to begin. Tap any past roll to copy.
            </Text>
          </View>
        ) : (
          history.map((n, i) => {
            const full = `${n.first}${n.last ? ` ${n.last}` : ""}`;
            const glyph = RACE_GLYPH[n.race];
            const isLatest = i === 0;
            const isCopied = copied === full;
            return (
              <Pressable
                key={`${n.rolledAt}-${i}`}
                onPress={() => handleCopy(full)}
                style={({ pressed }) => ({
                  marginHorizontal: 16,
                  marginBottom: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: isLatest
                    ? T.goldSoft
                    : pressed
                      ? T.bgCard
                      : T.bgRaise,
                  borderWidth: 1,
                  borderColor: isLatest ? T.goldEdge : T.rule,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                })}
              >
                <Glyph
                  name={glyph}
                  size={18}
                  color={isLatest ? T.gold : T.ink3}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: isLatest ? 18 : 15,
                      fontWeight: "600",
                      color: isLatest ? T.ink : T.ink2,
                    }}
                  >
                    {full}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: isCopied ? T.gold : T.ink3,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {isCopied ? "Copied" : n.race}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function Pill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? T.goldSoft : T.bgChip,
        borderWidth: 1,
        borderColor: active ? T.goldEdge : T.rule,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "500",
          color: active ? T.gold : T.ink2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const eyebrow = {
  fontSize: 10,
  color: T.ink3,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};
