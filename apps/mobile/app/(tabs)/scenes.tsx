// Scenes — save and restore complete mood snapshots.
// Each scene captures: category, queue, soundboard page, fade, ducking, volumes.

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { Scene, CategoryId, Track } from "@mc/core";
import { CATEGORIES } from "@mc/ui/categories";
import { T, FONT_DISPLAY } from "../../src/tokens";
import { Glyph } from "../../src/Glyph";
import { getDb } from "../../src/data/db";
import { listScenes, saveScene, deleteScene } from "../../src/data/scenes-repo";
import { listTracks } from "../../src/data/tracks-repo";
import { usePlayer } from "../../src/audio/store";

export default function ScenesScreen() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const { nowPlaying, queue } = usePlayer();

  const refresh = useCallback(async () => {
    try {
      const db = await getDb();
      const list = await listScenes(db);
      setScenes(list);
    } catch (err) {
      console.error("Scenes refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleCreateScene = useCallback(
    async (name: string) => {
      try {
        const db = await getDb();
        const tracks = await listTracks(db);
        
        // Build queue from current player state
        const trackIds = queue.map((t) => t.id);
        if (nowPlaying && !trackIds.includes(nowPlaying.id)) {
          trackIds.unshift(nowPlaying.id);
        }

        const newScene: Scene = {
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: name.trim() || "Untitled Scene",
          primaryCategory: nowPlaying?.category ?? "combat",
          accentCategories: [],
          trackIds,
          soundboardPage: "A",
          fadeMs: 600,
          duckingPct: 50,
          volumes: {},
          createdAt: Date.now(),
        };

        await saveScene(db, newScene);
        await refresh();
        setCreating(false);
        Alert.alert("Scene saved", `"${newScene.name}" has been saved.`);
      } catch (err) {
        Alert.alert("Failed to save", err instanceof Error ? err.message : String(err));
      }
    },
    [nowPlaying, queue, refresh],
  );

  const handleRestoreScene = useCallback(async (scene: Scene) => {
    try {
      const db = await getDb();
      const tracks = await listTracks(db);
      
      // Load tracks from scene
      const sceneTracks = scene.trackIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is Track => t !== undefined);

      if (sceneTracks.length === 0) {
        Alert.alert("Cannot restore", "No tracks found in this scene.");
        return;
      }

      Alert.alert(
        "Restore Scene",
        `Load "${scene.name}"?\n\n${sceneTracks.length} track${sceneTracks.length === 1 ? "" : "s"} will be queued.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Load",
            onPress: async () => {
              try {
                // Import playTrack from audio store
                const { playTrack } = await import("../../src/audio/store");
                
                // Play first track with rest as queue
                await playTrack(sceneTracks[0], sceneTracks.slice(1));
                
                Alert.alert("Scene loaded", `"${scene.name}" is now playing.`);
              } catch (err) {
                Alert.alert("Failed to restore", err instanceof Error ? err.message : String(err));
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert("Failed to load scene", err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleDeleteScene = useCallback(
    async (scene: Scene) => {
      Alert.alert(
        "Delete Scene",
        `Delete "${scene.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const db = await getDb();
                await deleteScene(db, scene.id);
                await refresh();
              } catch (err) {
                Alert.alert("Failed to delete", err instanceof Error ? err.message : String(err));
              }
            },
          },
        ],
      );
    },
    [refresh],
  );

  const handleUpdateScene = useCallback(
    async (updated: Scene) => {
      try {
        const db = await getDb();
        await saveScene(db, updated);
        await refresh();
        setEditingScene(null);
      } catch (err) {
        Alert.alert("Failed to update", err instanceof Error ? err.message : String(err));
      }
    },
    [refresh],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={T.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
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
        </View>

        {/* Info */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Text style={{ fontSize: 13, color: T.ink2, lineHeight: 19 }}>
            Save the current mood—category, queue, soundboard page, and settings—as a named scene. Tap to restore.
          </Text>
        </View>

        {/* Create button */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Pressable
            onPress={() => setCreating(true)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: pressed ? T.goldEdge : T.goldSoft,
              borderWidth: 1,
              borderColor: T.goldEdge,
            })}
          >
            <Glyph name="plus" size={18} color={T.gold} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: T.gold }}>
              Create Scene
            </Text>
          </Pressable>
        </View>

        {/* Scene list */}
        {scenes.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ fontSize: 13, color: T.ink3, fontStyle: "italic", textAlign: "center", lineHeight: 20 }}>
              No scenes yet. Create one to capture the current mood—active category, queue, soundboard page, and all your settings—so you can restore it instantly later.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onPress={() => handleRestoreScene(scene)}
                onLongPress={() => setEditingScene(scene)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create scene modal */}
      {creating && (
        <CreateSceneModal
          onSave={handleCreateScene}
          onClose={() => setCreating(false)}
        />
      )}

      {/* Edit scene modal */}
      {editingScene && (
        <EditSceneModal
          scene={editingScene}
          onUpdate={handleUpdateScene}
          onDelete={() => handleDeleteScene(editingScene)}
          onClose={() => setEditingScene(null)}
        />
      )}
    </View>
  );
}

