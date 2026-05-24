# Changelog

All notable changes to Major Ambience will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Nothing yet — Phase 2 cloud sync proper + IAP continue here. Mobile audio engine (react-native-track-player, needs EAS dev-client) is the next mobile ticket.

---

## [0.0.20] — 2026‑05‑24 — Loop crossfades into itself

Track-loop mode used to flip `HTMLAudioElement.loop = true`, which is a hard cut at the loop point. That made ambient beds (designed for seamless looping but recorded with a fade-in/out on the file itself) sound clicky on every revolution. Track loop now self-crossfades — the same fade duration the rest of the engine uses.

### Changed — Track loop is JS-driven

- Native `audio.loop` stays **off** in both loop modes. The desktop engine handles both in JS so the crossfade ramp can apply.
- "track" loop: when `onProgress` sees `remaining ≤ fadeSec`, a fresh `handlePlayTrack(currentTrack)` kicks off. The existing crossfade ramps the new handle in while the old handle ramps out, so the loop point sounds like a blend instead of a click.
- For tracks shorter than the configured fade, the trigger window clamps to `duration / 2` so we don't fire the loop crossfade at t=0 and chain restarts without ever playing the body.
- A `loopCrossfadeKicked` latch (per-handle closure) ensures the trigger fires once per playback even though `onProgress` fires several times a second.

### Internal — onEnded guard

- The old handle still reaches its natural end during the crossfade tail. Without a guard, its `onEnded` would flip `isPlaying` off mid-loop. Added an early-return when `loopCrossfadeKicked` is true, so the superseded handle no longer touches transport state.
- `handleCycleLoop` no longer pokes the live `HTMLAudioElement.loop` flag — `loopModeRef` drives the trigger, so flipping the mode mid-track applies on the next loop iteration without restarting the clip.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual: enable Loop (O hotkey), tune the fade slider to ~3–4s, let an ambient track ride a full cycle. You should hear the loop point as a smooth blend, not a click.

---

## [0.0.19] — 2026‑05‑24 — Polish: window state · empty-state copy · stale placeholders

Small-scope round of rough-edge fixes.

### Added — Window size & position persistence

- `tauri-plugin-window-state` (v2) added to `src-tauri/Cargo.toml` + initialized in `lib.rs`. Saves window size, position, and maximized state on close; restores on next launch. No JS-side wiring needed — the plugin intercepts the window lifecycle automatically.
- First-time launch still uses the `tauri.conf.json` defaults (1280 × 800).

### Changed — Right rail empty-state copy

- "Pick a track to begin." → walks the user through the three play paths: click a row, press a category letter (with the actual letters listed), or press **?** for the cheatsheet.
- **"Hit Shuffle to fill the queue"** (the Up Next empty state, which became wrong in v0.0.15 when row-clicks started autoqueueing) → "Tap a track row, hit Shuffle, or press a category letter…".

### Removed — "SFX Layer · Phase 2" placeholder in the right rail

- The block has lived in the right rail since v0.0.1 as a "coming soon" stub. SFX / soundboard has been a full feature since v0.0.2 with its own tab and live pad indicators, so the placeholder was lying to users. Dropped it. The right rail is now Now-Playing + Up-Next.

### Changed — Sidebar folder card resilience

- When the local DB has tracks but no `root_folder_name` (older release, or the config row was lost), the card said "No folder open · 5,317 tracks" — contradictory. Now reads "Indexed library · 5,317 tracks" in that fallback case. Opening a folder writes the real name back.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Window state plugin needs a Rust rebuild on first run (`pnpm tauri dev` will compile it automatically).

---

## [0.0.18] — 2026‑05‑24 — Scene editor

Scenes have been create / restore / delete since v0.0.3. Today you can edit them too.

### Added — Scene edit dialog

- Hover a scene card → two icons appear top-right: **sliders** (edit) and **×** (delete, unchanged). Click sliders to open `SceneEditDialog`.
- Edit any of: **name**, **primary category** (10-chip picker, color-tinted), **crossfade** (0–10s), **volume**, **ducking**. Tracks editor with two actions: **Adopt current queue** (replaces the scene's pinned tracks with the Library's current `queue`) and **Clear** (drops the pinned tracks so the scene shuffles the primary category on restore — the original empty-queue behavior).
- Save persists via the existing `saveScene` upsert, refreshes the scene list, and toasts the new name. Cancel / Esc / click-outside discards.
- Slotted into the existing `handleEscape` overlay-chain right after the save-dialog rung.

