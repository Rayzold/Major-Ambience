// Tension countdown timers — multiple named offscreen clocks the GM can
// run alongside scene playback. Each timer optionally binds a stinger
// track that fires (soundboard bus, auto-ducks music) when its clock
// reaches zero.
//
// Configs (name, duration, stingerTrackId) persist under dm_countdown_timers.
// Runtime (remaining seconds, running flag) is component-local — a
// countdown shouldn't resume mid-flight after a screen swap or app
// restart.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { Track } from "@mc/core";
import { T, FONT_DISPLAY, FONT_MONO } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { getJsonConfig, setJsonConfig } from "../../src/data/config-repo";
import { listTracks } from "../../src/data/tracks-repo";
import { fireSfx } from "../../src/audio/soundboard-store";
import { TrackPickerOverlay } from "../../src/components/TrackPickerOverlay";

type CountdownTimer = {
  id: string;
  name: string;
  durationSec: number;
  stingerTrackId?: string;
};

type Runtime = { remaining: number; running: boolean };

const CONFIG_KEY = "dm_countdown_timers";

const PRESETS: Array<{ label: string; sec: number }> = [
  { label: "1m", sec: 60 },
  { label: "3m", sec: 180 },
  { label: "5m", sec: 300 },
  { label: "10m", sec: 600 },
];

function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function TimersScreen() {
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [runtime, setRuntime] = useState<Record<string, Runtime>>({});
  const [picking, setPicking] = useState<{ timerId: string } | null>(null);
  const [tracksById, setTracksById] = useState<ReadonlyMap<string, Track>>(
    new Map(),
  );

  // Refs the 1Hz tick reads so it never closes over stale state.
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  const timersRef = useRef(timers);
  timersRef.current = timers;
  const tracksRef = useRef(tracksById);
  tracksRef.current = tracksById;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const db = await getDb();
          const [list, tracks] = await Promise.all([
            getJsonConfig<CountdownTimer[]>(db, CONFIG_KEY, []),
            listTracks(db),
          ]);
          if (cancelled) return;
          setTimers(Array.isArray(list) ? list : []);
          setTracksById(new Map(tracks.map((t) => [t.id, t])));
          setLoaded(true);
        } catch (err) {
          console.error("Timers load failed:", err);
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
        await setJsonConfig(db, CONFIG_KEY, timers);
      } catch (err) {
        console.error("Timers save failed:", err);
      }
    })();
  }, [timers, loaded]);

  // Sync runtime entries to the current timer list: add a Runtime for
  // every new timer; prune for any removed.
  useEffect(() => {
    setRuntime((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const t of timers) {
        if (!next[t.id]) {
          next[t.id] = { remaining: t.durationSec, running: false };
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!timers.some((t) => t.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [timers]);

  const anyRunning = useMemo(
    () => Object.values(runtime).some((r) => r.running),
    [runtime],
  );

  // Single 1Hz interval, mounted only while at least one timer runs.
  useEffect(() => {
    if (!anyRunning) return undefined;
    const iv = setInterval(() => {
      const cur = runtimeRef.current;
      const next: Record<string, Runtime> = { ...cur };
      const zeroed: string[] = [];
      let changed = false;
      for (const id of Object.keys(cur)) {
        const r = cur[id]!;
        if (!r.running) continue;
        changed = true;
        const rem = r.remaining - 1;
        if (rem <= 0) {
          next[id] = { remaining: 0, running: false };
          zeroed.push(id);
        } else {
          next[id] = { remaining: rem, running: true };
        }
      }
      // Fire stingers AFTER updating state so the row visibly hits 0:00
      // before audio kicks in (UI parity with desktop).
      for (const id of zeroed) {
        const t = timersRef.current.find((x) => x.id === id);
        if (!t?.stingerTrackId) continue;
        const track = tracksRef.current.get(t.stingerTrackId);
        if (track) void fireSfx(track);
      }
      if (changed) setRuntime(next);
    }, 1000);
    return () => clearInterval(iv);
  }, [anyRunning]);

  // ── Config ops ──
  function addTimer() {
    setTimers((prev) => [
      ...prev,
      { id: rid(), name: "Timer", durationSec: 60 },
    ]);
  }

  function patchTimer(id: string, patch: Partial<CountdownTimer>) {
    setTimers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function bindStinger(timerId: string, track: Track) {
    patchTimer(timerId, { stingerTrackId: track.id });
  }

  function clearStinger(id: string) {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const { stingerTrackId: _s, ...rest } = t;
        void _s;
        return rest;
      }),
    );
  }

  function deleteTimer(id: string) {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }

  function setPreset(t: CountdownTimer, sec: number) {
    patchTimer(t.id, { durationSec: sec });
    setRuntime((prev) => ({
      ...prev,
      [t.id]: { remaining: sec, running: false },
    }));
  }

  // ── Runtime ops ──
  function toggle(t: CountdownTimer) {
    setRuntime((prev) => {
      const r = prev[t.id] ?? { remaining: t.durationSec, running: false };
      if (!r.running && r.remaining <= 0) {
        // Re-start from full duration once it's hit zero.
        return { ...prev, [t.id]: { remaining: t.durationSec, running: true } };
      }
      return { ...prev, [t.id]: { ...r, running: !r.running } };
    });
  }

  function reset(t: CountdownTimer) {
    setRuntime((prev) => ({
      ...prev,
      [t.id]: { remaining: t.durationSec, running: false },
    }));
  }

  function addThirty(t: CountdownTimer) {
    setRuntime((prev) => {
      const r = prev[t.id] ?? { remaining: t.durationSec, running: false };
      return { ...prev, [t.id]: { ...r, remaining: r.remaining + 30 } };
    });
  }

  const pickingTimer = timers.find((t) => t.id === picking?.timerId);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Add button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable
            onPress={addTimer}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: pressed ? T.goldEdge : T.gold,
            })}
          >
            <Glyph name="plus" size={16} color={T.bg} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: T.bg }}>
              Add timer
            </Text>
          </Pressable>
        </View>

        {timers.length === 0 ? (
          <View style={{ paddingHorizontal: 32, paddingTop: 20 }}>
            <Text
              style={{
                fontSize: 13,
                color: T.ink3,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              Add a timer to track an offscreen clock — a ritual,
              reinforcements, a collapsing dungeon. Bind a stinger to mark
              zero.
            </Text>
          </View>
        ) : (
          timers.map((t) => {
            const r = runtime[t.id] ?? { remaining: t.durationSec, running: false };
            const done = r.remaining <= 0;
            const stinger = t.stingerTrackId
              ? tracksById.get(t.stingerTrackId)
              : undefined;
            return (
              <TimerCard
                key={t.id}
                timer={t}
                remaining={r.remaining}
                running={r.running}
                done={done}
                stinger={stinger}
                onName={(v) => patchTimer(t.id, { name: v })}
                onToggle={() => toggle(t)}
                onReset={() => reset(t)}
                onAdd30={() => addThirty(t)}
                onPreset={(sec) => setPreset(t, sec)}
                onPickStinger={() => setPicking({ timerId: t.id })}
                onClearStinger={() => clearStinger(t.id)}
                onDelete={() => deleteTimer(t.id)}
              />
            );
          })
        )}
      </ScrollView>

      <TrackPickerOverlay
        visible={picking !== null}
        title="Tension stinger"
        subtitle={
          pickingTimer
            ? `Plays on the soundboard bus when "${pickingTimer.name || "Timer"}" hits zero.`
            : "Plays on the soundboard bus when the timer hits zero."
        }
        onPick={(track) => {
          if (picking) bindStinger(picking.timerId, track);
          setPicking(null);
        }}
        onDismiss={() => setPicking(null)}
      />
    </View>
  );
}

