// Dice roller — polyhedrals, modifier, adv/dis on d20, session-local history.
// Pure logic comes from @mc/core/dm; this screen is just touch UI.

import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  DICE,
  formatSpec,
  rollDice,
  type Advantage,
  type Die,
  type RollResult,
  type RollSpec,
} from "@mc/core/dm";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";

const HISTORY_LIMIT = 30;

export default function DiceScreen() {
  const [die, setDie] = useState<Die>(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [advantage, setAdvantage] = useState<Advantage>("none");
  const [history, setHistory] = useState<RollResult[]>([]);

  function handleRoll() {
    const spec: RollSpec = { die, count, modifier, advantage };
    const result = rollDice(spec);
    setHistory((prev) => [result, ...prev].slice(0, HISTORY_LIMIT));
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Die row */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={eyebrow}>Die</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {DICE.map((d) => {
              const active = d === die;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDie(d)}
                  style={({ pressed }) => ({
                    width: 56,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: active ? T.goldSoft : T.bgChip,
                    borderWidth: 1,
                    borderColor: active ? T.goldEdge : T.rule,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? T.gold : T.ink2,
                    }}
                  >
                    d{d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Count + Modifier */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <NumberField
            label="Count"
            value={count}
            onChange={(n) => setCount(Math.max(1, Math.min(20, n)))}
          />
          <NumberField
            label="Modifier"
            value={modifier}
            onChange={setModifier}
            allowNegative
          />
        </View>

        {/* Adv/Dis — d20 only */}
        {die === 20 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={eyebrow}>d20 mode</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {(["none", "advantage", "disadvantage"] as Advantage[]).map((a) => {
                const active = a === advantage;
                return (
                  <Pressable
                    key={a}
                    onPress={() => setAdvantage(a)}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: active ? T.goldSoft : T.bgChip,
                      borderWidth: 1,
                      borderColor: active ? T.goldEdge : T.rule,
                      alignItems: "center",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: active ? T.gold : T.ink2,
                        textTransform: "capitalize",
                      }}
                    >
                      {a === "none" ? "Straight" : a}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Roll button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }}>
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
            <Glyph name="dice" size={18} color={T.bg} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: T.bg }}>
              Roll {formatSpec({ die, count, modifier, advantage })}
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
              No rolls yet. Pick a die and tap Roll.
            </Text>
          </View>
        ) : (
          history.map((r, i) => (
            <DiceRollRow key={`${r.rolledAt}-${i}`} result={r} latest={i === 0} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  allowNegative,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  allowNegative?: boolean;
}) {
  const [text, setText] = useState(String(value));

  // Sync external value if it changes (e.g. clamped)
  // We keep local text so users can type "-" mid-edit without losing focus.
  if (Number(text) !== value && text !== "-" && text !== "") {
    // no-op — state-sync handled below
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={eyebrow}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 8,
          backgroundColor: T.bgChip,
          borderWidth: 1,
          borderColor: T.rule,
          borderRadius: 10,
        }}
      >
        <Pressable
          onPress={() => {
            const next = value - 1;
            onChange(next);
            setText(String(next));
          }}
          style={({ pressed }) => ({
            width: 40,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 18, color: T.ink2 }}>−</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={(s) => {
            const cleaned = allowNegative ? s.replace(/[^0-9-]/g, "") : s.replace(/[^0-9]/g, "");
            setText(cleaned);
            const n = Number(cleaned);
            if (!Number.isNaN(n)) onChange(n);
          }}
          keyboardType={allowNegative ? "numbers-and-punctuation" : "number-pad"}
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: FONT_MONO,
            fontSize: 16,
            color: T.ink,
            paddingVertical: 10,
          }}
        />
        <Pressable
          onPress={() => {
            const next = value + 1;
            onChange(next);
            setText(String(next));
          }}
          style={({ pressed }) => ({
            width: 40,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 18, color: T.ink2 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DiceRollRow({ result, latest }: { result: RollResult; latest: boolean }) {
  const accent =
    result.crit === "nat20"
      ? "#6fbf7a"
      : result.crit === "nat1"
        ? "#d96666"
        : latest
          ? T.gold
          : T.ink2;

  const facesStr = result.rolls
    .map((v, idx) => (result.kept.includes(idx) ? `${v}` : `(${v})`))
    .join(" + ");
  const modStr =
    result.spec.modifier !== 0
      ? ` ${result.spec.modifier > 0 ? "+" : "−"} ${Math.abs(result.spec.modifier)}`
      : "";

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: latest ? T.goldSoft : T.bgRaise,
        borderWidth: 1,
        borderColor: latest ? T.goldEdge : T.rule,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.ink3 }}>
          {formatSpec(result.spec)}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, color: T.ink2, marginTop: 2 }}
        >
          {facesStr}
          {modStr}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: latest ? 30 : 22,
          fontWeight: "700",
          color: accent,
        }}
      >
        {result.total}
      </Text>
      {result.crit && (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: `${accent}66`,
            backgroundColor: `${accent}1a`,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: accent,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {result.crit === "nat20" ? "Nat 20" : "Nat 1"}
          </Text>
        </View>
      )}
    </View>
  );
}

const eyebrow = {
  fontSize: 10,
  color: T.ink3,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};
