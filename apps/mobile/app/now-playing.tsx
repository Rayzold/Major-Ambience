// Now Playing — full-screen player view with visualizer, controls, and queue.
// Opened by tapping the MiniPlayer. Gesture-dismissible (swipe down or back).

import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../src/tokens";
import { Glyph } from "../src/Glyph";
import { playTrack, skipNext, stop, togglePlay, usePlayer } from "../src/audio/store";
import type { Track } from "@mc/core";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function NowPlayingScreen() {
  const router = useRouter();
  const { nowPlaying, playing, positionSec, durationSec, queue } = usePlayer();

  // If nothing is playing, auto-dismiss back to previous screen
  useEffect(() => {
    if (!nowPlaying) {
      router.back();
    }
  }, [nowPlaying, router]);

  if (!nowPlaying) {
    return null;
  }

  const meta = CATEGORIES.find((c) => c.id === nowPlaying.category);
  const color = meta?.color ?? T.gold;
  const dark = meta?.dark ?? T.bg;

  const progress = durationSec > 0 ? (positionSec / durationSec) * 100 : 0;

  const formatTime = (sec: number): string => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back button */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: Platform.OS === "ios" ? 60 : 20,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? T.bgCard : "transparent",
            })}
          >
            <Glyph name="close" size={20} color={T.ink2} />
          </Pressable>
          <Text
            style={{
              fontSize: 11,
              color: T.ink3,
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Now Playing
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero visualizer area */}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 40,
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: SCREEN_WIDTH - 80,
              height: SCREEN_WIDTH - 80,
              borderRadius: (SCREEN_WIDTH - 80) / 2,
              backgroundColor: dark,
              borderWidth: 2,
              borderColor: `${color}44`,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Gradient background */}
            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: `${color}22`,
              }}
            />
            {/* Pulse rings when playing */}
            {playing && <PulseRings color={color} />}
            {/* Center icon */}
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: `${color}33`,
                borderWidth: 2,
                borderColor: `${color}66`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Glyph name={meta?.glyph ?? "spark"} size={48} color={color} />
            </View>
          </View>
        </View>

        {/* Track info */}
        <View style={{ paddingHorizontal: 32, paddingBottom: 24 }}>
          {/* Category chip */}
          <View
            style={{
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: `${color}1f`,
              borderWidth: 1,
              borderColor: `${color}44`,
              marginBottom: 16,
            }}
          >
            <Glyph name={meta?.glyph ?? "spark"} size={12} color={color} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {meta?.name ?? "Unknown"}
            </Text>
          </View>

          {/* Track title */}
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: "600",
              color: T.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {nowPlaying.title}
          </Text>

          {/* Pack / Subcategory */}
          <Text
            style={{
              fontSize: 14,
              color: T.ink2,
              textAlign: "center",
            }}
          >
            {nowPlaying.pack || "Unknown Pack"}
            {nowPlaying.subcategory ? ` • ${nowPlaying.subcategory}` : ""}
          </Text>
        </View>

        {/* Progress bar and times */}
        <View style={{ paddingHorizontal: 32, paddingBottom: 16 }}>
          <View
            style={{
              height: 4,
              backgroundColor: T.bgCard,
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: color,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: T.ink3,
                fontFamily: "monospace",
              }}
            >
              {formatTime(positionSec)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: T.ink3,
                fontFamily: "monospace",
              }}
            >
              {formatTime(durationSec)}
            </Text>
          </View>
        </View>

        {/* Playback controls */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            paddingVertical: 32,
          }}
        >
          {/* Skip back / Stop */}
          <Pressable
            onPress={stop}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? T.bgCard : T.bgRaise,
              borderWidth: 1,
              borderColor: T.rule,
            })}
          >
            <Glyph name="close" size={24} color={T.ink2} />
          </Pressable>

          {/* Play/Pause (large) */}
          <Pressable
            onPress={togglePlay}
            style={({ pressed }) => ({
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? color : `${color}dd`,
              borderWidth: 2,
              borderColor: color,
              shadowColor: color,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            })}
          >
            <Glyph
              name={playing ? "pause" : "play"}
              size={36}
              color={T.bg}
              stroke={2.2}
            />
          </Pressable>

          {/* Skip forward */}
          <Pressable
            onPress={() => {
              void skipNext();
            }}
            disabled={queue.length === 0}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? T.bgCard : T.bgRaise,
              borderWidth: 1,
              borderColor: T.rule,
              opacity: queue.length === 0 ? 0.4 : 1,
            })}
          >
            <Glyph name="next" size={24} color={T.ink2} />
          </Pressable>
        </View>

        {/* Queue section */}
        {queue.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <Text
              style={{
                fontSize: 11,
                color: T.ink3,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 12,
                paddingHorizontal: 12,
              }}
            >
              Up Next • {queue.length}
            </Text>
            {queue.slice(0, 5).map((track, idx) => (
              <QueueItem
                key={track.id}
                track={track}
                index={idx + 1}
                onPress={() => {
                  void playTrack(track, queue);
                }}
              />
            ))}
            {queue.length > 5 && (
              <Text
                style={{
                  fontSize: 12,
                  color: T.ink3,
                  fontStyle: "italic",
                  textAlign: "center",
                  paddingVertical: 12,
                }}
              >
                + {queue.length - 5} more
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function QueueItem({
  track,
  index,
  onPress,
}: {
  track: Track;
  index: number;
  onPress: () => void;
}) {
  const meta = CATEGORIES.find((c) => c.id === track.category);
  const color = meta?.color ?? T.ink2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: pressed ? T.bgCard : "transparent",
        marginBottom: 4,
      })}
    >
      <Text
        style={{
          fontSize: 12,
          color: T.ink3,
          fontFamily: "monospace",
          width: 20,
        }}
      >
        {index}
      </Text>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          backgroundColor: `${color}22`,
          borderWidth: 1,
          borderColor: `${color}33`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Glyph name={meta?.glyph ?? "spark"} size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: T.ink,
          }}
        >
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            color: T.ink3,
            marginTop: 2,
          }}
        >
          {track.pack || "—"}
        </Text>
      </View>
    </Pressable>
  );
}

// Animated pulse rings component
function PulseRings({ color }: { color: string }) {
  const [anim1] = useState(new Animated.Value(0));
  const [anim2] = useState(new Animated.Value(0));
  const [anim3] = useState(new Animated.Value(0));

  useEffect(() => {
    const createPulse = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const pulse1 = createPulse(anim1, 0);
    const pulse2 = createPulse(anim2, 800);
    const pulse3 = createPulse(anim3, 1600);

    pulse1.start();
    pulse2.start();
    pulse3.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
    };
  }, [anim1, anim2, anim3]);

  const createRingStyle = (animValue: Animated.Value) => {
    return {
      position: "absolute" as const,
      width: "100%" as const,
      height: "100%" as const,
      borderRadius: 1000,
      borderWidth: 2,
      borderColor: color,
      opacity: animValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.6, 0.3, 0],
      }),
      transform: [
        {
          scale: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1.3],
          }),
        },
      ],
    };
  };

  return (
    <>
      <Animated.View style={createRingStyle(anim1)} />
      <Animated.View style={createRingStyle(anim2)} />
      <Animated.View style={createRingStyle(anim3)} />
    </>
  );
}
