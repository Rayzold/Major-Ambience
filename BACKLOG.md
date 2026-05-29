# Backlog — untracked work

Concrete, near-term engineering items that are **not** already captured in another planning doc. Before adding here, check that it isn't already covered by:

- [`ROADMAP.md`](ROADMAP.md) — phase-level features (cloud sync, IAP/tiers, mobile store launch, themes, DM Mode, VTT/MIDI/Stream Deck, compact mode, per-category volume offsets, notes-on-tracks).
- [`CHANGELOG.md`](CHANGELOG.md) `[Unreleased]` — immediate follow-ups (mobile background-audio config, mobile SFX-bus ducking).
- [`IDEAS.md`](IDEAS.md) — future GM-toolkit additions (random encounter table, tension countdown, mood deck, reaction roll, standalone tables).

This file is only for the stuff that falls through those cracks.

---

## Mobile feature parity (desktop has it, mobile doesn't)

The mobile app currently does: library browsing, playback + mini-player + Now Playing, search, category detail, and — once PR #26 lands — scenes + soundboard. The following desktop features have no mobile equivalent yet:

- [ ] **Loop control** — desktop has off / track-loop (self-crossfade) / queue-loop, cycled with `O`. Mobile playback has no loop mode.
- [ ] **Grade pills** — desktop filters the track table by S/A/B/C/D/F. Mobile has no grading UI at all (the `grade` field exists on the track model).
- [ ] **Length filter** — desktop's `Any · <1m · 1–3m · 3–5m · 5m+` pill row. Needs a mobile duration source first (mobile has no background duration scanner — see note below).
- [ ] **Removed category** — desktop's soft-delete trash + Removed view (PR #25). No mobile equivalent.
- [ ] **Favorites / Recently played views** — desktop sidebar pseudo-views. Mobile has neither.
- [ ] **DM Toolkit** — names / dice / initiative / turn sounds are desktop-only. Largest single parity gap.
- [ ] **Mobile duration probe** — desktop probes durations in the background (`duration-scan.ts`); mobile leaves `durationMs` at 0 until a track is played. Several items above (length filter, accurate Now-Playing scrubber) depend on this.

## Cleanup / loose ends

- [ ] **Delete `apps/mobile/app/(tabs)/two.tsx`** — leftover Expo scaffold tab, kept as a `null`-returning placeholder hidden via `href: null`. Its own comment says "safe to delete once the scaffold gen-files are pruned."

---

> Convention: when one of these ships, move the detail into a `CHANGELOG.md` release entry and check the box (or delete the line) here.
