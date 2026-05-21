# Major Ambience — Design & Build Guide

> A handoff document for shipping the Major Ambience redesign across **iOS**, **Android**, and **Windows 11**. Pairs with the interactive prototype at `prototype/index.html`.

---

## TL;DR

| Layer | Choice | Why |
|---|---|---|
| **Mobile** | **React Native + Expo (dev‑client)** | One codebase for iOS + Android, mature audio story, Expo handles signing/builds/OTA. |
| **Desktop** | **Tauri 2 + React + Vite** | 10 MB binaries vs Electron's 150 MB, uses native WebView2 on Windows, easy Rust audio bridge if you ever need it. |
| **Shared core** | **pnpm monorepo + TypeScript** | One audio engine, one design system, one schema across all three apps. |
| **Audio** | **Web Audio API** (desktop & web) + **react‑native‑track‑player** (mobile) | Sample‑accurate scheduling, gapless playback, lock‑screen controls. |
| **Storage** | **SQLite** (local index) + **JSON sync blob** (cloud) | Files stay on device; only metadata syncs. |
| **Cloud sync** | **Cloudflare Workers + KV + magic‑link auth** | Free tier covers thousands of users, no servers to run. |
| **Monetization** | **One‑time Pro purchase** ($14.99) + optional content packs | Honest, no subscription fatigue, sits well with TTRPG audience. |

**Estimated MVP**: 14 weeks for one mobile platform + Windows. **Full cross‑platform launch**: ~22 weeks.

---

## 1. Design System

The look is fixed by the prototype. These are the tokens to lift into code.

### 1.1 Color tokens

```ts
export const T = {
  // surfaces
  bg:       '#0b0913',   // app base
  bgRaise:  '#15121f',   // raised surfaces (modals, sheets)
  bgCard:   '#1c1828',   // cards, list rows
  bgChip:   'rgba(243,236,217,0.06)',
  // ink (warm parchment)
  ink:      '#f3ecd9',
  ink2:     '#b6a890',
  ink3:     '#6b5f4b',
  // accent
  gold:     '#e3b66a',
  goldSoft: 'rgba(227,182,106,0.14)',
  goldEdge: 'rgba(227,182,106,0.35)',
  // dividers
  rule:     'rgba(243,236,217,0.07)',
};
```

Each **category** has its own pair `(color, dark)` driving gradients, badges, pads, and the active‑track row tint. This is the design's central trick — the app's mood shifts with what's playing.

| Category | color | dark | Mood |
|---|---|---|---|
| Combat | `#d96a4a` | `#3b0f0a` | Ember |
| Tavern | `#e2a154` | `#3a1f0a` | Hearth amber |
| Exploration | `#bcae54` | `#2a2810` | Mossy gold |
| Ambient | `#6fbfa6` | `#0f2a26` | Sage |
| Horror | `#9a6ed1` | `#1a0f2e` | Cold violet |
| Tension | `#d27a4a` | `#2e160a` | Sienna |
| Rest | `#7d92dd` | `#10142e` | Moonlit indigo |
| SFX | `#5cc4d9` | `#0a2630` | Ozone cyan |
| Voices | `#c084c0` | `#26102a` | Plum |
| Sci‑Fi | `#6e8be0` | `#0e1830` | Steel blue |

### 1.2 Typography

```css
--font-display: "Cormorant Garamond", Georgia, serif;  /* 500/600 + italic */
--font-ui:      "Geist", system-ui, sans-serif;        /* 300–700 */
--font-mono:    "Geist Mono", ui-monospace, monospace;
```

| Scale | Mobile | Desktop |
|---|---|---|
| Display (Cormorant 600) | 32 / 38 px | 38 / 46 px |
| H2 | 22 px | 22 px |
| Body | 14 px | 13–14 px |
| Caption | 11 px | 11 px |
| Eyebrow (UPPERCASE, 0.16em tracking) | 11 px | 11 px |
| Mono (timers, counts) | 10–11 px | 10–11 px |

Display serif is reserved for **track titles, screen titles, scene names**. Italic gold is the *one* accent treatment used for emphasis ("Tonight's *Score*", "*Scenes*").

### 1.3 Spacing, radii, motion

