import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { T, FONT_DISPLAY } from "../src/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Library</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: T.bg,
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    fontWeight: "600",
    color: T.ink,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: T.gold,
  },
});
