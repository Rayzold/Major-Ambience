// Bottom tab bar — Library / Scenes / Soundboard / Search.
// Custom dark styling on top of expo-router's tabs primitive.

import { Tabs } from "expo-router";
import { Text, View, type ColorValue } from "react-native";
import { T } from "../../src/tokens";

function tabIcon(glyph: string) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View
      style={{
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color,
          fontSize: 20,
          fontWeight: focused ? "700" : "500",
          opacity: focused ? 1 : 0.85,
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.ink3,
        tabBarStyle: {
          backgroundColor: "rgba(11,9,19,0.95)",
          borderTopColor: T.rule,
          borderTopWidth: 1,
        },
        headerStyle: { backgroundColor: T.bg },
        headerTintColor: T.ink,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: tabIcon("▤"),
        }}
      />
      <Tabs.Screen
        name="scenes"
        options={{
          title: "Scenes",
          tabBarIcon: tabIcon("◫"),
        }}
      />
      <Tabs.Screen
        name="soundboard"
        options={{
          title: "Soundboard",
          tabBarIcon: tabIcon("⊞"),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: tabIcon("⌕"),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
