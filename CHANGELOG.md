# Changelog

All notable changes to Major Ambience will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Nothing yet — Phase 2 work lands here.

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

[Unreleased]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/Rayzold/Major-Ambience/releases/tag/v0.0.1
