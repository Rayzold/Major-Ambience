# Changelog

All notable changes to Major Ambience will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Nothing yet — Phase 2 cloud sync proper + IAP continue here. Mobile audio engine (react-native-track-player, needs EAS dev-client) is the next mobile ticket.

---

## [0.0.8] — 2026‑05‑23 — Mobile: file picker + expo-sqlite data layer

First real interactive milestone on mobile. The shell that landed in the v0.0.3 cycle now has a working data path: pick audio from Files / iCloud / Downloads, run the shared `@mc/core/categorize` against it, persist into an on-device SQLite database, and surface live counts + FTS5 search across the imported library.

### Added — Mobile data layer (`apps/mobile/src/data/`)

- `schema.ts` — same DDL as the desktop `0001_initial.sql` migration (tracks, FTS5 virtual table + AI/AD/AU triggers, indexes, config). One additive `IF NOT EXISTS` block runs on every app launch; no migration table needed yet for a single schema version.
- `db.ts` — `getDb()` singleton over `expo-sqlite`'s `openDatabaseAsync`. Caches the handle for the process lifetime, runs the init script on first open.
- `tracks-repo.ts` — `insertTracks` / `listTracks` / `listTracksByCategory` / `countByCategory` / `countTracks` / `searchTracks` / `setGrade` / `deleteAllTracks`. Parallel to `packages/data/src/tracks-repo.ts` but written against expo-sqlite's `runAsync` / `getAllAsync` API (the desktop file uses tauri-plugin-sql's `execute` / `select` and can't be shared as-is). Same row → `Track` mapping, same FTS5 prefix-AND query construction.

### Added — Import flow (`apps/mobile/src/lib/import.ts`)

