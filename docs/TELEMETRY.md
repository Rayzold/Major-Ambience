# Telemetry — Sentry integration

Desktop ships with [Sentry](https://sentry.io) wired in for opt-in error reporting. The integration is scaffolded but **inert until a DSN is configured at build time** — dev shells and unconfigured deploys produce no traffic.

This doc covers what's collected, how to enable it for a production build, and the privacy posture.

---

## What's collected

Only **errors and unhandled rejections**. No performance traces, no session replay, no PII.

Each error includes:

- The error message, stack, and source location (standard Sentry payload).
- App version (`major-ambience@0.0.43`).
- The tail of the in-app diag ring buffer (last 50 entries) attached as breadcrumbs — same content the **Help → Copy diag** button would produce. Gives the same forensic trail a manually-submitted bug report would, so we don't need both reports to debug a crash.

Default Sentry browser integrations that fingerprint the user (`BrowserApiErrors` and friends) are **deliberately dropped** in `apps/desktop/src/lib/telemetry.ts`. Only `GlobalHandlers` (window.onerror + unhandledrejection) and `InboundFilters` (drop-list) remain.

---

## Privacy posture

- **Off by default.** The "Send anonymous diagnostics" toggle in **Help** is unchecked on a fresh install.
- **Opt-in is persisted** in SQLite (`telemetry_enabled` config key) — survives relaunches.
- **The Sentry client is always *constructed*** when a DSN is present, but starts with `enabled: false`. Flipping the toggle live changes the client's `enabled` flag without a relaunch — `setTelemetryEnabled` mutates `client.getOptions().enabled` directly.
- **Even with the toggle on, no traffic flows until an error fires.** This isn't a heartbeat; nothing is sent on a clean session.

---

## Enabling telemetry for a release build

1. Create a Sentry project at [sentry.io](https://sentry.io) — pick "React" as the platform.
2. Grab the DSN from **Settings → Projects → \<project\> → Client Keys (DSN)**. Looks like `https://abc123@o45.ingest.sentry.io/789`.
3. Build with the DSN baked in as a Vite env var:

   ```powershell
   $env:VITE_SENTRY_DSN = "https://abc123@o45.ingest.sentry.io/789"
   pnpm --filter @mc/desktop build
   ```

   Or for a Tauri build:

   ```powershell
   $env:VITE_SENTRY_DSN = "https://..."
   pnpm --filter @mc/desktop tauri build
   ```

4. Distribute the resulting binary. Users still need to opt in via Help → "Send anonymous diagnostics" before anything is sent.

If `VITE_SENTRY_DSN` is unset at build time, `initTelemetry()` logs a `telemetry.disabled.no-dsn` event into the diag buffer and returns — Sentry is never constructed.

---

## How it integrates with the diag buffer

The two systems are complementary, not redundant:

| | Diag ring buffer (`./lib/diag.ts`) | Sentry (`./lib/telemetry.ts`) |
|---|---|---|
| **Captures** | Every console.warn/error, window.error, unhandledrejection, plus structured `logEvent()` calls | Errors + unhandled rejections only |
| **Where** | localStorage on the user's machine | Remote sink |
| **Trigger** | Always-on, no opt-in | Only when user opts in AND a build-time DSN is configured |
| **Retention** | Last 250 entries, ring-buffer per session | Project retention policy (Sentry default: 90 days) |
| **Consumed by** | The user via **Help → Report a bug** (opens a GitHub issue with the dump pre-filled) | Project maintainers via the Sentry dashboard |

The diag buffer's tail is also attached as Sentry breadcrumbs in the `beforeSend` hook, so a remote crash report includes the same per-session trail a manually-submitted bug report would.

---

## Mobile

Deliberately deferred. The mobile app ships to platform stores with different privacy review requirements (App Store specifically scrutinizes "tracking" frameworks even when opt-in); bundling Sentry there warrants its own conversation and probably a separate user-facing disclosure flow. The desktop scaffold here is the pattern mobile would mirror once that conversation happens.
