// DM Tools hub — grid of cards drilling into each tool's stack route.
// PR-1 ships the three pure-logic tools (Dice, Names, Generators).
// Initiative / XP / Recap / Encounters / Timers come in subsequent PRs.

import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { T, FONT_DISPLAY } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";

type Tool = {
  id: string;
  label: string;
  eyebrow: string;
  blurb: string;
  glyph: string;
  href: Href | null;
};

const TOOLS: Tool[] = [
  {
    id: "dice",
    label: "Dice",
    eyebrow: "Roller",
    blurb: "Polyhedral roller with modifier + adv/dis.",
    glyph: "dice",
    href: "/dm/dice" as Href,
  },
  {
    id: "names",
    label: "Names",
    eyebrow: "NPCs",
    blurb: "Race + gender NPC name roller.",
    glyph: "mask",
    href: "/dm/names" as Href,
  },
  {
    id: "generators",
    label: "Generators",
    eyebrow: "Roll tables",
    blurb: "Loot, NPC, tavern, weather, quest hooks…",
    glyph: "note",
    href: "/dm/generators" as Href,
  },
  {
    id: "initiative",
    label: "Initiative",
    eyebrow: "Tracker",
    blurb: "HP, AC, turn order, conditions.",
    glyph: "swords",
    href: "/dm/initiative" as Href,
  },
  {
    id: "ledger",
    label: "Ledger",
    eyebrow: "XP & loot",
    blurb: "Party XP + per-player split + loot list.",
    glyph: "star",
    href: "/dm/ledger" as Href,
  },
  {
    id: "recap",
    label: "Recap",
    eyebrow: "Session log",
    blurb: "Pin moments tagged with the playing track.",
    glyph: "theatre",
    href: "/dm/recap" as Href,
  },
  // Placeholders for PR-3 — track picker + ducking dependencies.
  {
    id: "encounters",
    label: "Encounters",
    eyebrow: "Random tables",
    blurb: "Coming soon — tables bound to tracks.",
    glyph: "compass",
    href: null,
  },
  {
    id: "timers",
    label: "Timers",
    eyebrow: "Countdown",
    blurb: "Coming soon — tension timers with stingers.",
    glyph: "clock",
    href: null,
  },
];

export default function DmToolsScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
            BEHIND THE SCREEN
          </Text>
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 38,
              fontWeight: "600",
              color: T.ink,
              marginTop: 2,
              fontStyle: "italic",
            }}
          >
            DM Tools
          </Text>
        </View>

        {/* Intro */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text style={{ fontSize: 13, color: T.ink2, lineHeight: 19 }}>
            Quick utilities for the table — dice, names, generators, and more.
            Tap a card to open.
          </Text>
        </View>

        {/* Grid */}
        <View
          style={{
            paddingHorizontal: 12,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onPress={() => {
                if (tool.href) router.push(tool.href);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ToolCard({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  const disabled = tool.href === null;
  return (
    <View style={{ width: "50%", padding: 8 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          borderRadius: 14,
          backgroundColor: T.bgRaise,
          borderWidth: 1,
          borderColor: T.rule,
          padding: 16,
          minHeight: 148,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: T.goldSoft,
            borderWidth: 1,
            borderColor: T.goldEdge,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Glyph name={tool.glyph} size={20} color={T.gold} />
        </View>
        <Text
          style={{
            fontSize: 10,
            color: T.ink3,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          {tool.eyebrow}
        </Text>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontWeight: "600",
            color: T.ink,
            marginBottom: 6,
          }}
        >
          {tool.label}
        </Text>
        <Text style={{ fontSize: 11, color: T.ink2, lineHeight: 15 }}>
          {tool.blurb}
        </Text>
      </Pressable>
    </View>
  );
}
