import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HandoutView } from "./layout/HandoutView";
import { installDiagnostics } from "./lib/diag";

// Forensic log buffer — wraps console + captures `logEvent` calls so
// we have a record after a silent-exit crash. Must install BEFORE
// React renders so the very first errors get caught. See
// BACKLOG.md "Forensic log buffer for the silent audio exit".
installDiagnostics();

// The player-view (handout) window loads the same bundle with
// `?view=handout`, so a single entry can render either surface.
const isHandout =
  new URLSearchParams(window.location.search).get("view") === "handout";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isHandout ? <HandoutView /> : <App />}</React.StrictMode>,
);