- 4 / 8 / 12 / 16 / 20 / 24 / 32 base
- Radii: 9 (pills tight), 12 (chips), 16 (cards), 22 (hero), 999 (round)
- Easing: `cubic-bezier(0.2, 0.7, 0.3, 1)`
- VU bar animation: `mc-bar 0.5–1.2s` infinite, staggered per bar
- Pulse rings on now‑playing orb: 2.4s ease‑out infinite, three offset by 0.8s

### 1.4 Iconography

**No emoji.** All glyphs are custom 24×24 SVG, 1.6 px stroke, `currentColor`, slightly hand‑drawn to feel codex‑like rather than utility. The full set lives in `app/icons.jsx` in the prototype. When implementing, port to a single `<Glyph name="…" />` component so the family stays consistent across platforms.

### 1.5 Component primitives

| Primitive | Used in |
|---|---|
| `GradeChip` | track rows, now‑playing rate rail |
| `CatChip` | track headers, scene cards, now‑playing |
| `Visualizer` | mini‑player, track rows, soundboard pads |
| `OrbVisualizer` | now‑playing hero (mobile + desktop right rail) |
| `CategoryGradient` | screen background washes |
| `TrackRow` | every list view |
| `SoundPad` | soundboard grid |
| `SceneCardSmall / Large` | library and scenes screens |
| `MiniPlayer + TabBar` | mobile chrome |
| `DesktopTransport` | desktop bottom bar |

---

## 2. Information Architecture

```
┌─────────────────────────────────────────────────────┐
│ MOBILE                                              │
├─────────────────────────────────────────────────────┤
│ Tab: Library    →  Home          →  Category Detail │
│                                  →  Now Playing     │
│ Tab: Scenes     →  Grid          →  Now Playing     │
│ Tab: Soundboard →  Pads + SFX                       │
│ Tab: Search     →  Results       →  Now Playing     │
│                                                     │
│ Persistent: MiniPlayer (above tab bar)              │
│ Modal:      NowPlayingScreen (slides up)            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DESKTOP                                             │
├─────────────────────────────────────────────────────┤
│ Header: Library | Scenes | Soundboard               │
│ ┌─────────┬─────────────────────┬─────────────────┐ │
│ │ Sidebar │ Main                │ Right rail      │ │
│ │ Folders │ Hero + track table  │ Now Playing     │ │
│ │ + cats  │ (Library)           │ + Queue         │ │
│ │         │ Grid (Scenes)       │ + SFX Layer     │ │
│ │         │ Pads (Soundboard)   │                 │ │
│ └─────────┴─────────────────────┴─────────────────┘ │
│ Transport bar (full width, persistent)              │
└─────────────────────────────────────────────────────┘
```

### Core flows to preserve from the current HTML app

1. **Open folder** → scan → categorize → resume. Never block the UI.
2. **Tap track → play** with crossfade matching `fadeDuration` slider.
3. **Hover preview** (desktop only) — 5s preview from 20% into track, never interrupts now playing.
4. **Cycle grade** — single tap on the grade chip cycles `S → A → B → C → D → F → (none)`.
5. **Save scene** — name + snapshot: category, soundboard layout, fade, ambient mode, volumes.
6. **Restore scene** — single tap loads everything.
7. **Fire SFX** — plays simultaneously with current music, ducks main bus per ducking slider.
8. **Pin to soundboard** — drag onto slot, or pin button. Persists.

### Mobile‑specific UX gains

- **Mini‑player → Now Playing** sheet (swipe up). Single anchor for transport.
- **Pads become wide**: 2‑column grid at 16 pt gap, 96 pt tall — easy to thumb‑hit on the table.
- **Scene cards are illustrated** with the category gradient and a color‑mix bar at the bottom showing which categories the scene weaves together — readable across the table.
- **Fade and Duck on the Now Playing screen** — not buried in settings.

### Desktop‑specific UX gains

- **Always‑visible Now Playing in the right rail**, including the orb and note.
- **Persistent transport bar** with the full VU meter, scrubber, grade chips, fade, and volume.
- **Three‑pane lock‑in**: there's no full‑screen now‑playing because everything is always one mouse target away. (You can still toggle Compact Mode for screen‑share sessions — keep that feature.)

---

## 3. Tech Stack

### 3.1 Monorepo layout

