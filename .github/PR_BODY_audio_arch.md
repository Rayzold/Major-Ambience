## Summary

First production code for Major Ambience. Implements **DESIGN.md § 2 in full** — a Tauri 2 desktop shell that renders the prototype's Library against a real local folder, plays audio through a Web Audio engine with crossfade, persists state, and ships the complete three-pane layout from `prototype/app/desktop.jsx`.

End-to-end flow: **Open Folder → recursive scan via Rust → categorize (ancestor-walking) → SQLite insert with FTS5 + orphan deletion → render three-pane Library → click track → `WebAudioBackend` plays it with crossfade to whatever was playing before. Grade, fade, volume, root folder all persist across launches.**

Verified live against a 5,471-track personal library on Windows 11.

---

## ⚠️ One critical fix worth flagging

`.gitignore` had a bare `audio/` rule (meant to exclude user music folders), which silently excluded **the entire `packages/core/src/audio/` directory** from every commit until the last one. The earlier commits *referenced* the audio engine files in their messages but never actually contained them. Fixed in commit `a5348af` by:

- Removing the broad `audio/` rule
- Relying on the per-extension globs (`*.mp3`, `*.wav`, `*.flac`, `*.ogg`, `*.m4a`, `*.aac`) which already prevent committing audio media at any depth
- Adding the three audio source files (`backend.ts`, `web-audio-backend.ts`, `index.ts`) to tracking

The dev app worked the whole time because Vite reads the local file system; the gap was only between local and GitHub.

---

## What landed (DESIGN.md § 2 deliverables, all ten)

| # | Spec | Status |
|---|---|---|
| 1 | `apps/desktop/` Tauri 2 + React + Vite scaffold via `pnpm create tauri-app` | ✅ Mica window, identifier `com.rayzold.majorambience`, 1280×800 |
| 2 | `packages/core/` workspace package with `AudioBackend` interface | ✅ Matches `BUILD_GUIDE.md § 3.4` exactly |
| 3 | `packages/core/src/categorize.ts` pure function with Vitest tests | ✅ 129 cases, every rule in `CATEGORIZATION_GUIDE.md` plus ancestor walking |
| 4 | `packages/core/src/shuffle.ts` weighted shuffle with tests | ✅ S=6×, A=4×, B=2×, C/D/Ungraded=1×, F=excluded — 12 cases, Mulberry32 PRNG for determinism |
| 5 | `packages/data/` SQLite schema with FTS5 via `tauri-plugin-sql` | ✅ Ships as Tauri migration `0001_initial.sql` |
| 6 | `packages/ui/` ported primitives | ✅ Tokens, category palette, `<Glyph>` (30+ icons), `<TrackRow>`, `<CategoryGradient>`, `<Visualizer>`, `<OrbVisualizer>`, `<GradeChip>`, `<CatChip>` |
| 7 | Library screen wired in `apps/desktop/` with Open Folder action | ✅ Full three-pane layout, not the minimal one |
| 8 | `WebAudioBackend` against `MediaElementAudioSourceNode` on an `AudioContext` | ✅ Plus master `GainNode` bus for volume control |
| 9 | Crossfade per `BUILD_GUIDE.md § 4.1` | ✅ Linear-ramp `setGain`, user-controllable duration |
| 10 | Track play count, last-played, fade duration in SQLite | ✅ Plus duration_ms, grade, root folder name, master volume |

## What the layout actually looks like

Faithful port of `prototype/app/desktop.jsx` — five components under `apps/desktop/src/layout/`:

- **`DesktopHeader`** — top toolbar with Library / Scenes / Soundboard tabs (Library functional, others stubbed for Phase 2), search input (visual placeholder), Open Folder, dice / theatre / settings icon buttons.
- **`DesktopSidebar`** — 244 px wide. MUSIC summary card with root folder name + track count. Library section (Favorites / Recently played as Phase-2 placeholders). Categories list with live counts and color-tinted active state.
- **`DesktopLibraryView`** — category hero with 112 × 112 glyph tile, italic display title, gradient wash, *Shuffle weighted* button, subcategory tabs with live counts, S–F grade filter row, six-column track grid (#, Title, Pack, Plays, Grade, Time).
- **`DesktopRightRail`** — 360 px wide. Now Playing card with pulsing `<OrbVisualizer>`, italic display title, pack, click-to-set/clear grade row, progress sliver. Up Next queue. SFX Layer Phase-2 placeholder.
- **`DesktopTransport`** — 88 px bottom bar. Track tile + clickable S/A/B/C/D/F cycle pills, fade slider (0–10 s), prev/play/pause/next, click-to-seek scrubber, VU visualizer, master volume slider.

## Interactions wired

- **Click any track** → loads via `WebAudioBackend`, plays, crossfades from whatever was playing before
- **Play / pause** in the transport (pauses the HTML audio element; audio context stays alive)
- **Click anywhere on the scrubber** → seek
- **Grade cycle pills** in transport: S→A→B→C→D→F→none, persisted
- **Grade row** in right rail: click to set, click active to clear
- **Shuffle weighted** on category hero — queues that category, plays first, prev/next steps through, auto-advances on end
- **Fade slider** updates crossfade duration for the *next* track change, persisted as `fade_ms`
- **Master volume slider** drives the master `GainNode`, persisted as `master_volume`, restored on launch
- **Open Folder** rescan — orphans deleted, ancestor-walking categorize re-applied

## Architecture worth a closer read

- **`WebAudioBackend`** ([packages/core/src/audio/web-audio-backend.ts](packages/core/src/audio/web-audio-backend.ts)) — `<audio>` → `MediaElementAudioSourceNode` → per-track `GainNode` → master `GainNode` → destination. One gain node per track means crossfade is two independent ramps with no glide between sources. The master bus is one ramp affecting everything. `setGain` cancels scheduled values then linearly ramps from current, so re-triggering mid-fade behaves sanely.
- **`scan_folder` Rust command** ([apps/desktop/src-tauri/src/lib.rs](apps/desktop/src-tauri/src/lib.rs)) — recursive directory walk, filters `.mp3/.wav/.flac/.ogg/.m4a/.aac`, skips macOS `._` AppleDouble files. Chosen over the fs plugin to sidestep dynamic scope grants. Returns `path + size + mtime`; renderer hashes those into a stable Track id via FNV-1a 64-bit.
- **Asset protocol** (`assetProtocol.scope: ["**/*"]`) — needed because `convertFileSrc()` turns user-picked paths into `http://asset.localhost/...` URLs the WebView can play. Permissive but reasonable for a local-only desktop app where the user explicitly picks the folder.
- **`categorize` precedence**: filename > filename+immediate-parent > walk ancestors closest-first. Surfaced when "System Status OK" in "Ominous Overtures" first picked up Tension from the pack name; fix runs `match()` on the filename alone before falling back. Ancestor walking handles `MUSIC/<Category>/<Subcategory>/<pack>/track.mp3` library layouts where filename and pack folder are mute but `Battle` or `Horror` sits one level up.
- **SQLite via `tauri-plugin-sql` v2** — the pool returns a different connection per `execute()`, so JS-level `BEGIN TRANSACTION` orphans the tx and locks the DB (SQLITE_BUSY). `insertTracks` does plain per-row inserts; `INSERT OR REPLACE` keeps rescans idempotent. Orphans purged via a temp `keep_ids` table to dodge the 999-bind limit.

## Out of scope (DESIGN.md § 2)

These are deliberate Phase-2 carve-outs, not gaps:

- Scenes view (tab present, content stubbed)
- Soundboard view (tab present, content stubbed)
- Search (input present, disabled)
- SFX layer (placeholder slot in right rail)
- DM Mode toggle
- Themes (Parchment, Arcane) — Gold & Dark only
- Mobile, cloud sync, IAP

## Open questions

None hit. `DESIGN.md § 11.1` (VTT) is already decided. `§ 11.2–11.5` don't apply to this ticket.

## Verification

- ✅ `pnpm -r typecheck` — strict mode, no `any`, clean across all 4 workspace packages
- ✅ `pnpm --filter @mc/core test` — **141/141 pass** (129 categorize, 12 shuffle)
- ✅ `pnpm --filter @mc/desktop build` — Vite, 246 KB / 76 KB gzipped
- ✅ `cargo check` from `apps/desktop/src-tauri/`
- ✅ Live test against 5,471-track personal library: scan, categorize, play, crossfade, grade, shuffle, fade, volume, restart-persistence all confirmed working

## Test plan for reviewer

- [ ] `pnpm install` from repo root
- [ ] `pnpm desktop` (or `pnpm tauri dev` from `apps/desktop/`)
- [ ] Window paints, Mica visible, title "Major Ambience"
- [ ] Click **Open Folder**, pick a folder with audio files
- [ ] Scan completes, sidebar counts populate, distribution reasonable (not 75% Exploration)
- [ ] Click a track — audio plays, orb pulses in category color, transport progress moves
- [ ] Click a second track while first is playing — crossfade smoothly over the fade-slider duration
- [ ] Click any grade letter under the orb — persists; relaunch confirms
- [ ] Drag volume slider — audio level changes in real time
- [ ] Drag fade slider to 5 s, switch tracks — confirms 5-second fade
- [ ] Click **Shuffle weighted** — Up Next fills, prev/next steps through
- [ ] Click the scrubber — track seeks to that position
- [ ] Restart the app — sidebar repopulates from SQLite, fade/volume/root folder restored

## Working rules honored (DESIGN.md § 12)

1. Prototype not refactored (referenced; production matches it)
2. No audio files in the repo
3. No emoji in UI (Glyph everywhere)
4. No CSS-in-JS libraries (inline `style={{}}` only, matching prototype)
5. No subscription / IAP plumbing
6. No telemetry
7. Prototype untouched
8. Reference, don't duplicate (links throughout PR body)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
