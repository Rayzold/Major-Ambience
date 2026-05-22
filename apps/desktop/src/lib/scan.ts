// Folder scan: ask Rust to walk the directory, then categorize and
// shape into Track[] for SQLite insertion.

import { invoke } from "@tauri-apps/api/core";
import { categorize, type Track } from "@mc/core";
import { trackIdFromMeta } from "./hash.js";

type ScannedTrackRaw = {
  path: string;
  file_name: string;
  parent_folder: string;
  parent_folder_path: string;
  size_bytes: number;
  mtime_secs: number;
};

export async function scanFolderToTracks(folderPath: string): Promise<Track[]> {
  const raw = await invoke<ScannedTrackRaw[]>("scan_folder", { path: folderPath });
  return raw.map(toTrack);
}

function toTrack(r: ScannedTrackRaw): Track {
  const cat = categorize(r.file_name, r.parent_folder);
  const title = stripExtension(r.file_name);
  return {
    id: trackIdFromMeta(r.path, r.size_bytes, r.mtime_secs),
    uri: r.path,
    title,
    pack: r.parent_folder,
    category: cat.category,
    ...(cat.subcategory ? { subcategory: cat.subcategory } : {}),
    durationMs: 0, // populated on first load; cheap enough to compute lazily.
    grade: null,
    playCount: 0,
  };
}

function stripExtension(s: string): string {
  const dot = s.lastIndexOf(".");
  return dot <= 0 ? s : s.slice(0, dot);
}
