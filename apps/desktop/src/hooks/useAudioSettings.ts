// useAudioSettings — slice 3a of the Library.tsx god-component
// extraction (BACKLOG #2). Owns the three audio-bus settings that
// round-trip to SQLite + propagate to the audio backend:
//
//   - fadeMs      — crossfade duration applied by handlePlayTrack
//                   when switching tracks (also used by loop "track"
//                   self-crossfade trigger).
//   - masterVolume — master gain on the audio bus.
//   - duckingPct   — how far music ducks when a soundboard pad fires.
//
// Why a dedicated slice: these are persisted, cross-cut a couple of
// places (the boot effect, refreshSyncableFromDb, the scene-restore
// handler), and feed two side-effecting buses (audio backend +
// pad-audio). Lifting them out of Library narrows the surface area
// of the upcoming usePlayback extraction (slice 3b) — usePlayback can
// then just *read* fadeMs from this hook instead of also owning it.
//
// What stays in Library: handleRestoreScene (composition — it pulls
// fadeMs + masterVolume from a saved Scene and writes via this hook's
// setters). Composition layer always stays outside the slice hooks.

import { useCallback, useEffect, useState } from "react";
import { getConfigNumber, getDb, setConfig } from "@mc/data";
import { getAudioBackend } from "../lib/audio.js";
import { setDuckingPct as setPadDuckingPct } from "../lib/pad-audio.js";

const DEFAULT_FADE_MS = 2000;
const DEFAULT_VOLUME = 0.85;
const DEFAULT_DUCKING = 0.4;

export type UseAudioSettingsReturn = {
  fadeMs: number;
  masterVolume: number;
  duckingPct: number;

  /** Persist + propagate. setMasterVolume hits the audio backend's
   *  master gain; setDuckingPct hits the pad-audio bus. setFadeMs
   *  only needs to land in state — handlePlayTrack reads the live
   *  value at trigger time. */
  setFadeMs: (ms: number) => Promise<void>;
  setMasterVolume: (v: number) => Promise<void>;
  setDuckingPct: (pct: number) => Promise<void>;

  /** Re-load all three from SQLite. Called from Library's boot effect
   *  and from refreshSyncableFromDb after a cloud merge. Single source
   *  of truth for the SQLite plumbing. */
  reloadFromDb: () => Promise<void>;
};

export function useAudioSettings(): UseAudioSettingsReturn {
  const [fadeMs, setFadeMsState] = useState(DEFAULT_FADE_MS);
  const [masterVolume, setMasterVolumeState] = useState(DEFAULT_VOLUME);
  const [duckingPct, setDuckingPctState] = useState(DEFAULT_DUCKING);

  // Mirror master volume into the audio backend whenever it changes.
  // Centralized here so callers don't have to remember to call
  // backend.setMasterGain() after every state change — they just
  // await setMasterVolume() (or trigger a cloud-merge reload).
  useEffect(() => {
    getAudioBackend().setMasterGain(masterVolume);
  }, [masterVolume]);

  const setFadeMs = useCallback(async (ms: number) => {
    setFadeMsState(ms);
    const db = await getDb();
    await setConfig(db, "fade_ms", String(ms));
  }, []);

  const setMasterVolume = useCallback(async (v: number) => {
    setMasterVolumeState(v);
    // The effect above also fires setMasterGain — calling here
    // makes the volume change audible *immediately* rather than
    // after the next render commit. Belt + suspenders.
    getAudioBackend().setMasterGain(v);
    const db = await getDb();
    await setConfig(db, "master_volume", String(v));
  }, []);

  const setDuckingPct = useCallback(async (pct: number) => {
    setDuckingPctState(pct);
    setPadDuckingPct(pct);
    const db = await getDb();
    await setConfig(db, "ducking_pct", String(pct));
  }, []);

  const reloadFromDb = useCallback(async () => {
    const db = await getDb();
    const fade = await getConfigNumber(db, "fade_ms", DEFAULT_FADE_MS);
    setFadeMsState(fade);
    const vol = await getConfigNumber(db, "master_volume", DEFAULT_VOLUME);
    setMasterVolumeState(vol);
    getAudioBackend().setMasterGain(vol);
    const duck = await getConfigNumber(db, "ducking_pct", DEFAULT_DUCKING);
    setDuckingPctState(duck);
    setPadDuckingPct(duck);
  }, []);

  // Boot: hydrate all three from SQLite.
  useEffect(() => {
    void (async () => {
      try {
        await reloadFromDb();
      } catch (err) {
        console.error("[audio-settings] init failed:", err);
      }
    })();
  }, [reloadFromDb]);

  return {
    fadeMs,
    masterVolume,
    duckingPct,
    setFadeMs,
    setMasterVolume,
    setDuckingPct,
    reloadFromDb,
  };
}
