// Global test setup for the desktop renderer.
//
// Imports `@testing-library/jest-dom` so matchers like `toBeInTheDocument`
// are available everywhere without per-file re-import. Adds a no-op
// Tauri shim so components that defensively call `window.__TAURI__`
// don't blow up in happy-dom.

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Some components reach for Tauri APIs at module load. Stub to a
// minimal shape so the import doesn't throw — tests that need richer
// behavior should mock per-suite.
(globalThis as unknown as { __TAURI__?: object }).__TAURI__ = {};

// happy-dom doesn't unmount React trees between tests by default. RTL's
// cleanup() does it; afterEach makes sure DOM state doesn't leak from
// one test into the next.
afterEach(() => {
  cleanup();
});
