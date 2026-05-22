## Summary

First production code for Major Ambience. Implements **DESIGN.md § 2 in full** plus **all seven pillars of ROADMAP Phase 1**. A Tauri 2 desktop shell that renders the full prototype layout against a real local folder, plays audio through a Web Audio engine with crossfade + auto-ducking, persists state, and ships every Phase 1 feature: Library, Now Playing, Scenes, Soundboard, SFX layer, Search, Tutorials.

End-to-end flow: **Open Folder → Rust recursive scan → ancestor-walk categorize → SQLite insert with FTS5 + orphan deletion → render three-pane Library → click track → `WebAudioBackend` plays with crossfade. Right-click a track → pin to soundboard. Soundboard pad fires → music ducks automatically. Save current as a scene → click later to restore. Ctrl+K → full-text search.** Grade, fade, ducking, volume, root folder all persist across launches.

Verified live against a 5,471-track personal library on Windows 11.

---

## ⚠️ One critical fix worth flagging

`.gitignore` had a bare `audio/` rule (meant to exclude user music folders), which silently excluded **the entire `packages/core/src/audio/` directory** from every commit until commit `a5348af`. The earlier commits *referenced* the audio engine files in their messages but never actually contained them. Fixed by removing the broad rule (per-extension globs already cover audio media) and explicitly adding the three audio source files to tracking.

The dev app worked the whole time because Vite reads the local file system; the gap was only between local and GitHub.

---

## ROADMAP Phase 1 — all seven pillars shipped

| Pillar | Status |
|---|---|
| **Library** | ✅ Folder import, ancestor-walk auto-categorization, ten categories with live counts, grade filtering, subcategory tabs, click-to-play with crossfade |
| **Now Playing** | ✅ Pulsing `<OrbVisualizer>` tinted to category color, italic display title, scrubbable progress, grade row, fade slider |
| **Scenes** | ✅ Snapshot category + queue + fade + volume; restore in one tap; 3-column card grid with delete-on-hover |
| **Soundboard** | ✅ 3 pages × 8 pads. Drag-to-assign + right-click "Pin to slot" menu. Per-pad loop + volume |
| **SFX layer** | ✅ Auto-ducks the music bus when any pad fires (150 ms down, 400 ms up). Ducking slider in transport, persisted |
| **Search** | ✅ FTS5 spotlight overlay, Ctrl+K, debounced 120 ms, click-to-play |
| **Tutorials** | ✅ 5 coachmark walkthroughs, opt-in via settings, gold pulsing dot until seen |

## Architecture worth a closer read

- **`WebAudioBackend`** ([packages/core/src/audio/web-audio-backend.ts](packages/core/src/audio/web-audio-backend.ts)) — `<audio>` → `MediaElementAudioSourceNode` → per-track `GainNode` → `musicBus` / `soundboardBus` → `master` → destination. One gain node per track so crossfade is two independent ramps with no glide between sources. Master ramp drives the volume slider; music bus ramp drives auto-ducking. `setGain` cancels scheduled values then linearly ramps from current, so re-triggering mid-fade behaves sanely.
- **`scan_folder` Rust command** ([apps/desktop/src-tauri/src/lib.rs](apps/desktop/src-tauri/src/lib.rs)) — recursive directory walk, filters `.mp3/.wav/.flac/.ogg/.m4a/.aac`, skips macOS `._` AppleDouble files. Chosen over the fs plugin to sidestep dynamic scope grants. Returns `path + size + mtime`; renderer hashes those into a stable Track id via FNV-1a 64-bit.
- **Asset protocol** (`assetProtocol.scope: ["**/*"]`) — needed because `convertFileSrc()` turns user-picked paths into `http://asset.localhost/...` URLs the WebView can play. Permissive but reasonable for a local-only desktop app where the user explicitly picks the folder.
- **`categorize` precedence**: filename > filename+immediate-parent > walk ancestors closest-first. Surfaced when "System Status OK" in "Ominous Overtures" first picked up Tension from the pack name; fix runs `match()` on the filename alone before falling back. Ancestor walking handles `MUSIC/<Category>/<Subcategory>/<pack>/track.mp3` library layouts where filename and pack folder are mute but `Battle` or `Horror` sits one level up. Bare weather words (rain, snow, wind, thunder, lightning) removed from `SFX_OVERRIDE` — too many song titles contain them; real weather SFX packs always carry `weather` or `weatherwounds` in the pack folder name.
- **Auto-ducking** ([apps/desktop/src/lib/pad-audio.ts](apps/desktop/src/lib/pad-audio.ts)) — active pad count drives the music bus. First pad firing: music → `1 − duckingPct` over 150 ms. Last pad ending: music → 1 over 400 ms. If the user moves the ducking slider while pads are alive, the new depth re-applies live via the same 150 ms ramp.
- **SQLite via `tauri-plugin-sql` v2** — the pool returns a different connection per `execute()`, so JS-level `BEGIN TRANSACTION` orphans the tx and locks the DB (SQLITE_BUSY). `insertTracks` does plain per-row inserts; `INSERT OR REPLACE` keeps rescans idempotent. Orphans purged via a temp `keep_ids` table to dodge the 999-bind limit.

## Layout port

Faithful port of `prototype/app/desktop.jsx` — five components under `apps/desktop/src/layout/`:

- **`DesktopHeader`** — Library / Scenes / Soundboard tabs (all functional), search input with Ctrl+K shortcut, Open Folder, dice / theatre icons (Phase 2 stubs), settings icon that opens the tutorials menu.
- **`DesktopSidebar`** — 244 px wide. MUSIC summary card with root folder name + track count. Library section. Categories list with live counts and color-tinted active state.
- **`DesktopLibraryView`** — 112 × 112 glyph tile, italic display title, gradient wash, *Shuffle weighted* button, subcategory tabs with live counts, S–F grade filter, six-column track grid (#, Title, Pack, Plays, Grade, Time).
- **`DesktopRightRail`** — 360 px wide. Now Playing card with `<OrbVisualizer>`, italic title, pack, click-to-set/clear grade row, progress sliver. Up Next queue. SFX layer placeholder.
- **`DesktopTransport`** — 88 px bottom bar. Track tile + clickable grade pills, fade slider (0–10 s), duck slider (0–100 %), prev/play/pause/next, click-to-seek scrubber, VU visualizer, master volume slider.

## Verification

- ✅ `pnpm -r typecheck` — strict mode, no `any`, clean across all 4 workspace packages
- ✅ `pnpm --filter @mc/core test` — **143/143 pass** (131 categorize, 12 shuffle)
- ✅ `pnpm --filter @mc/desktop build` — Vite, 286 KB / 87 KB gzipped
- ✅ `cargo check` from `apps/desktop/src-tauri/`
- ✅ Live test against a 5,471-track personal library: scan, categorize, play, crossfade, grade, shuffle, fade, volume, ducking, search, scenes, soundboard pin, soundboard fire, restart-persistence all confirmed working

## Out of scope (Phase 2 carve-outs)

- DM Mode toggle (red badge for screen-sharing)
- Themes (Parchment, Arcane) — Gold & Dark only for v1
- DM Toolkit add-on (NPC names, dice, initiative, turn sounds) — $4.99 IAP
- Mobile beta (RN + Expo)
- Cloud sync (Cloudflare Workers + KV)
- IAP plumbing

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