- `importTracks()` opens the system document picker (`expo-document-picker` with `type: "audio/*"`, `multiple: true`, `copyToCacheDirectory: true`), maps each picked asset to a `Track`, and inserts via the data layer.
- Categorization runs through the shared `@mc/core/categorize`. Mobile has no real parent-folder path, so we infer a pack hint from the file name (AudioHero's `"Pack - Title.mp3"` / `"Pack_Title.mp3"` conventions). Filename evidence + pack hint are what the existing categorize rules need to route most tracks correctly.
- IDs are content-addressed via `trackKey(title|size, pack)`, so re-importing the same audio idempotently replaces the existing row.
- Why files-not-folders on iOS: iOS has no folder picker. The Files share sheet is the iOS-native way to import from iCloud / Dropbox / etc. and `expo-document-picker` is the cross-platform binding. Android folder import via `ACTION_OPEN_DOCUMENT_TREE` is possible but needs the SAF plugin + a dev client — deferred to a follow-up ticket.

### Changed — Library tab (`apps/mobile/app/(tabs)/index.tsx`)

- New **Import** button in the header. Loading state with `ActivityIndicator` while the picker / insert runs; success toast with imported count via `Alert`.
- Category tiles now render the live count of tracks per category (small badge top-right), refreshed after each import. Empty state copy explains tap-Import-to-start; populated state shows the total.

### Changed — Search tab (`apps/mobile/app/(tabs)/search.tsx`)

- Wired to the real FTS5 query via `searchTracks(db, query, 80)`. 120 ms debounce on the input, same prefix-AND tokenization as desktop. Result rows show category color + glyph + pack / subcategory.
- Empty / loading / no-match states all distinct.

### Cherry-picked off-tree mobile scaffold

PR #2's squash merge collapsed the mobile scaffold + Glyph port commits (5df683c, c913b14) — they never made it onto `main`. This release cherry-picks both as the foundation. CHANGELOG entry for the mobile scaffold is folded into this entry (rather than backdated under v0.0.3) since the commits land here.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects (packages/core, data, ui; apps/desktop, mobile).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual smoke (deferred to user): on iOS / Android, tap Import, pick a few audio files, watch the category badges populate and search by title.

### Not in this release

- Playback. Tapping a row is a no-op until the mobile audio engine lands (react-native-track-player, needs EAS dev-client).
- Scenes / soundboard wiring on mobile. Data layer is now there to support both — only the UI + playback hookup is left.
- Android folder import via SAF. The multi-file picker covers the cross-platform path.

---

## [0.0.7] — 2026‑05‑23 — Local sync blob: export + import to JSON file

First step toward cloud sync from `DESIGN.md § 6` / `BUILD_GUIDE § 6.3`. Implements the `SyncBlob` wire format and the export/import flow against a local file. Cloud (Cloudflare Workers + KV + magic-link auth) ships once that infra is set up — same blob format will travel over the wire.

### Added

- `SyncBlob` type in `@mc/core` (`sync-blob.ts`) per `BUILD_GUIDE § 6.3` — version, updatedAt, deviceId, grades (keyed by content-based `trackKey(title, pack)`), notes, scenes, soundboard, npcHistory, config subset.
- `@mc/data/sync-repo`: `buildSyncBlob(db, opts)` reads everything from SQLite and returns the blob; `applySyncBlob(db, blob)` applies it back with per-top-level-key replace semantics. Grade merge survives across devices because `trackKey` is `hash(title + pack)` — same audio on a new machine inherits the same grade.
- Rust commands `write_text_file` + `read_text_file` for arbitrary-path JSON I/O. `dialog:allow-save` permission added.
- `apps/desktop/src/lib/sync.ts`: `exportSyncBlob()` prompts for a save location, writes the JSON; `pickAndLoadSyncBlob()` prompts for a file and parses without applying; `applyLoadedBlob(blob)` commits the parsed blob to SQLite.
- Settings popup grew a **Sync** section with Export and Import buttons, plus a one-line copy explaining the local-file model.
- `SyncImportConfirm` modal — shows the file name, exported-at timestamp, optional device label, and counts (grades, scenes, soundboard slots) before applying. Calls out the destructive replace semantics in a red note.
- Stable per-device id stored in the config table as `device_id` (UUID, generated on first export).

---

## [0.0.6] — 2026‑05‑23 — Right-click pin menu on search results + suppress WebView context menu

### Fixed

- Right-clicking a row in the **search overlay** previously fell through to the WebView's native Back / Refresh / Inspect menu — there was no `onContextMenu` handler on `SearchResultRow`. Now wired through to the same pin-to-slot popup as Library track rows. Closing the search overlay first so the pin menu isn't obscured by it.
- WebView default right-click menu suppressed globally via a single `document` listener in `App.tsx`. Inputs / textareas keep the native menu (so copy/paste still works for the search input and dice modifier fields).

---

## [0.0.5] — 2026‑05‑23 — Categorize: pack-name lookup for flat libraries

### Fixed

- Auto-categorization for **flat library layouts** where AudioHero packs sit directly under the music root (e.g. `MUSIC/shadowsfall_audiohero/...`) rather than nested under category folders (`MUSIC/Horror/shadowsfall_audiohero/...`). Real-world test on a 5,317-track library had 74 % of tracks falling into the Exploration fallback because the ancestor walk had no category folder to recognize.
- Added `PACK_DEFAULTS` table in `categorize.ts` mapping all 14 documented AudioHero packs from `CATEGORIZATION_GUIDE.md` to their dominant category, plus 4 commonly-seen variants. Fires after the filename keyword check + ancestor walk but before the Exploration fallback — track-name and explicit category folders still win.
- Pack-name lookup beats the file+immediate-parent keyword check so packs whose names accidentally contain category keywords (`conflictbattle` has "battle", `droneswarm` has "drone", `spacehord` has "space") route to the documented category instead of the coincident substring.
- Normalized matching: case-insensitive, separator-stripped. So `ShadowsFall_AudioHero`, `shadowsfall-audiohero`, and `shadowsfall_audiohero_v2` all match the same entry.
- **169/169 vitest cases pass** (up from 143; 26 new pack-default cases).

---

## [0.0.4] — 2026‑05‑23 — Hotfix: orphan-delete fails on second scan

### Fixed

- `deleteTracksNotIn` (in `@mc/data/tracks-repo`) was using a `TEMP` table named `keep_ids` to hold the keep-set, then running `DELETE FROM tracks WHERE id NOT IN (SELECT id FROM keep_ids)`. `tauri-plugin-sql` v2 returns a different pool connection per `db.execute()`, and SQLite `TEMP` tables are connection-local — so the DELETE ran on a connection that didn't see the helper table and panicked with `(code: 1) no such table: keep_ids`. Same root cause as the v0.0.2 SQLITE_BUSY transaction bug.
- Switched to a regular (non-TEMP) helper table named `_mc_keep_ids`, created + populated + read + dropped in a `try/finally` so a crash mid-flow doesn't leak the table.
- Bumped desktop version `0.0.1` → `0.0.4` in `tauri.conf.json`, `package.json`, and `Cargo.toml` so MSI bundle filenames line up with the tag.

### Note

The CHANGELOG entries for v0.0.3 (Themes, DM Mode, DM Toolkit) live under the [0.0.3] section below. Previous versions of this file had those entries stuck under `[Unreleased]` because of a PR-squash artifact; that's resolved as part of this release.

---

## [0.0.3] — 2026‑05‑22 — Phase 2 begins: Themes, DM Mode, DM Toolkit

First Phase 2 milestone. Three locked DESIGN.md features that round out the desktop product before mobile + sync land.

### Added — Themes (`DESIGN.md § 5.5`)

- Three locked themes wired end-to-end: **Gold & Dark** (canonical default), **Parchment** (light variant with cream surfaces + deep brown ink + brass accent), **Arcane** (Horror palette as the surface ramp, gold accent unchanged). Category palette and gold accent stay consistent across all three per spec.
- Theme switching is a single class toggle on `<html>`. `T` in `@mc/ui` now exports `var(--mc-…)` strings instead of hex values, so swapping themes never triggers a React re-render cascade.
- New theme-aware tokens: `chromeBg` (translucent header / transport), `popoverBg` (search, pin menu, settings popup), `modalBackdrop` (save-scene modal, tutorial overlay) — all per-theme so light + dark + violet popovers all read correctly.
- Settings icon popup grew a **Themes** section above Tutorials with a mini palette swatch per theme and a check mark on the active one. Persisted as `theme` in `config`.

### Added — DM Mode (`DESIGN.md § 6.2`)

<<<<<<< HEAD
- Single toggle on the theatre icon in the header. Red "DM MODE" pill next to the logo with a soft red glow when on.
- Hides editing affordances that would either distract at the table or reveal private GM judgment: grade chips (track rows, transport, right rail), play counts, right-click pin menu + drag-to-assign, Save current scene, scene delete chip, per-pad clear/loop/volume controls, settings icon, Open Folder, DM Toolkit.
- Keeps player-facing affordances visible: category sidebar, track list, search, scenes/soundboard tabs, fade/duck/volume sliders, prev/play/next, scrubber, orb visualizer.
- Persisted as `dm_mode` in `config`.
=======
- Single toggle on the theatre icon in the header. Red "DM MODE" pill appears next to the logo with a soft red glow when on.
- Hides editing affordances that would either distract at the table or reveal private GM judgment: grade chips (track rows, transport, right rail), play counts, right-click pin menu + drag-to-assign, Save current scene, scene delete chip, per-pad clear/loop/volume controls, settings icon, Open Folder, DM Toolkit.
- Keeps every player-facing affordance visible: category sidebar, track list, search, scenes/soundboard tabs, fade/duck/volume sliders, prev/play/next, scrubber, orb visualizer.
- Persisted as `dm_mode` in `config`; reopening any popovers is blocked while DM Mode is on.
>>>>>>> 5df683c (feat(mobile): scaffold apps/mobile + workspace integration + UI shell)

### Added — DM Toolkit (`DESIGN.md § 6.3`)

- Fourth header tab + entry from the dice icon in the right cluster.
<<<<<<< HEAD
- Three-column desktop layout: **Names** (race-aware NPC generator), **Dice** (d4–d100 with adv/dis on d20, nat-20/nat-1 highlighting), **Initiative** (add combatants with init + condition, sort descending, prev/next cycle).
- **Turn sounds** — drag a track onto a combatant *or* right-click any track in the Library and pick a combatant from a new "Set as turn sound" section. On turn advance, the active combatant's turn sound fires through the soundboard bus — auto-ducks the music exactly like a regular pad.
=======
- Three-column desktop layout:
  - **Names** — race-aware NPC generator across Any / Human / Elf / Dwarf / Orc / Halfling. Click name to copy. Last 30 in scrollable history.
  - **Dice** — d4 through d100 with count + modifier + advantage / disadvantage on d20. Each history row shows the formula, individual die faces (kept ones plain, discarded parenthesized), total in big tabular numerals. Nat 20 green, nat 1 red.
  - **Initiative** — add combatants with init + condition, sort descending, prev / next buttons cycle the active turn. Active row tinted gold with a left-edge stripe.
- **Turn sounds** — drag a track row from the Library onto a combatant *or* right-click any track in the Library and pick a combatant from the new "Set as turn sound" section. On turn advance, the active combatant's turn sound fires through the **soundboard bus** — auto-ducks the music exactly like a regular pad.
>>>>>>> 5df683c (feat(mobile): scaffold apps/mobile + workspace integration + UI shell)
- All three histories + the combatant roster persisted in the `config` table.

### Changed

<<<<<<< HEAD
- Right-click pin menu grew a "Set as turn sound" section below the soundboard grid.
- Hardcoded `rgba(11,9,19,0.x)` translucent backgrounds replaced with theme-aware `T.chromeBg` / `T.popoverBg` / `T.modalBackdrop` references.
=======
- Right-click pin menu grew a "Set as turn sound" section below the soundboard grid. Avoids the cross-tab drag-and-drop awkwardness when the Library and DM Tools tabs are mutually exclusive.
- Hardcoded `rgba(11,9,19,0.x)` translucent backgrounds throughout the layout replaced with theme-aware `T.chromeBg` / `T.popoverBg` / `T.modalBackdrop` references.
>>>>>>> 5df683c (feat(mobile): scaffold apps/mobile + workspace integration + UI shell)

---

## [0.0.2] — 2026‑05‑22 — Phase 1: Windows desktop MVP

First production code. Implements all seven pillars of ROADMAP Phase 1
against a Tauri 2 + React + Vite shell on Windows 11. Verified live
against a 5,471-track personal music library.

### Added — engineering baseline

- Project DESIGN.md handoff document for engineering pick‑up.
- Year 1 sales forecast (`FORECAST.md`) — three scenarios.
- GTM brief deck (`Major Ambience - Pitch Deck.html` + `.pptx`).
- Marketing plan with 90‑day action plan (`MARKETING.md`).
- pnpm workspaces baseline: `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json` (TypeScript strict), `.nvmrc`, `.npmrc`.

### Added — apps/desktop (Tauri 2 + React + Vite)

- Tauri 2 shell, MSI-ready, identifier `com.rayzold.majorambience`, Mica window effect, 1280×800 default.
- Rust `scan_folder` command — recursive walk, filters `.mp3/.wav/.flac/.ogg/.m4a/.aac`, skips macOS `._` AppleDouble files.
- Asset protocol enabled so the WebView can play user-picked files via `convertFileSrc()`.
- Full three-pane layout ported from `prototype/app/desktop.jsx`:
  - `DesktopHeader` — Library / Scenes / Soundboard tabs, search input, dice / theatre / settings icons, Open Folder.
  - `DesktopSidebar` — MUSIC folder summary, Library section (Favorites / Recently played placeholders), Categories with live counts.
  - `DesktopLibraryView` — category hero with 112×112 glyph tile + italic display title + Shuffle weighted button + Save as scene placeholder, subcategory tabs with live counts, S–F grade filter row, six-column track grid.
  - `DesktopRightRail` — Now Playing card with pulsing `<OrbVisualizer>`, italic title, pack, click-to-set grade row, progress sliver. Up Next queue. SFX Layer Phase-2 placeholder.
  - `DesktopTransport` — track tile + grade cycle pills, prev/play/next, click-to-seek scrubber, VU visualizer, fade slider (0–10 s), duck slider (0–100 %), master volume slider.

### Added — packages/core

- `AudioBackend` interface (`BUILD_GUIDE.md § 3.4`) with `bus: 'music' | 'soundboard'` load option.
- `WebAudioBackend` — `<audio>` → `MediaElementSource` → per-track `Gain` → musicBus / soundboardBus → master → destination. One gain node per track so crossfade is two independent ramps. Master gain bus drives the volume slider; music bus is auto-ducked when soundboard pads fire.
- `crossfade(out, in_, durationSec, backend)` helper per `BUILD_GUIDE.md § 4.1`.
- `categorize.ts` — pure `(filename, parentFolderPath) → { category, subcategory? }` covering every rule in `CATEGORIZATION_GUIDE.md`: keyword tables, composer/piece overrides, Alternates-for inheritance, short-version stripping, SFX override. Walks ancestor folders so `MUSIC/Combat/Battle/pack/track.mp3` resolves to `combat/battle` even when filename and pack are mute. **131 Vitest cases.**
- `shuffle.ts` — weighted shuffle (S=6×, A=4×, B=2×, C/D/Ungraded=1×, F=excluded) + `pickWeighted` + Mulberry32 PRNG for deterministic tests. **12 Vitest cases.**

### Added — packages/data

- Typed repository over `tauri-plugin-sql`. SQLite schema (tracks, tracks_fts FTS5, scenes, soundboard, config) ships as Tauri migration `0001_initial.sql`.
- `tracks-repo` — list / list-by-category / insert / delete-orphans / search (FTS5) / set grade / set duration / bump play count.
- `config-repo` — typed key/value over the config table (fade_ms, master_volume, ducking_pct, root_folder_name, tutorials_seen).
- `scenes-repo` — JSON payload over the scenes table, newest-first via `json_extract(payload, '$.createdAt')`.
- `soundboard-repo` — JSON payload over the soundboard table, keyed by `(page, slot)`.

### Added — packages/ui

- Design tokens (colors, fonts, motion), category palette.
- `<Glyph>` with 30+ icons ported character-for-character from `prototype/app/icons.jsx`.
- `<TrackRow>`, `<CategoryGradient>`, `<Visualizer>`, `<OrbVisualizer>`, `<GradeChip>`, `<CatChip>` — all paths and styles preserved from the prototype per Working Rule 4.
- `installGlobalStyles()` injects fonts + base resets + keyframes idempotently.

### Added — features (ROADMAP Phase 1 pillars)

- **Library** — folder import, recursive scan via Rust, ancestor-walk auto-categorization, ten categories with live counts, grade filtering, subcategory tabs, click-to-play with crossfade. Track id is FNV-1a 64-bit hex of `path|size|mtime` for stable rescans. Rescan deletes orphan rows via a temp `keep_ids` table.
- **Now Playing** — pulsing orb in the right rail, italic display title, pack, click-to-set grade row, scrubbable progress, fade slider, master volume.
- **Scenes** — save snapshot of category + queue + fade + volume into the scenes table; restore in one tap. 3-column card grid with category gradient + glyph; hover surfaces delete chip; modal for naming a new scene.
- **Soundboard** — 3 pages × 8 pads = 24 slots. Drag a track row onto a pad to assign; right-click a row to open a 3-column "Pin to slot" popup; click a pad to fire (plays alongside music with no crossfade); click again to stop. Per-pad loop toggle + volume slider. Auto-cleanup on natural end for non-looped pads.
- **SFX layer + auto-ducking** (`BUILD_GUIDE.md § 4.2`) — `WebAudioBackend` split into music + soundboard buses. When any pad fires, music bus ramps to `(1 − duckingPct)` over 150 ms; when the last pad ends, ramps back over 400 ms. `ducking_pct` slider in the transport, default 40 %.
- **Search** — FTS5 across title / pack / note via `tracks_fts`. Spotlight-style overlay drops below the header input. Debounced 120 ms. Ctrl+K focuses from anywhere; ESC dismisses; click result plays + dismisses. Prefix-match AND-chain ("mighty seas" → `mighty* seas*`).
- **Tutorials** (`DESIGN.md § 8.3`) — opt-in coachmark walkthroughs. Five tutorials shipped: Library basics, Grading & weighted shuffle, Scenes, Soundboard, SFX & ducking. Each 3–5 steps with spotlight overlay + tooltip + prev/next/skip. Accessible from the settings icon in the header; icon pulses gold while unseen tutorials exist. Persisted as `tutorials_seen` in config.

### Fixed

- `.gitignore` — removed a too-broad `audio/` rule that was silently excluding `packages/core/src/audio/` from every commit. Per-extension globs already cover audio media files at any depth.
- SQLite `database is locked` (SQLITE_BUSY code 5) on first folder scan. Removed JS-level `BEGIN TRANSACTION` wrapping inserts — `tauri-plugin-sql` v2 returns a different pool connection per `execute()`, so the tx was orphaned and locked the DB.
- macOS `._` AppleDouble metadata files indexed as audio. Rust scanner skips them via `is_macos_resource_fork()`.
- Transport bar pushed off-screen. Outer container switched from `minHeight: 100vh` to `height: 100vh + overflow: hidden` so the middle scrolls internally.
- Duration column showing `0:00` for unscanned tracks. Now shows `—` until a track loads, then captured real duration is persisted to `duration_ms`.
- `categorize.ts` — bare weather words (rain, snow, wind, thunder, lightning) no longer trigger SFX override on their own. Surfaced when "Reflections on the Snow" (piano piece) classified as SFX. Real weather SFX packs still route correctly because the pack folder name carries "weather" or "weatherwounds".
- `categorize.ts` — filename evidence now beats parent-folder evidence. Surfaced when "System Status OK" in "Ominous Overtures" picked up Tension from the pack name instead of Sci-Fi from the track name.

### Changed

- Project renamed from "Music Companion" to **Major Ambience**.

---

## [0.0.1] — 2026‑05‑21 — Prototype

Initial repository commit. Pre‑production state: design and spec only, no production code yet.

### Added
- Interactive HTML prototype covering all primary screens across iPhone, Android, and Windows 11 (`prototype/`).
- Custom SVG glyph set — no emoji used anywhere in the UI (`prototype/app/icons.jsx`).
- Visual system: Cormorant Garamond + Geist + Geist Mono, 10‑category color palette, dark parchment base.
- Three‑pane desktop workspace: sidebar, main, right rail, persistent transport bar.
- Mobile shell: tab bar + mini player + full‑screen Now Playing modal.
- Build & engineering handoff document (`docs/BUILD_GUIDE.md`).
- Music categorization rules (`docs/CATEGORIZATION_GUIDE.md`).
- README, MIT license, `.gitignore`.

---

[Unreleased]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.7...HEAD
[0.0.7]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/Rayzold/Major-Ambience/releases/tag/v0.0.1
