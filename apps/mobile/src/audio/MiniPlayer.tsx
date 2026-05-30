// Mini-player surfaced above the tab bar on every screen. Shows the
// currently playing track (chip color + title + pack), play/pause, and
// skip. Hidden when nothing is loaded. Tap to expand to full Now Playing.

import { Pressable, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_MONO } from "../tokens";
import { Glyph } from "../Glyph";
import { cycleLoopMode, skipNext, stop, togglePlay, usePlayer } from "./store";

export function MiniPlayer() {
  const router = useRouter();
  const { nowPlaying, playing, positionSec, durationSec, queue, loopMode } = usePlayer();
  if (!nowPlaying) return null;

  const meta = CATEGORIES.find((c) => c.id === nowPlaying.category);
  const color = meta?.color ?? T.gold;
  const pct =
    durationSec > 0 ? Math.min(100, Math.max(0, (positionSec / durationSec) * 100)) : 0;

  return (
    <View
      style={{
        backgroundColor: T.bgRaise,
        borderTopWidth: 1,
        borderTopColor: T.rule,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 12,
      }}
    >
      <View
        style={{
          height: 2,
          backgroundColor: T.rule,
          borderRadius: 1,
          marginBottom: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: color,
          }}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* Tappable track info area - expands to Now Playing */}
        <Pressable
          // `now-playing` is a new route — cast to Href until Expo
          // regenerates .expo/types/router.d.ts on the next dev start.
          onPress={() => router.push("/now-playing" as Href)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: `${color}22`,
              borderWidth: 1,
              borderColor: `${color}55`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph name={meta?.glyph ?? "spark"} size={18} color={color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: T.ink, fontSize: 13, fontWeight: "600" }}
            >
              {nowPlaying.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: T.ink3, fontSize: 11, marginTop: 1 }}
            >
              {nowPlaying.pack || "—"}
              {queue.length > 0 ? `  · ${queue.length} up next` : ""}
            </Text>
          </View>
        </Pressable>
        <LoopMini
          mode={loopMode}
          onPress={() => {
            void cycleLoopMode();
          }}
        />
        <IconButton glyph={playing ? "pause" : "play"} onPress={togglePlay} tint={color} />
        <IconButton
          glyph="next"
          onPress={() => {
            void skipNext();
          }}
          tint={queue.length > 0 ? T.ink2 : T.ink3}
          disabled={queue.length === 0}
        />
        <IconButton glyph="close" onPress={stop} tint={T.ink3} />
      </View>
    </View>
  );
}

function LoopMini({
  mode,
  onPress,
}: {
  mode: "off" | "track" | "queue";
  onPress: () => void;
}) {
  const active = mode !== "off";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 32,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? T.bgCard : "transparent",
        position: "relative",
      })}
    >
      <Glyph
        name="loop"
        size={17}
        color={active ? T.gold : T.ink3}
        stroke={active ? 1.9 : 1.5}
      />
      {mode === "track" && (
        <Text
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            fontFamily: FONT_MONO,
            fontSize: 8,
            color: T.gold,
            fontWeight: "700",
          }}
        >
          1
        </Text>
      )}
    </Pressable>
  );
}

function IconButton({
  glyph,
  onPress,
  tint,
  disabled,
}: {
  glyph: string;
  onPress: () => void;
  tint: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? T.bgCard : "transparent",
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Glyph name={glyph} size={18} color={tint} />
    </Pressable>
  );
}
