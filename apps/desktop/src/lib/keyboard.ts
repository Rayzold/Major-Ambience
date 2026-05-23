// Global keyboard shortcut binding for the desktop app.
//
// Why a single hook owned by Library: Library holds the playback /
// queue / overlay state, and every shortcut is a thin wrapper over an
// existing handler. Keeping the binding here avoids prop-drilling the
// shortcut intent through every layout component.
//
// All shortcuts no-op when the active element is an <input> /
// <textarea> / [contenteditable], or when any modal-y overlay is open
// (search, pin menu, tutorials menu, scene save dialog, sync confirm,
// guided tutorial). The Esc shortcut still fires inside those overlays
// because individual overlays own their own Esc listeners and call
// onDismiss; the global handler defers to them.

import { useEffect } from "react";
import type { CategoryId } from "@mc/core";
import { CATEGORIES } from "@mc/ui";

/**
 * Bindable actions. Optional — Library passes only the ones that make
 * sense for the current state. Missing handlers are silently ignored.
 */
export type ShortcutHandlers = {
  /** Space / K — toggle play/pause on the current track. */
  onTogglePlay?: () => void;
  /** J / ArrowLeft — previous track in queue. */
  onPrev?: () => void;
  /** L / ArrowRight — next track in queue. */
  onNext?: () => void;
  /** , — seek -5s. */
  onSeekBack?: () => void;
  /** . — seek +5s. */
  onSeekForward?: () => void;
  /** G — cycle grade on current track. */
  onCycleGrade?: () => void;
  /** S — weighted-shuffle the current category. */
  onShuffleCategory?: () => void;
  /** D — toggle DM Mode. */
  onToggleDmMode?: () => void;
  /** / — focus the header search input. Ctrl+K still works (Library wires it separately). */
  onFocusSearch?: () => void;
  /** ? (Shift+/) — toggle the keyboard help overlay. */
  onToggleHelp?: () => void;
  /** Esc — close the topmost overlay. Library passes a dismisser that does the right thing. */
  onEscape?: () => void;
  /** 1..0 — jump to the nth category. */
  onJumpToCategory?: (id: CategoryId) => void;
};

export type ShortcutContext = {
  /** True when any modal overlay is open — most shortcuts skip in that case. */
  overlayOpen: boolean;
};

/** Public list — fed to the help overlay so the cheatsheet stays in sync. */
export const SHORTCUTS_REFERENCE: ReadonlyArray<{
  keys: string;
  description: string;
}> = [
  { keys: "Space / K", description: "Play or pause" },
  { keys: "J / ←", description: "Previous in queue" },
  { keys: "L / →", description: "Next in queue" },
  { keys: ", / .", description: "Seek −5s / +5s" },
  { keys: "G", description: "Cycle grade on current track" },
  { keys: "S", description: "Shuffle weighted in current category" },
  { keys: "1–9, 0", description: "Jump to category" },
  { keys: "D", description: "Toggle DM Mode" },
  { keys: "/", description: "Focus search" },
  { keys: "Ctrl/⌘ K", description: "Open search" },
  { keys: "?", description: "Show this cheatsheet" },
  { keys: "Esc", description: "Close overlay" },
];

/**
 * Map keyboard input to the bound handler. Returns true when the event
 * was consumed (caller should preventDefault). Pulled out for testing.
 */
export function resolveShortcut(
  event: KeyboardEvent,
  handlers: ShortcutHandlers,
  ctx: ShortcutContext,
): (() => void) | null {
  // Esc is special — it fires even with overlays open, since Library uses
  // it to close the topmost one.
  if (event.key === "Escape") {
    return handlers.onEscape ?? null;
  }

  // Inside text inputs, only Ctrl/⌘+K and Escape should reach us; the
  // Library's existing useEffect handles Ctrl+K, and Escape already
  // returned above. So we bail.
  const target = event.target as HTMLElement | null;
  if (
    target?.closest("input, textarea, [contenteditable='true']") != null
  ) {
    return null;
  }

  // Don't fire while a modifier is held (Ctrl+K / ⌘K / etc. are owned by
  // browser-style accelerators registered elsewhere).
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

  // Don't fire when an overlay is open — let the overlay's own Esc /
  // Enter handlers run instead.
  if (ctx.overlayOpen) {
    return null;
  }

  switch (event.key) {
    case " ":
    case "k":
    case "K":
      return handlers.onTogglePlay ?? null;
    case "j":
    case "J":
    case "ArrowLeft":
      return handlers.onPrev ?? null;
    case "l":
    case "L":
    case "ArrowRight":
      return handlers.onNext ?? null;
    case ",":
      return handlers.onSeekBack ?? null;
    case ".":
      return handlers.onSeekForward ?? null;
    case "g":
    case "G":
      return handlers.onCycleGrade ?? null;
    case "s":
    case "S":
      return handlers.onShuffleCategory ?? null;
    case "d":
    case "D":
      return handlers.onToggleDmMode ?? null;
    case "/":
      return handlers.onFocusSearch ?? null;
    case "?":
      return handlers.onToggleHelp ?? null;
  }

  // Category jumps — 1..9 then 0 maps to CATEGORIES[0..9].
  if (event.key >= "1" && event.key <= "9") {
    const idx = Number(event.key) - 1;
    const cat = CATEGORIES[idx];
    if (cat && handlers.onJumpToCategory) {
      return () => handlers.onJumpToCategory!(cat.id);
    }
  }
  if (event.key === "0") {
    const cat = CATEGORIES[9];
    if (cat && handlers.onJumpToCategory) {
      return () => handlers.onJumpToCategory!(cat.id);
    }
  }

  return null;
}

/**
 * React hook that installs a document-level keydown listener and routes
 * key events through resolveShortcut().
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  ctx: ShortcutContext,
): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = resolveShortcut(e, handlers, ctx);
      if (action) {
        e.preventDefault();
        action();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handlers, ctx]);
}
