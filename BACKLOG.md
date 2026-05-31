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

> Convention: when one of these ships, move the detail into a `CHANGELOG.md` release entry and check the box (or delete the line) here.