### Internal

- `SceneEditDialog` keeps the edits as local draft state (name / primary / fadeMs / volume / ducking / trackIds). Only commits to Library on Save — Cancel never touches the underlying scene.
- "Volume" exposes the primary-category slot of the scene's `volumes` record. The dialog rewrites just that key on save, preserving any other per-category volumes the scene already had.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Tauri-runtime feature — manual verification on `pnpm tauri dev`.

---

## [0.0.17] — 2026‑05‑24 — Bulk grading via multi-select

Grading 5,000+ tracks one-at-a-time is painful. Multi-select + a batch grade bar makes it fast.

### Added — Multi-select

- **Ctrl/⌘ + click** any track row to toggle it in/out of the selection.
- **Shift + click** another row to range-select between it and the last selection anchor in the current visible order (respects category, grade filter, subcategory filter).
- Selected rows get a gold border + tinted background. Plain (no-modifier) click clears the selection and plays the track as before — autoqueue still works on the visible list.

### Added — SelectionBar

- Floating bar above the transport when ≥ 1 track is selected. Shows the count, then **S / A / B / C / D / F** grade pills and a `—` clear-grade pill. Click any pill → batch-applies that grade to every selected track.
- Clear button on the bar — same as **Esc** — drops the selection without changing grades.
- Bar hides in DM Mode and on non-Library tabs.

### Internal

- New repo function: `setGrades(db, trackIds, grade)` — per-row UPDATEs in a loop because tauri-plugin-sql's pool returns a different connection per `execute()`, so transactional batching has the SQLITE_BUSY risk from earlier releases.
- `handleSelectRow(trackId, mode, visibleTracks)` in Library encapsulates the three click modes. Anchor sticks across shift-clicks so the user can pivot on a single row.
- `Esc` clears the selection via the existing `handleEscape` chain (slotted between picker dismissal and search dismissal).

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Tauri-runtime feature — manual verification on `pnpm tauri dev`.

---

## [0.0.16] — 2026‑05‑23 — Manual recategorize + notes

First of four small-scope improvements from a session-quality pass. The right-click track menu — historically just for pinning to soundboard slots / setting turn sounds — grew two new sections so users can clean up auto-categorized tracks and annotate them without leaving the library.

### Added — Categorize section in the right-click menu

- Right-click any track row → new **Categorize** section. Ten category pills (Combat / Tavern / … / SciFi), colored to match their palette, with the current category highlighted.
- Click any pill to move the track to that category. When the current category has subcategories (Combat: Boss / Battle / Skirmish today), a second row appears with the available subcats + a **none** option. Switching category drops the subcategory because the value would no longer be meaningful; staying in the same category preserves it.
- Menu stays open after a category click so the user can fine-tune the subcategory in the same gesture. Esc / outside click dismisses.
- Status toast describes the change: `Moved "Mighty Seas" Exploration → Combat · battle` or `Updated "Mighty Seas" subcategory → boss`.

### Added — Notes section in the right-click menu

- Free-form text input. Saves on **blur** or **Enter**. Empty input clears the note.
- Notes are already indexed by the `tracks_fts` triggers, so anything you type here is searchable from the **Ctrl/⌘ K** spotlight overlay.

### Added — Repo helpers (`packages/data/src/tracks-repo.ts`)

- `setCategory(db, trackId, category, subcategory | null)` — atomic category + subcategory update.
- `setNote(db, trackId, note | null)` — normalizes empty / whitespace input to NULL.

### Internal

- `PinToSlotMenu` kept its name for git-history continuity even though it's now the canonical track-edit popover. Header eyebrow changed from "Pin to soundboard" to just "Track" and gained the pack name as a second line.
- `handleSetTrackCategory` + `handleSetTrackNote` in Library mirror the DB change into the local `tracks` array so the library view re-buckets / re-renders immediately.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Tauri-runtime feature — manual verification on `pnpm tauri dev`.

---

## [0.0.15] — 2026‑05‑23 — Fix: autoqueue from clicked row + loop stale closure

Two bugs from a real-session run that both have the same root: the queue and loop state weren't being read at the right time.

### Fixed — Autoqueue when clicking a track row

