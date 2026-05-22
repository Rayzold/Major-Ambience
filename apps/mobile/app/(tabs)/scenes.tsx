import { ScrollView, Text, View } from "react-native";
import { T, FONT_DISPLAY } from "../../src/tokens";

export default function ScenesScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
          SNAPSHOTS
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
          Scenes
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: T.ink2,
            marginTop: 16,
            lineHeight: 19,
          }}
        >
          Snapshot the active category, queue, fade, and volume. Lands when
          the mobile data layer (expo-sqlite adapter) ships.
        </Text>
      </View>
    </ScrollView>
  );
}
