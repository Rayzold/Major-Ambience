// Global style injection — fonts, resets, keyframes, theme CSS variables.
// Ported from prototype/app/ui.jsx so production matches the prototype.
//
// Call `installGlobalStyles()` once during app startup (idempotent).
// Call `applyTheme(id)` to swap themes — toggles a class on <html>.

import { FONT_DISPLAY, FONT_MONO, FONT_UI } from "./tokens.js";
import { THEMES, type ThemeId, type ThemePalette } from "./themes.js";

const STYLE_ELEMENT_ID = "mc-global-styles";
const FONT_ELEMENT_ID = "mc-fonts";
const HTML_THEME_PREFIX = "mc-theme-";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

function paletteToVars(p: ThemePalette): string {
  return [
    `--mc-bg: ${p.bg};`,
    `--mc-bgRaise: ${p.bgRaise};`,
    `--mc-bgCard: ${p.bgCard};`,
    `--mc-bgChip: ${p.bgChip};`,
    `--mc-ink: ${p.ink};`,
    `--mc-ink2: ${p.ink2};`,
    `--mc-ink3: ${p.ink3};`,
    `--mc-gold: ${p.gold};`,
    `--mc-goldSoft: ${p.goldSoft};`,
    `--mc-goldEdge: ${p.goldEdge};`,
    `--mc-rule: ${p.rule};`,
    `--mc-chromeBg: ${p.chromeBg};`,
    `--mc-popoverBg: ${p.popoverBg};`,
    `--mc-modalBackdrop: ${p.modalBackdrop};`,
  ].join("\n      ");
}

function buildCss(): string {
  return `
    :root {
      ${paletteToVars(THEMES["gold-dark"])}
    }
    :root.mc-theme-parchment {
      ${paletteToVars(THEMES.parchment)}
    }
    :root.mc-theme-arcane {
      ${paletteToVars(THEMES.arcane)}
    }
    /* Kill the browser-default body margin + paint the theme bg right on
       html/body so the Tauri window's Mica effect doesn't bleed the
       system theme through at the edges. Also covers the initial paint
       before React mounts — no white flash on launch. */
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      background: var(--mc-bg);
    }
    .mc-app * { box-sizing: border-box; }
    .mc-app {
      font-family: ${FONT_UI};
      color: var(--mc-ink);
      background: var(--mc-bg);
    }
    .mc-app button {
      font-family: inherit;
      color: inherit;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .mc-app input { font: inherit; color: inherit; }
    .mc-display {
      font-family: ${FONT_DISPLAY};
      letter-spacing: -0.01em;
      font-weight: 500;
    }
    .mc-eyebrow {
      font-family: ${FONT_UI};
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: 500;
      color: var(--mc-ink3);
    }
    .mc-mono {
      font-family: ${FONT_MONO};
      font-variant-numeric: tabular-nums;
    }
    .mc-grain {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.5;
      mix-blend-mode: overlay;
      background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 3px 3px;
    }
    :root.mc-theme-parchment .mc-grain {
      mix-blend-mode: multiply;
      background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px);
    }
    /* Hidden scrollbars by default — they reveal a thin gold-tinted bar
       when the scroll container is hovered. Keeps the canvas calm but
       gives a scroll affordance when the user actually engages. */
    .mc-scroll {
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      transition: scrollbar-color 0.2s;
    }
    .mc-scroll:hover { scrollbar-color: var(--mc-rule) transparent; }
    .mc-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .mc-scroll::-webkit-scrollbar-track { background: transparent; }
    .mc-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 3px; transition: background 0.2s; }
    .mc-scroll:hover::-webkit-scrollbar-thumb { background: var(--mc-rule); }
    .mc-scroll:hover::-webkit-scrollbar-thumb:hover { background: var(--mc-ink3); }

    /* Keyboard focus ring — visible only for keyboard navigation (the
       :focus-visible heuristic), so mouse users don't see outlines on
       click but Tab users get a clear "you are here". */
    :focus { outline: none; }
    :focus-visible {
      outline: 2px solid var(--mc-gold);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .mc-row-tap { transition: background 0.12s; }
    .mc-row-tap:active { background: var(--mc-bgChip); }
    .mc-row-action { opacity: 0; transition: opacity 0.12s, color 0.12s, background 0.12s; }
    .mc-row-tap:hover .mc-row-action,
    .mc-row-tap:focus-within .mc-row-action { opacity: 0.7; }
    .mc-row-action:hover { opacity: 1 !important; color: var(--mc-ink); background: var(--mc-bgChip); }
    @keyframes mc-bar {
      0%,100% { transform: scaleY(0.25); }
      50%     { transform: scaleY(1); }
    }
    @keyframes mc-pulse-ring {
      0%   { transform: scale(0.92); opacity: 0.6; }
      100% { transform: scale(1.6);  opacity: 0;   }
    }
  `;
}

export function installGlobalStyles(): void {
  if (typeof document === "undefined") return;

  if (!document.getElementById(FONT_ELEMENT_ID)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    link.id = FONT_ELEMENT_ID;
    document.head.appendChild(link);
  }

  if (!document.getElementById(STYLE_ELEMENT_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    style.textContent = buildCss();
    document.head.appendChild(style);
  }
}

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const className of Array.from(root.classList)) {
    if (className.startsWith(HTML_THEME_PREFIX)) {
      root.classList.remove(className);
    }
  }
  // Gold & Dark is the :root default; only add a class for the other two.
  if (id !== "gold-dark") {
    root.classList.add(`${HTML_THEME_PREFIX}${id}`);
  }
}