- Clicking a track in the library only called `handlePlayTrack(track)` without touching the queue, so when the track ended `onEnded`'s queue-findIndex returned `-1` (empty queue) and playback just stopped. Shuffle and the letter hotkeys built a queue themselves so they were fine; row clicks were the broken path.
- `DesktopLibraryView` now passes the visible filtered list as a second arg to `onPlayTrack`. `handlePlayTrack(track, queueContext)` builds an autoqueue: clicked track at index 0, everything after it in its original order next, then everything before it (so the queue wraps the visible list once). When that track ends, the next-in-queue plays — same category, same filter, same sort order.

### Fixed — Loop wrap not working when mode changed mid-playback

- `onEnded` closed over `queue` and `loopMode` at subscription time (inside `handlePlayTrack`). If the user enabled **loop queue** *after* starting playback, the callback still saw `loopMode === "off"` when the track ended and didn't wrap. Same staleness for the queue.
- Now `loopMode` and `queue` are mirrored into refs (`loopModeRef`, `queueRef`) and `onEnded` reads from those — live values, not subscription-time snapshots. Loop track was unaffected because that path uses `HTMLAudioElement.loop` natively and never reaches `onEnded`.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Tauri-runtime feature — manual verification on `pnpm tauri dev`. Try: click any Combat track → let it play out → next Combat track plays. Enable loop queue mid-track → at the end, queue wraps to the first track.

---

## [0.0.14] — 2026‑05‑23 — Fix: "All" grade pill clipped

### Fixed

- The **All** grade-filter pill in the library hero was rendering inside a `width: 26px` box (sized for the single-letter S/A/B/C/D/F chips) so the three-letter label was clipped and off-center. Pills now use `minWidth: 26` + `padding: 0 10px` for **All** and `0` padding for the single-letters, so each chip fits its content and the row stays uniform.

---

## [0.0.13] — 2026‑05‑23 — Name variety + click-to-pick track assignment

Two real-session pain points: the NPC name generator kept rolling the same names, and the "drag a track from the Library onto a soundboard pad / combatant" affordance never worked in the single-pane tabbed UI (source and target are never visible together). Both fixed.

### Added — Track picker overlay (`apps/desktop/src/layout/TrackPickerOverlay.tsx`)

- Searchable popover. Filters the full track index by title + pack (case-insensitive, AND-of-terms). Anchored at click position; Esc / click outside to dismiss.
- Click an **empty soundboard pad** → picker opens for that pad. Pick a track → pinned.
- Click the **speaker icon on a combatant row** → picker opens. Pick a track → set as their turn sound. Right-click the speaker reopens the picker even if a sound is already set (swap rather than clear-then-reassign).
- The cross-tab drag-and-drop affordance never actually worked because Library / Soundboard / DM Tools each live on their own tab — the drop target is invisible while the user is dragging from a source on the Library tab. The picker is the click-driven alternative; existing drag-drop targets stay wired for the few cases where users have the Library and a sibling pane visible.

### Changed — Copy + tooltips

- Soundboard hero: "Drag a track from the Library onto a pad" → "Click an empty pad to pick a track from your library; click an assigned pad to fire."
- Empty soundboard pad: "Drag a track here" → "Click to pick a track".
- Combatant speaker icon tooltip: "Drag a track from the Library onto this row to assign a turn sound" → "Click to pick a turn sound for this combatant".
- Initiative footer: "Drop a track onto a row to assign its turn sound" → "Click the speaker on a row to pick its turn sound."

### Changed — NPC name variety (`apps/desktop/src/lib/dm-names.ts`)

- Roughly doubled each race's first + last name list (now 50-70 per slot per race; orcs got more last names too). 50 × 30 = 1,500 combos per race minimum.
- New `rollNameAvoiding(race, recentSet)` helper. The NameGenerator passes its own history as the avoid set, so the next roll won't collide with anything already in your session history (up to the existing 30-entry cap). Tries up to 20 redraws before giving up — list sizes make a 21st collision astronomically unlikely.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Tauri-runtime feature — no browser preview path; manual verification on `pnpm tauri dev`.

---

## [0.0.12] — 2026‑05‑23 — Loop: off / track / queue

The Loop button in the transport was a disabled placeholder since v0.0.2 ("Phase 2" tooltip). Wired it up.

### Added — Three-state loop

- Click the loop glyph next to **Next** in the transport to cycle: **off → track → queue → off**.
- **O** hotkey runs the same cycle. Added to the `?` cheatsheet.
- New config key `loop_mode` persists the choice across launches.

### Behavior