```
major-ambience/
├─ apps/
│  ├─ mobile/          # React Native + Expo
│  ├─ desktop/         # Tauri 2 + React (renderer)
│  └─ web/             # Vite + React (live demo / marketing / current HTML successor)
├─ packages/
│  ├─ core/            # Audio engine, state machine, sync client
│  ├─ ui/              # Design tokens, primitives, icons, screens (web + RN flavors)
│  ├─ data/            # Schema, migrations, SQLite adapter
│  └─ shared/          # Types, utils, constants
└─ pnpm-workspace.yaml
```

Use **pnpm workspaces** (lighter than Nx for a project of this size). Add **Turborepo** for cached builds once the test suite grows.

### 3.2 Mobile: React Native + Expo

**Why not Capacitor / wrapped web view?** The current HTML app would load *fast* in Capacitor, but you lose:
- Lock‑screen / Control Center controls (iOS) and media notification (Android)
- Background audio reliability (Safari View kills audio aggressively)
- Native file picker for adding packs
- App Store search ranking (web‑view apps trend lower)

The audio engine is the heart of the product, so accept the porting cost.

**Setup**

```bash
pnpm create expo apps/mobile --template
cd apps/mobile
expo install react-native-track-player expo-av expo-file-system \
            expo-sqlite expo-document-picker expo-media-library \
            react-native-reanimated react-native-gesture-handler \
            @shopify/flash-list
```

**Key libraries**

| Need | Library |
|---|---|
| Long‑form music + lock‑screen | `react-native-track-player` |
| Short SFX (low latency) | `expo-av` Sound w/ preloading; switch to `react-native-sound` if you need lower than 50 ms |
| Lists 1000+ rows | `@shopify/flash-list` |
| Animated visualizers | `react-native-reanimated` v3 (worklets) |
| File system | `expo-file-system` |
| Index DB | `expo-sqlite` (FTS5 enabled) |

### 3.3 Desktop: Tauri 2 + React

Why Tauri:
- **10 MB installer**, 150 KB after install vs Electron's 150 MB
- Uses **WebView2 on Windows 10/11** (already installed) — same Chromium engine, no extra runtime
- Future‑proof: the same Tauri project ships **macOS and Linux** with `pnpm tauri build --target <triple>` — write once, distribute everywhere
- Audio runs in the WebView (Web Audio API), so the React renderer can directly own playback
- Native menus, tray, file watchers via Tauri's Rust side

**Setup**

```bash
pnpm create tauri-app apps/desktop --template react-ts --manager pnpm
cd apps/desktop
pnpm tauri dev
```

**Allowlist (in `tauri.conf.json`)**: `fs.scope: ["$AUDIO/**"]`, `dialog.open`, `notification`, `globalShortcut`, `path`. Keep the rest off.

### 3.4 Shared core (`@mc/core`)

The audio engine, state, and sync client are **platform‑agnostic TypeScript**. They consume an `AudioBackend` interface that each app implements:

```ts
// packages/core/src/audio/backend.ts
export interface AudioBackend {
  loadTrack(uri: string, opts?: { gapless?: boolean }): Promise<TrackHandle>;
  play(handle: TrackHandle, at?: number): void;
  pause(handle: TrackHandle): void;
  seek(handle: TrackHandle, t: number): void;
  setGain(handle: TrackHandle, g: number, rampSeconds?: number): void;
  destroy(handle: TrackHandle): void;
  onProgress(handle: TrackHandle, cb: (t: number) => void): Unsubscribe;
  onEnded(handle: TrackHandle, cb: () => void): Unsubscribe;
}
```

Implementations:
- `WebAudioBackend` (desktop & web) — `AudioContext` + `AudioBufferSourceNode` for SFX, `MediaElementAudioSourceNode` for music
- `RNTPBackend` (mobile) — `react-native-track-player` queue for music, `expo-av` for SFX

The **scene / player / queue / grade / search logic** lives entirely in `@mc/core` as an XState machine — no platform code touches it.

---

## 4. Audio Engine

This is the technical centerpiece. Three concerns: **playback fidelity, latency, and mixing**.

### 4.1 Crossfade

```ts
// Dual‑source crossfade with linear gain ramp.
function crossfade(
  out: TrackHandle, in_: TrackHandle, durationSec: number, backend: AudioBackend,
) {
  const now = backend.currentTime();
  backend.setGain(out, 0, durationSec);
  backend.setGain(in_, 1, durationSec);
  setTimeout(() => backend.destroy(out), durationSec * 1000 + 50);
}
```

