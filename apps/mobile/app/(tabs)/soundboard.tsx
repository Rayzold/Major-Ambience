import { ScrollView, Text, View } from "react-native";
import { T, FONT_DISPLAY } from "../../src/tokens";

export default function SoundboardScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 11, color: T.ink3, letterSpacing: 2 }}>
          INSTANT TRIGGERS
        </Text>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 38,
            fontWeight: "600",
            color: "#5cc4d9",
            marginTop: 2,
            fontStyle: "italic",
          }}
        >
          Soundboard
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: T.ink2,
            marginTop: 16,
            lineHeight: 19,
          }}
        >
          Three pages × 8 pads. Drag-to-assign and per-pad loop / volume land
          once react-native-track-player is wired (separate ticket — needs
          EAS dev-client build).
        </Text>
      </View>
    </ScrollView>
  );
}
