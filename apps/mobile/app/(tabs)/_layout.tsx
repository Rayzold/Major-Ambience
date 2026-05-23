// Bottom tab bar — Library / Scenes / Soundboard / Search.

import { Tabs } from "expo-router";
import { View, type ColorValue } from "react-native";
import { T } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";

function tabIcon(name: string) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View
      style={{
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Glyph
        name={name}
        size={22}
        stroke={focused ? 1.9 : 1.5}
        color={typeof color === "string" ? color : T.ink2}
      />
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
        options={{ title: "Library", tabBarIcon: tabIcon("library") }}
      />
      <Tabs.Screen
        name="scenes"
        options={{ title: "Scenes", tabBarIcon: tabIcon("scenes") }}
      />
      <Tabs.Screen
        name="soundboard"
        options={{ title: "Soundboard", tabBarIcon: tabIcon("soundboard") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: tabIcon("search") }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
