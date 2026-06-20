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
const APP_VERSION = "0.0.33"; // wire to package.json import if it ever needs lockstep

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
 */
export function logEvent(
  tag: string,
  data?: Record<string, unknown>,
): void {
  const msg = data ? stringifyArgs([data]) : "";
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
