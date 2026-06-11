# Changelog

All notable changes to Major Ambience will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Earlier: **mobile reached full desktop parity** for the v0.x feature set — DM Toolkit (#35), background audio (#39), loop control (#40), grade pills (#41), removed-category (#42), Favorites + Recently played (#43), duration probe (#44), and length filter (#45). `BACKLOG.md` is empty for the mobile-parity track.

---

## [0.0.32] — 2026‑06‑11 — Initiative tracker: per-combatant modifier + Roll all

The next-battle workflow used to mean retyping every combatant. Now you set each combatant's d20 modifier once; one click re-rolls the whole party.

> Desktop-only release: bumps `apps/desktop/package.json` / `tauri.conf.json` / `Cargo.toml` 0.0.31 → 0.0.32. Mobile untouched (mobile DM Toolkit Initiative is on the same Combatant shape and inherits the new field as forward-compatible data — the UI mirror lands in a follow-up).

### Added — `apps/desktop/src/layout/dm/InitiativeTracker.tsx`

- New optional `initiativeMod?: number` on `Combatant`. Older persisted combatants (pre-0.0.32) simply won't have it; treated as 0 when rolling.
- **Inline-editable initiative.** The big roll total on each row is now an `EditableNumber`: click → type → Enter (or blur) to commit. Escape reverts. Empty commits as 0 so an explicit clear feels responsive.
- **Modifier chip** below each row's initiative number. Same edit pattern, formatted with leading `+`/`-` (`+5`, `-1`, `+0`). Persisted alongside the rest of the combatant record.
- **"Roll initiative"** button in the footer (next to Clear all), gold-soft with a dice glyph. Re-rolls d20 + each combatant's modifier and resets the turn cursor to the new top of the order. No-op when the roster is empty.

### Layout

- Left column widened 30px → 44px to fit the stacked init + mod controls. The rest of the grid (`1fr 78px 42px 28px 24px`) is unchanged, so HP / AC / speaker / remove keep their existing footprint.

### Verification

- `pnpm -r typecheck` — clean (6 of 6 projects).
- `pnpm -r test` — 228/228 (no test deltas; UI-only).
- Manual smoke (Vite HMR in the running dev shell):
  - Add two combatants with raw init numbers → click each one's mod chip, set +5 / -1 → hit Roll initiative → both rows re-roll, list re-sorts, turn cursor lands on the new top.
  - Click an init number → type → Enter → row resorts to the right place.
  - Escape during edit reverts to the last committed number.
  - Empty an init field then blur → commits as 0.

---

## [0.0.31] — 2026‑06‑11 — Fix the "Converting circular structure to JSON" scan toast

Pins the cryptic scan-failure toast that surfaced once in the 2026‑06‑03 session. The message read:

> Scan failed: Converting circular structure to JSON ─→ starting at object with constructor 'HTMLBu...'

The "HTMLBu…" truncation was `HTMLButtonElement` — i.e. the Open Folder button itself.

> Desktop-only release: bumps `apps/desktop/package.json` / `tauri.conf.json` / `Cargo.toml` 0.0.30 → 0.0.31. Mobile untouched.

### What was happening

`Library.tsx` rendered `<DesktopHeader onOpenFolder={handleOpenFolder} … />`. Upstream, `onOpenFolder` is typed `() => void`, but `handleOpenFolder` actually takes an optional `forcedPath: string`. `DesktopHeader` then wired the prop straight onto a `<button onClick={onOpenFolder}>`, so React invoked it with the `MouseEvent` as the first argument. That event satisfied the truthy `if (forcedPath)` branch, got piped through `scanFolderToTracks` into `invoke("scan_folder", { path: forcedPath })`, and Tauri's IPC serializer crashed trying to JSON-stringify the event — `MouseEvent.currentTarget` is the `HTMLButtonElement` and carries circular refs back through the DOM tree.

### Fix

- **Call site** (`apps/desktop/src/Library.tsx`): wrap so the bare reference doesn't leak the event in — `onOpenFolder={() => void handleOpenFolder()}`. Matches the pattern the rescan branch was already using.
- **Defensive guard** (`handleOpenFolder` itself): swap `if (forcedPath)` for `if (typeof forcedPath === "string" && forcedPath.length > 0)`. Any future caller that hands the function to an event handler — and any other non-string slips through — falls back to the picker dialog instead of crashing the IPC. Comment at the call site documents why.

### Verification

- `pnpm -r typecheck` — clean (6 of 6 projects).
- `pnpm -r test` — 228/228 (no test deltas; one-liner behavioural fix in an event boundary the renderer doesn't expose for unit testing).
- Manual: click the gold Folder button in the header → dialog opens correctly (used to crash before reaching the dialog if the bug fired).

---

## [0.0.30 / mobile 0.0.25] — 2026‑06‑10 — Cloud sync feedback polish

Closes the "Cloud Sync feedback is too subtle" follow-up from the 2026‑06‑03 handoff. Sub-second syncs used to land with only a button label flip and a corner toast that vanished after 4.5s; the modal you were looking at gave you nothing. Now there's a sticky success banner sitting *inside* the modal, plus a small pulse on the "Last synced" line so the time update is visible.

> Cross-surface release: bumps desktop `apps/desktop/package.json` / `tauri.conf.json` / `Cargo.toml` 0.0.29 → 0.0.30 and `apps/mobile/package.json` 0.0.24 → 0.0.25 in lockstep — both surfaces gained the same polish.

### Changed — `apps/desktop/src/layout/SyncSettings.tsx`

- New optional `syncResult` prop. When set, the modal renders an in-place banner (gold-soft background, spark glyph, copy from the caller) immediately above the "Sync now" button — same column the user is already looking at.
- Banner animates in with `mc-sync-banner-in` (~360ms fade + slide). Remounts via `key={lastSyncedAt}` so back-to-back syncs each animate.
- "Last synced" line gains a 1.6s `mc-sync-pulse` highlight (gold-soft → transparent) every time the timestamp updates. Keyframes ship inline with the component via a `<style>` tag so they live and die with the consumer.

### Changed — `apps/desktop/src/Library.tsx`

- New `cloudSyncResult` state, set on every successful sync round-trip and threaded through to `SyncSettings`. Cleared on a fresh sync start and on modal close so reopening doesn't show stale "Synced to cloud" next to a "Last synced 38 mins ago".

### Changed — `apps/mobile/app/settings.tsx`

- New `syncResult` state replaces the single-line gold text for sync outcomes (auth-flow copy keeps the old `status` line — they don't fight any more).
- New `SyncSuccessBanner` — card with a gold checkmark-style chip, "Synced" header, and "Merged changes from the cloud" / "Pushed to the cloud" subtitle. Animated in via React Native `Animated` (native driver) with the same fade+slide as desktop. Remount on `key={lastSyncedAt}`.

### Verification

- `pnpm -r typecheck` — clean (6 of 6 projects).
- `pnpm -r test` — 228/228 still pass (no test deltas; presentation-only).
- Manual: open Cloud Sync on desktop, hit **Sync now** — banner appears with animation, "Last synced" line pulses gold then settles. Same on mobile Settings.

---

## [0.0.24] — 2026‑06‑05 — Mobile grade-set UI (long-press)

Closes the last desktop-parity gap surfaced in the 2026‑06‑03 handoff: mobile had no way to *set* a track's grade, only filter by it. The Favorites pseudo-view's empty-state copy ("grade a track S or A from a category view") promised an affordance that didn't exist.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.23 → 0.0.24. Desktop version files untouched.

### Added — `apps/mobile/src/components/GradeSheet.tsx`

- Bottom-sheet `Modal` (fade-in over a dimmed backdrop). Header shows the track title + pack; pill row below offers **None / S / A / B / C / D / F**. The track's current grade is highlighted with the category accent color, so the sheet doubles as a "current grade" indicator.
- Backdrop tap dismisses without choosing; an inner `Pressable` swallows taps inside the sheet so reaching for a pill doesn't accidentally close it.
- 44 × 44 hit targets across the pill row — mobile target-size guideline. "None" gets a `close` glyph alongside its label so it reads as "clear grade" rather than as a seventh letter.

### Changed — `apps/mobile/app/category/[id].tsx`

- `TrackRow` gained an optional `onLongPress`. `delayLongPress={350}` matches the platform default; longer than the play-tap window so the modal doesn't fight with quick taps.
- Long-press opens `GradeSheet` for the row. Removed view doesn't expose grading (you'd grade-then-it-disappears) — `onLongPress` is undefined there.
- `handleSetGrade` writes through `setGrade(db, …)` from `tracks-repo`. Optimistic local-state update so the row's subtitle ("Pack · grade · 3:42") re-renders instantly; rolls back if the write fails.
- Gated through `hasEntitlement("grades")` per the documented audit pattern in `packages/core/src/entitlements.ts`. During beta `BETA_TIER = "major"` so the path is always open — but the call site is in place for when the gate flips at launch.

### Verification

- `pnpm -r typecheck` — clean (6 of 6 projects).
- `pnpm -r test` — 228/228 still pass (no test deltas; UI-only PR).
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Long-press any row in a category → sheet slides up; tap **A** → row re-renders with `· A` in the subtitle; tap a different row's grade → both retained.
  - Open **Favorites** → graded-S/A rows now appear; the empty-state copy finally matches the wired affordance.
  - Tap a pill while offline / DB locked → row rolls back to previous grade.
  - Removed view → long-press is a no-op (no sheet).

---

## [0.0.29] — 2026‑06‑03 — Cloud sync (PR-2 → PR-6) + IAP foundation (PR-8)

The Phase-2 cloud-sync sequence from [`docs/CLOUD_SYNC.md`](docs/CLOUD_SYNC.md) lands end to end (server + both clients + CI), plus the codeable foundation of PR-8 (the IAP seam + desktop license-key path). Server is not yet deployed; everything is still beta-unlocked.

> Cross-surface release: bumps `apps/desktop/package.json` / `tauri.conf.json` / `Cargo.toml` 0.0.28 → 0.0.29 and `apps/mobile/package.json` 0.0.22 → 0.0.23 in lockstep — both apps gained sync UI in the same commits.

### Added — `cloud/worker/` (PR-2 + PR-3)

- New Cloudflare Worker, **outside the pnpm workspace** (its own `npm` toolchain — see `cloud/worker/README.md`). Implements the wire contract `@mc/sync`'s `SyncClient` already speaks:
  - `POST /v1/auth/request` — single-use 15-min KV nonce (256-bit hex), mailed via Resend with a dev fallback that logs the code when `RESEND_API_KEY` is unset. 204 unconditionally so account existence isn't leaked.
  - `GET /v1/auth/callback?token=…` — delete-on-read redemption → HS256 session JWT (90-day TTL).
  - `GET /v1/blob` / `PUT /v1/blob` — dumb per-user blob keyed by JWT `sub`. All conflict resolution stays client-side in `@mc/core`'s `mergeSyncBlobs`; the server's only authority is the receive-time `updatedAt` stamp.
  - `handle()` is pure (req + env + deps) so the 19 contract tests run without the Workers runtime. Top-level catch maps unhandled errors to a generic 500.
- HS256 JWT is hand-rolled on Web Crypto (no third-party dep). Constant-time signature compare; verify returns `null` for every failure mode without revealing why.

### Added — Desktop sync (PR-5)

- **[`apps/desktop/src/lib/cloud-sync.ts`](apps/desktop/src/lib/cloud-sync.ts)** — `SessionStore` backed by the SQLite `config` table, a memoised `SyncClient` factory that rebuilds when the base URL changes, and `runSync()` (pull → `mergeSyncBlobs` → apply → push). Throws the typed `@mc/sync` errors so the caller can drop to signed-out on `SyncAuthError`.
- **[`apps/desktop/src/layout/SyncSettings.tsx`](apps/desktop/src/layout/SyncSettings.tsx)** — magic-link sign-in (email → "link sent" stage → paste-code), device name field, manual "Sync now", last-synced relative label, and an Advanced row for the base URL override. Opened from the settings (☰) menu.
- **[`apps/desktop/src/Library.tsx`](apps/desktop/src/Library.tsx)** — boot reads the auth + device label state; a debounced 4s background push fires off a `syncSignature` that deliberately excludes playback-only churn (`playCount`, `lastPlayedAt`, `durationMs`) so just hitting Next doesn't sync. First post-sign-in tick is the baseline (no spurious push), since sign-in already triggers an explicit sync.
- **Session-token storage deviates from plan.** The token is a bearer JWT for a single-user TTRPG tool; the SQLite `config` row avoids the Tauri Stronghold password/salt ceremony + Rust recompile. The `SessionStore` interface stays the seam — swapping in Stronghold later touches only `cloud-sync.ts`.

### Added — Mobile sync (PR-6)

- **[`apps/mobile/src/data/sync-repo.ts`](apps/mobile/src/data/sync-repo.ts)** — mobile parallel to `packages/data`'s sync-repo: `buildSyncBlob` + `applySyncBlob` on the expo-sqlite driver. Same SyncBlob v2 wire format. `setNote` added to the mobile tracks-repo so notes round-trip.
- **[`apps/mobile/src/lib/cloud-sync.ts`](apps/mobile/src/lib/cloud-sync.ts)** — the desktop glue ported verbatim: SessionStore, client factory, auth helpers, `runSync()`.
- **[`apps/mobile/app/settings.tsx`](apps/mobile/app/settings.tsx)** — a **stack route** off the Library tab (not a new bottom-tab — that risk was called out in CLOUD_SYNC.md). Reached via a gear button in the Library header. Manual "Sync now" + sync-on-verify; debounced edit-triggered sync is a follow-up (mobile has no central mutation chokepoint to hang the signature off).

### Added — `.github/workflows/ci.yml`

- Two jobs: workspace `pnpm -r typecheck` + `pnpm -r test`, and a separate worker job (`npm install` + `npm run typecheck` + `npm test` inside `cloud/worker/`). Concurrency cancellation on superseded pushes per-ref.

### Added — IAP foundation (PR-8, see [`docs/IAP.md`](docs/IAP.md))

- **`@mc/core` — the entitlement seam:**
  - [`setTierResolver()`](packages/core/src/entitlements.ts) so `currentTier()` reads a real source. Precedence: test override → registered resolver → `BETA_TIER`. Plus `tierRank` / `maxTier` for the resolver to combine the beta grant with the purchased tier.
  - [`license.ts`](packages/core/src/license.ts) — offline RS256 license-key verification via WebCrypto (`verifyLicenseKey`) + the issuer-side mint (`issueLicenseKey`). Asymmetric so a leaked client can't mint keys. Verify never throws and never reveals *why* it failed.
  - 14 new tests in `license.test.ts`: tamper, wrong-issuer, expiry, bad tier, garbage, resolver precedence, tier ordering.
- **Desktop — the license path:**
  - [`apps/desktop/src/lib/entitlement.ts`](apps/desktop/src/lib/entitlement.ts) — boot resolver returns `maxTier(BETA_TIER, _purchasedTier)`, plus `applyLicenseKey` / `clearLicense` persisting through the SQLite `config` table.
  - [`apps/desktop/src/layout/LicenseDialog.tsx`](apps/desktop/src/layout/LicenseDialog.tsx) — paste-a-key UI, reached from the settings menu → "Plan & license…". `loadEntitlement()` runs in `App.tsx`.
  - `ISSUER_PUBLIC_JWK` is a documented placeholder (`REPLACE_WITH_ISSUER_PUBLIC_KEY_MODULUS`) — every key fails verification today, which is correct: none can be legitimately issued yet either.
- **Beta stays free.** Since `BETA_TIER = "major"`, nothing is gated yet (CLOUD_SYNC.md D3). Launch is a one-line `BETA_TIER` → `"demo"` flip in `entitlements.ts`; the resolvers already return the purchased tier.

### Verification

- `pnpm -r typecheck` — clean (6 of 6 projects).
- `pnpm -r test` — **242 pass** (220 `@mc/core` incl. 14 new license + 22 `@mc/sync`).
- `cd cloud/worker && npm test` — 19 worker contract tests pass (runs without the Workers runtime).
- `pnpm --filter @mc/desktop build` — Vite bundle builds.
- CI green on both #51 and #53.
- **Not runtime-verified** (no environment for it here): the desktop UI (needs the Tauri dev shell), the mobile UI (needs an Expo device/simulator), and any live server round-trip (needs the Worker deployed — see `cloud/worker/README.md`).

### Documented deferrals (intentional)

- **Session-token storage** is the SQLite `config` table on both apps behind the `SessionStore` seam — Stronghold / SecureStore is the drop-in hardening upgrade.
- **No sync tombstones** — deletes don't propagate yet (a record only on device A survives a merge from B). Per-record edit timestamps + tombstones are a pre-rollout follow-up.
- **Merge fidelity** — `buildSyncBlob` stamps every record with build time (SQLite tracks no per-record edit time), so on a conflicting key the freshly-built local value wins. Records only on the remote still merge in. Full per-record LWW arrives with a sidecar timestamp column.
- **Mobile edit-triggered sync** — manual + sync-on-verify only; the debounce that desktop hangs off `Library.tsx`'s mutation signature needs a port to the mobile mutation paths.
- **IAP externals** — Stripe issuer + real public JWK + StoreKit + Play Billing. See `docs/IAP.md` checklist.

---

## [0.0.22] — 2026‑05‑30 — Mobile length filter pills

Closes the mobile-parity backlog. Adds the desktop `Any · <1m · 1–3m · 3–5m · 5m+` filter row to the mobile category screen, backed by the duration data #44 started populating. Filter pills stack with the grade filter from #41 — both apply together.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.21 → 0.0.22. Desktop version files untouched.

### Added — `apps/mobile/app/category/[id].tsx`

- `DurationBucket` type + `bucketContains` helper — identical thresholds + labels to `apps/desktop/src/layout/DesktopLibraryView.tsx` so a future cross-surface UI-prefs sync is verbatim.
- Second pill row below the grade pills. Same layout treatment (mono numerals, accent on active, per-bucket count). Buckets with a zero count are hidden — a category whose tracks are all `<1m` won't render the `5m+` chip.
- `filtered` memo now applies both filters in series; auto-advance honors the filtered slice (same pattern as the grade-filter PR).
- Self-healing: if the active bucket's count drops to zero (track removed, duration probe lands and re-classifies), snaps back to `Any`. Mirrors the grade-pill behaviour.
- Empty-state copy now describes the active filter combination — "No tracks matching grade S + length 5m+ in this category" — instead of just naming the grade.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Open a category with durations probed (let the scanner from #44 finish) → length pills appear, each with a count.
  - Tap `1–3m` → list shrinks to mid-length tracks; play one → auto-advance stays inside that bucket.
  - Stack with grade: filter to `S` + `5m+` → list narrows further; empty-state copy reflects the combo.
  - Open a freshly imported category before durations probe → length row hidden (only "Any" would render).

---

## [0.0.21] — 2026‑05‑30 — Mobile background duration probe

Adds the mobile parallel to desktop's `duration-scan.ts` (which has been around since #15). Without this, mobile track rows showed no length and the Now Playing scrubber stayed at `0:00` until the track was played to completion. Tracks imported on mobile would silently never get a `duration_ms` value persisted, so a future cross-device sync round-trip would have carried `null` for every mobile-imported track.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.20 → 0.0.21. Desktop version files untouched.

### Added — `apps/mobile/src/audio/duration-scan.ts`

- `probeDuration(track)` — creates a transient `expo-audio` `AudioPlayer` for the track URI, listens for `playbackStatusUpdate`, resolves with the first `{ isLoaded: true, duration > 0 }` status. Never calls `.play()` — loading is enough to surface `AudioStatus.duration`. Belt-and-suspenders 8s timeout for corrupt files that never fire an `isLoaded: true` (matches desktop). `player.remove()` runs on every settle path so native resources release immediately.
- `ensureDurationsProbed()` — one-shot, idempotent batch scanner. In-memory `_attempted` Set + `_running` flag mean concurrent calls (boot + tab focus + post-import) all collapse to a single scan. Concurrency capped at 2 (vs desktop's 4) — mobile has tighter native memory.
- Failure sentinel matches desktop: `duration_ms = 0` for tried-and-failed, NULL for untried. Persisting 0 still re-queries on next boot, but the in-session attempted Set stops a re-probe in the same launch.

### Added — `apps/mobile/src/data/tracks-repo.ts`

- `updateDuration(db, trackId, durationMs)` — single-track UPDATE the scanner calls once per probe result.

### Changed — `apps/mobile/app/(tabs)/index.tsx`

- `useFocusEffect` now also calls `ensureDurationsProbed()`. Idempotent guard means re-focusing during a scan is a no-op.
- Post-import: after the Alert dismisses and counts refresh, `ensureDurationsProbed()` runs again so newly imported tracks fill in their durations within seconds rather than waiting for the next tab focus.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Import a handful of tracks → category row durations fill in over the next few seconds (visible in the row subtitle: `Pack · grade · 3:42`).
  - Open Now Playing while a never-probed track plays → scrubber + end-time populate as soon as the probe lands.
  - Force-quit and relaunch → previously probed tracks have durations immediately, no re-probe.

---

## [0.0.20] — 2026‑05‑30 — Mobile Favorites + Recently played pseudo-views

Brings the desktop sidebar's two pseudo-views to mobile and wires up the missing `bumpPlayCount` write path that recency was silently missing without. Mobile track playback now updates `play_count` and `last_played_at` the same way desktop does, in the same units (unix seconds), so a future sync-blob round-trip carries recency ordering verbatim across surfaces.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.19 → 0.0.20. Desktop version files untouched.

### Added — `apps/mobile/src/data/tracks-repo.ts`

- `bumpPlayCount(db, trackId, playedAt)` — mirrors the desktop signature. `playedAt` is unix seconds (matches desktop's `lastPlayedAt` units exactly).
- `listFavorites(db)` — `WHERE grade IN ('S', 'A') AND category != 'removed'`, sorted S-first then alphabetically. Same rules as `apps/desktop/src/Library.tsx`'s favorites view.
- `listRecentlyPlayed(db, limit = 25)` — `WHERE last_played_at IS NOT NULL AND category != 'removed'`, sorted DESC, capped at 25. Default matches desktop.

### Changed — `apps/mobile/src/audio/store.ts`

- `playTrack()` now fires a fire-and-forget `bumpPlayCount` after gain ramp-in. Write failures are warned, not thrown — playback shouldn't break on a sqlite hiccup.

### Added — `apps/mobile/app/favorites.tsx` + `apps/mobile/app/recent.tsx`

- Two new card-presentation stack routes. Same shape as a category screen: hero header + FlatList of rows that route through `playTrack(item, list)` so auto-advance respects the pseudo-view.
- Favorites row gets a gold grade chip on the right; Recent row shows a relative timestamp ("just now", "12m ago", "3d ago") in the subtitle line.
- Empty states explain what to do to fill them (grade a track / play a track).

### Changed — `apps/mobile/app/(tabs)/index.tsx` + `apps/mobile/app/_layout.tsx`

- Library tab gets two side-by-side **Favorites** + **Recent** chips above the category grid, hidden when `total === 0`.
- `_layout.tsx` registers `favorites` and `recent` as card-presentation screens with native headers.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Play any track → tap Recent on the Library tab → it's there with "just now".
  - Grade a track S (or A) from its category view → tap Favorites → it's there with the gold S/A chip.
  - Soft-delete a graded + recently-played track → it disappears from both pseudo-views.
  - Tap a row in either pseudo-view → playback starts, auto-advance walks the pseudo-view's slice.

---

## [0.0.19] — 2026‑05‑30 — Mobile removed-category soft-delete + Restore view

Brings desktop's soft-delete pattern (PR #25) to mobile. Tapping the trash glyph on a track row moves it into the `"removed"` pseudo-category — hidden from the Library tab's category counts, but the file on disk is untouched. A new Removed row appears on the Library tab (only when non-empty) → opens the same category screen rendered for `"removed"`. Restoring re-runs the auto-categorizer on title + pack, the same way a fresh folder scan would.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.18 → 0.0.19. Desktop version files untouched.

### Added — `apps/mobile/src/data/tracks-repo.ts`

- `setCategory(db, trackId, category, subcategory)`. Mirrors the desktop signature. Moving to `"removed"` clears `subcategory`; restore re-fills it via the categorizer.

### Changed — `apps/mobile/app/category/[id].tsx`

- `meta` now uses `findCategory()` so the `"removed"` route renders the same hero chrome as a real category (grey + trash glyph from `REMOVED_CATEGORY`).
- Each `TrackRow` gets a right-side action button: trash on real categories, undo on the Removed view. Tapping it is opt-in (separate Pressable from the play tap target) and removes the row from the live list optimistically.
- Restore calls `categorize(title, pack)` from `@mc/core` and writes the resulting category + subcategory — same reconstruction logic as `Library.handleRestoreTrack` on desktop.

### Changed — `apps/mobile/app/(tabs)/index.tsx`

- A new "Removed" entry renders below the category tiles when `counts.removed > 0`. Routes to `/category/removed`. Hidden entirely when nothing is soft-deleted — the empty-library experience stays uncluttered.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Open any non-empty category → trash glyph appears on each row.
  - Tap trash on one track → row disappears from the list; Library tab now shows a "Removed" entry below the tiles.
  - Open Removed → same screen layout, undo glyph in place of trash on each row.
  - Tap undo → track disappears from Removed, reappears in its categorized home.
  - Soft-delete a playing track → playback continues uninterrupted; track just becomes invisible to the library views.

---

## [0.0.18] — 2026‑05‑30 — Mobile grade-pill filter on category screen

Brings desktop's S/A/B/C/D/F filter row to mobile. The `Track.grade` field has existed on the mobile data model since the first scan; this PR just exposes it as a UI filter. Tapping a pill restricts the visible list to that grade; tapping "All" clears the filter.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.17 → 0.0.18. Desktop version files untouched.

### Added — `apps/mobile/app/category/[id].tsx`

- New horizontally-scrolling pill row above the FlatList. Row starts with "All" + a per-grade count, followed by every grade that has at least one track in this category. Zero-count chips are hidden — a Combat category with no F-rated tracks won't show an F chip (matches the desktop polish from #30).
- `gradeFilter` state restricts the FlatList. Active pill picks up the category's accent color (gold for default, varies per category). Empty-state copy when the filter zeroes the list.
- Self-healing: if the selected grade's track count drops to zero (e.g. all tracks of that grade get removed elsewhere), the filter snaps back to "All" so the list isn't mysteriously empty.
- Auto-advance honors the filter: `playTrack(item, filtered)` hands the filtered slice as the queue so the next track stays on-grade. Matches the desktop pattern.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Open a category that has graded tracks → pill row appears with non-zero grades.
  - Tap an S pill → list shrinks to S tracks only; play one → next track auto-advance also S.
  - Open a category with NO graded tracks → pill row hidden entirely.
  - Tap "All" → full list returns.

---

## [0.0.17] — 2026‑05‑30 — Mobile loop control (off / track / queue)

Brings the desktop `O` shortcut's three-state loop to mobile. The cycle is off → track → queue → off, persisted to the same `loop_mode` config key the desktop uses so a future cloud-sync round-trip carries the value across surfaces.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.16 → 0.0.17. Desktop version files untouched.

### Behaviour

- **`off`** — natural end of a track skips to the next queued track, or stops if the queue is empty. (Existing behaviour.)
- **`track`** — natural end replays the same track from the beginning. No self-crossfade in this v1 — simpler than the desktop's fade-driven loop, matches desktop's behaviour when `fadeSec` is 0.
- **`queue`** — natural end advances to the next track; when the next-up slice is exhausted, wraps back to the first track of the queue the user originally launched playback from.

Manual skip (`skipNext`) deliberately doesn't honor "track" loop — a user tap means "skip", not "restart". Queue loop is honored on natural end only.

### Added — `apps/mobile/src/audio/store.ts`

- `LoopMode = "off" | "track" | "queue"` type + new `loopMode` field on `PlayerState`.
- Module-level `_fullQueue: Track[]` — the original caller-supplied queue, kept so "queue" loop can wrap back to the top after the live `_state.queue` slice drains.
- `cycleLoopMode()` — off → track → queue → off, writes the value to the `loop_mode` config key via the existing `config-repo`.
- One-time IIFE on module init reads the persisted mode from sqlite. Fire-and-forget; first frame may render with the default "off" briefly before the loaded value pushes through.
- `handleNaturalEnd()` now branches on `loopMode` before delegating to `skipNext()`.

### Added — UI

- **MiniPlayer** — a compact loop button between Skip and Close. Gold tint + bold stroke when active; tiny `1` overlay in track-loop mode.
- **Now Playing** — full 56px loop button to the left of Stop. Gold pill background when active; `1` overlay in track-loop, `∞` in queue-loop. Matches the existing transport control sizing.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`.
  - Cycle the mini-player loop button → off → 1 / gold → ∞ (Now Playing) / gold → off.
  - Play a short track with loop=off, queue=[a, b]: ends → b plays → ends → stops.
  - Same with loop=track: ends → same track restarts; persists across mode cycles.
  - Same with loop=queue: ends → b plays → ends → wraps back to a.
  - Tap Skip while loop=track: behaves as a normal skip (does NOT restart current).
  - Restart the app: loop mode persists.

---

## [0.0.16] — 2026‑05‑30 — Mobile background audio + lock-screen controls

Mobile audio now keeps playing when the app is backgrounded or the screen locks — previously the OS paused playback at backgrounding, killing GM sessions the moment the phone slept. iOS via the standard `UIBackgroundModes: ["audio"]`; Android via the `mediaPlayback` foreground service the `expo-audio` config plugin generates. The runtime audio mode flips `shouldPlayInBackground: true`, and every music track takes ownership of the lock-screen / Control Center entry through `setActiveForLockScreen` — without that, Android still pauses background audio after ~3 minutes.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.15 → 0.0.16. Desktop version files untouched.

### Changed — `apps/mobile/package.json`

- `expo-audio: ~1.0.0` → `~56.0.11`. The `~1.0.0` range was a leftover from when the package first appeared; the SDK-56-aligned line carries the config plugin options and the `setActiveForLockScreen` / `clearLockScreenControls` methods this PR depends on.

### Added — `apps/mobile/app.json` plugin entry

- `["expo-audio", { "enableBackgroundPlayback": true, "microphonePermission": false, "recordAudioAndroid": false }]`. The plugin:
  - On iOS, appends `"audio"` to `UIBackgroundModes` in the generated Info.plist.
  - On Android, adds `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions to the manifest and declares the `expo.modules.audio.service.AudioControlsService` (`android:foregroundServiceType="mediaPlayback"`, MediaSessionService intent-filter).
  - `microphonePermission: false` skips `NSMicrophoneUsageDescription`; `recordAudioAndroid: false` skips `RECORD_AUDIO` — neither feature ships in this app.
- Requires a new EAS dev-client / native build to take effect (`expo prebuild --clean` then a fresh `eas build` or `pnpm --filter @mc/mobile run android` / `run ios`). The new permissions can't be hot-reloaded from Expo Go.

### Changed — `apps/mobile/src/audio/backend.ts`

- `setAudioModeAsync` flipped: `shouldPlayInBackground: false → true`; `interruptionMode: "duckOthers" → "doNotMix"`; explicit `interruptionModeAndroid: "doNotMix"`. `doNotMix` is required when using `setActiveForLockScreen` (per the `expo-audio` docs note on `AudioMode`) — and also matches GM-session ergonomics: when ambient music starts, other audio apps yield rather than fight for the mix.

### Added — lock-screen plumbing on `ExpoAudioBackend`

- New `setLockScreenMetadata(handle, AudioMetadata)` method. Calls `player.setActiveForLockScreen(true, metadata)` and tracks `lockScreenHandleId` so subsequent music tracks transparently transfer ownership (only one player may own the session at a time per expo-audio). `destroy()` now also calls `player.clearLockScreenControls()` when destroying the active owner so the lock-screen widget clears.
- `store.ts` `playTrack(track, queue)` calls `setLockScreenMetadata(handle, { title: track.title, artist: track.pack || undefined })` immediately after starting playback. Soundboard pads + stingers deliberately do NOT take the lock-screen — a fired pad shouldn't displace the music's Now-Playing entry.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a fresh native build, NOT Expo Go): `pnpm --filter @mc/mobile prebuild --clean && pnpm --filter @mc/mobile run android` (or `run ios`):
  - **Background**: start a track, swipe home / lock the phone → audio keeps playing.
  - **Lock-screen**: track title (and pack as the "artist" line) appears on iOS lock-screen / Android notification shade; transport from the lock-screen pauses/resumes the in-app player.
  - **Cross-track lock-screen handover**: skip to next → lock-screen entry updates to the new track without flicker.
  - **Android 3-minute test**: leave the phone locked for 5+ minutes; playback continues (this is the regression `setActiveForLockScreen` prevents).
  - **Sfx don't hijack lock-screen**: fire a soundboard pad while music plays → lock-screen entry stays on the music track, not the pad.

---

## [0.0.15] — 2026‑05‑30 — Mobile DM Toolkit audio panels (Encounters + Timers)

Third and final slice of the mobile DM Toolkit. Adds the two audio-coupled tools — **Encounters** (random encounter tables that fire bound tracks or categories) and **Timers** (tension countdowns that fire bound stingers at zero) — bringing the mobile DM Toolkit to parity with desktop's 8-panel set. Also introduces the mobile **TrackPickerOverlay** (the binding affordance that desktop gets via drag-and-drop), and two new audio helpers used by both panels.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.14 → 0.0.15. Desktop version files untouched.

### Added — `apps/mobile/src/components/TrackPickerOverlay.tsx`

- Bottom-sheet `Modal` (pageSheet) with a header, search input, and FlatList of all imported tracks. Filters client-side (200 max) by title + pack, term-by-term. Mirrors the desktop popover's role: drag-and-drop doesn't translate to single-pane touch, so this IS the binding affordance.
- Takes `visible`, `title`, `subtitle`, `onPick(track)`, `onDismiss` — composed by Encounters (entry → track) and Timers (timer → stinger).

### Added — `playCategory(categoryId)` on `apps/mobile/src/audio/store.ts`

- Fetches all tracks in the category from sqlite, runs them through `weightedShuffle` from `@mc/core/shuffle`, plays the first track and feeds the rest as the queue so auto-advance keeps the same mood. Used by Encounter entries bound to a category (vs. a specific track).

### Added — `fireSfx(track)` on `apps/mobile/src/audio/soundboard-store.ts`

- One-shot soundboard-bus playback for stingers and any other pad-shaped audio without a (page, slot) home. Synthetic key per fire so multiple stingers can overlap without colliding with the real soundboard grid. Auto-cleanup on natural end. Routes through the existing `activePads` registry so the music ducker (PR-4) reacts the same as a real pad fire.

### Added — Encounters (`apps/mobile/app/dm/encounters.tsx`)

- Horizontally-scrolling table picker + add-table chip. Active table gets an inline-editable name + delete button (Alert-confirmed).
- Each entry has an inline-editable label, a horizontally-scrolling category pill row (with a "None" leftmost), and a Track chip that opens the picker. Bindings are exclusive — picking a track clears any category, picking a category clears any track, "clear" un-binds. Active binding shows underneath each entry in italic.
- Roll picks an entry with non-empty label uniformly at random. If track-bound → `playTrack(track, [])`. If category-bound → `playCategory(categoryId)` (weighted shuffle). Rolled entry tinted gold + result banner above the list.
- Persists under `dm_encounter_tables` (same key as desktop).

### Added — Timers (`apps/mobile/app/dm/timers.tsx`)

- Multiple independent named countdown timers. Big 48px display clock, large play/pause, reset (loop glyph), +30s. Preset row (1m / 3m / 5m / 10m).
- Each timer can bind a stinger track via the picker; on zero the timer auto-pauses, the row flashes red, and `fireSfx(track)` plays the stinger on the soundboard bus — which ducks music thanks to the PR-4 backend wiring.
- One 1Hz `setInterval` drives all running timers, mounted only while at least one timer runs. Refs the tick reads so closures stay fresh. Stingers fire AFTER the runtime tick updates so the row visibly hits 0:00 before audio kicks in (parity with desktop).
- Configs persist under `dm_countdown_timers`. Runtime (remaining seconds, running flag) is component-local — a clock shouldn't resume mid-flight after a screen swap.

### Changed — DM Tools hub + routes

- Last two greyed-out cards on `apps/mobile/app/(tabs)/dm.tsx` (Encounters, Timers) now route into their stack screens. The mobile DM Toolkit now has all eight panels live.
- `apps/mobile/app/_layout.tsx` registers `dm/encounters` and `dm/timers` with card presentation + native headers.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`. DM Tools hub → all 8 cards active.
  - **Encounters**: create a table, add 3 entries (Goblin / Ogre / Dragon). Bind Goblin to the Combat category, bind Dragon to a specific track via the picker; leave Ogre unbound. Roll a few times → goblin shuffles Combat, dragon plays the bound track, ogre just highlights with no audio.
  - **Timers**: add a timer, set preset to 1m, bind a stinger, hit play; row counts down; at 0:00 the row flashes red, the stinger fires on the soundboard bus, and the music ducks while the stinger plays. Multiple timers run independently from the single 1Hz interval.

---

## [0.0.14] — 2026‑05‑30 — Mobile SFX-bus ducking

The mobile soundboard now ducks music while pads are alive, matching the desktop behaviour from `apps/desktop/src/lib/pad-audio.ts`. Before this, `ExpoAudioBackend.reapplyAll()` was a documented no-op (the handle store was a `WeakMap`, so `setBusGain("music", N)` couldn't propagate to live music handles) — calling it changed `busGains` in JS but never wrote to any `AudioPlayer.volume`. This PR makes the bus actually take effect.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.13 → 0.0.14. Desktop version files untouched.

### Changed — `apps/mobile/src/audio/expo-audio-backend.ts`

- **Handle store: `WeakMap<TrackHandle, InternalHandle>` → `Map<string, InternalHandle>`** keyed by `handle.id`. `destroy()` now clears the entry, so retention stays bounded by the existing caller contract (destroy() was already required to release the native player). Steady-state size is small — 1–2 music tracks + N pads, typically < 10.
- **`reapplyAll()` actually does something now.** Iterates the live handles and re-applies the effective gain (`userGain × busGain × masterGain`) per handle. New `reapplyBus(bus)` helper for the common case where only one bus is changing.
- **`setBusGain(bus, g, rampSeconds?)`** — new optional ramp arg matches the desktop's `setMusicBusGain` / `setSoundboardBusGain` signature. JS-driven linear ramp at ~60Hz via setInterval; per-bus active ramp state so a new call cancels the in-flight one. Same shape for `setMasterGain(g, rampSeconds?)`.
- **`scheduleRamp(start, target, seconds, onTick)`** internal helper extracted so the bus and master ramps share one implementation. The per-handle `setGain` ramp keeps its own copy (its cancel state lives on the handle so `destroy()` can clear it without bookkeeping a handle reference here).

### Changed — `apps/mobile/src/audio/soundboard-store.ts`

- New ducker module-state (`DUCK_DOWN_SEC = 0.15`, `DUCK_UP_SEC = 0.4`, `duckingPct = 0.4`) and `applyDuckForActiveCount()` helper, matching `apps/desktop/src/lib/pad-audio.ts` exactly.
- `playPad` and `stopPad` both call `applyDuckForActiveCount()` after touching `activePads`. The natural-end callback already routes through `stopPad`, so auto-clearing non-loop pads ducks correctly without separate wiring.
- New exports: `setDuckingPct(pct)` and `getDuckingPct()`. The setter respects live state — adjusting while pads are alive re-applies the new amount with `DUCK_DOWN_SEC`.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`. Start a music track from the Library; jump to Soundboard; fire a pad → music ramps down 150ms to ~60% (40% duck). Fire a second pad → no additional duck (already ducked). Stop both → music ramps back to full over 400ms. Fire a non-loop pad and let it end naturally → unducks on its own.

---

## [0.0.13] — 2026‑05‑30 — Mobile cleanup: kill scaffold tab, wire clipboard

Two small cleanups that were called out as deferred in the previous two PRs.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.12 → 0.0.13. Desktop version files untouched.

### Removed — `apps/mobile/app/(tabs)/two.tsx`

- Leftover Expo scaffold tab that was being hidden via `href: null` in `_layout.tsx`. The corresponding `<Tabs.Screen name="two" .../>` line went with it. The route is gone, the BACKLOG entry is gone.

### Added — `expo-clipboard` + tap-to-copy on Names and Generators

- New dep `expo-clipboard ~56.0.3` (added via `npx expo install`, so the SDK 56 compatible range was picked automatically).
- **Names** (`apps/mobile/app/dm/names.tsx`) — tapping any past name copies the full name to the clipboard. The race chip on the right swaps to a gold "COPIED" label for 1.5s as feedback.
- **Generators** (`apps/mobile/app/dm/generators.tsx`) — tapping any past generator result copies its flattened text (using the shared `resultToText()`). Same gold "COPIED" indicator in the top-right of the row for 1.5s.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`. Bottom bar still shows the expected 5 tabs (Library / Scenes / Soundboard / Search / DM Tools). Names → roll a name, tap it, paste into another app — full name lands. Generators → generate, tap a result, paste — flattened text lands (composite generators use `LABEL: VALUE · LABEL: VALUE` separator).

---

## [0.0.12] — 2026‑05‑30 — Mobile DM Toolkit state panels (Initiative + Ledger + Recap)

Second slice of the mobile DM Toolkit. Adds the three local-state tools — **Initiative** (with HP/AC and turn cycling), **Ledger** (party XP + per-player split + loot list), and **Recap** (pin moments tagged with the current track) — all persisting to the same `config` key/value table the desktop uses (`dm_combatants`, `dm_xp_ledger`, `dm_recap`).

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.11 → 0.0.12. Desktop version files untouched. No schema changes — the `config` table was already present from the original mobile data layer.

### Added — `apps/mobile/src/data/config-repo.ts`

- Generic `getConfig` / `setConfig` plus typed `getJsonConfig<T>` / `setJsonConfig<T>` (safe-parse + fallback). The desktop already uses the same `config (key, value)` table for these three blobs, so the wire format matches and a future cloud-sync blob round-trip will line up.

### Added — Initiative (`apps/mobile/app/dm/initiative.tsx`)

- Name + Init add-row with `Enter`-to-submit, sorted descending. Per-row HP / Max HP / AC stat fields and a free-text condition input. HP ≤ 0 → red tint + strikethrough on the name.
- Next / Prev turn cycle through sorted combatants with a gold-highlighted active row + left-edge accent bar. Current turn idx is component-local (matches desktop — combat is a session thing).
- Clear-all is gated by a confirm `Alert`. Persists under `dm_combatants`. Turn-sound (the speaker glyph from the desktop row) is deferred to PR-3 with the track picker.

### Added — Ledger (`apps/mobile/app/dm/ledger.tsx`)

- Big display XP total, party-size input, live per-player split. Add XP row accepts negatives so corrections work. Reset clears just the XP, not the loot.
- Loot list with inline-editable entries. Persists under `dm_xp_ledger`.

### Added — Recap (`apps/mobile/app/dm/recap.tsx`)

- Pin-a-moment input row; pinning tags the moment with whatever the mobile player store reports as `nowPlaying.title` at the time. Each row shows wall-clock time on the left, the editable text in the middle (multiline), the music tag underneath, remove glyph on the right.
- **Share recap** uses `Share.share()` from RN (no clipboard dep) — feeds the recap straight into Messages / Notes / Discord. Oldest-first formatting reads like a story. Clear-all is `Alert`-confirmed. Persists under `dm_recap`.

### Changed — DM Tools hub (`apps/mobile/app/(tabs)/dm.tsx`)

- Three of the previously greyed-out hub cards (Initiative, Ledger, Recap) light up and route into their respective stack screens. The remaining two (Encounters, Timers) stay greyed until PR-3.

### Internal — `apps/mobile/app/_layout.tsx`

- Three new `Stack.Screen` entries (`dm/initiative`, `dm/ledger`, `dm/recap`) registered with `card` presentation + native headers.

### Verification

- `pnpm -r typecheck` — clean (5 of 5 projects).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`. DM Tools hub → all three new cards are active. Initiative: add a combatant, set HP to 0 (row turns red + strikethrough), Next cycles the gold accent, force-quit + reopen → list restores. Ledger: add XP (with a negative test), party size 4 → split updates, add loot, force-quit + reopen → state restores. Recap: start a track, pin a moment → it tags with the track title; Share recap opens the OS share sheet with the oldest-first text.

---

## [0.0.11] — 2026‑05‑30 — Mobile DM Toolkit foundation (Dice + Names + Generators)

First slice of the mobile DM Toolkit. Adds a fifth bottom tab whose hub screen drills into per-tool stack routes; the three pure-logic tools land in this PR. The shared roll logic (`dm-dice`, `dm-names`, `dm-generators`) was lifted from `apps/desktop/src/lib/` into `@mc/core/dm` so both apps consume it.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.10 → 0.0.11; desktop version files untouched. The desktop import sites changed (5 files) but the behaviour didn't.

### Added — DM Tools tab + hub (`apps/mobile/app/(tabs)/dm.tsx`)

- New fifth bottom tab using the `theatre` glyph — the same glyph the desktop header uses for DM Mode, so the entry point reads consistently across surfaces.
- The hub is a 2-column grid of tool cards (`eyebrow / display title / blurb / gold icon orb`). Tap to push into the tool's stack route. The five tools that aren't ported yet (Initiative, XP Ledger, Recap, Encounters, Timers) render greyed-out with a "Coming soon" blurb so the eventual IA is visible.

### Added — Dice (`apps/mobile/app/dm/dice.tsx`)

- Polyhedral die picker (d4–d100), count + modifier stepper inputs (1–20 / signed), Straight / Advantage / Disadvantage toggle row (d20 only). Tap-and-go gold Roll button; full session-local history (cap 30) below.
- History rows mirror the desktop's accent rules: green for `Nat 20`, red for `Nat 1`, gold for the latest non-crit. Faces show kept rolls plain and dropped rolls parenthesised, exactly as on desktop.

### Added — Names (`apps/mobile/app/dm/names.tsx`)

- Gender row (Any / Male / Female) above the race row (Any / Human / Elf / Dwarf / Orc / Halfling), driving `rollNameAvoiding()` with a `Set` of recent rolls so back-to-back collisions stay rare. Roll button + session history (cap 30) with per-race glyphs from the shared mapping.
- Copy-to-clipboard intentionally deferred — `expo-clipboard` isn't installed yet and the dep add is a separate follow-up; on mobile the tappable feedback can stay minimal until then.

### Added — Generators (`apps/mobile/app/dm/generators.tsx`)

- Horizontally-scrolling pill picker across the 10 standalone tables (loot / NPC / tavern / settlement / weather / crit / fumble / wild magic / trap / quest hook). Active-blurb line under the pills. History is filtered to the active table so switching tables doesn't mix rolls.
- Single-facet generators render as a single sentence; composite ones (NPC, tavern, settlement, trap, quest) render as a `LABEL  VALUE` two-column layout with the labels in mono.

### Internal — `@mc/core/dm` subpath export

- `apps/desktop/src/lib/dm-{dice,names,generators}.ts` → `packages/core/src/dm/{dice,names,generators}.ts`, surfaced via a new `./dm` subpath in `packages/core/package.json`. New `packages/core/src/dm/index.ts` barrel re-exports all three.
- 5 desktop import sites updated (`Library.tsx`, `DesktopDmToolkit.tsx`, and the 3 panel components) to `@mc/core/dm`. No behaviour change on desktop.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects (both before and after the lift; both before and after the new screens).
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`. Bottom bar shows a fifth `DM Tools` tab. Open it → 2×4 grid of cards, three live + five greyed. Tap Dice → die row works, count/modifier steppers clamp 1–20, d20 advantage toggle appears and disappears as you change die, Roll appends a row at the top of history with the right accent for nat 1 / nat 20. Tap Names → gender + race pills change selection, Roll appends a row, repeated rolls stay varied. Tap Generators → horizontal pill row scrolls, blurb updates, Generate appends a result with the right shape (single sentence vs. labelled rows).

---

## [0.0.28] — 2026‑05‑24 — Player-view window (second screen)

The last `IDEAS.md` item: a player-facing window the GM drags onto a second screen or projector. Big calm now-playing display, zero GM controls.

### Added — Player-view (handout) window

- New header toggle (monitor glyph) opens/closes a second Tauri window. It runs the same bundle with `?view=handout`, so `main.tsx` branches to render `HandoutView` instead of the full app.
- `apps/desktop/src/layout/HandoutView.tsx` shows a category-tinted orb (`OrbVisualizer`), the track title + pack, and a progress bar — no transport, grades, or notes. Standing-by state when nothing plays.
- The window is created on demand (`new WebviewWindow("handout", …)`) and tracked in a ref; closing it (toggle or OS chrome) resets the toggle so it can be reopened.

### Internal — cross-window state sync

- The main window emits `mc:nowplaying` (title, pack, category, playing, position, duration, theme) over Tauri events whenever now-playing state moves; `HandoutView` listens and re-applies the theme so the two surfaces match.
- A `mc:handout-ready` handshake: the handout announces itself on mount and the main window replies with current state, so the display isn't blank on open (the periodic emit only fires on change — important when paused).
- Capabilities: `default.json` now covers the `handout` window and grants `core:webview:allow-create-webview-window`, `core:window:allow-close`, `core:window:allow-set-focus`. New `monitor` glyph in `@mc/ui`.
- Desktop version 0.0.27 → 0.0.28.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual: header → click the monitor icon. A second "Player View" window opens showing the current track on a big display; drag it to a second screen. Play / pause / skip in the main window — the player view mirrors it (orb animates only while playing). Close it from the icon or its own title bar; the icon de-highlights and reopening works.

---

## [0.0.27] — 2026‑05‑24 — UI polish (Batches A + B + C + D + E): full design-review sweep

Five focused polish batches against the design-review punch list, shipped as a single release.

### Changed — Track table (Batch A)

- **Empty grade column hidden.** Ungraded tracks rendered an empty `GradeChip` placeholder that read as a broken UI element across a whole column on a fresh library. The chip now renders only when `grade !== null`.
- **Plays column drops the `×` annotation.** "26×" → "26"; the "Plays" column header already provides the context, and the multiplication sign was an unconventional convention. Zero-count rows render blank rather than "0".
- **Subcategory tabs with no tracks are hidden.** A "Skirmish 0" tab takes space and creates a false affordance; only the All tab is forced to render. Tabs reappear automatically once a matching track is added.
- **Column header is sticky + opaque + a touch louder.** As you scroll a long category, the `#  TITLE  PACK  PLAYS  GRADE  TIME` header stays pinned at the top of the scroll container with a solid background so rows don't bleed through. Weight 600, slightly tighter color (`T.ink2`), wider letter-spacing.
- **Row hover state.** Default rows now lift to `T.bgChip` on hover (via local `useState`) so the "which row am I about to click" question is unambiguous. Selected and currently-playing tints still win over hover.
- **Filter eyebrow labels stop truncating.** `Length` and `Grade` labels in the pill rows had no `flexShrink: 0`, so at narrow widths "GRADE" clipped to "GRAD" with no obvious cause. Pinned to no-shrink.

### Changed — Header (Batch B)

- **Search placeholder no longer truncates.** `Search 5,317 tracks…` was 23 chars into a 200px input that could only fit ~15; it rendered as `Search 5,317 trac` and looked broken. Now reads `Search library…` regardless of track count.
- **Active tab indicator strengthened.** The four header tabs got a `boxShadow: inset 0 -2px 0 ${T.gold}` underline + 600-weight font + a slightly more opaque gold background when active, so "you are here" reads in a glance instead of relying on subtle brightness.
- **Open Folder is now an icon-only button** that matches the visual weight of its neighbors (DM Toolkit, Player View, DM Mode, Settings) rather than sitting next to them as a fully outlined pill. Still gold-tinted to mark it as the primary library entry; tooltip preserved.

### Changed — Sidebar (Batch B)

- **Usage hint removed.** "Letter plays · Number jumps" sat under the Categories header as a hint masquerading as a section label. The letter is still underlined in each category name and the full cheatsheet is `?` away — the nav is no longer cluttered with instructions.
- **Active category visual upgraded.** Left border 2px → 3px, background fill `${color}20` → `${color}33`, and the label switches to 600-weight when active. The same treatment applies to the Library section rows (Favorites / Recently played / Removed) so all active states match.
- **Section labels breathe.** `SidebarSection` gained 14px `marginTop` and the eyebrow label gets 10px of bottom padding so each section reads as a separator instead of stacking tight to the row above.

### Changed — Status pill becomes a toast (Batch B)

- The "5,317 tracks loaded from index." pill no longer sits awkwardly under the search bar. It's been moved to a bottom-right toast position above the transport, restyled with a 24px-radius card + soft drop shadow, and **auto-dismisses 4.5 seconds after the last change** via a `useEffect` on `scanStatus`.

### Changed — Player bar (Batch C)

- **Height +12px** (88 → 100) for breathing room around the new labels.
- **Fade / Duck / Volume sliders are labeled.** Each slider now has a small `Fade` / `Duck` / `Volume` eyebrow tucked under the icon-slider-value row, so what each modifier does isn't a tooltip-only guess.
- **Duck slider colour unified to gold.** It used a one-off teal accent (`#5cc4d9`) that clashed with the gold / rust accents everywhere else. All four interactive sliders now share `accentColor: T.gold`.
- **Empty-state copy.** "Open a folder to begin" misled once the user had actually opened a folder but not played anything yet. Reads "Nothing playing" now.

### Changed — Right-rail empty state (Batch C)

- The "no track loaded" state used to be a single italic paragraph mixing plain and inline-code letters for the shortcuts — easy to read as "the panel is broken."
- Replaced with a proper standing-by panel: a **Now Playing** eyebrow, a soft gold orb-ring containing the library glyph, a **Standing by** display title in italic gold, and a separate `Quick start` sub-card. The shortcut row chips every letter (`C` `T` `E` `A` `H` `S` `R` `V` `X` `F`) and `?` in uniformly-styled `kbd`-like rectangles so the typography is consistent.
- The populated (track-playing) state is unchanged — it already shows the category card, orb visualizer, grade row, and Up Next list.

### Changed — Soundboard (Batch D)

- **Pad track names show full text on hover.** Long titles (`01-Archive-of-S…`, `06-Positioning-…`) truncated with no way to see the rest; pad rows now carry a `title` attribute with the full track title.
- **Pad volume slider is taller (22px hit target)** so it's not a hair-thin line you have to aim at; tooltip clarifies the percent.
- **Loop / clear buttons enlarged from 24px → 28px** with sharper tooltips ("Loop on — click to turn off" / "Clear this pad — unassign the track").
- **Empty pads are visibly clickable now** — a dashed-border drop zone with a larger `+` glyph, an **Add track** label, and a hover state that lights the border + bg to gold.
- **Page count notation**: `Page A 3/8` → `Page A · 3 of 8`, with a matching tooltip for screen readers.

### Changed — Scenes empty state (Batch D)

- "No scenes yet. Pick a category…" was an italic one-liner floating in space. Replaced with a centered card mirroring the right-rail empty-state shape — gold orb-ring + `scenes` glyph, italic **No scenes yet** display title, a one-line explainer, and a centered **Save current scene** primary CTA so a first-time user has the action right under the explanation (the top-right button stays for return visits).

### Changed — DM Toolkit (Batch D)

- **Dropped the "Add-on" eyebrow** above the *DM Toolkit* title — it read like a debug label; the tabs and content below carry the section's role.
- **Sub-tab style matches the main-header tabs**: transparent background when inactive, gold `${color}33` fill + gold inset bottom underline + 600-weight font when active. Reads as native dark-theme nav instead of the previous outlined-chip look.
- **Initiative add row is a single grouped input.** Name + Init + add `+` button live inside one bordered shell with thin vertical dividers — no longer three disconnected widgets with their own borders.

### Changed — Category header (Batch E)

- **Track count joined the title metadata.** `298` now sits beside the category name as a chip-styled badge (`mc-mono`, gold-edged) instead of floating between the action buttons.
- **Description contrast lifted** from `T.ink2` to `T.ink` at 0.9 opacity for clearer reading over the hero gradient — closer to WCAG AA at body text size.
- **Disabled "Save as scene" placeholder removed.** It existed as a "coming in next phase" stub next to the primary CTA; the Scenes tab has a fully working save flow now, so the disabled button was just visual noise.
- **`DesktopLibraryViewProps.isPseudoView` retired** as part of the cleanup — its only consumer was that disabled button.

### Changed — Global design tokens (Batch E)

- **Custom thin scroll affordance.** `.mc-scroll` used to fully hide scrollbars; it now reveals a 6px gold-tinted scroll thumb when the container is hovered. Calm by default, scroll-aware when the user actually engages.
- **Keyboard focus ring.** Added a global `:focus-visible` rule (2px gold outline, 2px offset). Visible only for keyboard navigation (the `:focus-visible` heuristic) so mouse clicks don't reveal outlines but Tab users get a clear "you are here." Closes the only material a11y gap on the punch list.
- Explicit non-changes (flagged in the original review but already in place / out of scope for this PR): three-theme system already shipped (`gold-dark` / `parchment` / `arcane`); category glyphs are already thematic and SVG; `tauri.conf.json` already enforces 960×640 minimum window size; compact mode is a Phase 3 roadmap item.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (Batch A): open the Library on a long category — scroll; column header stays at top. Hover any row → background tints; click → row plays / selects (no hover state on the active row). Ungraded tracks show no chip; played tracks show their count without the `×`. A category with a zero-count subcategory (e.g. Combat → Skirmish 0) hides that tab.
- Manual (Batch B): the search input reads `Search library…`. Click a header tab — clear gold underline + bold label. Open Folder is now a single icon. Sidebar: no "Letter plays · Number jumps" line. Click between categories — the active one shows a 3px left border + stronger background. Open a folder or trigger any status — a toast appears bottom-right and fades after ~5 seconds.
- Manual (Batch C): the player bar is 12px taller; Fade / Duck / Volume each have an uppercase eyebrow tucked under their slider; the Duck slider thumb is gold (no longer teal). With nothing loaded the transport reads "Nothing playing" instead of "Open a folder to begin." The right rail empty state shows a gold orb-ring + **Standing by** card + a Quick-start card with every shortcut letter as a uniform `kbd` chip.
- Manual (Batch D): Soundboard — hover an assigned pad → full title tooltip; volume slider is visibly taller; loop / clear buttons are 28px; an empty pad shows a dashed gold-on-hover drop zone with **Add track**; the page tabs read `Page A · 3 of 8`. Scenes (empty) — gold orb-ring + No scenes yet card + centered Save-current-scene CTA. DM Tools — no Add-on micro-label; sub-tabs use gold underlines like the main header; Initiative add row is a single bordered group.
- Manual (Batch E): the Combat / Tavern / etc. hero shows track count as a small gold-edged chip beside the title (no longer between buttons); the disabled "Save as scene" stub is gone; the description reads slightly bolder. Hover any scroll surface (sidebar, library, DM panels) — a 6px gold-tinted scrollbar fades in; mouse out, it fades out. Tab through any view — focused buttons / inputs / rows get a 2px gold outline (no outline appears on plain mouse clicks).

---

## [0.0.26] — 2026‑05‑24 — DM Toolkit expansion: encounters · timers · generators · utilities

GM-tool additions from `IDEAS.md`, shipped together. **Encounters** — roll tables where each row can be wired to a track or a category, so rolling an encounter drops the right music. **Timers** — tension countdowns that fire a stinger (and duck the music) at zero. **Generators** — the standalone roll tables (loot, NPC, tavern, settlement, weather, crit/fumble, wild magic, trap, quest) under one tab. Plus utilities — a combat-tracker HP/AC upgrade, an XP/loot **Ledger**, and a **Recap** composer.

### Added — Encounter tables tab

- New `apps/desktop/src/layout/dm/EncounterTables.tsx` panel, registered as the `encounters` tool in `DesktopDmToolkit` (compass glyph) alongside Initiative / Names / Dice.
- Multiple named tables (create / rename / delete) via a pill selector — one per region/context (forest, dungeon, city…). Each table holds a list of free-text entries.
- Each entry can bind **one** audio source: a **category** (via inline `<select>` — rolling weighted-shuffles it) or a **specific track** (via the existing `TrackPickerOverlay` — rolling plays it once). Binding is exclusive; picking one clears the other. A "clear" control removes the binding.
- **Roll** picks a random entry among the non-empty rows, highlights it, shows a result banner, and fires the bound audio through the same engine paths the rest of the app uses (`handlePlayTrack` for a track, `handlePlayRandomFromCategory` for a category).

### Added — Tension countdown tab

- New `apps/desktop/src/layout/dm/TensionCountdown.tsx` panel, registered as the `timers` tool (clock glyph).
- Multiple independent named timers — "ritual completes in 5m", "reinforcements in 3m". Each has a big MM:SS clock with Start/Pause, Reset, and +30s, plus duration presets (1m / 3m / 5m / 10m).
- Each timer can bind a **stinger** track. At zero the timer flashes red and fires the stinger on the soundboard bus (auto-ducking the music), reusing the same `firePad` pseudo-slot mechanism as Initiative turn sounds.
- A single 1Hz interval drives all running timers, mounted only while at least one runs; the tick reads timers / runtime / callback through refs so it never closes over stale values.
- Timer *configs* (name, duration, stinger) persist under `dm_countdown_timers`; the running state (remaining, ticking) is component-local and resets on reload — a countdown shouldn't resume mid-flight after a restart.

### Added — Generators tab (standalone roll tables)

- New `apps/desktop/src/lib/dm-generators.ts` (curated table data + roll logic) and `apps/desktop/src/layout/dm/Generators.tsx` panel, registered as the `generators` tool (note glyph). One tab houses all nine tables behind a selector — adding nine tabs would overflow the toolbar.
- Tables: **Loot**, **NPC** (trait/flaw/ideal/voice), **Tavern** (name/drink/patron/rumor), **Settlement** (size/feature/mood), **Weather**, **Critical hit**, **Fumble**, **Wild magic**, **Trap** (type/save/effect), **Quest hook** (premise/obstacle/reward/catch).
- Each generator is modeled as a list of facets; rolling picks one option per facet, so single-result tables (weather, loot…) and composite ones (NPC, tavern…) share one component. Results render as a stat block; click any result to copy it.
- Pure data — no audio, no Library wiring, no persistence. History is session-local and filtered per active generator so switching tables doesn't mix results.

### Changed — Initiative tracker: HP / AC (combat-tracker upgrade)

- `Combatant` gains optional `hp` / `maxHp` / `ac`. Each row now has compact current/max HP inputs and an AC input alongside the existing condition field; values persist with the rest of the combatant via `dm_combatants`.
- A combatant at **0 or fewer HP** gets a red row tint + strikethrough name so the "who's down" read is instant.
- Fields are optional and cleared by emptying the input (`delete` keeps it clean under `exactOptionalPropertyTypes`), so combatants saved before this release load untouched.

### Added — XP / loot ledger tab

- New `apps/desktop/src/layout/dm/XpLedger.tsx` (`ledger` tool, star glyph). A running party XP total with an editable party size and a live per-player split, plus a simple loot list (add / edit / remove). Add-XP accepts negatives to correct mistakes.
- Persists as one JSON blob under `dm_xp_ledger`; merged over `EMPTY_LEDGER` defaults on load so a partial/old blob still hydrates.

### Added — Recap composer tab

- New `apps/desktop/src/layout/dm/RecapComposer.tsx` (`recap` tool, theatre glyph). Pin notable moments during play; each captures the currently-playing track title at pin time. **Copy recap** flattens them (oldest-first) into a paste-ready block. Persists under `dm_recap`.
- A future enhancement noted in `IDEAS.md` — a global "Pin this" hotkey — is intentionally out of scope here; pinning is via the tab's input for now.

### Internal

- `TrackPickerOverlay` gains two new target kinds, `encounterEntry` and `timerStinger` (alongside `pad` and `turnSound`), routed in `Library.tsx` to bind a track to a table entry / a timer's stinger.
- DM-tool state persists to SQLite config under `dm_encounter_tables`, `dm_countdown_timers`, `dm_xp_ledger`, and `dm_recap` (JSON), loaded on init — same pattern as `dm_combatants` / `dm_name_history` / `dm_roll_history`.
- Desktop version 0.0.24 → 0.0.26.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (encounters): DM Tools → Encounters → add a table, add entries, bind one to a category and one to a specific track, hit Roll. The rolled entry highlights and its bound audio starts; an unbound entry just shows the result.
- Manual (timers): DM Tools → Timers → add a timer, pick a preset, bind a stinger, Start. At zero the clock flashes and the stinger fires while the music ducks. +30s extends a running clock; Reset returns to the full duration.
- Manual (generators): DM Tools → Generators → pick a table, hit Generate. Composite tables (NPC, tavern…) show a labeled stat block; single tables (weather, loot…) show one line. Click a result to copy it; switching tables shows only that table's history.
- Manual (combat tracker): Initiative → add a combatant, set HP cur/max + AC; drop HP to 0 → row goes red + strikethrough. Reload → values persist.
- Manual (ledger): Ledger → add XP, set party size, watch the per-player split; add loot lines. Reload → persists.
- Manual (recap): play a track, Recap → pin a moment (tagged with the track), Copy recap → paste-ready block on the clipboard.

---

## [0.0.25] — 2026‑05‑24 — Mobile scenes + soundboard + Now Playing

Mobile gets three of its biggest missing surfaces. The Scenes and Soundboard tabs were placeholder copy until now; both are real, and a tap on the mini-player expands to a full Now Playing screen.

> Mobile-only release: bumps `apps/mobile/package.json` 0.0.9 → 0.0.10; desktop version files untouched.

### Added — Soundboard tab

- 3 pages (A/B/C) × 8 pads. Assign any library track to a pad, tap to fire, with per-pad volume and loop. New `apps/mobile/src/audio/soundboard-store.ts` tracks each active pad independently (one `AudioPlayer` per pad on the `soundboard` bus).
- Persistence via new `apps/mobile/src/data/soundboard-repo.ts` + a `soundboard (page, slot, payload)` table (`schema.ts`). Slot config is a JSON payload keyed by `(page, slot)` with an `ON CONFLICT` upsert.
- Non-looping pads auto-stop via the backend's `onEnded` callback (not a duration timer — mobile often hasn't probed `durationMs`, so a timer would either never fire or drift). Looping pads run until an explicit stop. The onEnded listener is detached on manual stop so it can't fire against a destroyed handle.

### Added — Scenes tab

- Save and restore complete mood snapshots — category, queue, soundboard page, fade, ducking, and per-category volumes — captured from the live player state. List / create / delete from the tab.
- Persistence via new `apps/mobile/src/data/scenes-repo.ts` + a `scenes (id, payload)` table, sorted by `json_extract(payload, '$.createdAt')`. Parameterized queries, `ON CONFLICT` upsert, and `safeParse` guards on read.

### Added — Now Playing screen

- New full-screen `app/now-playing.tsx` (visualizer, transport, queue) opened by tapping the mini-player. Auto-dismisses back when nothing is playing. Registered as a route in `app/_layout.tsx`.
- `MiniPlayer` is now tappable to expand. The route string is cast `as Href` until Expo regenerates `.expo/types/router.d.ts` on the next dev start (standard typed-routes dance for a brand-new route file).

### Internal

- Mobile data layer stores scenes / soundboard slots as JSON `payload` blobs rather than the structured columns the desktop uses. Pragmatic for the expo-sqlite adapter; worth keeping in mind for sync-blob format parity down the line.
- Mobile package bumped 0.0.9 → 0.0.10.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual (needs a device / simulator): `pnpm --filter @mc/mobile start`. Soundboard tab → assign a track to a pad, tap to play, toggle loop, adjust volume, stop. Scenes tab → start playback, save a scene, restore it. Tap the mini-player → Now Playing expands; controls + queue work; dismiss returns to the previous tab.

---

## [0.0.24] — 2026‑05‑24 — Removed-category soft delete · GM tool ideas log

A way to hide bad / unwanted tracks from the library without deleting them from disk, plus a brainstorm doc capturing where the DM Toolkit could go next.

### Added — `IDEAS.md`

- Living brainstorm of future GM-tool additions, grouped by integration depth. Audio-integrated tools (random encounter table, tension countdown, mood deck, reaction roll) are flagged as the highest-value next moves because they reuse the track index and playback engine. Standalone tables and session utilities listed below as cheaper follow-ups.

### Added — `removed` pseudo-category

- New `"removed"` value on the `CategoryId` union. Lives outside the visible `CATEGORIES` array so it doesn't leak into the sidebar's Categories section, the Scene editor, the Pin-to-slot menu, or letter/number hotkeys — every iteration site only sees the real ten categories.
- `findCategory()` resolves it via a separate `REMOVED_CATEGORY` meta so track-row rendering, the library hero, and the new sidebar entry all find a gray-tinted icon + colour without polluting the canonical category list.

### Added — Trash icon on every track row

- Hover any track row in the Library view — a `trash` glyph appears in a new 36px action column at the right edge (revealed by a new `.mc-row-action` CSS class with `opacity` transitioning from 0 → 0.7 on row hover → 1 on icon hover). Click sends the track to the Removed category instantly; no confirmation, the operation is fully reversible.
- Implemented as a `<span role="button">` inside the row's `<button>` (nested `<button>`s would be invalid HTML); `e.stopPropagation()` on click + keyboard activation so the row's play handler never fires for this control.
- In the Removed view itself, the same column shows an `undo` glyph instead. Clicking it re-runs `categorize(track.title, track.pack)` — the same auto-classifier the folder scan uses — and routes the track back to its best-guess category. The original pre-removal category isn't stored anywhere, so this is the closest reconstruction we can do without a new schema column.

### Added — `Removed` sidebar row

- New entry in the sidebar's Library section, between **Recently played** and the Categories list. Trash glyph + neutral gray tint so it doesn't pull the eye like Favorites does. Count badge shows the number of removed tracks; clicking jumps to the standard category-view code path with `activeCategory = "removed"`.

### Changed — Favorites and Recently played exclude removed tracks

- Both pseudo-views now filter `category !== "removed"` before grade / play-time bucketing. A soft-deleted track no longer keeps showing up in Favorites just because the user S-graded it earlier.

### Fixed — Track-row subtitle no longer wraps/overlaps the title

- The new 36px action column narrowed the `1fr` title cell enough that the "Last played …" subtitle (which had no wrap control) broke a word per line and the vertical stack collided with the title above it. The subtitle now gets the same `nowrap` + `overflow: hidden` + `textOverflow: ellipsis` treatment as the title and pack cells.
- Polished further: the subtitle is now time-first (`2h ago` instead of `Last played 2h ago`) so the part that matters survives truncation at narrow widths; the full "Last played …" label moved to a hover tooltip.

### Internal — Glyph additions

- `trash` (lid + lined body + two vertical strokes) and `undo` (curved back-arrow) added to `glyph-data.ts`. Both follow the existing `currentColor`-stroked style and render identically on desktop + mobile glyph paths.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- `pnpm -r test` — 169/169 vitest cases still pass.
- Manual: hover any library row, click the trash icon → row disappears from the current view, Removed sidebar count ticks up. Click Removed → see the row with the undo icon. Click undo → row re-categorizes and disappears from Removed. Favorites / Recently played do not list removed tracks. Search still finds them (intentional, so a recently-removed track can be located and restored from anywhere).

---

## [0.0.23] — 2026‑05‑24 — Name-generator gender · Next-button fallback

Two small DM-side fixes. The name generator now respects a male/female pick, and the transport's Next button no longer silently no-ops when the queue is empty.

### Added — Gender toggle in the name generator

- `apps/desktop/src/lib/dm-names.ts` splits each race's first-name list into `firstMale` / `firstFemale`. Last names stay shared. The Race/Gender data still drives `rollName` and `rollNameAvoiding`, now both accept a `Gender` argument (`"any" | "male" | "female"`); `"any"` flips a coin per roll.
- New `GENDER_OPTIONS` pill set rendered above the race pills in `NameGenerator.tsx` with the same active-state styling. State is panel-local — no persistence, matches how the Race pill works.
- `RolledName` carries an optional `gender` field so freshly rolled history items remember what gender bucket they came from. Old persisted history without the field still loads (field is optional).

### Fixed — Next button falls back to the playing track's category

- `handleNext` in `Library.tsx` no longer bails on `queue.length === 0`. When the queue is empty or you're already on the last item, it now looks up the playing track's category, weighted-shuffles the rest of that category (excluding the current track), sets the result as the new queue, and plays the head.
- This was a silent no-op whenever the user reached a playing track via a path that didn't seed a queue: a Search result, a Recently-Played row, or any one-shot play. The previous behavior was indistinguishable from a broken button.
- Reuses the same `weightedShuffle` semantics the Shuffle button and letter hotkeys already use — S=6×, A=4×, B=2×, C/D/Ungraded=1×, F excluded.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- Manual (name gender): open the DM Tools tab → Names panel. Pick a race + gender combination, hit Roll name; first names should be drawn from the matching gendered list. "Any" gender randomly picks between the two per roll.
- Manual (Next fallback): play a track from Search or Recently Played (queue stays at 0). Press the Next button — a new queue from the same category should appear and the next track plays.

---

## [0.0.20] — 2026‑05‑24 — Mobile audio engine (first cut)

The mobile app finally plays sound. Library and Search are wired through a brand-new `ExpoAudioBackend` so an imported track is one tap away from the speaker.

### Added — `ExpoAudioBackend`

- New `apps/mobile/src/audio/expo-audio-backend.ts` implements the `AudioBackend` contract from `@mc/core` on top of `expo-audio` (the supported Expo audio API in SDK 56+; `expo-av` is deprecated). One JS class per app, one native `AudioPlayer` per loaded track.
- `loadTrack` / `play` / `pause` / `seek` / `destroy` / `onProgress` / `onEnded` all map to expo-audio primitives. Bus selection (`music` vs `soundboard`) is accepted at the interface level; per-bus gain is tracked in JS for the future ducker (no separate mix-bus in expo-audio).
- `setGain(handle, target, rampSeconds)` runs a JS-driven ~60Hz linear ramp because expo-audio has no native gain-ramp API. Cancels any in-flight ramp before scheduling a new one, so back-to-back crossfades don't fight each other.
- `crossfade()` from `@mc/core` works unchanged — same signature, same semantics as on desktop.

### Added — Now-Playing store + persistent mini-player

- `apps/mobile/src/audio/store.ts` exposes a tiny `useSyncExternalStore`-backed module singleton: `nowPlaying`, `playing`, `positionSec`, `durationSec`, `queue`, plus `playTrack` / `togglePlay` / `skipNext` / `stop`. No Context, no Zustand — the surface is small enough.
- `playTrack(track, queue)` fades in over 600ms, crossfading any prior handle, and slices the queue past the just-started track so auto-advance lands on the next adjacent row.
- `MiniPlayer` renders above the bottom tab bar (in root `_layout.tsx`, so it persists across the category-detail stack route too). Shows progress, title, pack, up-next count, play/pause, skip, stop.

### Added — Category detail screen

- New route `app/category/[id].tsx` — tap a tile on the Library tab to open the full track list for that category. Tapping a row plays it and fills the queue with the rest of the visible list (mirrors desktop row-click-fills-queue from v0.0.15). Active-track row gets the category-color left border + tint.

### Added — Search → play

- Tapping a Search result now plays the track. Single-track queue (no auto-advance) since search picks a specific clip rather than browsing a list.

### Changed — Library tab navigation

- Category tiles are now `Pressable` with `onPress` routing to `/category/[id]`. Tile press feedback fades to 0.7 opacity.
- Tab refresh uses `useFocusEffect` so counts re-read after returning from category detail or after an import.

### Internal

- `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" })` runs once on first load. iOS won't route through the silent switch without this. Background audio (`shouldPlayInBackground: true`) is off for now — needs an EAS dev-client build with the audio capability, which is a separate ticket.
- Root layout switched to `SafeAreaProvider` + `SafeAreaView` for the mini-player so it clears the home indicator on devices with no hardware bezel.
- Mobile package bumped 0.0.8 → 0.0.9.

### Out of scope (next mobile tickets)

- **Background playback** — needs `app.json` audio mode + EAS dev-client; current build pauses on screen-off.
- **SFX-bus ducking** — interface is wired (`setBusGain`), but no soundboard yet on mobile to fire it from.
- **Scenes + Soundboard tabs** — both still show the placeholder copy; they need their own data wiring + screens.

### Verification

- `pnpm -r typecheck` — local; will be re-run in CI once the branch lands.
- Manual verification needs a phone — install on iOS / Android via Expo Go: `cd apps/mobile && pnpm start`, then import an MP3 from the Library tab, tap a category tile, tap a row. Mini-player should appear with progress, play/pause, skip-to-next.
- If `pnpm install` doesn't pick the right `expo-audio` version for SDK 56, run `cd apps/mobile && npx expo install expo-audio` to let the Expo CLI write the matched range back.

---

## [0.0.22] — 2026‑05‑24 — Durations without playing · Length filter

Until now the TIME column only filled in for tracks the user had actually played — capture happened inside `handlePlayTrack` on first load. Browsing a fresh library showed "—" for every row, which made it impossible to pick a track of the right length without hitting Play on each one. This release probes every track's duration in the background and adds a Length filter so the user can scope the table to short stingers, full ambient beds, or anything in between.

### Added — Background duration scanner

- New `apps/desktop/src/lib/duration-scan.ts` probes file metadata via a transient `<audio preload="metadata">` element. No playback graph, no fetch of the audio body — just enough to read the duration header.
- Runs 4 probes in parallel with an 8-second per-file timeout (corrupt MP3s otherwise hang `loadedmetadata` indefinitely). Each successful probe persists immediately to SQLite via `setDuration` and patches the React `tracks` state, so the TIME column fills in live rather than waiting for the whole batch.
- Library wires an effect that auto-fires whenever `tracks` updates with rows missing durations: initial load from SQLite, fresh folder scan, drag-drop import, sync-blob restore. A fingerprint of the missing-id set deduplicates so a successful probe doesn't re-trigger the scan, and an `isScanningDurations` guard blocks concurrent runs.
- Failed probes (timeout / unreadable) leave the row null so a future rescan can pick it up; they don't get persisted as `0`.

### Added — Length filter pills

- New "Length" pill row above the track table, mirroring the Grade pill UX: **Any · <1m · 1–3m · 3–5m · 5m+**. Active pill picks up the category's accent color the same way Grade does.
- Filter logic in `filteredTracks` excludes tracks whose duration falls outside the chosen bucket *and* tracks the scanner hasn't probed yet (so picking "1–3m" doesn't show unknowns). "Any" disables the filter entirely.
- Bucket boundaries: `<60s`, `60–180s`, `180–300s`, `≥300s`.

### Verification

- `pnpm -r typecheck` — clean across all 5 projects.
- Manual: open a fresh folder, watch the TIME column populate top-down without playing anything. Switch to a category, click "1–3m" — rows outside that range vanish, count in the All tab still reflects the unfiltered total.

---

## [0.0.21] — 2026‑05‑24 — Scrubber jitter fix during crossfade

A regression surfaced once 0.0.20 made track-loop self-crossfades visible: the playhead bar visibly oscillated between two positions for the full fade duration. Same root cause hits every track-to-track transition, but the loop crossfade made it obvious because it fires automatically near the end of every play.

### Fixed — Detach outgoing handle's subscriptions before crossfade

- `PlaybackState` now carries the `unsubProgress` + `unsubEnded` detachers for the live handle.
- When `handlePlayTrack` starts a new playback, it calls the outgoing handle's detachers **before** the crossfade begins. The outgoing handle keeps playing through the fade-out (`crossfade()` destroys it on completion), but it no longer fires `setCurrentTime` into React — only the incoming handle drives the scrubber.
- `handleStopAll` also detaches before destroying, so the trailing `onEnded` can't try to advance the queue or flip `isPlaying` back on after the user hit Stop.

### Verification

- `pnpm -r typecheck` — clean.
- Manual: enable Loop (O), set fade ≥ 3s, watch the scrubber as the loop point fires — it should advance smoothly into the new playback's 0:00 with no back-and-forth jitter to the outgoing position.

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

- Single toggle on the theatre icon in the header. Red "DM MODE" pill appears next to the logo with a soft red glow when on.
- Hides editing affordances that would either distract at the table or reveal private GM judgment: grade chips (track rows, transport, right rail), play counts, right-click pin menu + drag-to-assign, Save current scene, scene delete chip, per-pad clear/loop/volume controls, settings icon, Open Folder, DM Toolkit.
- Keeps every player-facing affordance visible: category sidebar, track list, search, scenes/soundboard tabs, fade/duck/volume sliders, prev/play/next, scrubber, orb visualizer.
- Persisted as `dm_mode` in `config`; reopening any popovers is blocked while DM Mode is on.

### Added — DM Toolkit (`DESIGN.md § 6.3`)

- Fourth header tab + entry from the dice icon in the right cluster.
- Three-column desktop layout:
  - **Names** — race-aware NPC generator across Any / Human / Elf / Dwarf / Orc / Halfling. Click name to copy. Last 30 in scrollable history.
  - **Dice** — d4 through d100 with count + modifier + advantage / disadvantage on d20. Each history row shows the formula, individual die faces (kept ones plain, discarded parenthesized), total in big tabular numerals. Nat 20 green, nat 1 red.
  - **Initiative** — add combatants with init + condition, sort descending, prev / next buttons cycle the active turn. Active row tinted gold with a left-edge stripe.
- **Turn sounds** — drag a track row from the Library onto a combatant *or* right-click any track in the Library and pick a combatant from the new "Set as turn sound" section. On turn advance, the active combatant's turn sound fires through the **soundboard bus** — auto-ducks the music exactly like a regular pad.
- All three histories + the combatant roster persisted in the `config` table.

### Changed

- Right-click pin menu grew a "Set as turn sound" section below the soundboard grid. Avoids the cross-tab drag-and-drop awkwardness when the Library and DM Tools tabs are mutually exclusive.
- Hardcoded `rgba(11,9,19,0.x)` translucent backgrounds throughout the layout replaced with theme-aware `T.chromeBg` / `T.popoverBg` / `T.modalBackdrop` references.

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
