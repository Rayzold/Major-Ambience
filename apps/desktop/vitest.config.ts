// vitest config for the desktop renderer's component tests.
//
// Component tests catch the class of regressions that have shipped +
// been caught manually this session — scrubber flicker (#65),
// scan-toast circular-JSON (#63), sidebar dead-click (#57). A render
// + click + assertion is enough for those.
//
// happy-dom is faster than jsdom and good enough for our needs; we
// don't render WebGL, canvases, or media elements in tests.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // The Tauri renderer normally runs in a WebView2 sandbox — tests
    // never touch the real backend or sqlite. Per-suite stubs in each
    // test file mock the small surface they need.
  },
});
