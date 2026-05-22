// Library tab. Mobile shell of the desktop Library — category grid.
// Real folder import + playback land in follow-up tickets.

import { Pressable, ScrollView, Text, View } from "react-native";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../../src/tokens";

export default function LibraryScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
          TONIGHT&apos;S
        </Text>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 38,
            fontWeight: "600",
            color: T.ink,
            marginTop: 2,
          }}
        >
          Library
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: T.ink2,
            marginTop: 8,
            lineHeight: 19,
          }}
        >
          Mobile beta — UI shell only. Folder import, playback, and the rest
          of the audio engine land in follow-up tickets.
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {CATEGORIES.map((c) => (
          <CategoryTile key={c.id} color={c.color} dark={c.dark} name={c.name} desc={c.desc} />
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function CategoryTile({
  color,
  dark,
  name,
  desc,
}: {
  color: string;
  dark: string;
  name: string;
  desc: string;
}) {
  return (
    <Pressable
      style={{
        width: "47%",
        backgroundColor: dark,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: `${color}33`,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: color,
          opacity: 0.85,
          marginBottom: 12,
        }}
      />
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: "600",
          color: T.ink,
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: T.ink2,
          marginTop: 4,
          lineHeight: 15,
        }}
        numberOfLines={2}
      >
        {desc}
      </Text>
    </Pressable>
  );
}
