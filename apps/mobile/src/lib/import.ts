// Mobile library import. Driver for expo-document-picker → categorize
// → expo-sqlite insert. Wires the desktop's pure-TS categorize logic
// (which is platform-agnostic) into a phone-shaped folder-less flow.
//
// Why a custom picker instead of a folder import:
//   - iOS has no folder picker. expo-document-picker returns individual
//     files chosen via the Files share sheet, which is the iOS-native way
//     to import audio from iCloud Drive, Dropbox, etc.
//   - Android has ACTION_OPEN_DOCUMENT_TREE for folder import but exposing
//     that through Expo needs the SAF plugin / a dev client. Multi-file
//     selection via the standard picker is the path-of-least-resistance
//     for v1 — same API as iOS, no extra build config.
//
// What we keep across launches:
//   - The picker (default `copyToCacheDirectory: true`) places each picked
//     file in the app's cache directory and returns a stable `file://` URI.
//     That URI survives launches (until the OS evicts the cache or the
//     user clears app data).

import * as DocumentPicker from "expo-document-picker";
import { categorize, type Track } from "@mc/core";
import { trackKey } from "@mc/core";
import { getDb } from "../data/db";
import { insertTracks } from "../data/tracks-repo";

export type ImportSummary = {
  imported: number;
  cancelled: boolean;
};

/**
 * Open the system document picker, categorize each selected audio file,
 * and write the resulting tracks into the local sqlite DB. Returns a
 * summary the caller can use to update the UI.
 */
export async function importTracks(): Promise<ImportSummary> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return { imported: 0, cancelled: true };
  }

  const tracks: Track[] = result.assets.map(assetToTrack);
  if (tracks.length === 0) {
    return { imported: 0, cancelled: false };
  }

  const db = await getDb();
  await insertTracks(db, tracks);

  return { imported: tracks.length, cancelled: false };
}

function assetToTrack(asset: DocumentPicker.DocumentPickerAsset): Track {
  const fileName = asset.name ?? "Unknown.mp3";

  // Mobile picker doesn't give us a real parent folder path — the file is
  // copied into cache and we get back a flat URI. We approximate the
  // "parent folder" hint from the file name itself by stripping any
  // bracketed pack tags. In practice users on mobile pick AudioHero packs
  // out of Files / iCloud where the pack name is embedded in the file
  // name (e.g. "ShadowsFall - Approaching Doom.mp3"), so the file-name
  // path through categorize() does most of the work.
  const inferredPack = inferPackFromFileName(fileName);
  const parentHint = inferredPack;
  const { category, subcategory } = categorize(fileName, parentHint);

  // Title-from-filename mirrors the desktop scan path (pack = parent folder,
  // title = filename minus extension). On mobile the same filename has the
  // pack embedded as a prefix, so strip it back off — without this, the
  // sync trackKey(title, pack) wouldn't match a desktop-imported copy of
  // the same file and grades wouldn't cross devices.
  const title = stripPackPrefix(stripExtension(fileName), inferredPack);

  // Content-addressed id so re-importing the same audio (same title + pack
  // + byte size) idempotently replaces the existing row instead of duping.
  const id = trackKey(`${title}|${asset.size ?? 0}`, inferredPack);

  return {
    id,
    uri: asset.uri,
    title,
    pack: inferredPack,
    category,
    ...(subcategory ? { subcategory } : {}),
    durationMs: 0,
    grade: null,
    playCount: 0,
  };
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Remove a leading `<pack> - ` / `<pack>_` prefix from a filename-derived
 * title so it lines up with the desktop convention (title = file stem,
 * pack = parent folder). Without this, the same audio file imported on
 * desktop and mobile produces two different `trackKey`s and cloud sync
 * can't carry grades between them.
 */
function stripPackPrefix(titleNoExt: string, pack: string): string {
  if (!pack) return titleNoExt;
  const dashPrefix = `${pack} - `;
  if (titleNoExt.startsWith(dashPrefix)) return titleNoExt.slice(dashPrefix.length);
  const underPrefix = `${pack}_`;
  if (titleNoExt.startsWith(underPrefix)) return titleNoExt.slice(underPrefix.length);
  return titleNoExt;
}

function inferPackFromFileName(name: string): string {
  // AudioHero convention: "Pack Name - Track Title.mp3" or
  // "Pack Name_Track Title.mp3". Anything before the first ' - ' or '_'
  // is treated as a pack hint. Best-effort — falls back to "" so the
  // track is still importable without a recognizable pack.
  const noExt = stripExtension(name);
  const dash = noExt.indexOf(" - ");
  if (dash > 0) return noExt.slice(0, dash);
  const under = noExt.indexOf("_");
  if (under > 0) return noExt.slice(0, under);
  return "";
}
