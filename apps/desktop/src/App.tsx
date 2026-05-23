import { useEffect } from "react";
import { installGlobalStyles } from "@mc/ui";
import { Library } from "./Library.js";

export default function App() {
  useEffect(() => {
    installGlobalStyles();

    // Suppress the WebView's default Back/Refresh/Inspect context menu so
    // right-click is always ours to use (pin-to-slot, etc.). Tauri's
    // WebView2 doesn't disable this by default. Listening on document
    // captures the event before it bubbles to the WebView's handler.
    function onContext(e: MouseEvent) {
      // Allow native context menu only inside inputs / textareas where
      // copy-paste is genuinely useful.
      const target = e.target as HTMLElement | null;
      const editable =
        target?.closest("input, textarea, [contenteditable='true']") != null;
      if (!editable) e.preventDefault();
    }
    document.addEventListener("contextmenu", onContext);
    return () => document.removeEventListener("contextmenu", onContext);
  }, []);
  return <Library />;
}
