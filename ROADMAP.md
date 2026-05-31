# Roadmap

> A public look at what's coming. This isn't a promise of dates — it's a promise of order.
>
> The current state of every item below is reflected in [`CHANGELOG.md`](CHANGELOG.md). For the engineering plan, see [`docs/BUILD_GUIDE.md § 10`](docs/BUILD_GUIDE.md#10-phased-roadmap).

---

## Now — Phase 1 (Q3 2026)

> **Windows desktop, in your hands.**

The first shippable build. Run your music library, score scenes, fire SFX, never pay another monthly bill.

- 🎚️ **Library** — folder import, auto‑categorize, grade, weighted shuffle
- 🎬 **Now Playing** — cinematic player with crossfade and ducking
- 🎭 **Scenes** — snapshot your category, soundboard, fade, and volumes
- 🎛️ **Soundboard** — three pages (A/B/C), 24 pads total, drag‑to‑assign
- 🔊 **SFX layer** — fire effects over music, auto‑ducked
- 🔍 **Search** — full‑text, instant, across the whole library
- 🎓 **Tutorials** — opt‑in coachmarks for every major surface

---

## Next — Phase 2 (Q4 2026)

> **DM Toolkit and the road to mobile.**

- ⚔️ **DM Toolkit** ($4.99 add‑on)
  - NPC name generator (race‑aware)
  - Dice roller with history
  - Initiative tracker
  - **Turn sounds** — assign audio cues to combatants
- 📱 **Mobile public beta** (TestFlight + Play Internal Testing)
- 🌗 **Themes** — Parchment (light) and Arcane (deep violet)
- ☁️ **Cloud sync** — your grades, scenes, and notes across devices (implementation plan: [`docs/CLOUD_SYNC.md`](docs/CLOUD_SYNC.md))
- 👁️ **DM Mode** — share‑safe view for streaming and screen‑sharing

---

## Soon — Phase 3 (Q1 2027)

> **Mobile launch.**

iPhone and Android, free upgrade for existing customers, native lock‑screen controls.

- 📱 **iOS launch** — App Store
- 🤖 **Android launch** — Play Store
- 🎚️ **Compact mode** — minimal UI for streaming overlays
- 🔁 **Per‑category volume offsets**
- 📝 **Notes on tracks** — personal annotations

---

## Later — Phase 4 (Q2 2027)

> **Epic tier.**

The held‑back tier ($49.99) for the GMs who push every limit.

- 🔌 **VTT integration** — Foundry, Roll20, Owlbear Rodeo (via the TriggerAPI bridge)
- 🎹 **MIDI input** — wire up a controller for soundboard firing
- 🎛️ **Stream Deck plugin** — official integration
- 🤝 **Collaborative GM mode** — two GMs at one table

---

## Maybe — under consideration

These are ideas we hear regularly. None are committed.

| Idea | Why it's "maybe" |
|---|---|
| Audio file hosting / cloud library | Licensing nightmare. Your library stays yours. |
| Multi‑user "live show" mode for actual‑play | Interesting; needs a host model |
| Generative ambience (procedural rain, crowds) | Cool, but feature creep |
| Discord bot integration | Possible via the v2 TriggerAPI bridge |
| Tablet‑optimized layout | Likely a quick win in Phase 3 |
| Mac and Linux desktop builds | Tauri ships these for free; question is support burden |

If something here matters to you, [open an issue](https://github.com/Rayzold/Major-Ambience/issues/new) — what gets discussed is what gets prioritized.

---

## Not happening

Per `DESIGN.md § 10`, these are explicit non‑goals:

- ❌ Music streaming or in‑app catalog
- ❌ DAW / audio editing features
- ❌ Virtual tabletop features (maps, sheets)
- ❌ Social features (sharing, profiles, comments)
- ❌ Subscriptions
- ❌ User‑to‑user marketplace

If you'd like one of these, there are excellent products that already do them well. Major Ambience deliberately does one thing.

---

## What "done" looks like

> A GM opens their laptop fifteen minutes before session. They click one scene. The tavern fades in. Everyone arrives. The table starts to breathe.
>
> Nobody mentions the music. That's how we know it worked.
