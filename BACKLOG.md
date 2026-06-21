# Backlog — untracked work

Concrete, near-term engineering items that are **not** already captured in another planning doc. Before adding here, check that it isn't already covered by:

- [`ROADMAP.md`](ROADMAP.md) — phase-level features (cloud sync, IAP/tiers, mobile store launch, themes, DM Mode, VTT/MIDI/Stream Deck, compact mode, per-category volume offsets, notes-on-tracks).
- [`CHANGELOG.md`](CHANGELOG.md) `[Unreleased]` — immediate follow-ups (mobile background-audio config, mobile SFX-bus ducking).
- [`IDEAS.md`](IDEAS.md) — future GM-toolkit additions (random encounter table, tension countdown, mood deck, reaction roll, standalone tables).

This file is only for the stuff that falls through those cracks.

---

## Mobile feature parity (desktop has it, mobile doesn't)

**All shipped.** Closed out in the v0.0.10 → v0.0.22 mobile sprint. Surviving roadmap items belong in [`ROADMAP.md`](ROADMAP.md), not here:

- [x] **DM Toolkit** — full parity in #35 (dice / names / generators / initiative / ledger / recap / encounters / timers).
- [x] **Mobile background audio + lock-screen** — #39.
- [x] **Loop control** (off / track / queue) — #40.
- [x] **Grade pills** (S/A/B/C/D/F filter) — #41.
- [x] **Removed category** (soft-delete + Restore view) — #42.
- [x] **Favorites / Recently played** pseudo-views — #43.
- [x] **Mobile duration probe** — #44.
- [x] **Length filter** (`Any · <1m · 1–3m · 3–5m · 5m+`) — #45.

## Cleanup / loose ends

_None currently outstanding._

---

## Post-0.0.33 health review (2026‑06‑20)

Snapshot of improvement areas surfaced after the v0.0.33 ship. Items already in other planning docs (IAP wiring → [`docs/CLOUD_SYNC.md`](docs/CLOUD_SYNC.md) PR-8 + [`docs/IAP.md`](docs/IAP.md); Windows code-signing → [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md) § 7.3; mobile EAS dev-client → [`SESSION-HANDOFF.md`](SESSION-HANDOFF.md)) are deliberately omitted to keep the BACKLOG convention clean.

### Critical

