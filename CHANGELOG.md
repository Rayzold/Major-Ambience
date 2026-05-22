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