- **off** — track ends, queue advances; final track stops playback. (Original behavior, unchanged.)
- **track** — `HTMLAudioElement.loop = true` replays the current track natively. The browser handles the seamless wrap, so `onEnded` never fires and the queue sits idle until you change the mode. Useful when you want a single piece to keep going for as long as the encounter does.
- **queue** — `HTMLAudioElement.loop = false`; track ends, `onEnded` advances; when the last queue track ends, wraps back to `queue[0]`. Useful for a curated playlist that should keep cycling.

Switching mode mid-playback applies live — no need to restart the track. `handleCycleLoop()` flips the live `audio.loop` flag on the currently-loaded handle.

### Visual

- Off: faded loop glyph in `ink3`.
- Track: gold-tinted button + small "**1**" badge in the bottom-right.
- Queue: gold-tinted button, no badge.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Tauri-runtime feature — cannot be exercised via browser preview. Manual verification on the running Tauri app.

---

## [0.0.11] — 2026‑05‑23 — DM Toolkit tabs · Stop All · Favorites & Recently played

Three usability gaps from a real-session DM run. None of them are big alone; together they make the app feel a lot less cramped on a 1280-wide window.

### Changed — DM Toolkit tabs

- The three tools (Names · Dice · Initiative) lived in a 3-column grid that squashed combatant names down to "Βασω" and dice modifiers to four characters wide on standard window sizes. Tabified into `Initiative` / `Names` / `Dice` so each gets the full pane width.
- Initiative is the default tab — it's the most useful at-the-table, and its counter (`Tracker · 2 in combat`) is also the live-status badge on the tab itself when you're on another tool.

### Added — Stop All sound (button + Z hotkey)

- Red **stop** button next to **Next** in the transport. Halts the music handle (tears it down — not the pause behavior), every soundboard pad, and any turn-sound pseudo-pads at once. Enabled state reflects whether anything is actually playing.
- New **Z** hotkey runs the same action. Added to the `?` cheatsheet.
- Behind the scenes: existing `stopAllPads()` was already there; this wires it to a new `handleStopAll()` that also drops the music handle (`backend.destroy`) and resets the transport UI to the no-playback baseline. Distinct from pause — pause keeps the track loaded.

### Changed — Favorites & Recently played are real

- **Favorites** (sidebar): all S- and A-graded tracks across every category, sorted S-then-A, then title. Click switches the center pane to a Favorites view with a gold hero. Live count badge.
- **Recently played** (sidebar): tracks with `lastPlayedAt` set, newest first, top 25. Blue hero. Live count badge.
- Both rows were previously muted placeholders. Now active highlight + cursor + click-to-show.
- Pseudo-views skip the subcategory tabs (no meaning for cross-category lists) and the Save-as-scene button. Letter and number hotkeys still jump to real categories — Favorites / Recently played live in the sidebar.

### Internal

- `DesktopLibraryView` now takes a `meta: ViewMeta` prop (name/glyph/color/dark/desc/subcats?) instead of `activeCategory: CategoryId`. Real categories still satisfy the type; pseudo-views supply a synthetic meta. New `isPseudoView` prop hides irrelevant chrome.
- New Library state: `activeView: "category" | "favorites" | "recent"`. Every category-switching site (sidebar pick, letter hotkey, number jump, scene restore, boss hotkey) resets this to `"category"`.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.

---

## [0.0.10] — 2026‑05‑23 — Category hotkeys: letter-to-play, highlighted in sidebar

Turns the keyboard from a navigation aid into a DM control surface. A single letter press now picks a weighted-random track from the matching category and starts playing — same weights the Shuffle button uses (S=6×, A=4×, B=2×, C/D/Ungraded=1×, F excluded), so a press of **C** is biased toward your best Combat tracks but won't get stuck on one.

### Added — Letter-to-play hotkeys

- **C** Combat · **T** Tavern · **E** Exploration · **A** Ambient · **H** Horror · **S** TenSion · **R** Rest · **V** Voices · **X** SFX · **F** SciFi.
- **B** plays a random Combat: Boss track (sub-category hotkey example — first of more if we add them).
- Each press switches to the matching category tab too, so you can see what landed in the queue.

### Added — Sidebar letter highlight

- Inside each category name the hotkey letter is now underlined + gold-accent so the binding is discoverable without opening the cheatsheet. Tension's "S" is highlighted in place; SFX's "X" is highlighted as the X. SciFi's "F" lights up the F.
- Small caption above the category list reads "Letter plays · Number jumps" so the distinction is one glance.
- Tooltip on each row reads `Press C to play a weighted random Combat track`.

