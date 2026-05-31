// Sync export/import via Tauri dialog + Rust file I/O commands.

import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import type { AnySyncBlob } from "@mc/core";
import { applySyncBlob, buildSyncBlob, type ApplyResult } from "@mc/data";
import { getDb } from "@mc/data";

const DEVICE_ID_KEY = "device_id";

function defaultFileName(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `major-ambience-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}

async function ensureDeviceId(): Promise<string> {
  const db = await getDb();
  const { getConfig, setConfig } = await import("@mc/data");
  const existing = await getConfig(db, DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
  await setConfig(db, DEVICE_ID_KEY, id);
  return id;
}

/**
 * Prompts for a save location and writes the current state as a SyncBlob
 * JSON file. Returns the chosen path, or null if the user cancelled.
 */
export async function exportSyncBlob(): Promise<{ path: string; bytes: number } | null> {
  const path = await saveDialog({
    title: "Export sync blob",
    defaultPath: defaultFileName(),
    filters: [{ name: "Major Ambience sync", extensions: ["json"] }],
  });
  if (!path) return null;

  const db = await getDb();
  const deviceId = await ensureDeviceId();
  const blob = await buildSyncBlob(db, { deviceId });
  const contents = JSON.stringify(blob, null, 2);
  await invoke<void>("write_text_file", { path, contents });
  return { path, bytes: contents.length };
}

/**
 * Prompts for a sync blob file and parses it WITHOUT applying. Apply via
 * applyLoadedBlob() after user confirms in the modal. Returns null on
 * cancel; throws if the file is malformed.
 */
export async function pickAndLoadSyncBlob(): Promise<
  { path: string; blob: AnySyncBlob } | null
> {
  const picked = await openDialog({
    title: "Import sync blob",
    multiple: false,
    filters: [{ name: "Major Ambience sync", extensions: ["json"] }],
  });
  if (!picked || typeof picked !== "string") return null;

  const contents = await invoke<string>("read_text_file", { path: picked });
  const blob = JSON.parse(contents) as AnySyncBlob;
  // Accept both supported versions — v1 blobs from previously-shipped
  // exports are migrated on apply via ensureV2 in @mc/data.
  if (
    typeof blob !== "object" ||
    blob === null ||
    (blob.version !== 1 && blob.version !== 2)
  ) {
    throw new Error(
      "Not a valid Major Ambience sync blob (version 1 or 2 expected).",
    );
  }
  return { path: picked, blob };
}

export async function applyLoadedBlob(blob: AnySyncBlob): Promise<ApplyResult> {
  const db = await getDb();
  return applySyncBlob(db, blob);
}
