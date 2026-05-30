// Recap composer — pin notable moments during play; each captures the
// track that was playing at the time. Persists under dm_recap.
//
// Uses the native Share API (RN built-in) for "Share recap" instead of
// the clipboard. Clean handoff to Messages / Notes / Discord without an
// extra dep — and it's the more native mobile gesture anyway.

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { getJsonConfig, setJsonConfig } from "../../src/data/config-repo";
import { usePlayer } from "../../src/audio/store";

type RecapMoment = {
  id: string;
  text: string;
  track?: string;
  at: number;
};

const CONFIG_KEY = "dm_recap";

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function recapText(moments: RecapMoment[]): string {
  // Oldest-first reads like a story; the list shows newest-first.
  const lines = [...moments]
    .sort((a, b) => a.at - b.at)
    .map((m) => `• ${m.text}${m.track ? `  (♪ ${m.track})` : ""}`);
  return `Session recap\n\n${lines.join("\n")}`;
}

export default function RecapScreen() {
  const [moments, setMoments] = useState<RecapMoment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const { nowPlaying } = usePlayer();
  const nowPlayingLabel = nowPlaying?.title;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const list = await getJsonConfig<RecapMoment[]>(db, CONFIG_KEY, []);
          if (!cancelled) {
            setMoments(Array.isArray(list) ? list : []);
            setLoaded(true);
          }
        } catch (err) {
          console.error("Recap load failed:", err);
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (!loaded) return;
    void (async () => {
      try {
        const db = await getDb();
        await setJsonConfig(db, CONFIG_KEY, moments);
      } catch (err) {
        console.error("Recap save failed:", err);
      }
    })();
  }, [moments, loaded]);

  function pin() {
    const text = input.trim();
    if (!text) return;
    const moment: RecapMoment = {
      id: rid(),
      text,
      at: Date.now(),
      ...(nowPlayingLabel ? { track: nowPlayingLabel } : {}),
    };
    setMoments((prev) => [moment, ...prev]);
    setInput("");
  }

  function editText(id: string, text: string) {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
  }

  function remove(id: string) {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  }

  function clearAll() {
    Alert.alert("Clear all moments?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => setMoments([]),
      },
    ]);
  }

  async function shareRecap() {
    if (moments.length === 0) return;
    try {
      await Share.share({
        message: recapText(moments),
        title: "Session recap",
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Pin form */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={eyebrow}>Pin a moment</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="What just happened?"
              placeholderTextColor={T.ink3}
              returnKeyType="done"
              onSubmitEditing={pin}
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: T.bgChip,
                borderWidth: 1,
                borderColor: T.rule,
                color: T.ink,
                fontSize: 14,
              }}
            />
            <Pressable
              onPress={pin}
              disabled={input.trim().length === 0}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor:
                  input.trim().length === 0
                    ? T.bgChip
                    : pressed
                      ? T.goldEdge
                      : T.gold,
              })}
            >
              <Glyph
                name="pin"
                size={14}
                color={input.trim().length === 0 ? T.ink3 : T.bg}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: input.trim().length === 0 ? T.ink3 : T.bg,
                }}
              >
                Pin
              </Text>
            </Pressable>
          </View>
          {nowPlayingLabel ? (
            <Text
              numberOfLines={1}
              style={{ fontSize: 11, color: T.ink3, marginTop: 8 }}
            >
              Will tag with ♪{" "}
              <Text style={{ color: T.ink2 }}>{nowPlayingLabel}</Text>
            </Text>
          ) : null}
        </View>

        {/* Share + clear controls (only when there's content) */}
        {moments.length > 0 && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Pressable
              onPress={shareRecap}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: pressed ? T.goldEdge : T.goldSoft,
                borderWidth: 1,
                borderColor: T.goldEdge,
              })}
            >
              <Glyph name="note" size={16} color={T.gold} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: T.gold }}>
                Share recap
              </Text>
            </Pressable>
            <Pressable
              onPress={clearAll}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: T.bgChip,
                borderWidth: 1,
                borderColor: T.rule,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 12, color: T.ink3 }}>Clear</Text>
            </Pressable>
          </View>
        )}

        {/* Moments list */}
        {moments.length === 0 ? (
          <View style={{ paddingHorizontal: 32, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 13,
                color: T.ink3,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              Pin a moment when something memorable happens. Each one tags the
              track that was playing — share the recap at the end of the session.
            </Text>
          </View>
        ) : (
          moments.map((m) => (
            <View
              key={m.id}
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: T.bgRaise,
                borderWidth: 1,
                borderColor: T.rule,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: T.ink3,
                  marginTop: 4,
                }}
              >
                {clockTime(m.at)}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextInput
                  value={m.text}
                  onChangeText={(text) => editText(m.id, text)}
                  multiline
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 14,
                    color: T.ink,
                    padding: 0,
                  }}
                />
                {m.track ? (
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 11, color: T.ink3, marginTop: 4 }}
                  >
                    ♪ {m.track}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => remove(m.id)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? T.bgChip : "transparent",
                })}
              >
                <Glyph name="close" size={14} color={T.ink3} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const eyebrow = {
  fontSize: 10,
  color: T.ink3,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};