For mobile, RNTP has a built‑in `setRepeatMode` and queue, but **no native crossfade** — you implement it the same way (two tracks, ramped gains via `setVolume`).

### 4.2 Ducking

When any SFX plays, ramp the music bus down to `1 - duckingAmount` over 150 ms, hold while at least one SFX is alive, then ramp back over 400 ms. Single global ducker tied to the SFX bus's `activeCount`.

### 4.3 Buses

```
master ──┬── musicBus      ──── now‑playing (1 or 2 sources during crossfade)
         ├── sfxBus        ──── 0‑N concurrent short clips
         └── soundboardBus ──── 0‑N pad triggers (long or short)
```

Per‑category volume offset applies as a per‑track gain at load time, multiplied onto the bus gain.

### 4.4 Low‑latency SFX

On Web Audio: decode pad samples into `AudioBuffer` on assignment, fire with `AudioBufferSourceNode.start()` — sub‑10 ms latency. **Do not** use `<audio>` for pads.

On RN: pre‑load every pad on the active page using `expo-av` `Sound.createAsync({ uri, shouldPlay: false })`. Keep the `Sound` object cached. `playAsync()` starts ~50 ms after tap, which is fine for combat stings.

### 4.5 Background playback

- **iOS**: `UIBackgroundModes: ['audio']` in `Info.plist`. Configure `AVAudioSession` category `playback`. RNTP handles this.
- **Android**: Use the foreground service that RNTP provides; declare `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions. Without this, OEMs (Samsung, Xiaomi) will kill the app within minutes when screen is off.

### 4.6 Lock‑screen / Media notification

RNTP exposes the right hooks. Wire:
- Title = track title
- Artist = pack name
- Artwork = generate a 1024×1024 PNG from the category gradient + glyph on first load and cache.
- Controls: play / pause / next / prev / seek
- Compact actions on Android: prev, play/pause, next

---

## 5. Data Model

```ts
// packages/data/src/schema.ts

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F' | null;
export type CategoryId =
  | 'combat' | 'tavern' | 'exploration' | 'ambient' | 'horror'
  | 'tension' | 'rest' | 'voices' | 'sfx' | 'scifi';

export interface Track {
  id: string;              // hash(filePath + size + mtime)
  uri: string;             // platform path or content:// URI
  title: string;
  pack: string;            // immediate parent folder
  category: CategoryId;
  subcategory?: string;
  durationMs: number;
  grade: Grade;
  playCount: number;
  lastPlayedAt?: number;
  note?: string;
  tags?: string[];
}

export interface Scene {
  id: string;
  name: string;
  glyph?: string;
  primaryCategory: CategoryId;
  accentCategories: CategoryId[];
  trackIds: string[];      // optional explicit set
  soundboardPage: 'A' | 'B' | 'C';
  fadeMs: number;
  duckingPct: number;
  volumes: Partial<Record<CategoryId, number>>;
  createdAt: number;
}

export interface SoundboardSlot {
  page: 'A' | 'B' | 'C';
  slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  trackId?: string;
  loop: boolean;
  volume: number;
}

