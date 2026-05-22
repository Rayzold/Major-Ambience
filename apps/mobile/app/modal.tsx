import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { T, FONT_DISPLAY } from "../src/tokens";

export default function AboutModal() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 24 }}>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 32,
            fontWeight: "600",
            color: T.ink,
          }}
        >
          Major <Text style={{ fontStyle: "italic", color: T.gold }}>Ambience</Text>
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: T.ink2,
            marginTop: 14,
            lineHeight: 19,
          }}
        >
          Mobile beta. Music, ambience, and sound effects for tabletop role-playing games.
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: T.ink3,
            marginTop: 20,
            fontStyle: "italic",
          }}
        >
          Folder import + audio engine land in follow-up tickets. UI shell only.
        </Text>
      </View>
      <StatusBar style="light" />
    </ScrollView>
  );
}
