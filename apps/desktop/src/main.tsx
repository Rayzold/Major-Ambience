import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HandoutView } from "./layout/HandoutView";
import { installDiagnostics, logEvent } from "./lib/diag";
import { probeWindowState } from "./lib/window-state-probe";
import { initTelemetry } from "./lib/telemetry";

// Forensic log buffer — wraps console + captures `logEvent` calls so
// we have a record after a silent-exit crash. Must install BEFORE
// React renders so the very first errors get caught. See
// BACKLOG.md "Forensic log buffer for the silent audio exit".
installDiagnostics();

// Sentry — opt-in error reporting. No-ops when VITE_SENTRY_DSN isn't
// configured at build time (dev shells stay silent). Initializes
// disabled until the user flips the Help → "Send anonymous diagnostics"
// toggle. Fire-and-forget; failures land on the unhandledrejection
// handler installed by installDiagnostics().
initTelemetry().catch((err) => {
  logEvent("telemetry.init.error", { error: String(err) });
});

// Window-state integrity probe — logs the stat of
// .window-state.json into the diag buffer so a future silent
// persistence regression in tauri-plugin-window-state shows up in
// any bug-report dump (stale mtime across successive boots).
// Fire-and-forget; failures land on the unhandledrejection handler
// already installed above.
probeWindowState().catch((err) => {
  logEvent("window-state.probe.error", { error: String(err) });
});

// The player-view (handout) window loads the same bundle with
// `?view=handout`, so a single entry can render either surface.
const isHandout =
  new URLSearchParams(window.location.search).get("view") === "handout";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isHandout ? <HandoutView /> : <App />}</React.StrictMode>,
);
