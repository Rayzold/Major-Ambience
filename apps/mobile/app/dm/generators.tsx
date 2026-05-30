// Standalone roll tables — loot, NPC, tavern, settlement, weather, crits,
// fumbles, wild magic, traps, quest hooks. Single horizontally-scrolling
// generator picker; history filtered to the active table.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  GENERATORS,
  rollGenerator,
  type GeneratorResult,
} from "@mc/core/dm";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";

const HISTORY_LIMIT = 20;

export default function GeneratorsScreen() {
  const [activeId, setActiveId] = useState<string>(GENERATORS[0]!.id);
  const [history, setHistory] = useState<GeneratorResult[]>([]);

  const active = useMemo(
    () => GENERATORS.find((g) => g.id === activeId) ?? GENERATORS[0]!,
    [activeId],
  );

  function generate() {
    const result = rollGenerator(active);
    setHistory((prev) => [result, ...prev].slice(0, HISTORY_LIMIT));
  }

  const visible = history.filter((r) => r.generatorId === active.id);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Generator selector — horizontal scroll of pills */}
        <View style={{ paddingTop: 16, paddingBottom: 10 }}>
          <Text style={[eyebrow, { paddingHorizontal: 16 }]}>Table</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              gap: 6,
            }}
          >
            {GENERATORS.map((g) => {
              const isActive = g.id === active.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setActiveId(g.id)}
                  style={({ pressed }) => ({
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: isActive ? T.goldSoft : T.bgChip,
                    borderWidth: 1,
                    borderColor: isActive ? T.goldEdge : T.rule,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: isActive ? T.gold : T.ink2,
                    }}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Active blurb */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 12,
              color: T.ink3,
              fontStyle: "italic",
              lineHeight: 17,
            }}
          >
            {active.blurb}
          </Text>
        </View>

        {/* Generate button */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Pressable
            onPress={generate}
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
              Generate {active.name}
            </Text>
          </Pressable>
        </View>

        {/* History */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={eyebrow}>Recent</Text>
        </View>
        {visible.length === 0 ? (
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
              Tap Generate to roll on the {active.name} table.
            </Text>
          </View>
        ) : (
          visible.map((r, i) => {
            const isLatest = i === 0;
            const single = r.parts.length === 1;
            return (
              <View
                key={r.at}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: isLatest ? T.goldSoft : T.bgRaise,
                  borderWidth: 1,
                  borderColor: isLatest ? T.goldEdge : T.rule,
                }}
              >
                {single ? (
                  <Text
                    style={{
                      fontFamily: isLatest ? FONT_DISPLAY : undefined,
                      fontSize: isLatest ? 16 : 13,
                      fontWeight: isLatest ? "600" : "500",
                      color: isLatest ? T.ink : T.ink2,
                      lineHeight: 22,
                    }}
                  >
                    {r.parts[0]!.value}
                  </Text>
                ) : (
                  <View style={{ gap: 4 }}>
                    {r.parts.map((p, j) => (
                      <View
                        key={j}
                        style={{
                          flexDirection: "row",
                          alignItems: "baseline",
                          gap: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: T.ink3,
                            width: 64,
                          }}
                        >
                          {p.label}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            fontSize: isLatest ? 14 : 12,
                            fontWeight: isLatest ? "600" : "500",
                            color: isLatest ? T.ink : T.ink2,
                            lineHeight: 18,
                          }}
                        >
                          {p.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
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
