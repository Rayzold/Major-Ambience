// Root layout. Wraps everything in the app's dark background by default.
// A persistent MiniPlayer sits below the active screen and above the
// tab bar so the now-playing surface follows the user across routes.

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { T } from "../src/tokens";
import { MiniPlayer } from "../src/audio/MiniPlayer";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: T.bg },
              headerTintColor: T.ink,
              contentStyle: { backgroundColor: T.bg },
              headerTitleStyle: { fontWeight: "600" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="category/[id]"
              options={{ title: "Category", presentation: "card" }}
            />
            <Stack.Screen name="modal" options={{ presentation: "modal", title: "About" }} />
          </Stack>
        </View>
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: T.bgRaise }}>
          <MiniPlayer />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
