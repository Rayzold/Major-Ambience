## Summary

Phase 2 kick-off — three locked features that round out the desktop product before mobile + sync land.

- **Themes** (`DESIGN.md § 5.5`) — Gold & Dark + Parchment + Arcane.
- **DM Mode** (`DESIGN.md § 6.2`) — one toggle, red badge, hides editing affordances for screen-sharing with players.
- **DM Toolkit** (`DESIGN.md § 6.3`) — names + dice + initiative + turn sounds.

Verified live against the same 5,471-track personal library as v0.0.2.

---

## Themes

Three palettes, locked. Category palette and gold accent stay consistent across all three — only the surface ramp + ink shift, per spec.

- **Gold & Dark** — canonical default, warm parchment ink on deep purple-black.
- **Parchment** — light variant. Cream surfaces, deep brown ink, deeper brass gold (`#b88a3a`) for contrast.
- **Arcane** — Horror palette (`#1a0f2e`) repurposed as the surface ramp. Gold accent unchanged.

Implementation:

- `packages/ui/src/themes.ts` defines the three palettes plus metadata + ordering.
- `packages/ui/src/tokens.ts` — `T` values switched from hex literals to `var(--mc-...)` strings. Components keep referencing `T.bg` etc.; the indirection means a theme swap is **one class flip on `<html>`** rather than a re-render cascade.
- `packages/ui/src/global.ts` emits `:root` + `.mc-theme-parchment` + `.mc-theme-arcane` CSS variable blocks. `applyTheme(id)` toggles the class.
- `.mc-grain` overlay switches to `mix-blend-mode: multiply` with dark dots under Parchment so the texture still reads.

Theme-aware overlay tokens (new): `chromeBg` (translucent header / transport), `popoverBg` (search, pin menu, settings popup), `modalBackdrop` (save-scene modal, tutorial overlay). Every component that previously hardcoded `rgba(11,9,19,0.x)` now references the matching var.

Picker lives in the settings popup above Tutorials, with mini palette swatches and a check mark on the active theme. Persisted as `theme` in `config`.

## DM Mode

Single toggle on the theatre icon in the header. When on:

- Red **DM MODE** pill next to the *Major Ambience* logo, with a soft red glow.
- Theatre icon itself goes red + glows.
- These editing affordances vanish: grade chips (track rows, transport, right rail), play counts, right-click pin menu + drag-to-assign on tracks, Save current scene, scene delete chips, per-pad clear/loop/volume controls, settings icon, Open Folder, DM Toolkit icon.
- Keeps every player-facing affordance visible: category sidebar, track list, search, Scenes / Soundboard tabs, fade / duck / volume sliders, prev / play / next, scrubber, orb visualizer.
- Open popovers (pin menu, tutorials menu, save-scene modal) all close when entering DM Mode.

Persisted as `dm_mode` in `config`.

## DM Toolkit

Fourth header tab. Three-column layout: Names · Dice · Initiative.

### Names
- Race-aware: Any / Human / Elf / Dwarf / Orc / Halfling. Each race has ~25 first + ~15 last names in a corpus suited to RPG tables.
- Click a name to copy.
- Latest result floats in italic display serif at the top with the race's category glyph; rest in scrollable history.
- Last 30 persisted to `dm_name_history`.

### Dice
- `lib/dm-dice.ts` is a pure roller. d4 / d6 / d8 / d10 / d12 / d20 / d100. Count 1–20. Modifier. Advantage / disadvantage available on d20.
- Result tracks individual rolls + which were kept + total + crit flag (nat 1 / nat 20).
- History row shows the formula (`2d8+3`, `1d20 (adv)`), individual die faces with kept ones plain and discarded ones parenthesized, total in big tabular numerals. Nat 20 green, nat 1 red.
- Last 30 persisted to `dm_roll_history`.

### Initiative
- Add combatants with name + initiative. Sort descending. Inline free-text condition.
- Active turn highlighted with a gold gradient + left-edge stripe.
- Prev / Next buttons cycle.
- Persisted to `dm_combatants`.

### Turn sounds — the keystone

Two ways to assign:

1. **Drag** a track row from the Library onto a combatant in the Initiative tracker. The combatant's tile turns into the track's category gradient.
2. **Right-click** any track row in the Library; a new "Set as turn sound" section in the pin popup lists every combatant sorted by initiative, showing their current turn sound (or italic "empty"). Click to assign.

On turn advance, the active combatant's turn sound fires through the **soundboard bus** — auto-ducks the music exactly like a regular pad. Click the combatant's tile to clear.

## Architecture worth a closer read

- **CSS-vars-for-tokens** ([packages/ui/src/global.ts](packages/ui/src/global.ts)) — `T.bg` etc. resolve to `var(--mc-bg)`. `applyTheme(id)` toggles a class on `<html>`. Whole theme swap is one DOM mutation; React doesn't re-render anything.
- **Turn-sound routing** ([apps/desktop/src/Library.tsx](apps/desktop/src/Library.tsx)) — `handleTurnChange` fires the active combatant's track via the existing `firePad` controller using a reserved pad slot (page `"A"`, slot `99 + turnIdx`) so the turn sound shares the soundboard bus + auto-ducking without colliding with real pads.
- **TS strict + `exactOptionalPropertyTypes`** caught one bug clearing a turn sound: `update(c.id, { turnSoundTrackId: undefined })` is invalid. Added a `clearTurnSound` helper that omits the key instead.

## Verification

- ✅ `pnpm -r typecheck` — strict mode, no `any`, clean across all 4 workspace packages.
- ✅ `pnpm --filter @mc/core test` — **143/143 pass**.
- ✅ `pnpm --filter @mc/desktop build` — Vite, 312 KB / 94 KB gzipped.
- ✅ Live test: all three themes paint correctly including popovers + modals; DM Mode hides every expected affordance; name/dice/initiative all work; turn sound assignment works via both drag-onto-combatant and right-click-from-library; turn sound fires on Next and the music ducks.

## Out of scope (still Phase 2, lands in next PRs)

- Cloud sync (Cloudflare Workers + KV + magic-link auth)
- Mobile beta (RN + Expo)
- IAP plumbing (App Store one-time purchase)
- DM Toolkit entitlement gate (will land with IAP)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
