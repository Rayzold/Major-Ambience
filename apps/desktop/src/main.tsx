import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HandoutView } from "./layout/HandoutView";

// The player-view (handout) window loads the same bundle with
// `?view=handout`, so a single entry can render either surface.
const isHandout =
  new URLSearchParams(window.location.search).get("view") === "handout";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isHandout ? <HandoutView /> : <App />}</React.StrictMode>,
);