function TimerCard({
  timer,
  remaining,
  running,
  done,
  stinger,
  onName,
  onToggle,
  onReset,
  onAdd30,
  onPreset,
  onPickStinger,
  onClearStinger,
  onDelete,
}: {
  timer: CountdownTimer;
  remaining: number;
  running: boolean;
  done: boolean;
  stinger: Track | undefined;
  onName: (v: string) => void;
  onToggle: () => void;
  onReset: () => void;
  onAdd30: () => void;
  onPreset: (sec: number) => void;
  onPickStinger: () => void;
  onClearStinger: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        borderRadius: 12,
        backgroundColor: done ? "#d9666615" : T.bgRaise,
        borderWidth: 1,
        borderColor: done ? "#d96666" : T.rule,
      }}
    >
      {/* Name + delete */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={timer.name}
          onChangeText={onName}
          placeholder="Timer name"
          placeholderTextColor={T.ink3}
          style={{
            flex: 1,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: T.bgChip,
            borderWidth: 1,
            borderColor: T.rule,
            color: T.ink,
            fontSize: 14,
            fontWeight: "600",
          }}
        />
        <Pressable
          onPress={onDelete}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? T.bgChip : "transparent",
          })}
        >
          <Glyph name="close" size={14} color={T.ink3} />
        </Pressable>
      </View>

      {/* Big clock + transport */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: FONT_DISPLAY,
            fontSize: 48,
            fontWeight: "700",
            color: done ? "#e08a8a" : running ? T.gold : T.ink,
          }}
        >
          {fmt(remaining)}
        </Text>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? T.goldEdge : T.gold,
          })}
        >
          <Glyph name={running ? "pause" : "play"} size={20} color={T.bg} />
        </Pressable>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: T.bgChip,
            borderWidth: 1,
            borderColor: T.rule,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Glyph name="loop" size={16} color={T.ink2} />
        </Pressable>
        <Pressable
          onPress={onAdd30}
          style={({ pressed }) => ({
            paddingHorizontal: 10,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: T.bgChip,
            borderWidth: 1,
            borderColor: T.rule,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 12, color: T.ink2, fontWeight: "600" }}>
            +30s
          </Text>
        </Pressable>
      </View>

      {/* Presets */}
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        {PRESETS.map((p) => {
          const isActive = timer.durationSec === p.sec;
          return (
            <Pressable
              key={p.sec}
              onPress={() => onPreset(p.sec)}
              style={({ pressed }) => ({
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: isActive ? T.goldSoft : T.bgChip,
                borderWidth: 1,
                borderColor: isActive ? T.goldEdge : T.rule,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: FONT_MONO,
                  color: isActive ? T.gold : T.ink3,
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Stinger */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
        }}
      >
        <Pressable
          onPress={onPickStinger}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: timer.stingerTrackId ? T.goldSoft : T.bgChip,
            borderWidth: 1,
            borderColor: timer.stingerTrackId ? T.goldEdge : T.rule,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Glyph
            name="spark"
            size={13}
            color={timer.stingerTrackId ? T.gold : T.ink3}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 12,
              color: timer.stingerTrackId ? T.gold : T.ink3,
            }}
          >
            {stinger
              ? stinger.title
              : timer.stingerTrackId
                ? "(track missing)"
                : "Bind a stinger for zero"}
          </Text>
        </Pressable>
        {timer.stingerTrackId && (
          <Pressable onPress={onClearStinger} hitSlop={6}>
            <Text
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: T.ink3,
                padding: 6,
              }}
            >
              clear
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
