// Module-singleton ExpoAudioBackend. The backend itself is stateless
// across React mounts, so we hold one instance for the process lifetime.
// On a dev-client reload the JS bundle is re-evaluated, so this is also
// reset — no lingering native players survive a fast refresh.

import { setAudioModeAsync } from "expo-audio";
import { ExpoAudioBackend } from "./expo-audio-backend";

let _backend: ExpoAudioBackend | null = null;
let _audioModePromise: Promise<void> | null = null;

export function getBackend(): ExpoAudioBackend {
  if (!_backend) {
    _backend = new ExpoAudioBackend();
  }
  return _backend;
}

/**
 * Configure the iOS audio session / Android focus mode. Idempotent.
 * Called once before the first loadTrack(). Without this iOS will
 * route audio through the silent switch (no playback when muted).
 */
export function ensureAudioMode(): Promise<void> {
  if (!_audioModePromise) {
    _audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false, // background audio needs EAS dev-client config; follow-up PR
      interruptionMode: "duckOthers",
    }).catch((err) => {
      console.warn("setAudioModeAsync failed:", err);
    });
  }
  return _audioModePromise;
}
