# Contributing to Major Ambience

Thank you for considering a contribution. This is a small, independent project — every issue and pull request gets read.

This document covers what to do **before** you spend time on a change, and what conventions to follow when you do.

---

## Before you start

### Read these first

| File | Why |
|---|---|
| [`README.md`](README.md) | Project overview, what's currently in the repo |
| [`DESIGN.md`](DESIGN.md) | What the product is, what it isn't, what's locked, what's open |
| [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md) | Tech stack, audio engine, data model, sync architecture |

Sections of `DESIGN.md` that are **non‑negotiable** without an open question being resolved:

- `§ 4` — stack lock‑in (RN + Expo mobile, Tauri 2 + React desktop, Web Audio, SQLite + FTS5)
- `§ 5` — visual system (tokens, type, glyphs, themes)
- `§ 6.1` — pricing tiers and "no subscriptions" commitment
- `§ 10` — non‑goals
- `§ 12` — working rules

If your change touches any of these, please **open an issue first** with the problem you're solving — don't open a PR.

---

## What we'd love help with

| Area | Examples |
|---|---|
| **Bug reports** | Crashes, audio glitches, layout bugs in the prototype, typos in docs |
| **Audio engine** | Crossfade edge cases, ducking behavior, gapless playback fidelity |
| **Categorization rules** | New keyword mappings, edge cases for the auto‑categorizer (see [`docs/CATEGORIZATION_GUIDE.md`](docs/CATEGORIZATION_GUIDE.md)) |
| **Accessibility** | Keyboard nav, screen reader labels, color contrast, reduced‑motion support |
| **Localization** | Translation strings (once `packages/ui` lands) |
| **Documentation** | Anything in `docs/` that's wrong, outdated, or unclear |

## What we're not looking for right now

Per `DESIGN.md § 10`:

- New UI themes beyond the three shipped (Gold & Dark, Parchment, Arcane)
- Social features (sharing, comments, profiles)
- Subscription pricing or monetization changes
- VTT integration — held for v2, see `DESIGN.md § 11.1`
- Audio file contributions (we don't ship audio)
- DAW‑style editing features (recording, trimming, effects)

---

## Issue types

Open an issue first for anything beyond a typo fix.

- **🐛 Bug** — what you did, what you expected, what happened. Include OS + app version.
- **💡 Feature** — describe the user problem first, then the proposed solution. Reference any relevant `DESIGN.md` open question.
- **📚 Docs** — point to the line(s) and propose a fix.
- **🎵 Categorization** — the file/pack name in question and the category you think it should map to. We cross‑reference against [`docs/CATEGORIZATION_GUIDE.md`](docs/CATEGORIZATION_GUIDE.md).
- **🎨 Design** — please screenshot, and tag the relevant `DESIGN.md § 5` token if applicable.

---

## Pull request flow

1. **Open an issue first** (unless it's a typo or doc fix < 5 lines).
2. Fork, branch from `main`. Branch names: `fix/short-description`, `feat/short-description`, `docs/short-description`.
3. Keep PRs **small and focused**. One concern per PR.
4. Match the existing code style — see [Coding standards](#coding-standards).
5. Update [`CHANGELOG.md`](CHANGELOG.md) under `[Unreleased]` with a one‑line entry.
6. Reference the issue (`Closes #42`).
7. Be patient — reviews land within 7 days.

---

## Coding standards

### TypeScript

- Strict mode, no `any` without a comment justifying it.
- Prefer `type` over `interface` unless declaration merging is needed.
- File names: `kebab-case.ts`. Component files: `PascalCase.tsx`.
- Test files: colocated, `foo.test.ts` next to `foo.ts`.

### React / RN

- Functional components, hooks, no classes.
- Inline `style={{}}` for prototype‑level work (matches existing code).
- CSS modules for `packages/ui` production code — **not** Tailwind, **not** styled‑components.
- Component order in a file: hooks → derived state → handlers → effects → render.

### Audio code

- Never block the UI thread. Decoding, scanning, hashing — all off‑main.
- Audio context lifecycle must be explicit. No leaking `AudioBufferSourceNode`s.
- Tests for any change touching `packages/core/audio/` — at minimum, a mock backend running through the player state machine.

### Commits

Conventional commits style, but lightly enforced:

```
feat(audio): add crossfade ramp on track end
fix(library): scan progress reports negative count when canceled
docs(readme): correct minimum Node version
```

Scopes that mean something to this project: `audio`, `library`, `scenes`, `soundboard`, `sync`, `ui`, `core`, `data`, `desktop`, `mobile`, `docs`, `build`.

### What `DESIGN.md` working rules enforce in PR review

From `§ 12`:

1. **Don't refactor `prototype/`.** If production disagrees with the prototype, fix production.
2. **No audio files in the repo. Ever.**
3. **No emoji in UI.** Use `<Glyph name="…" />`.
4. **No CSS‑in‑JS libraries** beyond inline `style`.
5. **No subscription plumbing.** IAPs are non‑consumable one‑time only.
6. **No telemetry without an off‑by‑default toggle.**
7. **Don't break the prototype.** It's the demo artifact for press/pitch.
8. **Reference, don't duplicate.** Link to existing docs.

A PR violating any of the above will be asked to revise before review.

---

## Communication

- **Bug reports / features:** GitHub Issues.
- **Real‑time chat:** Discord (link in the README once launched).
- **Email:** [contact placeholder — fill at launch]

Please don't use issues as a support channel — that's what Discord and email are for.

---

## Code of Conduct

Be a person worth working with. Don't be a jerk to other contributors, the maintainer, or users in linked threads. Disagreements are fine; contempt is not.

Reports of behavior issues go to the maintainer directly via email. We respond within 7 days. We don't have a published enforcement ladder yet — for now, judgment‑based action up to and including blocking from the repo and Discord.

---

## License

By submitting a contribution, you agree it will be licensed under the project's [MIT License](LICENSE).
