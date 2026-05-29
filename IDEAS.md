# GM Tool Ideas

Brainstorm of future additions to the DM Toolkit (desktop) and mobile equivalents. The toolkit currently ships **Initiative · Names · Dice**. Initiative is the strongest piece because it hooks the audio engine (per-combatant turn sounds). Future tools should lean into the same advantage where possible — utilities that *use the audio library* are uniquely Major Ambience, not generic GM utilities you can get from a phone.

---

## Audio-integrated (highest priority)

These reuse the track index, the playback engine, or both.

### Random encounter table

- Editable d20 / d100 tables; each row has a label and an optional bound track or category.
- Roll → labels surfaces in history, and any bound track fires through the existing engine (weighted-shuffle when bound to a category, single play when bound to a track).
- Per-table fade override (instant for stingers, ~3s for ambient swaps).
- Save tables per campaign; pre-seeded templates for "Forest encounters", "Urban night patrol", "Underdark", etc.

### Tension countdown

- Visible clock with start / pause / +30s. Defaults: 60s, 3m, 5m. Custom.
- On reach-zero: optional fade-down of music + stinger SFX trigger.
- Optional mid-point cue (50% / 25%) for "the ritual is almost complete" pacing.
- Multiple parallel timers (named) when the GM is juggling several offscreen clocks.

### Mood deck

- 6-12 quick-tap cards (Calm · Tense · Mysterious · Combat · Triumph · Rest). Each card binds to a category + an optional specific track + a fade duration.
- Tap card → cross-fade between bound categories using the existing crossfade ramp.
- Faster than the Scenes tab for spontaneous reads — Scenes are pre-planned, the deck is reactive.

### Reaction roll (2d6)

- Classic OSR-style NPC attitude roll: Hostile · Unfriendly · Neutral · Indifferent · Friendly · Helpful.
- Each band has an optional bound voice / laugh / grunt SFX from the Voices category.
- One-button: roll, show band, fire the SFX if assigned. History pane to keep a session record.

---

## Standalone tables (audio-neutral but useful)

Cheap to add — pure data + a roll button. No audio integration required.

- **Loot generator** — d100 or by CR. Custom tables per setting.
- **NPC personality & quirks** — trait + flaw + ideal + voice tag (raspy / lisping / clipped).
- **Tavern generator** — name + signature drink + notable patron + rumor.
- **Town / settlement generator** — population band + notable buildings + current mood.
- **Weather** — current conditions by region; chain into the next-period roll.
- **Crit & fumble tables** — d20 / d100 effects for crits, fumbles, and saving-throw blowouts.
- **Wild magic surge** — d100 surge effects with concise plain-language summaries.
- **Trap generator** — type + DC + damage + detection clue.
- **Quest / plot hook generator** — premise + obstacle + reward + complication.

---

## Session utilities

Closer to "running a session" than rolling on tables.

- **Combat tracker upgrade** — add HP, conditions, AC, and a damage shortcut to the existing Initiative tracker.
- **XP / loot ledger** — per-party log of what's been earned and what's been distributed.
- **Recap composer** — pin notable moments during play (with a quick "Pin this" hotkey that captures the currently-playing track + name-generator history + initiative state). Generates a recap doc the GM can paste into next session's chat.
- **Tag-based search overlay improvement** — let GM search "horror chase" and see all tracks tagged either, ordered by grade.
- **Player handout view** — Tauri can pop a second window with a stripped-down player-facing display: party HP bars, current scene art, no internal notes.

---

## Recommendation

Start with **Random encounter table**. It's the closest extension of what Initiative already proves works — binding a roll outcome to a Major Ambience track — and it adds genuine session value without needing a Phase-2 cloud sync. The data shape is also dirt simple (`{ label, trackId?, categoryId? }[]`), which keeps the first cut tight.

**Tension countdown** is a strong second because it ties into the existing duck/fade primitives the soundboard already uses, and it's the single GM tool most people Google for during a session.