- [x] **Forensic log buffer for the silent audio exit.** Three host-process exits during playback on 2026‑06‑20, all with zero diagnostic output (empty Tauri stderr, no WebView2 Crashpad report, no Windows event-log entry, even with `RUST_LOG=debug` + `RUST_BACKTRACE=full`). No reachable `app.exit` / `window.close` in our code. Cannot debug without a record. **Action:** rotating log file in `APPDATA` capturing the last N `console.error`s + every `handlePlayTrack(track.id, uri)` with timestamps. ~50 lines. Highest-leverage single change in the codebase right now. — Shipped 0.0.35 (#67): ring buffer in `apps/desktop/src/lib/diag.ts` (250 entries, localStorage-mirrored), wraps console.error/warn + window.error + unhandledrejection, plus `logEvent()` calls at every audio entry point.

- [ ] **`apps/desktop/src/Library.tsx` is 2,603 lines.** Owns playback + scenes + soundboard + every DM-toolkit slice + cloud sync + IAP dialog + drag-drop + the picker overlay coordinator + every dialog flag. Every PR this session that touched it had to grep for the right region. **Action:** extract `usePlayback`, `useCloudSync`, `useDMToolkit` hooks/contexts. Library.tsx becomes layout + dispatch. ~1–2 days, mechanical. — In progress: **slice 1/3 — `useCloudSync`** landed 0.0.39 (Library.tsx 2,655 → 2,492 LOC, −163 net). Remaining slices: `useDMToolkit`, `usePlayback`.

### Important — quality

- [x] **Zero React component tests.** 242 vitest cases across `@mc/core` (220) + `@mc/sync` (22) — all pure-TS. No `.test.tsx` anywhere under `apps/`. Every UI bug shipped + caught manually this session would have been caught by a render-test: scrubber flicker (#65), scan-toast circular-JSON (#63), sidebar dead-click (#57). **Action:** stand up `@testing-library/react` in `apps/desktop`; ship smoke tests for `DesktopTransport`, `DesktopSidebar`, `InitiativeTracker`. — Shipped 0.0.34 (#68): vitest + happy-dom + RTL stood up in `apps/desktop`; 8 cases including the scrubber-click regression captured.

- [ ] **No telemetry / error reporting.** Zero Sentry / Bugsnag / Rollbar deps in either app. The audio crash above + every future production bug exits with no record reaching anyone. **Action:** Sentry in desktop renderer + mobile, behind an opt-in "Send anonymous diagnostics" toggle in Settings.

- [x] **`window-state.json` last written 2026‑06‑04.** `tauri-plugin-window-state` is silently failing to persist across 2.5+ weeks of runs (confirmed by file mtime on 2026‑06‑20). Symptom is benign (window doesn't remember position), but a silent persistence failure is the class of bug that turns into "my scenes vanished" if it's shared infrastructure. **Action:** delete the stale file, retry on a fresh run; if still not writing, file upstream + add a startup integrity check. — Closed 0.0.37: re-inspection on 2026‑06‑21 shows the file IS persisting (mtime today, full state). Shipped the startup integrity probe anyway — `window_state_stat` Tauri command + `probeWindowState()` log a `window-state` event into the diag buffer at every boot, so a future silent regression leaves evidence.

### On the radar — surfaced 2026‑06‑20

- [x] **Audio-engine memory ceiling, post-#65.** The Blob-loading fix in v0.0.33 loads each track fully into memory (~5–10 MB). Two handles alive at a time ≈ 20 MB ceiling — fine. Long DM sessions where dozens of tracks load/unload could fragment the heap. **Action:** add a per-session memory probe + console log of peak heap; revisit if a real user hits it. — Shipped 0.0.38: every `audio.*` diag event auto-attaches `heap: {used, peak, limit}` in MB; a separate `audio.heap.peak` entry fires whenever the session peak grows by ≥1 MB past the last emit (rate-limited).

- [x] **Mobile DM-Toolkit Initiative needs the new init-mod UI.** PR #64 shipped to desktop only. The `Combatant` shape was updated as forward-compatible — mobile reads/writes the `initiativeMod` field — but the mobile UI to set it doesn't exist. **Action:** straight port of `EditableNumber` + "Roll all" footer button to `apps/mobile/app/dm/initiative.tsx`. — Shipped mobile 0.0.26 (#69): editable init field per combatant, mod chip, "🎲 Roll" footer button.

### Strategic

- [x] **In-app bug-report path.** No "Help → Report a bug" affordance. Users who hit the audio crash have no way to send their (currently nonexistent — see above) diag logs. Pairs with the telemetry item. **Action:** Settings → Report a bug → opens mailer with pre-filled diag dump (app version + OS + last 50 log lines). — Shipped 0.0.36 (#70): Help → Report a bug opens a GitHub-issue URL with the diag dump pre-filled.

- [x] **Landing page exists but isn't deployed.** Root `index.html` is a polished marketing page; `prototype/` is an interactive HTML mockup. Neither is on GH Pages. Free distribution channel sitting on the shelf. **Action:** GH Pages workflow that publishes root `index.html` + `prototype/` + `docs/screenshots/`. ~20 minutes. — Shipped Unreleased: `.github/workflows/pages.yml` deploys to [rayzold.github.io/Major-Ambience](https://rayzold.github.io/Major-Ambience/).

---

> Convention: when one of these ships, move the detail into a `CHANGELOG.md` release entry and check the box (or delete the line) here.
