// Tutorial definitions for the five Phase-1 surfaces. Each tutorial points
// at DOM elements via data-mc-tour attributes (added in the layout files).

import type { TutorialStep } from "./Tutorial.js";

export type TutorialDef = {
  id: string;
  title: string;
  blurb: string;
  durationSeconds: number;
  steps: TutorialStep[];
};

export const TUTORIALS: readonly TutorialDef[] = [
  {
    id: "library-basics",
    title: "Library basics",
    blurb: "Open a folder, browse categories, play a track.",
    durationSeconds: 30,
    steps: [
      {
        title: "Welcome to Major Ambience",
        body: "Your music stays on this machine. We index it locally, auto-categorize it into ten buckets, and let you score the table without leaving the GM's chair.",
        placement: "center",
      },
      {
        title: "Open your library",
        body: "Click Open Folder to point Major Ambience at your music. We'll walk every subfolder and sort everything into Combat, Tavern, Horror, and the rest.",
        target: '[data-mc-tour="open-folder"]',
        placement: "bottom",
      },
      {
        title: "Categories",
        body: "Once your folder is open, each of the ten categories shows its real count. Click one to see only that mood.",
        target: '[data-mc-tour="sidebar-categories"]',
        placement: "right",
      },
      {
        title: "Click any track to play",
        body: "Click a row to start playback. The category gradient tints the whole screen and the orb on the right pulses in that color.",
        target: '[data-mc-tour="track-table"]',
        placement: "top",
      },
      {
        title: "Crossfade is built-in",
        body: "Click a different track while one is playing — Major Ambience crossfades between them over the duration set by the fade slider in the transport.",
        target: '[data-mc-tour="fade-slider"]',
        placement: "top",
      },
    ],
  },

  {
    id: "grading-shuffle",
    title: "Grading & weighted shuffle",
    blurb: "Grade your favorites, then let weighted shuffle do the picking.",
    durationSeconds: 30,
    steps: [
      {
        title: "Grade what you love",
        body: "Click any grade letter under the orb on the right. S→A→B→C→D→F. Grading is saved instantly and follows the track across sessions.",
        target: '[data-mc-tour="grade-row"]',
        placement: "left",
      },
      {
        title: "Or cycle from the transport",
        body: "The grade pills next to the bottom-left track tile are clickable too — one tap cycles through S→A→B→C→D→F→none.",
        target: '[data-mc-tour="grade-pills"]',
        placement: "top",
      },
      {
        title: "Shuffle weighted",
        body: "On any category, click Shuffle weighted. S-tier tracks play 6× more often, A-tier 4×, B-tier 2×, and F-tier never. The Up Next queue fills with what's coming.",
        target: '[data-mc-tour="shuffle-button"]',
        placement: "bottom",
      },
    ],
  },

  {
    id: "scenes",
    title: "Scenes",
    blurb: "Snapshot category, queue, fade, and volume in one tap.",
    durationSeconds: 45,
    steps: [
      {
        title: "What's a scene?",
        body: "A scene is a frozen snapshot of the table mood — which category is active, what's queued, how long the fade is, and the master volume. One tap brings it all back.",
        placement: "center",
      },
      {
        title: "The Scenes tab",
        body: "Click Scenes in the top header. Saved scenes appear as a gradient card per category with the right glyph, accent stripes, and a play button.",
        target: '[data-mc-tour="scenes-tab"]',
        placement: "bottom",
      },
      {
        title: "Save current",
        body: "From the Scenes view, click Save current scene. Name it whatever you call the moment — \"Final Boss · Dragon\", \"Tavern Negotiation\". That's it.",
        placement: "center",
      },
      {
        title: "Restore in one click",
        body: "Later, click any scene card. Major Ambience switches to the right category, restores fade and volume, replays the saved queue. The card glows while it's the active scene.",
        placement: "center",
      },
    ],
  },

  {
    id: "soundboard",
    title: "Soundboard",
    blurb: "Pin tracks to pads, fire them alongside the music.",
    durationSeconds: 30,
    steps: [
      {
        title: "Three pages, eight pads",
        body: "The Soundboard tab gives you 24 slots across pages A, B, and C. Use it for jump-scares, ambient loops, or anything you fire over the main music.",
        target: '[data-mc-tour="soundboard-tab"]',
        placement: "bottom",
      },
      {
        title: "Two ways to pin",
        body: "Right-click any track in the Library to pin it to a slot from a popup menu. Or drag a row directly onto a pad. Either way, the pad lights up in the track's category color.",
        target: '[data-mc-tour="track-table"]',
        placement: "top",
      },
      {
        title: "Per-pad loop and volume",
        body: "Each pad has its own loop toggle (left) and volume slider. Click the pad to fire; click again to stop. The ✕ clears the slot.",
        placement: "center",
      },
    ],
  },

  {
    id: "sfx-ducking",
    title: "SFX & ducking",
    blurb: "Soundboard fires duck the music automatically.",
    durationSeconds: 45,
    steps: [
      {
        title: "Music dips, SFX cuts through",
        body: "The moment you fire a soundboard pad, the music bus ducks so the SFX sits on top. When the last pad ends, music ramps back up.",
        placement: "center",
      },
      {
        title: "Duck slider",
        body: "Control how deep the dip goes. Cyan duck slider in the transport — 0% is no ducking, 100% silences music while pads play. Default is 40%.",
        target: '[data-mc-tour="duck-slider"]',
        placement: "top",
      },
      {
        title: "Multiple pads stack",
        body: "Fire two pads at once and music stays ducked until both finish. The duck ramp is 150ms down, 400ms back up — calibrated to feel natural at the table.",
        placement: "center",
      },
    ],
  },
];
