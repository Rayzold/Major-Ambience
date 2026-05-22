// Per-pad audio controller. Pads play alongside music — they share the
// master GainNode but have their own per-track GainNode and can be looped.
// Stored separately from the music playback handle in Library.tsx.

import { convertFileSrc } from "@tauri-apps/api/core";
import type { Track, TrackHandle } from "@mc/core";
import { getAudioBackend } from "./audio.js";

type PadKey = string; // `${page}-${slot}`

type PadHandle = {
  handle: TrackHandle;
  unsubscribeEnded: () => void;
};

const active = new Map<PadKey, PadHandle>();
const listeners = new Set<() => void>();

// Auto-ducking — BUILD_GUIDE.md § 4.2.
//   "When any SFX plays, ramp the music bus down to (1 - duckingAmount) over
//   150 ms, hold while at least one SFX is alive, then ramp back over 400 ms."
const DUCK_DOWN_SEC = 0.15;
const DUCK_UP_SEC = 0.4;
let duckingPct = 0.4;

export function setDuckingPct(pct: number): void {
  duckingPct = Math.max(0, Math.min(1, pct));
  // If anything is currently playing, re-apply the new amount on the fly.
  if (active.size > 0) {
    getAudioBackend().setMusicBusGain(1 - duckingPct, DUCK_DOWN_SEC);
  }
}

export function getDuckingPct(): number {
  return duckingPct;
}

function applyDuckForActiveCount(): void {
  const backend = getAudioBackend();
  if (active.size > 0) {
    backend.setMusicBusGain(1 - duckingPct, DUCK_DOWN_SEC);
  } else {
    backend.setMusicBusGain(1, DUCK_UP_SEC);
  }
}

function key(page: string, slot: number): PadKey {
  return `${page}-${slot}`;
}

function notify() {
  for (const l of listeners) l();
}

export function subscribePadState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isPadPlaying(page: string, slot: number): boolean {
  return active.has(key(page, slot));
}

export async function firePad(
  page: string,
  slot: number,
  track: Track,
  opts: { loop: boolean; volume: number },
): Promise<void> {
  const backend = getAudioBackend();
  const k = key(page, slot);
  // Re-trigger from start: stop any existing instance first (without
  // unducking — we're about to re-add an active pad).
  const previous = active.get(k);
  if (previous) {
    previous.unsubscribeEnded();
    backend.destroy(previous.handle);
    active.delete(k);
  }

  const handle = await backend.loadTrack(convertFileSrc(track.uri), {
    bus: "soundboard",
  });
  const raw = backend.getRawHandle(handle);
  if (raw) raw.audio.loop = opts.loop;
  backend.setGain(handle, opts.volume);
  backend.play(handle);

  const unsubscribeEnded = backend.onEnded(handle, () => {
    // Non-loop pads auto-clear when they finish.
    if (!opts.loop) {
      active.delete(k);
      backend.destroy(handle);
      applyDuckForActiveCount();
      notify();
    }
  });

  active.set(k, { handle, unsubscribeEnded });
  applyDuckForActiveCount();
  notify();
}

export function stopPad(page: string, slot: number): void {
  const k = key(page, slot);
  const pad = active.get(k);
  if (!pad) return;
  pad.unsubscribeEnded();
  getAudioBackend().destroy(pad.handle);
  active.delete(k);
  applyDuckForActiveCount();
  notify();
}

export function setPadVolume(page: string, slot: number, volume: number): void {
  const pad = active.get(key(page, slot));
  if (!pad) return;
  getAudioBackend().setGain(pad.handle, volume);
}

export function stopAllPads(): void {
  for (const [, pad] of active) {
    pad.unsubscribeEnded();
    getAudioBackend().destroy(pad.handle);
  }
  active.clear();
  applyDuckForActiveCount();
  notify();
}
