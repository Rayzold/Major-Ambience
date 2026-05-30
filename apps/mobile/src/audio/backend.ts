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
 * Called once before the first loadTrack(). Without this iOS routes
 * audio through the silent switch (no playback when muted).
 *
 * `shouldPlayInBackground` pairs with the `expo-audio` config plugin
 * in app.json (`enableBackgroundPlayback: true`), which adds the iOS
 * `UIBackgroundModes: ["audio"]` entry and the Android
 * `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission + `AudioControlsService`
 * declaration. Without either half the OS pauses us at backgrounding.
 *
 * `interruptionMode: "doNotMix"` is required for `setActiveForLockScreen`
 * (see the docs note on AudioMode). It also matches the GM-session use
 * case: when ambient music starts, other audio apps should yield, not
 * keep playing at lowered volume.
 */
export function ensureAudioMode(): Promise<void> {
  if (!_audioModePromise) {
    _audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch((err) => {
      console.warn("setAudioModeAsync failed:", err);
    });
  }
  return _audioModePromise;
}
