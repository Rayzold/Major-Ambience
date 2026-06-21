// Diagnostic ring buffer — forensic logging for the silent-exit class
// of bugs (notably the audio host process dying mid-playback with zero
// output anywhere in the OS, Tauri, or WebView2 stack — see the
// 2026-06-20 BACKLOG entry "Forensic log buffer for the silent audio
// exit").
//
// Design constraints:
//   - No new Tauri capabilities. Pure renderer; survives via
//     localStorage so it round-trips a fresh launch after a silent
//     exit. (A fs-plugin file would be slightly more durable but
//     requires permission scope work — not worth it for v1.)
//   - Always-on, zero opt-in friction. Cost is one Date.now() + one
//     array push per event; well under any noticeable budget.
//   - Console-wrap is non-destructive: original behaviour preserved,
//     entries also captured.
//   - Buffer caps + truncation prevents an infinite loop pathological
//     case from blowing out memory.
//
// Surface for retrieval:
//   - getDiagnosticsText() returns a paste-ready dump for the user
//     to copy to clipboard from a Help affordance (lands in a
//     follow-up; the data plumbing is what's load-bearing here).
//   - The browser console "MC_DIAG" global is the dev-mode escape
//     hatch for `console.log(MC_DIAG.entries())` from the DevTools.

const MAX_ENTRIES = 250;
const LS_KEY = "mc:diag:ringbuffer:v1";
const APP_VERSION = "0.0.40"; // wire to package.json import if it ever needs lockstep

export type DiagLevel = "info" | "warn" | "error" | "event";

export type DiagEntry = {
  /** ms since unix epoch when the entry was recorded. */
  t: number;
  level: DiagLevel;
  /** Short category — "audio", "sync", "scan", "console.error" etc. */
  tag: string;
  /** Human message. Truncated at 500 chars to keep the buffer bounded. */
  msg: string;
};

let _buffer: DiagEntry[] = [];
let _installed = false;

// Peak-heap tracker for the audio-engine memory ceiling probe (BACKLOG #6).
// The Blob-loading fix in v0.0.33 keeps each track fully resident
// (~5–10 MB/track, two handles alive ≈ 20 MB ceiling). Long sessions
// where dozens of tracks load/unload could fragment the heap; this
// tracker exists so we'd see it in a bug-report dump rather than
// guessing. Reset across boots so the value is per-session.
let _peakHeapUsed = 0;
let _lastPeakEmit = 0;
/** Minimum bytes a new peak must beat the last *emitted* peak by before
 *  we add another `audio.heap.peak` entry. 1 MB keeps the buffer from
 *  filling with sub-noise increments during normal play. */
const PEAK_EMIT_DELTA_BYTES = 1024 * 1024;

type HeapSample = { used: number; total: number; limit: number };

/** Read the renderer's JS heap usage. Returns null when the host doesn't
 *  expose `performance.memory` (non-standard but present in Chromium,
 *  which is what WebView2 ships). happy-dom in tests returns null. */
function readHeap(): HeapSample | null {
  const perf = performance as unknown as {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  };
  const m = perf.memory;
  if (!m || typeof m.usedJSHeapSize !== "number") return null;
  return {
    used: m.usedJSHeapSize,
    total: m.totalJSHeapSize ?? 0,
    limit: m.jsHeapSizeLimit ?? 0,
  };
}

/** Sample current heap and update the session peak. Returns the values
 *  in MB (rounded) for compact display in dumps; nulls when unavailable. */
export function sampleHeapMB(): {
  used: number;
  peak: number;
  limit: number;
} | null {
  const s = readHeap();
  if (!s) return null;
  if (s.used > _peakHeapUsed) _peakHeapUsed = s.used;
  const toMB = (b: number) => Math.round(b / (1024 * 1024));
  return { used: toMB(s.used), peak: toMB(_peakHeapUsed), limit: toMB(s.limit) };
}

function loadFromStorage(): DiagEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Be liberal about what we accept — old shapes from a previous
    // schema shouldn't blow the load path.
    return parsed
      .filter(
        (e): e is DiagEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as DiagEntry).t === "number" &&
          typeof (e as DiagEntry).level === "string" &&
          typeof (e as DiagEntry).tag === "string" &&
          typeof (e as DiagEntry).msg === "string",
      )
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

function flushToStorage(): void {
  // localStorage writes are synchronous and quite cheap (<1ms for
  // small payloads); rate-limit only if profiling shows it matters.
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(_buffer));
  } catch {
    /* swallow — quota exceeded etc. shouldn't break playback */
  }
}

