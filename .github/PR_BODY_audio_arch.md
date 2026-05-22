## Summary

This is the audio-architecture checkpoint for DESIGN.md § 2 — the Tauri 2 desktop shell that renders the Library against a real local folder and plays audio. Opening as **draft** so the audio engine can be reviewed before the full prototype UI lands on top.

The flow: **Open Folder → recursive scan via Rust → categorize → SQLite insert → render Library → click a track → WebAudioBackend plays it, crossfading from the previous track.**

## What's in scope (per DESIGN.md § 2)

- pnpm workspaces, TypeScript strict mode, Conventional Commits
- `apps/desktop/` — Tauri 2 + React + Vite, identifier `com.rayzold.majorambience`, Mica window effect
- `packages/core/` — `AudioBackend` interface (`docs/BUILD_GUIDE.md § 3.4`) + `WebAudioBackend` + `crossfade` (`§ 4.1`)
- `packages/core/categorize.ts` — pure `(filename, parentFolderPath) → { category, subcategory? }` covering every rule in CATEGORIZATION_GUIDE.md
- `packages/core/shuffle.ts` — weighted shuffle (S=6×, A=4×, B=2×, C/D/Ungraded=1×, F=excluded), Mulberry32 PRNG for deterministic tests
- `packages/data/` — typed repository over `tauri-plugin-sql`; SQLite schema with FTS5 ships as Tauri migration `0001_initial.sql`
- `packages/ui/` — design tokens, category palette, `<Glyph>` with 30+ ported icons, `<TrackRow>`, `<CategoryGradient>`, `<Visualizer>`, `<OrbVisualizer>`, `<GradeChip>`, `<CatChip>` — paths/styles preserved character-for-character from `prototype/app/ui.jsx` and `icons.jsx`

## What's deliberately minimal

The Library UI is a single-column track list with a category sidebar — enough to prove playback works end-to-end, **not** the full three-pane prototype port. That comes in the follow-up PR once you've signed off on the audio architecture. From your original brief:

> Open a draft PR when the audio engine plays its first real track, before wiring up the rest of the Library UI — that's the riskiest 30% and I want to review the audio architecture before the rest lands on top.

## Out of scope (per DESIGN.md § 2)

Scenes, Soundboard, Search, SFX layer, themes, DM Mode, mobile, cloud sync, IAP.

## Architecture notes worth reviewing

- **`WebAudioBackend`** ([packages/core/src/audio/web-audio-backend.ts](packages/core/src/audio/web-audio-backend.ts)) — `<audio>` → `MediaElementAudioSourceNode` → per-track `GainNode` → `AudioContext.destination`. One gain node per track so crossfade is two independent ramps with no glide between sources. `setGain` cancels scheduled values, anchors current, then linearly ramps — so re-triggering mid-fade behaves sanely.
- **`scan_folder` Rust command** ([apps/desktop/src-tauri/src/lib.rs](apps/desktop/src-tauri/src/lib.rs)) — chose this over the fs plugin to sidestep dynamic scope grants. Returns `path + size + mtime`; the renderer hashes those into a stable Track id via FNV-1a 64-bit.
- **Asset protocol** (`assetProtocol.scope: ["**/*"]`) — needed because `convertFileSrc()` turns user-picked paths into `http://asset.localhost/...` URLs the WebView can play. Permissive but reasonable for a local-only desktop app where the user explicitly picks the folder.
- **Categorize precedence** — track-name evidence beats pack-name evidence. Surfaced when "System Status OK" in "Ominous Overtures" first picked up Tension from the pack name; fix is in `match()` running on the filename alone before falling back to filename+parent.

## Verified pre-PR

- ✅ `pnpm -r typecheck` — strict mode, no `any`
- ✅ `pnpm --filter @mc/core test` — 130/130 pass (118 categorize, 12 shuffle)
- ✅ `pnpm --filter @mc/desktop build` — Vite, 223 KB / 71 KB gzipped
- ✅ `cargo check` from `apps/desktop/src-tauri/`

## Test plan

Runtime verification needs a Tauri window — couldn't drive that headlessly. Steps to validate locally:

- [ ] `pnpm install` from repo root
- [ ] `pnpm desktop` (or `pnpm tauri dev` from `apps/desktop/`) — window paints, Mica visible, title "Major Ambience"
- [ ] Click **Open Folder**, pick a folder with `.mp3`/`.wav`/`.flac`/`.ogg`/`.m4a` files
- [ ] Verify scan completes, sidebar counts populate, tracks distribute across categories
- [ ] Click a track in any non-empty category — audio plays, transport bar progresses, time updates
- [ ] Click a second track — first fades out over 2s, second fades in over 2s
- [ ] Restart the app — sidebar repopulates from SQLite (no rescan needed)
- [ ] Inspect `tracks.last_played_at` in SQLite — bumps when a track is clicked

## Working rules honored

`DESIGN.md § 12`: prototype not refactored (referenced); no audio files in repo; no emoji in UI (Glyph everywhere); inline styles only (no CSS-in-JS lib); no IAP plumbing; no telemetry; prototype untouched.

## Follow-up (already tracked, will land after review)

- Full three-pane Library layout matching `prototype/app/desktop.jsx`
- Hover preview (5s from 20% in, desktop only — `BUILD_GUIDE § 2`)
- Now Playing right rail with `<OrbVisualizer>`
- Grade chip cycling (S→A→B→C→D→F→none)
- Per-track fade duration persisted to config table

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
