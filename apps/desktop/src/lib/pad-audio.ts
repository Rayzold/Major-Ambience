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
  // Re-trigger from start: stop any existing instance first.
  stopPad(page, slot);

  const handle = await backend.loadTrack(convertFileSrc(track.uri));
  const raw = backend.getRawHandle(handle);
  if (raw) raw.audio.loop = opts.loop;
  backend.setGain(handle, opts.volume);
  backend.play(handle);

  const unsubscribeEnded = backend.onEnded(handle, () => {
    // Non-loop pads auto-clear when they finish.
    if (!opts.loop) {
      active.delete(k);
      backend.destroy(handle);
      notify();
    }
  });

  active.set(k, { handle, unsubscribeEnded });
  notify();
}

export function stopPad(page: string, slot: number): void {
  const k = key(page, slot);
  const pad = active.get(k);
  if (!pad) return;
  pad.unsubscribeEnded();
  getAudioBackend().destroy(pad.handle);
  active.delete(k);
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
  notify();
}