export interface AppConfig {
  duckingPct: number;
  fadeMs: number;
  largeUI: boolean;
  theme: 'gold-dark' | 'ocean' | 'blood' | 'forest' | 'arcane';
  rootFolderUri: string;
  schemaVersion: number;
}
```

### SQLite tables (mobile + desktop both)

```sql
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  title TEXT NOT NULL,
  pack TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  duration_ms INTEGER,
  grade TEXT,
  play_count INTEGER DEFAULT 0,
  last_played_at INTEGER,
  note TEXT
);
CREATE VIRTUAL TABLE tracks_fts USING fts5(title, pack, note, content='tracks');
CREATE TABLE scenes (id TEXT PRIMARY KEY, payload JSON NOT NULL);
CREATE TABLE soundboard (page TEXT, slot INTEGER, payload JSON, PRIMARY KEY(page, slot));
CREATE TABLE config (key TEXT PRIMARY KEY, value JSON);
```

Use **FTS5** for the global search — 4,796 tracks searched in <2 ms.

---

## 6. Offline & Sync

### 6.1 Audio files

**Audio stays on the device.** Don't ship anyone else's audio. Don't host it. Two reasons:
1. Licensing — most TTRPG music packs (AudioHero, Battle Bards, etc.) forbid redistribution.
2. Size — 4,796 tracks ≈ 60 GB. Untenable to sync.

### 6.2 Importing on mobile

- **iOS**: Files app → share to Music Companion. Accept folders via `expo-document-picker.getDocumentAsync({ type: 'folder' })` (iOS 17+). Copy into the app sandbox documents directory.
- **Android**: `ACTION_OPEN_DOCUMENT_TREE` → persistable URI permission. Index the tree in place (don't copy — Android storage is shared).
- **Scan progress**: surface as a one‑time onboarding step with cancellable progress bar.

### 6.3 What syncs

Only the **config blob**: grades, notes, scenes, soundboard layouts, NPC name history, theme, ducking, fade. Together this is <100 KB even for a power user.

```ts
// packages/core/src/sync/blob.ts
export interface SyncBlob {
  version: 1;
  updatedAt: number;
  deviceId: string;
  grades: Record<string /*trackKey*/, Grade>; // trackKey = hash(title + pack)
  notes: Record<string, string>;
  scenes: Scene[];
  soundboard: SoundboardSlot[];
  npcHistory: string[];
  config: AppConfig;
}
```

Track keys are content‑based (not local IDs) so the same track on a different device still gets its grade.

### 6.4 Sync backend

- **Cloudflare Worker** + **KV** for blob storage (free tier: 100 K reads/day, 1 K writes/day — plenty)
- **Magic‑link email auth** via Resend; JWT in a cookie or token in keychain
- Last‑write‑wins per top‑level key (grades, scenes, soundboard) — no operational transform needed; conflicts are vanishingly rare for single‑user TTRPG use

---

## 7. Platform Notes

### 7.1 iOS

- **Build & ship via Expo EAS** — no Xcode involvement until you need a custom native module.
- Add to `app.json`:
  ```json
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["audio"],
      "NSDocumentsFolderUsageDescription": "Choose your music folder",
      "ITSAppUsesNonExemptEncryption": false
    },
    "bundleIdentifier": "com.rayzold.majorambience"
  }
  ```
- App Store submission gotchas: explain background audio in the review notes, demonstrate the value (running across multiple devices isn't a "rich" app feature unless you show it). Approve in ~2 attempts.

### 7.2 Android

- Foreground service is mandatory for background audio in 2026 (`FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission, declared `serviceType` in `AndroidManifest`).
- Audio focus: respond to phone calls / map navigation by lowering bus to 0.2 over 200 ms.
- Battery optimization: prompt the user (once) to whitelist the app on Samsung / Xiaomi / OnePlus — these OEMs are aggressive about killing audio services.

### 7.3 Windows 11

- Tauri auto‑builds an **MSI** installer; signing requires an EV cert ($300‑$500/yr) to avoid SmartScreen warnings.
- Use **`mica` window effect** (Tauri 2: `tauri.conf.json` → `windows.mica: true`). The dark Mica tint perfectly matches the design.
- Global hotkeys for the soundboard's 1‑8 should be **opt‑in** — power users will love it, but defaulting it on conflicts with text input.

---

## 8. Performance & Scalability

| Concern | Strategy |
|---|---|
| **Lists** (4,796 tracks) | FlashList (mobile) / react‑virtuoso (desktop). Render only 20‑30 items. |
| **Search** | SQLite FTS5. Debounce input 120 ms. |
| **Library scan** | Web Worker (desktop) / JS thread off‑main (mobile via `JSI`). Stream results into SQLite in 100‑track batches. |
| **Visualizer cost** | Pure CSS keyframes for VU bars. The orb is 3 CSS rings + 1 gradient — no canvas, no rAF loop. |
| **Memory** | Decode SFX into AudioBuffers only for the active soundboard page; release on page switch. |
| **Cold start** | <2s on mobile, <800 ms on desktop. Achievable by deferring library scan until after first paint. |
| **Battery (mobile)** | One AVAudioSession, ducking via gain ramps (cheap). Disable visualizer animation when screen is off. |

---

## 9. Monetization

Sit honest in the TTRPG community. They'll repay you with loyalty.

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0 | Full playback, 3 scenes, 8 soundboard slots, no sync |
| **Pro** | $14.99 one‑time | Unlimited scenes, 24 slots (A/B/C), cloud sync, all themes, DM mode, Stream Deck plugin, MIDI |
| **Curated packs** | $4.99 each | Optional in‑app purchases for licensed/commissioned ambient packs; revenue split with creators |

