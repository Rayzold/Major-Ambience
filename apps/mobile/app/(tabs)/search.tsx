import { ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { T, FONT_DISPLAY } from "../../src/tokens";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
          FIND
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
          Search
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, pack, or notes…"
          placeholderTextColor={T.ink3}
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            backgroundColor: T.bgCard,
            borderColor: T.rule,
            borderWidth: 1,
            color: T.ink,
            fontSize: 15,
          }}
        />
        <Text
          style={{
            fontSize: 12,
            color: T.ink3,
            marginTop: 16,
            fontStyle: "italic",
            lineHeight: 18,
          }}
        >
          FTS5 search lands with the mobile data layer (expo-sqlite adapter,
          mirrors the desktop tracks_fts virtual table).
        </Text>
      </View>
    </ScrollView>
  );
}
