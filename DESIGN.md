# Major Ambience — DESIGN.md

> **Audience.** This document is written for the next Claude Code session (or any engineer) to pick up the project cold. It states what *is*, not what might be. Where decisions are still open, they live in [§ 11 Open Questions](#11-open-questions).
>
> **Companion files.** Implementation depth lives in [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md). The interactive prototype is `prototype/index.html`. The music auto‑categorization rules live in [`docs/CATEGORIZATION_GUIDE.md`](docs/CATEGORIZATION_GUIDE.md).

---

## 1. Project Snapshot

| Field | Value |
|---|---|
| Product name | **Major Ambience** |
| One‑line positioning | *No monthly subscriptions. You pay it, you own it. Simple, all inclusive.* |
| Category | GM audio companion for tabletop RPGs |
| Repository | `github.com/Rayzold/Major-Ambience` |
| State | **Pre‑production.** Prototype + spec only. No production code yet. |
| Personality | **A spellbook** — every interaction feels a little magical. Tier names (Minor / Major / Epic) follow D&D spell‑level convention. |
| First platform | **Windows desktop.** Owner's daily driver; dogfooded before mobile. |
| License | MIT |

The repository already contains the **final visual system** (in `prototype/`) and the **technical spec** (in `docs/BUILD_GUIDE.md`). Production code begins from those references — do not redesign the look or re‑argue the stack.

---

## 2. First Ticket — What to Build

Build a **Tauri 2 desktop shell** that renders the prototype's **Library** screen against a real local folder and plays audio.

Concretely, the deliverable is:

1. `apps/desktop/` — Tauri 2 + React + Vite scaffold (`pnpm create tauri-app`).
2. Render the prototype's three‑pane workspace (sidebar · main · right rail) using the components ported from `prototype/app/desktop.jsx` and `prototype/app/ui.jsx`.
3. **Folder import**: a "Open Folder" action that calls Tauri's `dialog.open({ directory: true })`, then enumerates `.mp3/.wav/.flac/.ogg/.m4a` files via Tauri's `fs` API.
4. **Categorize**: implement `packages/core/src/categorize.ts` as a pure `(filename, parentFolderPath) => { category, subcategory? }` function. Cover every rule in `docs/CATEGORIZATION_GUIDE.md`. Add tests.
5. **Index**: insert into SQLite (use `tauri-plugin-sql` with the `sqlite:` driver). Schema is given in [`docs/BUILD_GUIDE.md § 5`](docs/BUILD_GUIDE.md#5-data-model).
6. **Audio engine**: implement `packages/core/src/audio/web-audio-backend.ts` conforming to the `AudioBackend` interface in `docs/BUILD_GUIDE.md § 3.4`. Wire `loadTrack / play / pause / seek / setGain` against `HTMLAudioElement` routed through a `MediaElementAudioSourceNode` on an `AudioContext`.
7. **Crossfade**: ramp gain on outgoing track, 0→1 on incoming, over the value of the user's fade slider.
8. **Persistence**: track grade, play count, last‑played, fade duration, ducking percentage. No cloud sync yet.

**Out of scope for this ticket.** Scenes, soundboard, search, SFX layer, themes, DM Mode, mobile, sync, IAP. Those come in later phases per [`docs/BUILD_GUIDE.md § 10`](docs/BUILD_GUIDE.md#10-phased-roadmap).

---

## 3. Repository Layout (target)

The repo currently has only `prototype/` and `docs/`. Create this structure as Phase 0 work:

```
.
├── apps/
│   ├── desktop/                 # Tauri 2 + React + Vite
│   ├── mobile/                  # React Native + Expo (Phase 2+)
│   └── web/                     # Vite + React (marketing / live demo, Phase 5+)
├── packages/
│   ├── core/                    # Audio engine, state machine, sync client, categorize, shuffle
│   ├── ui/                      # Shared design tokens, primitives, icons, screen components
│   ├── data/                    # SQLite schema, migrations, repositories
│   └── shared/                  # Types, utilities, constants
├── docs/                        # ← exists; do not move
├── prototype/                   # ← exists; reference only, do not refactor
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                   # Add when test suite grows
├── tsconfig.base.json
└── README.md                    # ← exists
```

Use **pnpm workspaces**. Add Turborepo only once builds need caching.

---

## 4. Stack Lock‑In

These choices are settled. Do not re‑evaluate without raising an Open Question.

| Layer | Choice |
|---|---|
| Mobile | **React Native + Expo** (dev‑client) |
| Desktop | **Tauri 2 + React + Vite** |
| Shared core | TypeScript, pnpm workspaces |
| Audio (desktop & web) | **Web Audio API** |
| Audio (mobile) | **react‑native‑track‑player** for music; **expo‑av** for SFX |
| Local index | **SQLite + FTS5** (`tauri-plugin-sql` desktop, `expo-sqlite` mobile) |
| Lists | FlashList (mobile), react‑virtuoso (desktop) |
| State | XState for the player machine, Zustand for UI state |
| Sync backend | **Cloudflare Workers + KV**, magic‑link auth via Resend |
| Sync payload | **Config blob only** (~100 KB). Audio never leaves the device. |
| Sync model | Per‑top‑level‑key last‑write‑wins. No CRDT. |

Detailed reasoning lives in [`docs/BUILD_GUIDE.md § 3–6`](docs/BUILD_GUIDE.md#3-tech-stack).

---

## 5. Visual System (locked)

The prototype is the canonical reference. Lift values directly from `prototype/app/ui.jsx`.

### 5.1 Color tokens

```ts
export const T = {
  bg:       '#0b0913',
  bgRaise:  '#15121f',
  bgCard:   '#1c1828',
  bgChip:   'rgba(243,236,217,0.06)',
  ink:      '#f3ecd9',
  ink2:     '#b6a890',
  ink3:     '#6b5f4b',
  gold:     '#e3b66a',
  goldSoft: 'rgba(227,182,106,0.14)',
  goldEdge: 'rgba(227,182,106,0.35)',
  rule:     'rgba(243,236,217,0.07)',
};
```

### 5.2 Category palette (locked)

Each category has a `(color, dark)` pair. Used for tiles, badges, gradients, active‑row tints, soundboard pads, and the now‑playing orb.

| Category | color | dark |
|---|---|---|
| Combat | `#d96a4a` | `#3b0f0a` |
| Tavern | `#e2a154` | `#3a1f0a` |
| Exploration | `#bcae54` | `#2a2810` |
| Ambient | `#6fbfa6` | `#0f2a26` |
| Horror | `#9a6ed1` | `#1a0f2e` |
| Tension | `#d27a4a` | `#2e160a` |
| Rest | `#7d92dd` | `#10142e` |
| SFX | `#5cc4d9` | `#0a2630` |
| Voices | `#c084c0` | `#26102a` |
| Sci‑Fi | `#6e8be0` | `#0e1830` |

### 5.3 Typography

```css
--font-display: "Cormorant Garamond", Georgia, serif;   /* 500/600 + italic */
--font-ui:      "Geist", system-ui, sans-serif;         /* 300–700 */
--font-mono:    "Geist Mono", ui-monospace, monospace;
```

Display serif is reserved for **track titles, screen titles, scene names**. Italic gold is the *one* emphasis treatment ("Tonight's *Score*", "*Scenes*"). Both fonts are subsettable; ship Latin only.

### 5.4 Iconography

**No emoji anywhere in the UI.** All glyphs are custom 24×24 SVG, 1.6 px stroke, `currentColor`. The set lives in `prototype/app/icons.jsx`. Port it into `packages/ui/src/icons/` as a single `<Glyph name="…" />` component.

### 5.5 Themes (ship three)

| Theme | ID | Status |
|---|---|---|
| **Gold & Dark** | `gold-dark` | Canonical. Default. |
| **Parchment** | `parchment` | Light theme. Inverts surface ramp; keeps gold accent and category palette. |
| **Arcane** | `arcane` | Deep violet variant. Reuses the Horror category palette as the surface ramp; gold accent stays. |

Drop Ocean Blue / Blood Red / Forest Green from the current HTML. Three is enough; more dilutes the brand.

### 5.6 Motion

- Easing: `cubic-bezier(0.2, 0.7, 0.3, 1)`.
- VU bars: pure CSS keyframes `mc-bar`, 0.5–1.2 s loop, staggered.
- Now Playing orb: three CSS rings, 2.4 s ease‑out, offset by 0.8 s each.
- No canvas, no rAF loops, no animation libraries beyond Reanimated for mobile gestures.

---

## 6. Product Scope & Tiers

### 6.1 Pricing (locked)

| Tier | Price | Status |
|---|---|---|
| **Demo** | Free | Always available |
| **Minor Ambience** | **$14.99** one‑time | Ships at launch |
| **Major Ambience** | **$29.99** one‑time | Ships at launch |
| **Epic Ambience** | **$49.99** one‑time | **Not released at launch.** Hold for v2. Don't mention in store copy. |
| **DM Toolkit** | **$4.99** add‑on | Ships with the desktop launch. Works on any tier. |

**No subscriptions, ever.** This is a positioning commitment, not just a pricing choice.

### 6.2 Tier feature matrix (working split — finalize before launch)

| Feature | Demo | Minor | Major | Epic (held) |
|---|:---:|:---:|:---:|:---:|
| Library playback | Built‑in pack only | ✓ user library | ✓ user library | ✓ user library |
| Crossfade, ducking | ✓ | ✓ | ✓ | ✓ |
| Grades + weighted shuffle | — | ✓ | ✓ | ✓ |
| Recently played / Favorites | — | ✓ | ✓ | ✓ |
| Scenes | 1 | 5 | unlimited | unlimited |
| Soundboard | Page A only, 8 slots | A only | A / B / C (24 slots) | A / B / C |
| SFX layer + auto‑ducking | — | ✓ | ✓ | ✓ |
| DM Mode | — | — | ✓ | ✓ |
| Cloud sync (config blob) | — | — | ✓ | ✓ |
| Themes (Parchment, Arcane) | — | — | ✓ | ✓ |
| Notes on tracks | — | — | ✓ | ✓ |
| Per‑category volume offsets | — | — | ✓ | ✓ |
| Stream Deck plugin | — | — | — | ✓ |
| MIDI in | — | — | — | ✓ |
| VTT integration | — | — | — | ✓ — see [§ 11](#11-open-questions) |
| Collaborative GM mode | — | — | — | ✓ |

> The Minor/Major split above is a working draft. Lock final feature gates before App Store submission.

### 6.3 DM Toolkit ($4.99 add‑on)

Bundled add‑on, works alongside any tier. Lives behind a single IAP entitlement.

| Tool | Description |
|---|---|
| **Name Generator** | Race‑aware random NPC names. Port the existing HTML implementation (Any / Human / Elf / Dwarf / Orc / Halfling). |
| **Dice Roller** | Standard polyhedrals (d4–d100). Persistent roll history. Modifiers, advantage/disadvantage. |
| **Initiative Tracker** | Add combatants, sort by initiative, advance turns, mark conditions. |
| **Turn Sounds** | Per‑combatant audio cue. When a combatant's turn comes up in the Initiative Tracker, their assigned track triggers automatically. Cross‑references the main library — pick any track. |

The Turn Sounds feature is the keystone — it's the reason DM Toolkit lives inside Major Ambience rather than as a separate app.

### 6.4 Demo content pack

The free Demo tier needs a small built‑in pack so the app works without a user library:

- ~20 tracks total, covering each major category (1–3 per category).
- Public‑domain music + commissioned ambient loops + commissioned SFX (5–10 of each).
- Bundled in the binary. Cannot be edited, graded, or removed by the user.
- Demo tier can play these and explore the UI; cannot import user files.

Source: commission a sound designer for ~$1.5–3K for the SFX/ambient set; pull music from public‑domain classical (Bach, Mozart, Vivaldi — same pieces the categorization guide already references).

---

## 7. Audience & Positioning

### 7.1 Target customers (priority order)

1. **Professional GMs running paid sessions** — most willing to pay, most demanding of reliability. Primary segment.
2. **Solo GMs running home games** — largest segment by volume. Loyal once converted.
3. **Streamers / actual‑play podcasters** — high visibility. Adopt early if the UX is on‑stream‑worthy (compact mode, no telemetry pop‑ups, clean visualizers).
4. **Tabletop game stores running in‑store events** — bulk license potential.
5. **LARP / immersive theater organizers** — niche but underserved; product fits with minimal adaptation.

### 7.2 Competitors & positioning

| Competitor | Their angle | Major Ambience's angle |
|---|---|---|
| Syrinscape | Curated soundscapes via subscription | One‑time purchase, your library |
| Tabletop Audio | Free web player, curated scenes | Own your files, own your scenes |
| Battle Bards | Album‑based, curated | Folder‑based, your collection |

The wedge is **ownership + autonomy**. Other tools rent you mood; Major Ambience tunes the mood you already curated.

---

## 8. Onboarding Spec

**Philosophy:** no handholding. The app trusts the GM to figure it out, with help available on demand.

### 8.1 First run (Demo tier, no library yet)

1. Splash with logo + tagline, 1 second.
2. Land on the **Library** screen, populated with the **Demo Pack**. The Combat category is selected and a track is queued (not playing).
3. A small ribbon at the top: "Tap any track to play. *Take the tour →*". Dismissible. The tour link opens § 8.3 below.
4. The user can ignore everything and just click around.

### 8.2 First library import (post‑purchase, Minor/Major)

1. Click **Open Folder** in the sidebar.
2. Native folder picker.
3. Modal with a progress bar: "Scanning *4,796 tracks*…" with a cancel button. Stays unobtrusive; the rest of the UI is usable.
4. Toast on completion: "Categorized into 9 buckets. *Review categories?*" Link opens the Categories view filtered to the new pack.

### 8.3 Tutorials (opt‑in, anytime)

Accessible from the settings menu under **Tutorials**. Never auto‑triggered.

| Topic | Length | Trigger |
|---|---|---|
| Library basics | 30 s | Pulses on first launch |
| Scenes | 45 s | After 5 minutes of library use |
| Soundboard | 30 s | After saving first scene |
| Grading & shuffle | 30 s | After 10 tracks played |
| SFX layer + ducking | 45 s | After firing first SFX |
| DM Mode | 20 s | Only when DM Mode toggled for first time |

Each is a coachmark walkthrough (4–6 steps), not a video. Built with a single `<Tutorial steps={…} />` component.

---

## 9. Voice & Copy

The personality is **a spellbook** — every interaction feels a little magical. Implications for copy:

- Use *italic gold* for emphasis in display serif (e.g., *"Tonight's Score"*, *"Cast a scene"*).
- Action verbs lean theatrical: **Cue**, **Cast**, **Fade**, **Conjure**, **Bind to slot**, **Snapshot scene**.
- Avoid corporate verbs: *manage, configure, set up, customize*.
- Never use "user" in UI copy. Say "you" or omit the subject entirely.
- Tier names follow spell convention — Minor / Major / Epic. Marketing copy can lean into this: "*Minor* is enough for most tables. *Major* is for the GM who scores every scene. *Epic* is for the table that streams.""
- Error states are calm and short. No "Oops!", no exclamation marks. "Couldn't open that folder. Try again or pick another." is the tone.

---

## 10. Non‑Goals

Major Ambience **is not** and **will not become**:

- A music streaming service. No audio is shipped beyond the Demo Pack.
- A DAW or audio editor. No recording, trimming, effects chain, multi‑band EQ.
- A virtual tabletop. No maps, character sheets, dice mechanics beyond the optional DM Toolkit.
- A social platform. No accounts beyond sync auth, no profiles, no sharing, no comments.
- A subscription product. Ever.
- A marketplace at launch. Optional content packs may come post‑launch via IAP; user‑to‑user marketplace is out.

If a feature request maps to any of the above, decline with a one‑line note pointing to this section.

---

## 11. Open Questions

Document them; do not resolve speculatively. Each gets a decision before the corresponding phase ships.

### 11.1 VTT integration — needed but un‑scoped

We want VTT integration (Foundry, Roll20, Owlbear Rodeo, FoundryVTT modules). It can't delay v1.

**Decided approach:** ship v1 without a VTT integration *but* design the audio engine with a `TriggerAPI` interface that exposes the same actions the UI uses (`playScene(id)`, `playTrack(id)`, `fireSFX(slot)`, `setFade(ms)`). In v2, a thin **WebSocket bridge** on `localhost:7237` lets a VTT module send those triggers. Foundry/Roll20 modules become 200‑line plugins, not engine rewrites.

Concrete v1 obligations (so v2 isn't blocked):
- `packages/core/src/trigger-api.ts` exists and is the single mutation surface for the player machine.
- UI calls only `TriggerAPI` methods — no direct state mutation from React components.
- A local server (`apps/desktop/src-tauri/src/trigger_server.rs`) is stubbed but disabled. Toggle behind a feature flag for v2.

### 11.2 Minor vs Major feature gates — finalize pre‑launch

Working split is in [§ 6.2](#62-tier-feature-matrix--working-split--finalize-before-launch). Confirm before App Store submission. Risk: a too‑generous Minor undercuts Major; a too‑restrictive Minor pushes users to Demo + piracy.

### 11.3 Demo Pack curation

20 tracks, ~10 SFX. Decide:
- Commission vs license vs pure public domain?
- Budget ceiling for commissioning?
- Whether the Demo Pack is also visible to paid tiers (probably yes — "starter tracks").

### 11.4 Tutorial UX library

Build coachmarks in‑house (small footprint) or adopt a library (Shepherd.js / Driver.js)? Decision blocked until § 8.3 components begin.

### 11.5 Sync auth provider

Magic‑link via Resend is the working plan. Alternatives: Sign in with Apple (required on iOS anyway), Google Sign‑In, passkey only. Settle before mobile launch.

---

## 12. Working Rules

For any Claude Code session picking up this repo:

1. **Don't refactor `prototype/`.** It's reference. If the prototype and a production component disagree, fix the production component to match the prototype.
2. **Don't add audio files to the repo.** Ever. Not even the Demo Pack — it ships in app binaries, sourced from a separate private repo or asset CDN.
3. **Don't add emoji to UI.** Use `<Glyph name="…" />` from `packages/ui`.
4. **Don't introduce CSS‑in‑JS libraries** beyond what the prototype uses (inline `style` objects). When `packages/ui` matures, migrate to **vanilla CSS modules** — *not* Tailwind, *not* styled‑components.
5. **Don't ship subscription plumbing.** App Store IAPs are non‑consumable one‑time purchases only.
6. **Don't add telemetry without a toggle**, and ship the toggle as **off by default**.
7. **Don't break the prototype.** It's the demo‑able artifact for any pitch or fundraising conversation.
8. **Reference, don't duplicate.** When a topic is covered in `docs/BUILD_GUIDE.md`, link to it rather than re‑state.

---

## 13. Decisions Log

Append‑only. Add a row every time a previously open question lands.

| Date | Decision | Source |
|---|---|---|
| 2026‑05 | Product name: **Major Ambience** | Owner |
| 2026‑05 | Tier names follow D&D spell convention: Minor / Major / Epic | Owner |
| 2026‑05 | Three‑tier pricing: $14.99 / $29.99 / $49.99 (Epic held) | Owner |
| 2026‑05 | DM Toolkit is a **$4.99 add‑on**, not bundled | Owner |
| 2026‑05 | First platform: Windows desktop (Tauri 2) | Owner |
| 2026‑05 | Themes shipped: Gold & Dark (default), Parchment (light), Arcane (deep violet) | Owner |
| 2026‑05 | Free tier model: Demo Pack only, no user library imports | Owner |
| 2026‑05 | Onboarding: opt‑in tutorials, no forced handholding | Owner |
| 2026‑05 | VTT integration: v2, via `TriggerAPI` + WebSocket bridge | Owner |

---

*Last updated: 2026‑05. Maintained alongside `docs/BUILD_GUIDE.md`. When this document and the build guide disagree, this document wins.*
