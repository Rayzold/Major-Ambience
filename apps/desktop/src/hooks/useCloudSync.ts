// useCloudSync — first slice extracted from Library.tsx as part of
// BACKLOG #2 (god-component extraction). Owns all `cloud*` state, the
// boot-load effect, the 4s debounced background-push timer, the sync
// signature, and the five user-facing handlers (request-link / verify
// / sign-out / set-base-url / set-device-label).
//
// External seams the hook needs from the surrounding library:
//   - `syncable`: the raw inputs the signature is computed from. The
//     hook intentionally does NOT subscribe to the wider library
//     state — it just builds a stable signature each render and the
//     debounce effect reacts to changes.
//   - `refreshSyncableFromDb`: called after a remote merge to reload
//     everything the merge could have touched. Lives in Library
//     because it sets a dozen pieces of library/playback state.
//   - `setScanStatus`: the shared toast banner that already carries
//     non-sync messages too.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Scene,
  SoundboardSlot,
  Track,
} from "@mc/core";
import { SyncAuthError } from "@mc/sync";
import type { ThemeId } from "@mc/ui";
import {
  getAccountEmail,
  getAuthStatus,
  getBaseUrl,
  getDeviceLabel,
  getLastSyncedAt,
  requestMagicLink,
  runSync,
  setBaseUrl as persistBaseUrl,
  setDeviceLabel as persistDeviceLabel,
  signOutCloud,
  verifyMagicCode,
} from "../lib/cloud-sync.js";
import type { RolledName } from "../layout/dm/NameGenerator.js";

/** Inputs the sync signature is built from. Deliberately narrow on
 *  Track (id + grade + note only) so playback-only churn — playCount,
 *  lastPlayedAt, durationMs — doesn't trip a sync. */
export type SyncableInputs = {
  tracks: ReadonlyArray<Pick<Track, "id" | "grade" | "note">>;
  scenes: Scene[];
  soundboard: SoundboardSlot[];
  theme: ThemeId;
  fadeMs: number;
  masterVolume: number;
  duckingPct: number;
  dmMode: boolean;
  nameHistory: RolledName[];
};

export type UseCloudSyncOptions = {
  syncable: SyncableInputs;
  /** Called after a remote merge — reload the library state from SQLite. */
  refreshSyncableFromDb: () => Promise<void>;
  /** Shared toast banner — sync events surface here alongside scans/errors. */
  setScanStatus: (s: string) => void;
};

