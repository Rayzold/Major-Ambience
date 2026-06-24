// Sentry telemetry — opt-in error/event reporting that complements the
// local diag ring buffer (see ./diag.ts). The diag buffer captures
// everything per-session for post-hoc inspection via "Report a bug";
// Sentry sends the *errors* to a remote sink so we hear about crashes
// even when the user doesn't report them. Pairs with BACKLOG #4.
//
// Privacy model — opt-in, off-by-default:
//   - DSN comes from a Vite env var (`VITE_SENTRY_DSN`) at build time.
//     If unset, telemetry never initializes — the bundle stays inert.
//   - User must explicitly enable via the Help → "Send anonymous
//     diagnostics" toggle. Flag persists in SQLite (`telemetry_enabled`).
//   - Even when initialized, `Sentry.init` runs with `enabled: false`
//     until `setTelemetryEnabled(true)` flips it. Avoids any traffic
//     before the user actively opts in.
//   - The diag buffer's tail (last 50 entries) is attached to each
//     error report as breadcrumbs so the remote trace lines up with
//     what the user would see in a local Copy-diag dump.
//
// Mobile parity: deliberately deferred to a separate PR — the mobile
// app ships to platform stores with different privacy review
// requirements; bundling Sentry there warrants its own conversation.

import * as Sentry from "@sentry/react";
import { getDb, getConfig, setConfig } from "@mc/data";
import { getDiagnostics, logEvent } from "./diag";

const APP_VERSION = "0.0.46"; // mirror diag.ts; bumps in lockstep
const CONFIG_KEY = "telemetry_enabled";

let _initialized = false;
let _enabled = false;

/** Build-time DSN. Empty string when the build wasn't configured with
 *  one — keeps the dev-shell and unconfigured deploys silent. */
function dsn(): string {
  // Vite exposes import.meta.env.VITE_* at build time. Cast through
  // unknown so TS doesn't complain about the ambient type when the
  // var isn't declared in vite-env.d.ts.
  const raw = (import.meta as unknown as { env?: Record<string, string> }).env?.[
    "VITE_SENTRY_DSN"
  ];
  return typeof raw === "string" ? raw : "";
}

/** Pull the persisted opt-in flag (default: false). */
export async function readTelemetryEnabled(): Promise<boolean> {
  try {
    const db = await getDb();
    const raw = await getConfig(db, CONFIG_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

/** Persist the opt-in flag + flip the Sentry client's enabled state
 *  live so the toggle takes effect without a relaunch. */
export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  _enabled = enabled;
  try {
    const db = await getDb();
    await setConfig(db, CONFIG_KEY, enabled ? "true" : "false");
  } catch (err) {
    console.error("[telemetry] persist failed:", err);
  }
  logEvent("telemetry.toggle", { enabled });
  if (_initialized) {
    const client = Sentry.getClient();
    if (client) {
      client.getOptions().enabled = enabled;
    }
  }
}

/** Initialize Sentry. Idempotent. No-ops when the DSN isn't built into
 *  the bundle (development + unconfigured deploys stay silent).
 *
 *  Reads the persisted opt-in flag and sets the client's `enabled`
 *  state accordingly — the client is always *constructed* (so a later
 *  flip via the toggle just flips a flag, no re-init), but only
 *  *sends* when the user has opted in. */
export async function initTelemetry(): Promise<void> {
  if (_initialized) return;
  const sentryDsn = dsn();
  if (!sentryDsn) {
    logEvent("telemetry.disabled.no-dsn", {});
    return;
  }
  _enabled = await readTelemetryEnabled();

  Sentry.init({
    dsn: sentryDsn,
    enabled: _enabled,
    release: `major-ambience@${APP_VERSION}`,
    // Errors only for the v1 — no performance tracing, no session
    // replay. Cheap, predictable, defensible privacy story.
    tracesSampleRate: 0,
    // Drop the default browser integrations that fingerprint the user
    // (BrowserApiErrors which reads location, etc.). Keep only the
    // global error + unhandled-rejection handlers — same surface the
    // diag buffer wraps.
    integrations: (defaults) =>
      defaults.filter(
        (i) => i.name === "GlobalHandlers" || i.name === "InboundFilters",
      ),
    // Attach the diag ring buffer's tail as breadcrumbs so a remote
    // report has the same forensic trail a local Copy-diag dump would
    // have. Capped to the last 50 entries — Sentry's breadcrumb soft
    // limit is 100 and we want headroom for the SDK's own crumbs.
    beforeSend(event) {
      try {
        const tail = getDiagnostics().slice(-50);
        const existing = event.breadcrumbs ?? [];
        const diagCrumbs = tail.map((e) => ({
          category: e.tag,
          level: e.level === "error" ? ("error" as const) : ("info" as const),
          message: e.msg,
          timestamp: e.t / 1000,
        }));
        event.breadcrumbs = [...existing, ...diagCrumbs];
      } catch {
        /* swallow — never let breadcrumb prep break the error path */
      }
      return event;
    },
  });
  _initialized = true;
  logEvent("telemetry.init", { enabled: _enabled });
}

/** Current opt-in state, sync read (after `initTelemetry` resolved). */
export function isTelemetryEnabled(): boolean {
  return _enabled;
}