### Changed

- `Category metadata` (`packages/ui/src/categories.ts`) grew a `shortcut: string` field. Two new helpers: `letterIndexInName(meta)` and `findCategoryByShortcut(letter)`. Single source of truth for both desktop and (later) mobile.
- Shuffle moved from **S** to **W** (weighted) — S now belongs to TenSion. The Shuffle button in the hero is untouched.
- `1–9 / 0` keep their silent-jump behavior — you can still preview a category without playing if that's what you want.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual verification on the running Tauri app is required (UI-only feature, no testable unit boundary beyond the shortcut routing already covered by `resolveShortcut`). I could not exercise the change in a browser preview because the desktop app depends on Tauri runtime APIs (asset protocol, plugin-sql, webview drag-drop) — verification needs `pnpm tauri dev`.

---

## [0.0.9] — 2026‑05‑23 — Desktop polish: keyboard shortcuts + scan UX + track row

Wide polish pass on the desktop client. No new tabs / features — everything was already there, this just makes it nicer to drive without the mouse and easier to see what's going on with your library.

### Added — Keyboard shortcuts (`apps/desktop/src/lib/keyboard.ts`)

- Global keydown handler routed through `resolveShortcut()` (pure function, easy to test). Skips when the focus is in an input / textarea / contenteditable; skips most shortcuts when any modal-y overlay is open (search, pin menu, tutorials menu, scene save, sync confirm, guided tutorial, help). `Esc` is the one exception — it falls through to a per-overlay dismisser so the user can always close the topmost layer with one press.
- Bindings: **Space / K** play-pause, **J / ←** prev, **L / →** next, **,** / **.** seek ±5s, **G** cycle grade, **S** weighted-shuffle current category, **D** toggle DM Mode, **/** focus search, **Ctrl/⌘ K** open search (already there, preserved), **?** open the cheatsheet, **Esc** close overlay, **1–9 / 0** jump to category by index.
- `apps/desktop/src/layout/KeyboardHelpOverlay.tsx` — modal cheatsheet that reads `SHORTCUTS_REFERENCE` from the shortcuts module so the docs and the code can't drift apart. Dismiss with Esc / `?` / click outside.

### Added — Drag a folder onto the window to scan it

- `getCurrentWebview().onDragDropEvent` (Tauri 2 webview-level drag-drop) gates the existing `handleOpenFolder()` path. While the drag is over the window we show a gold dashed overlay reading **"Drop folder to scan"**.
- Single path only for v1 — dropping multiple files / folders surfaces a hint and ignores the drop.

### Added — Sidebar: Rescan + last-scanned timestamp

- Folder card grew a compact rescan button (small loop glyph) that re-runs the scan against the stored `root_folder_path` config key. Disabled while a scan is in flight; hidden in DM Mode.
- Second line of the card now reads `5,317 · 12 min ago` instead of just the track count. Relative-time formatter is local to the sidebar and only handles 1 unit — full Intl machinery would be overkill for `< 5s / <60s / <60m / <24h / <30d / dd MMM`.
- New config keys: `root_folder_path` (full OS path so rescan / drag both share an entry point), `last_scanned_at` (epoch seconds).

### Added — Track row polish

- Subcategory chip next to the title for any track with `track.subcategory` (Combat: Boss / Battle / Skirmish today). Color-tinted to the category palette.
- Second line under the title shows `Last played 5d ago` when `track.lastPlayedAt` is set. Same compact formatter as the sidebar.

### Fixed — Play error keeps UI consistent

- `handlePlayTrack` previously left `isPlaying` / `currentTime` / `trackDurationSec` at stale values when the audio backend threw mid-load (e.g. broken file path). Now the transport UI resets to the no-playback baseline on error if there's no existing playback to fall back to. If there *is* an existing playback (mid-crossfade), it stays — the old track keeps going and the user just sees the error toast.

### Internal

- `handleSeek` clamps to `[0, trackDurationSec]` instead of trusting the caller. Adds a thin `handleSeekRelative(delta)` wrapper for the `,` / `.` shortcuts.
- `handleOpenFolder()` refactored to accept an optional `forcedPath` so the picker / rescan / drag-drop all funnel through the same body.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual: most of this is UI behavior in the Tauri window — covered by the existing tutorials and the new cheatsheet.

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
