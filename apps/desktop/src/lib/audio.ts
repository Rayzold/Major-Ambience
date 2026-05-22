// Singleton WebAudioBackend for the desktop shell.

import { WebAudioBackend } from "@mc/core";

let cached: WebAudioBackend | null = null;

export function getAudioBackend(): WebAudioBackend {
  if (!cached) cached = new WebAudioBackend();
  return cached;
}