function SceneCard({
  scene,
  onPress,
  onLongPress,
}: {
  scene: Scene;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = CATEGORIES.find((c) => c.id === scene.primaryCategory);
  const color = meta?.color ?? T.gold;
  const dark = meta?.dark ?? T.bg;

  const date = new Date(scene.createdAt);
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        marginBottom: 12,
        borderRadius: 14,
        backgroundColor: dark,
        borderWidth: 2,
        borderColor: `${color}55`,
        padding: 16,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `${color}33`,
            borderWidth: 1,
            borderColor: `${color}66`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Glyph name={meta?.glyph ?? "scenes"} size={22} color={color} />
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: `${color}22`,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {meta?.name ?? "Scene"}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
          fontWeight: "600",
          color: T.ink,
          marginBottom: 6,
        }}
      >
        {scene.name}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Glyph name="queue" size={14} color={T.ink3} />
          <Text style={{ fontSize: 12, color: T.ink3 }}>
            {scene.trackIds.length} track{scene.trackIds.length === 1 ? "" : "s"}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: T.ink3 }}>•</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Glyph name="clock" size={14} color={T.ink3} />
          <Text style={{ fontSize: 12, color: T.ink3 }}>{dateStr}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CreateSceneModal({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: T.bgRaise,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 24,
            paddingBottom: 40,
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 24,
              fontWeight: "600",
              color: T.ink,
              marginBottom: 8,
            }}
          >
            Create Scene
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: T.ink2,
              marginBottom: 20,
              lineHeight: 18,
            }}
          >
            Name this scene to save the current mood—your active category, queue, and settings.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Scene name (e.g., 'Dragon Fight')"
            placeholderTextColor={T.ink3}
            autoFocus
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: T.bgCard,
              borderWidth: 1,
              borderColor: T.rule,
              color: T.ink,
              fontSize: 15,
              marginBottom: 20,
            }}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: pressed ? T.bgCard : "transparent",
                borderWidth: 1,
                borderColor: T.rule,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: T.ink2 }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(name)}
              disabled={name.trim().length === 0}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor:
                  name.trim().length === 0
                    ? T.bgCard
                    : pressed
                      ? T.goldEdge
                      : T.gold,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: name.trim().length === 0 ? T.ink3 : T.bg,
                }}
              >
                Save Scene
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditSceneModal({
  scene,
  onUpdate,
  onDelete,
  onClose,
}: {
  scene: Scene;
  onUpdate: (scene: Scene) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(scene.name);

  const handleSave = () => {
    if (name.trim().length === 0) return;
    onUpdate({ ...scene, name: name.trim() });
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: T.bgRaise,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 24,
            paddingBottom: 40,
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 24,
              fontWeight: "600",
              color: T.ink,
              marginBottom: 20,
            }}
          >
            Edit Scene
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Scene name"
            placeholderTextColor={T.ink3}
            autoFocus
            selectTextOnFocus
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: T.bgCard,
              borderWidth: 1,
              borderColor: T.rule,
              color: T.ink,
              fontSize: 15,
              marginBottom: 20,
            }}
          />

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: pressed ? "#d96a4a" : "transparent",
                borderWidth: 1,
                borderColor: "#d96a4a",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#d96a4a" }}>
                Delete
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={name.trim().length === 0}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor:
                  name.trim().length === 0
                    ? T.bgCard
                    : pressed
                      ? T.goldEdge
                      : T.gold,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: name.trim().length === 0 ? T.ink3 : T.bg,
                }}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 12,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: T.ink3 }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