**Avoid subscriptions.** This isn't a SaaS — it's a tool. Subscriptions also force you to keep the server alive forever, which the sync‑only‑on‑demand architecture above already avoids.

---

## 10. Phased Roadmap

| Phase | Duration | Scope | Complexity |
|---|---|---|---|
| **0 — Foundations** | 3 weeks | Monorepo, design tokens, glyph set, core schema, audio backend interface, XState player machine | Med |
| **1 — Mobile MVP (iOS)** | 5 weeks | Library, Now Playing, Soundboard, Scenes, Search. No sync. TestFlight beta. | High |
| **2 — Android parity** | 2 weeks | Foreground service, file picker, media notification | Med |
| **3 — Windows MVP** | 4 weeks | Tauri shell, three‑pane workspace, folder watch, mic‑level VU, global hotkeys | Med‑High |
| **4 — Cloud sync** | 3 weeks | Worker + KV + magic‑link auth, sync blob client, conflict UI | Med |
| **5 — Polish & Pro tier** | 3 weeks | Onboarding, themes, NPC name generator, A/B/C pages, in‑app purchases, accessibility audit | Med |
| **6 — Launch** | 2 weeks | App Store + Play Store + MSI signing + landing page + docs | Low |
| **7 — Post‑launch (rolling)** | ongoing | Stream Deck plugin, MIDI in, content packs marketplace, collaborative GM mode | Variable |

**MVP for one platform: ~10 weeks.** **All three platforms in user hands: ~22 weeks.**

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| iOS background audio gets killed in iOS 18+ | Med | High | Use RNTP, follow Apple's audio session docs, test on physical device early. |
| Android OEM battery optimizer kills service | High | Med | One‑time onboarding prompt with deep link to OEM whitelist. |
| Users dump a 4,796‑track folder and the scan freezes | High if naive | High | Stream into SQLite in batches; show progress; cancellable. |
| Crossfade audible artifact when switching mid‑decode | Med | Low | Pre‑decode the next 2 tracks in the queue; fall back to instant cut if not ready. |
| Sync conflicts when GM uses multiple devices | Low | Low | Per‑key last‑write‑wins. Show a "synced 4 min ago" indicator. |
| WebView2 missing on locked‑down Windows 10 | Low | High | Tauri auto‑installer ships WebView2 bootstrap. Document the offline installer for IT environments. |
| Audio licensing concerns from packs the user imports | Med | Low | Users supply their own files. Don't ship audio. State this clearly on the store page. |
| App Store rejects "professional" tool for niche audience | Low | Med | Position as "music for tabletop role‑playing games", show family‑friendly screenshots, no copyrighted track names. |
| Cormorant + Geist fonts inflate bundle | Low | Low | Subset the fonts (Latin only); each is ~30 KB woff2. |

---

## 12. Refactoring the Current HTML App

The existing `dnd-music.html` is a single ~3000‑line file. Treat it as a working spec, not a code base to port. Concretely:

1. **Lift the categorization logic** from `MUSIC_CATEGORIZATION_GUIDE.md` into `packages/core/src/categorize.ts` as a pure function `(filename, parentFolder) => { category, subcategory? }`. Add tests with the 40+ examples from the guide.
2. **Lift the grade weighting** from the shuffle code into `core/src/shuffle.ts` (S=6×, A=4×, B=2×, C/D/Ungraded=1×, F=never). Pure function over `Track[]`.
3. **Lift the JSON export schema** — that's your sync blob v1. Maintain compatibility so power users can import their existing settings into the new app on day one.
4. **Discard** the HTML/CSS/JS/DOM code. The visual system in the prototype supersedes it.

---

## 13. What to Build First

If you have one week, build this:

1. `packages/core` — audio backend interface, player state machine, categorize.ts, shuffle.ts.
2. `apps/desktop` — Tauri + React renderer using `@mc/ui` to render the **Library** screen against a local folder.
3. Wire **play / pause / next / seek / fade**. Skip scenes, soundboard, search, settings.

That's the riskiest 30% — once playback works smoothly with the new visual system across two real tracks, the rest is composition of UI you've already designed.

---

*Companion file: `prototype/index.html` — interactive prototype for every screen referenced in this document.*
