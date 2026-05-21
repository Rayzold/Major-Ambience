# Major Ambience

> Music, ambience, and sound effects for tabletop RPGs.

A GM's audio companion for iOS, Android, and Windows 11 — designed to score the tavern, cue the dragon, and fade to silence on command. Built around the workflow of a sitting Dungeon Master with a 4,000+ track library and zero patience for a fiddly interface.

![Major Ambience — three platforms](docs/screenshots/01-hero.png)

---

## Status

**Pre‑production.** This repository currently contains:

- An **interactive HTML prototype** of every primary screen across iPhone, Android, and Windows 11 (`prototype/`).
- A **design + engineering handoff document** (`docs/BUILD_GUIDE.md`) covering tech stack, audio engine, data model, sync, monetization, and a phased roadmap.
- The **categorization rules** that drive the auto‑sorting of imported music packs (`docs/CATEGORIZATION_GUIDE.md`).

Production app builds (`apps/mobile`, `apps/desktop`) will land on this repo as Phase 1 work begins.

---

## What it does

| Pillar | What you get |
|---|---|
| **Library** | Auto‑categorize your music folder into Combat, Tavern, Exploration, Ambient, Horror, Tension, Rest, Voices, SFX, and Sci‑Fi. Filter, search, grade, and shuffle by weight (S=6×, A=4×, B=2×, C/D=1×, F=never). |
| **Now Playing** | Cinematic full‑screen player with category‑tinted visualizer, crossfade slider, ducking, in‑line grade rail, and Up Next queue. |
| **Scenes** | Snapshot category, soundboard layout, fade, and volume into a named scene. Tap to restore the whole table mood in one move. |
| **Soundboard** | Three pages (A/B/C) × 8 pads each. Drag a track onto a slot or pin from anywhere. Pads light up when playing, support loop + per‑pad volume. |
| **SFX Layer** | Fire any sound effect alongside the main track. The music bus ducks automatically while SFX are active. Per‑SFX volume, loop toggle. |
| **Search** | Global, fuzzy, across the whole library. Filters by grade, length, and category. |
| **DM Mode** | One toggle hides editing controls and shows a red DM badge — safe to share the screen with players. |

---

## Screenshots

### Windows 11 — primary GM surface

Three‑pane workspace: categories, tracks, and a persistent Now Playing + Queue + SFX rail. Transport stays anchored at the bottom across all views.

![Windows · Library](docs/screenshots/05-desktop-library.png)

![Windows · Soundboard](docs/screenshots/06-desktop-soundboard.png)

### Mobile — touch‑first GM companion

The phone sits next to the laptop for one‑hand control while running the table.

![Mobile · Library & Now Playing](docs/screenshots/02-mobile-library-nowplaying.png)

![Mobile · Now Playing & Soundboard](docs/screenshots/03-mobile-nowplaying-soundboard.png)

![Mobile · Category & Scenes](docs/screenshots/04-mobile-category-scenes.png)

---

## Run the prototype locally

The prototype is a single static HTML file with no build step.

```bash
git clone https://github.com/Rayzold/Major-Ambience.git
cd Major-Ambience/prototype
# Serve over HTTP (any static server works; the file: protocol won't load Babel modules)
python3 -m http.server 8000
# or:  npx serve .
```

Then open <http://localhost:8000/> and click around any artboard.

> The prototype uses React 18 + Babel standalone for runtime JSX transpilation, so it loads in any modern browser without a build step. Production apps will be built with the stack in [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md).

---

## Tech direction (summary)

Full reasoning lives in [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md). The short version:

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (dev‑client) |
| Desktop | Tauri 2 + React + Vite |
| Shared core | pnpm monorepo, TypeScript |
| Audio | Web Audio API (desktop) + react‑native‑track‑player (mobile) |
| Storage | SQLite + FTS5 local; ~100 KB config blob syncs via Cloudflare Workers + KV |
| Monetization | One‑time Pro purchase, no subscription |

Files don't sync. Audio stays on device — only your grades, scenes, notes, and soundboard layouts move between your phone and laptop.

---

## Repository layout

```
.
├── README.md                     ← you are here
├── LICENSE
├── prototype/
│   ├── index.html                ← interactive multi‑platform prototype
│   └── app/
│       ├── data.js               ← mock library, scenes, soundboard
│       ├── icons.jsx             ← custom SVG glyph set (no emoji)
│       ├── ui.jsx                ← tokens, primitives, mini‑player, tab bar
│       ├── screens.jsx           ← 6 mobile screens
│       ├── app.jsx               ← mobile shell
│       ├── desktop.jsx           ← Windows desktop shell
│       ├── ios-frame.jsx         ← iOS device chrome
│       ├── android-frame.jsx     ← Android device chrome
│       ├── windows-frame.jsx     ← Windows 11 window chrome
│       └── design-canvas.jsx     ← canvas wrapper (zoom, pan, focus mode)
└── docs/
    ├── BUILD_GUIDE.md            ← full design + engineering handoff
    ├── CATEGORIZATION_GUIDE.md   ← music auto‑categorization rules
    └── screenshots/
```

---

## Roadmap

See [`docs/BUILD_GUIDE.md § 10`](docs/BUILD_GUIDE.md#10-phased-roadmap) for the seven‑phase plan. Headline: **MVP on one platform in ~10 weeks, all three platforms in users' hands in ~22 weeks.**

---

## License

MIT — see [`LICENSE`](LICENSE).

> The repository contains no audio files. Major Ambience is a player; you supply your own music and effects. Curated content packs (sold via in‑app purchase) will live in a separate repo at the appropriate phase.
