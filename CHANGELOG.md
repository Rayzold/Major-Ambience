# Changelog

All notable changes to Major Ambience will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Project DESIGN.md handoff document for engineering pick‑up.
- Year 1 sales forecast (`FORECAST.md`) — three scenarios.
- GTM brief deck (`Major Ambience - Pitch Deck.html` + `.pptx`).
- Marketing plan with 90‑day action plan (`MARKETING.md`).
- pnpm workspaces baseline: `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json` (TypeScript strict), `.nvmrc`, `.npmrc`.
- `apps/desktop` — Tauri 2 + React + Vite shell, MSI-ready, Mica window effect, 1280×800 default.
- `packages/core` — `AudioBackend` interface, `WebAudioBackend` implementation with linear-ramp `setGain`, and the `crossfade` helper from BUILD_GUIDE § 4.1.
- `packages/core/categorize.ts` — pure `(filename, parentFolderPath) → { category, subcategory? }` covering every rule in CATEGORIZATION_GUIDE.md. 118 Vitest cases.
- `packages/core/shuffle.ts` — weighted shuffle (S=6×, A=4×, B=2×, C/D/Ungraded=1×, F=excluded) with deterministic Mulberry32 PRNG for tests.
- `packages/data` — typed repository over `tauri-plugin-sql`. SQLite schema (tracks, tracks_fts FTS5, scenes, soundboard, config) ships as Tauri migration `0001_initial.sql`.
- `packages/ui` — design tokens, category palette, `<Glyph>` with 30+ ported icons, `<TrackRow>`, `<CategoryGradient>`, `<Visualizer>`, `<OrbVisualizer>`, `<GradeChip>`, `<CatChip>`. Inline styles preserved from the prototype per Working Rule 4.
- `apps/desktop` — Library screen with sidebar + track list, Open Folder via `dialog.open({ directory: true })`, recursive scan via Rust `scan_folder` command, auto-categorization, SQLite persistence, click-to-play with crossfade through `WebAudioBackend`. Play count and last-played timestamp persisted.
- `categorize.ts` — walks ancestor folders so `MUSIC/Combat/Battle/pack/track.mp3` resolves to `combat/battle` even when the filename has no category signal. 11 new test cases.
- `tracks-repo` — `deleteTracksNotIn` purges orphan rows on rescan; `setDuration` persists the real audio duration after first load.
- `config-repo` — typed key/value store over the `config` table (fade_ms, master_volume, root_folder_name).
- `WebAudioBackend.setMasterGain` — single master `GainNode` between every track and the destination, so the transport's volume slider actually affects audio.
- `apps/desktop` — full three-pane layout ported from `prototype/app/desktop.jsx`: `DesktopHeader` (tabs + search placeholder), `DesktopSidebar` (folder summary, Categories), `DesktopLibraryView` (category hero with weighted-shuffle button, subcategory tabs, grade filter, track grid), `DesktopRightRail` (Now Playing card with `<OrbVisualizer>` + Up Next queue + SFX placeholder), `DesktopTransport` (track tile, prev/play/next, click-to-seek scrubber, VU visualizer, fade slider, master volume).
- Grade cycling: click track-tile grade pills in the transport (S→A→B→C→D→F→none) or any grade in the right rail to set; persisted via `setGrade`.
- Weighted shuffle queue: category-hero "Shuffle weighted" button calls `weightedShuffle` from `@mc/core`, queues that category, advances on end and via prev/next.
- Fade duration and master volume now persisted to the `config` table.

### Fixed
- `categorize.ts` — bare weather words (rain, snow, wind, thunder, lightning) no longer trigger SFX override on their own. Surfaced when "Reflections on the Snow" (piano piece) classified as SFX. Real weather SFX packs still route correctly because the pack folder name carries "weather" or "weatherwounds". Also added "sfx" as a strong ancestor-folder signal.

### Added (post-MVP, Phase 1)
- **Search** — FTS5 across title / pack / note. Spotlight-style overlay drops below the header search input. Debounced 120ms. Click result to play (and dismiss). Ctrl+K focuses search from anywhere, ESC closes. `searchTracks(db, query, limit)` in `@mc/data` builds a prefix-match AND-chain ("mighty seas" → `mighty* seas*`).
- **Scenes** — first version of `prototype/app/screens.jsx` Scenes view. Save the current category, queue, fade, and master volume as a named snapshot; restore it in one click. `scenes-repo.ts` in `@mc/data` serializes Scene objects to the JSON payload column. Scenes tab in the header is now live with a 3-column card grid, save-current-scene modal, and per-card restore + delete.
- **Soundboard** — 3 pages (A/B/C) × 8 pads = 24 slots. Drag a track row from the Library onto a pad to assign; click the pad to fire (plays alongside music with no crossfade); click again to stop. Per-pad loop toggle + volume slider. Click ✕ to clear. State persisted via the existing `soundboard` table. `soundboard-repo.ts` in `@mc/data`, `lib/pad-audio.ts` as the per-pad audio controller. SFX layer auto-ducking ships with the next feature.
- **Right-click Pin to slot menu** — right-clicking any Library track row opens a 3-column popup showing all 24 soundboard slots across A/B/C. Empty slots are italic placeholders; occupied slots show the current track title and replace on click. Click outside or press ESC to dismiss. Avoids the cross-tab drag-and-drop awkwardness when assigning multiple tracks.
- **SFX layer + auto-ducking** (`BUILD_GUIDE.md § 4.2`) — `WebAudioBackend` is now split into music + soundboard buses, both feeding master. Soundboard pads route through `soundboardBus`, music through `musicBus`. When any pad fires, the music bus ramps to `(1 − duckingPct)` over 150 ms; when the last pad ends, ramps back over 400 ms. `setDuckingPct` slider lives next to fade in the transport, with a cyan SFX-color accent. Persisted as `ducking_pct` in `config`. Default 40 %.
- **Tutorials** (`DESIGN.md § 8.3`) — opt-in coachmark walkthroughs. Five tutorials shipped: Library basics, Grading & weighted shuffle, Scenes, Soundboard, SFX & ducking. Each is 3-5 steps with title + body + optional DOM target. Spotlight overlay punches a gold-edged hole over the target; tooltip card with prev/next/skip + ESC/arrow-key nav. Accessible from the settings icon in the header; settings icon pulses gold while unseen tutorials exist. Persisted as `tutorials_seen` in `config`. Never auto-triggers — strictly opt-in per the spec.

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

[Unreleased]: https://github.com/Rayzold/Major-Ambience/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Rayzold/Major-Ambience/releases/tag/v0.0.1