export type UseCloudSyncReturn = {
  // Dialog open state.
  cloudSyncOpen: boolean;
  openCloudSync: () => void;
  closeCloudSync: () => void;
  // Settings + status (props for SyncSettings).
  signedIn: boolean;
  accountEmail: string | undefined;
  deviceLabel: string | undefined;
  baseUrl: string;
  lastSyncedAt: number | undefined;
  syncing: boolean;
  error: string | undefined;
  syncResult: string | undefined;
  // Handlers.
  runCloudSync: (manual: boolean) => Promise<void>;
  handleRequestLink: (email: string) => Promise<void>;
  handleVerify: (code: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleSetBaseUrl: (url: string) => Promise<void>;
  handleSetDeviceLabel: (label: string) => Promise<void>;
};

export function useCloudSync(
  opts: UseCloudSyncOptions,
): UseCloudSyncReturn {
  const { syncable, refreshSyncableFromDb, setScanStatus } = opts;

  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | undefined>(
    undefined,
  );
  const [deviceLabel, setDeviceLabel] = useState<string | undefined>(undefined);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>(
    undefined,
  );
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // Last-sync success copy for an in-modal banner. Cleared on Close so
  // reopening doesn't show a stale "Synced to cloud." next to a
  // "Last synced 38 mins ago" — the latter is the authoritative state.
  const [syncResult, setSyncResult] = useState<string | undefined>(undefined);

  const bgSyncTimer = useRef<number | null>(null);
  const lastSyncSig = useRef<string | null>(null);

  // Boot: load persisted cloud state.
  useEffect(() => {
    void (async () => {
      try {
        setSignedIn((await getAuthStatus()) === "signed-in");
        setAccountEmail(await getAccountEmail());
        setDeviceLabel(await getDeviceLabel());
        setBaseUrl(await getBaseUrl());
        setLastSyncedAt(await getLastSyncedAt());
      } catch (err) {
        console.error("[cloud-sync] init failed:", err);
      }
    })();
  }, []);

  // One full sync round-trip. `manual` only affects the status copy —
  // the debounced background path passes false.
  const runCloudSync = useCallback(
    async (manual: boolean) => {
      if (syncing) return;
      setSyncing(true);
      setError(undefined);
      setSyncResult(undefined);
      if (manual) setScanStatus("Syncing…");
      try {
        const res = await runSync();
        setLastSyncedAt(res.updatedAt);
        if (res.merged) await refreshSyncableFromDb();
        const msg = res.merged
          ? "Synced — merged cloud changes."
          : "Synced to cloud.";
        setSyncResult(msg);
        setScanStatus(msg);
      } catch (err) {
        if (err instanceof SyncAuthError) {
          setSignedIn(false);
          setError("Session expired — sign in again.");
          setScanStatus("Cloud session expired. Sign in again.");
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setScanStatus(`Sync failed: ${msg}`);
        }
      } finally {
        setSyncing(false);
      }
    },
    [syncing, refreshSyncableFromDb, setScanStatus],
  );

  // Mirror the latest runCloudSync into a ref so the debounce effect
  // can fire it without re-subscribing every time its deps change.
  const runCloudSyncRef = useRef(runCloudSync);
  useEffect(() => {
    runCloudSyncRef.current = runCloudSync;
  }, [runCloudSync]);

  // Signature of everything that syncs. Empty while signed out so the
  // debounce effect short-circuits.
  const syncSignature = useMemo(() => {
    if (!signedIn) return "";
    return JSON.stringify({
      g: syncable.tracks.map((t) => [t.id, t.grade ?? "", t.note ?? ""]),
      s: syncable.scenes,
      b: syncable.soundboard,
      cfg: [
        syncable.theme,
        syncable.fadeMs,
        syncable.masterVolume,
        syncable.duckingPct,
        syncable.dmMode,
      ],
      n: syncable.nameHistory,
    });
  }, [signedIn, syncable]);

  // Debounced background push: 4s after the last syncable edit. The
  // first run after sign-in only captures the baseline signature —
  // sign-in already triggers an explicit sync.
  useEffect(() => {
    if (!signedIn) return undefined;
    if (lastSyncSig.current === null) {
      lastSyncSig.current = syncSignature;
      return undefined;
    }
    if (syncSignature === lastSyncSig.current) return undefined;
    lastSyncSig.current = syncSignature;
    if (bgSyncTimer.current) window.clearTimeout(bgSyncTimer.current);
    bgSyncTimer.current = window.setTimeout(() => {
      void runCloudSyncRef.current(false);
    }, 4000);
    return () => {
      if (bgSyncTimer.current) window.clearTimeout(bgSyncTimer.current);
    };
  }, [syncSignature, signedIn]);

  const handleRequestLink = useCallback(
    async (email: string) => {
      setError(undefined);
      try {
        await requestMagicLink(email);
        setAccountEmail(email.trim().toLowerCase());
        setScanStatus(`Sign-in link sent to ${email.trim()}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [setScanStatus],
  );

  const handleVerify = useCallback(
    async (code: string) => {
      setError(undefined);
      try {
        await verifyMagicCode(code);
        setSignedIn(true);
        setScanStatus("Signed in to cloud sync.");
        void runCloudSync(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [runCloudSync, setScanStatus],
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOutCloud();
    } catch (err) {
      console.error("[cloud-sync] sign out failed:", err);
    }
    setSignedIn(false);
    setAccountEmail(undefined);
    setLastSyncedAt(undefined);
    lastSyncSig.current = null;
    setScanStatus("Signed out of cloud sync.");
  }, [setScanStatus]);

  const handleSetBaseUrl = useCallback(async (url: string) => {
    setError(undefined);
    await persistBaseUrl(url);
    setBaseUrl(await getBaseUrl());
    // A different server means a different session — re-check auth state.
    setSignedIn((await getAuthStatus()) === "signed-in");
  }, []);

  const handleSetDeviceLabel = useCallback(async (label: string) => {
    await persistDeviceLabel(label);
    setDeviceLabel(label.trim() || undefined);
  }, []);

  const openCloudSync = useCallback(() => setCloudSyncOpen(true), []);
  const closeCloudSync = useCallback(() => {
    setCloudSyncOpen(false);
    setSyncResult(undefined);
  }, []);

  return {
    cloudSyncOpen,
    openCloudSync,
    closeCloudSync,
    signedIn,
    accountEmail,
    deviceLabel,
    baseUrl,
    lastSyncedAt,
    syncing,
    error,
    syncResult,
    runCloudSync,
    handleRequestLink,
    handleVerify,
    handleSignOut,
    handleSetBaseUrl,
    handleSetDeviceLabel,
  };
}
