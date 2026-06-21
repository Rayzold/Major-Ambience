// Window-state integrity probe — records the mtime/size of
// `.window-state.json` into the diag buffer at boot. Pairs with the
// Rust `window_state_stat` command. See BACKLOG.md (closed 2026‑06‑21)
// — the plugin is currently writing on every close; this is the trip
// wire so a future silent regression leaves evidence in any bug
// report dump (stale mtime across multiple boots = plugin's regressed).

import { invoke } from "@tauri-apps/api/core";
import { logEvent } from "./diag";

type WindowStateStat = {
  exists: boolean;
  size_bytes: number;
  mtime_secs: number;
  path: string;
};

export async function probeWindowState(): Promise<void> {
  const stat = await invoke<WindowStateStat>("window_state_stat");
  const ageSeconds =
    stat.mtime_secs > 0 ? Math.floor(Date.now() / 1000 - stat.mtime_secs) : null;
  logEvent("window-state", {
    exists: stat.exists,
    size: stat.size_bytes,
    mtime: stat.mtime_secs
      ? new Date(stat.mtime_secs * 1000).toISOString()
      : null,
    ageSeconds,
    path: stat.path,
  });
}