function push(level: DiagLevel, tag: string, msg: string): void {
  const entry: DiagEntry = {
    t: Date.now(),
    level,
    tag,
    msg: msg.length > 500 ? `${msg.slice(0, 497)}…` : msg,
  };
  _buffer.push(entry);
  if (_buffer.length > MAX_ENTRIES) {
    _buffer = _buffer.slice(-MAX_ENTRIES);
  }
  flushToStorage();
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) {
        return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ""}`;
      }
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

/**
 * Record a structured event from the app — call sites for the audio
 * crash trail in particular. Tag is freeform; the convention is to
 * use a short noun phrase like "audio.play", "sync.push.start",
 * "scan.complete". Data is stringified into the message so it can be
 * scanned by eye in the dump.
 *
 * Side-effect: any `audio.*` event auto-includes a `heap` reading (MB)
 * so the dump shows how the JS heap moved alongside each playback
 * transition. When a new session peak grows past the last emitted peak
 * by ≥1 MB, a separate `audio.heap.peak` entry is appended so the
 * ceiling is greppable. The peak event is rate-limited; the auto-include
 * is free because we'd already be calling `push()` for the audio event.
 */
export function logEvent(
  tag: string,
  data?: Record<string, unknown>,
): void {
  let payload = data;
  if (tag.startsWith("audio.")) {
    const heap = sampleHeapMB();
    if (heap) {
      payload = { ...(data ?? {}), heap };
      if (heap.peak * 1024 * 1024 >= _lastPeakEmit + PEAK_EMIT_DELTA_BYTES) {
        _lastPeakEmit = heap.peak * 1024 * 1024;
        push(
          "event",
          "audio.heap.peak",
          stringifyArgs([{ peakMB: heap.peak, limitMB: heap.limit }]),
        );
      }
    }
  }
  const msg = payload ? stringifyArgs([payload]) : "";
  push("event", tag, msg);
}

/**
 * Install the console wrapper. Idempotent — safe to call from both
 * the main and handout entry points. The original console methods
 * keep firing untouched; we just *also* record into the buffer.
 */
export function installDiagnostics(): void {
  if (_installed) return;
  _installed = true;

  _buffer = loadFromStorage();
  push("event", "boot", `version=${APP_VERSION}, ua=${navigator.userAgent}`);

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    push("error", "console.error", stringifyArgs(args));
    origError(...(args as Parameters<typeof console.error>));
  };
  console.warn = (...args: unknown[]) => {
    push("warn", "console.warn", stringifyArgs(args));
    origWarn(...(args as Parameters<typeof console.warn>));
  };

  // Catch otherwise-unobserved render errors + promise rejections —
  // the silent-exit class of bug we're hunting may surface here even
  // if it never reaches a console call.
  window.addEventListener("error", (e) => {
    push(
      "error",
      "window.error",
      `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`,
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    push(
      "error",
      "unhandledrejection",
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : String(reason),
    );
  });

  // Dev-mode escape hatch — copy/paste from DevTools without needing
  // a UI affordance.
  (window as unknown as Record<string, unknown>).MC_DIAG = {
    entries: () => _buffer.slice(),
    text: () => getDiagnosticsText(),
    clear: () => clearDiagnostics(),
  };
}

/** Snapshot the current buffer. Safe to call from any thread/component. */
export function getDiagnostics(): DiagEntry[] {
  return _buffer.slice();
}

/**
 * Paste-ready text dump. Format is deliberately stable + greppable —
 * timestamps as ISO so they sort lexically, level/tag in fixed columns.
 * Header line carries app + UA so a pasted dump in an issue tracker is
 * self-describing.
 */
export function getDiagnosticsText(): string {
  const header = [
    `# Major Ambience diagnostics`,
    `# version: ${APP_VERSION}`,
    `# ua: ${navigator.userAgent}`,
    `# entries: ${_buffer.length} / ${MAX_ENTRIES}`,
    `# generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  const lines = _buffer.map((e) => {
    const ts = new Date(e.t).toISOString();
    return `${ts}  ${e.level.padEnd(5)}  ${e.tag.padEnd(22)}  ${e.msg}`;
  });
  return [header, ...lines, ""].join("\n");
}

/** Wipe the buffer + localStorage mirror. */
export function clearDiagnostics(): void {
  _buffer = [];
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* swallow */
  }
}

// ─── Bug-report URL ────────────────────────────────────────────────────

const GITHUB_ISSUES_NEW =
  "https://github.com/Rayzold/Major-Ambience/issues/new";
/**
 * Maximum body size (chars) we'll pack into the issue URL. GitHub's
 * total URL limit lands around 8 KB; this leaves headroom for the
 * title, prefix template, and percent-encoding overhead (~3x for
 * heavily-quoted dumps). If the diag dump is longer, we keep the
 * tail (most recent entries) since those are the most useful for
 * debugging — the crash signature usually lives there.
 */
const MAX_BODY_CHARS = 5500;

const BUG_REPORT_TEMPLATE = `**What were you doing when this happened?**

(write here — what action triggered it, what did you see on screen?)

**Expected behaviour:**

(what should have happened instead?)

---

<details>
<summary>Diagnostics (auto-attached — last events in the app)</summary>

\`\`\`
{{DIAG}}
\`\`\`

</details>
`;

/**
 * Build a GitHub-issue URL with the diagnostics dump pre-filled.
 * Returns a single URL ready to hand to the opener plugin. The user
 * can still edit everything before submitting — we're just removing
 * the friction of finding the repo + remembering to paste the dump.
 */
export function getBugReportUrl(): string {
  const fullDiag = getDiagnosticsText();
  // Keep the most recent entries — the crash trail lives near the end.
  const diag =
    fullDiag.length <= MAX_BODY_CHARS
      ? fullDiag
      : `[…truncated — kept last ${MAX_BODY_CHARS} chars of a ${fullDiag.length}-char dump]\n\n${fullDiag.slice(-MAX_BODY_CHARS)}`;
  const body = BUG_REPORT_TEMPLATE.replace("{{DIAG}}", diag);
  const title = `Bug — Major Ambience v${APP_VERSION}`;
  const url = new URL(GITHUB_ISSUES_NEW);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return url.toString();
}
