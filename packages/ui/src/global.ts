// Global style injection — fonts, resets, keyframes. Ported from
// prototype/app/ui.jsx so the production app matches the prototype exactly.
//
// Call `installGlobalStyles()` once during app startup (idempotent).

import { FONT_DISPLAY, FONT_MONO, FONT_UI, T } from "./tokens.js";

const STYLE_ELEMENT_ID = "mc-global-styles";
const FONT_ELEMENT_ID = "mc-fonts";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

const CSS = `
  .mc-app * { box-sizing: border-box; }
  .mc-app {
    font-family: ${FONT_UI};
    color: ${T.ink};
    background: ${T.bg};
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
    color: ${T.ink3};
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
  .mc-scroll {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mc-scroll::-webkit-scrollbar { display: none; }
  .mc-row-tap { transition: background 0.12s; }
  .mc-row-tap:active { background: ${T.bgChip}; }
  @keyframes mc-bar {
    0%,100% { transform: scaleY(0.25); }
    50%     { transform: scaleY(1); }
  }
  @keyframes mc-pulse-ring {
    0%   { transform: scale(0.92); opacity: 0.6; }
    100% { transform: scale(1.6);  opacity: 0;   }
  }
`;

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
    style.textContent = CSS;
    document.head.appendChild(style);
  }
}
