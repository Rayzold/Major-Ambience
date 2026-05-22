// Pure auto-categorization for imported audio files.
// Source of truth: docs/CATEGORIZATION_GUIDE.md.
//
//   categorize("Mighty Seas.mp3", "The Grand Fleet")
//     -> { category: "combat", subcategory: "battle" }

import type { CategoryId, CombatSubcategory } from "./types.js";

export type CategorizeResult = {
  category: CategoryId;
  subcategory?: CombatSubcategory | string;
};

// ---------- Keyword tables (lowercase, word-ish) ----------
// Order within a category is informational; matching is set membership.
// Cross-category priority is enforced by `categorize()` below.

const COMBAT_BOSS = [
  "apocalypse",
  "boss",
  "davy jones",
  "brut",
  "mark of",
  "legendary foe",
  "dawn of apocalypse",
];

const COMBAT_SKIRMISH = ["skirmish", "encounter", "brawl"];

const COMBAT_BATTLE = [
  "battle",
  "battle lines",
  "fight",
  "combat",
  "army",
  "musket",
  "forces",
  "charge",
  "mighty seas",
  "man the battlements",
  "undefeated army",
  "special forces",
  "black powder",
  "claiming glory",
  "molten steel",
  "rise against",
  "prepare for battle",
];

const HORROR = [
  "horror",
  "vampire",
  "nightmare",
  "crawl",
  "stair",
  "imagination",
  "grave",
  "haunt",
  "scream",
  "dark tower",
  "dark horizon",
  "behind the door",
  "night crawler",
  "alienhive",
  "darkambience",
  "swarmtransform",
];

const TENSION = [
  "tension",
  "ominous",
  "creep",
  "doubt",
  "dread",
  "chase",
  "closing in",
  "caution",
  "anticipating",
  "destruction",
  "no future",
  "distressed",
  "unfinished business",
  "out of control",
  "magic revue",
  "circle tightens",
  "oracle of delphi",
  "revelations",
  "light into darkness",
  "pirates hidden lair",
  "clock's ticking",
  "clocks ticking",
  "sparse landscape",
  "subtle warning",
  "grim prospects",
  "storm watch",
  "walk the walk",
  "precarious",
  "faint of heart",
  "city chase",
  "approach with caution",
  "captious",
  "dragma",
];

const TAVERN = [
  "tavern",
  "celtic",
  "folk",
  "jig",
  "reel",
  "dance",
  "whirl",
  "carol",
  "planxties",
  "kick up heels",
  "aromatic courtyard",
  "jewel bright",
  "enchanted connection",
  "boar's head",
  "boars head",
  "good king wenceslas",
  "scotland the brave",
  "minuet",
  "march of wooden soldiers",
  "musical snuff box",
  "opening presents",
  "holiday wish",
  "dance of toy flutes",
];

const REST = [
  "rest",
  "sacred",
  "hymn",
  "ave maria",
  "grace",
  "praise",
  "benediction",
  "gymnopedie",
  "alleluia",
  "gloria",
  "crown him",
  "joyful joyful",
  "all hail",
  "spiritual retreat",
  "wer nur",
  "by the fireside",
  "pastorale",
  "wie schon",
  "wie schön",
  "dreams & meditation",
  "amazing grace",
  "praise my soul",
  "anthem to the fallen",
  "requesting benediction",
  "faith",
  "june bacarolle",
  "look up",
  "beethoven quartet",
  "dolly is ill",
];

const EXPLORATION = [
  "exploration",
  "journey",
  "adventure",
  "quest",
  "voyage",
  "sails",
  "sails set",
  "spinning a legendary tale",
  "promise",
  "positioning",
  "provoking",
  "big adventure",
  "understanding",
  "mountain festival",
  "chill africa",
  "valinor",
  "breaking in",
  "royal fireworks",
  "grand affair",
  "game intro overture",
  "william tell pastoral",
  "silk trader",
  "peer gynt",
  "les preludes",
  "les préludes",
  "schubert symphony 5",
  "four seasons autumn",
  "four seasons spring",
];

const AMBIENT = [
  "ambient",
  "sad",
  "sorrow",
  "grief",
  "tragedy",
  "memorial",
  "farewell",
  "melancholy",
  "lament",
  "dream",
  "crystal",
  "healing",
  "peaceful",
  "gentle",
  "arabesque",
  "casta diva",
  "swan lake",
  "may nights",
  "four seasons winter",
  "vivaldi winter",
  "coastal waters",
  "distant perspective",
  "vocal dreams",
  "ambient dreams",
  "belle view",
  "ice & crystal",
  "ice and crystal",
  "healing spectrum",
  "dream sequence",
  "inlaid pearl",
  "off the grid",
  "lucky win",
  "muscle car",
  "quiet resilience",
];

const SCIFI = [
  "alien",
  "space",
  "robot",
  "sci-fi",
  "scifi",
  "outer",
  "computer",
  "drone",
  "outer space",
  "outer limits",
  "alien planet",
  "system status",
];

const VOICES = ["voice", "narration", "monster sound"];

// Non-musical SFX overrides. Match anywhere in name or pack folder.
const SFX_OVERRIDE = [
  "rain",
  "thunder",
  "wind",
  "snow",
  "weather",
  "lightning",
  "gunfire",
  "explosion",
  "weapon",
  "cannon",
  "crowd",
  "propeller",
  "torpedo",
  "weatherwounds",
];

// Specific composer/piece overrides. Each entry: matcher → result.
// Listed in priority order; first hit wins.
const COMPOSER_PIECES: Array<{ match: string[]; result: CategorizeResult }> = [
  { match: ["eine kleine nachtmusik", "mozart eine kleine"], result: { category: "tavern" } },
  { match: ["waltz of flowers", "waltz of the flowers", "nutcracker"], result: { category: "tavern" } },
  { match: ["tchaikovsky waltz of flowers"], result: { category: "tavern" } },
  { match: ["bach c minor", "bach d minor"], result: { category: "tension" } },
  { match: ["flight of bumblebee", "flight of the bumblebee"], result: { category: "tension" } },
  { match: ["mozart symphony 40", "symphony no 40", "symphony no. 40", "symphony 40 g minor"], result: { category: "tension" } },
  { match: ["schubert ave maria", "ave maria"], result: { category: "rest" } },
  { match: ["liszt les preludes", "liszt les préludes", "les preludes", "les préludes"], result: { category: "exploration" } },
  { match: ["grieg peer gynt", "peer gynt"], result: { category: "exploration" } },
  { match: ["four seasons spring", "four seasons - spring"], result: { category: "exploration" } },
  { match: ["four seasons autumn", "four seasons - autumn"], result: { category: "exploration" } },
  { match: ["four seasons winter", "four seasons - winter", "vivaldi winter"], result: { category: "ambient" } },
  { match: ["swan lake waltz", "tchaikovsky swan lake"], result: { category: "ambient" } },
  { match: ["bach pastorale", "pastorale bwv 590"], result: { category: "rest" } },
  { match: ["debussy arabesque", "arabesque"], result: { category: "ambient" } },
  { match: ["chopin"], result: { category: "ambient" } },
];

// ---------- Public API ----------

export function categorize(
  filename: string,
  parentFolderPath: string,
): CategorizeResult {
  const baseName = stripExtension(filename);
  const normalizedFile = stripShortVersionTag(baseName).toLowerCase();
  const segments = pathSegments(parentFolderPath).map((s) => s.toLowerCase());
  const immediate = segments.length > 0 ? segments[segments.length - 1]! : "";

  // Rule: "Alternates for - X" folders inherit X's category.
  const altMatch = immediate.match(/^alternates? for\s*-\s*(.+)$/);
  if (altMatch?.[1]) {
    return categorize(altMatch[1], "");
  }

  // 1. Track-name evidence is strongest — a specific track in a generic
  //    pack should win (e.g. "System Status OK" in "Ominous Overtures" →
  //    scifi, not tension).
  const fileMatch = match(normalizedFile);
  if (fileMatch) return fileMatch;

  // 2. Filename + immediate parent (the pack folder).
  const fileParent = `${normalizedFile} ${immediate}`.trim();
  if (fileParent !== normalizedFile) {
    const m = match(fileParent);
    if (m) return m;
  }

  // 3. Walk ancestor folders, closest first. A library laid out as
  //    MUSIC/Combat/Battle/pack/track.mp3 lets the grandparent "Battle"
  //    settle category + subcategory even when filename + pack are mute.
  for (let i = segments.length - 2; i >= 0; i--) {
    const seg = segments[i]!;
    // Combine with filename so a per-file boss/skirmish keyword can still
    // pick the subcategory inside an ancestor like "Combat".
    const combined = `${normalizedFile} ${seg}`.trim();
    const m = match(combined);
    if (m) return m;
  }

  // Default fallback. Exploration is the broadest "between scenes" bucket.
  return { category: "exploration" };
}

function match(text: string): CategorizeResult | undefined {
  // SFX override beats everything else — non-musical signals are unambiguous.
  if (containsAny(text, SFX_OVERRIDE)) {
    return { category: "sfx" };
  }

  // Voices (narration/monster sounds) wins early over Scifi mis-matches.
  if (containsAny(text, VOICES)) {
    return { category: "voices" };
  }

  // Specific composer/piece overrides.
  for (const entry of COMPOSER_PIECES) {
    if (containsAny(text, entry.match)) {
      return entry.result;
    }
  }

  // Combat with subcategory.
  if (containsAny(text, COMBAT_BOSS)) {
    return { category: "combat", subcategory: "boss" };
  }
  if (containsAny(text, COMBAT_SKIRMISH)) {
    return { category: "combat", subcategory: "skirmish" };
  }
  if (containsAny(text, COMBAT_BATTLE)) {
    return { category: "combat", subcategory: "battle" };
  }

  // Horror beats Tension when both could match (haunted houses score on both).
  if (containsAny(text, HORROR)) {
    return { category: "horror" };
  }
  if (containsAny(text, TENSION)) {
    return { category: "tension" };
  }

  if (containsAny(text, REST)) {
    return { category: "rest" };
  }
  if (containsAny(text, TAVERN)) {
    return { category: "tavern" };
  }
  if (containsAny(text, EXPLORATION)) {
    return { category: "exploration" };
  }
  if (containsAny(text, AMBIENT)) {
    return { category: "ambient" };
  }

  // Sci-Fi last: prefer Tension/Horror for robot-monster ambiguity (guide § Tips 5).
  if (containsAny(text, SCIFI)) {
    return { category: "scifi" };
  }

  return undefined;
}

// ---------- Internals ----------

function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return filename;
  return filename.slice(0, dot);
}

function stripShortVersionTag(name: string): string {
  // Strips "(15s)", " - 30s", "_60s", "(short)", "(loop)" etc.
  return name
    .replace(/[\s_\-(]*\b(?:15|30|45|60|90)\s?s\b[)\s_]*$/i, "")
    .replace(/[\s_\-(]*\b(?:short|loop|full)\b[)\s_]*$/i, "")
    .trim();
}

function pathSegments(p: string): string[] {
  if (!p) return [];
  return p
    .replace(/^[a-zA-Z]:[\\/]/, "") // strip Windows drive letter
    .split(/[\\/]+/)
    .filter((s) => s.length > 0);
}

function containsAny(haystack: string, needles: readonly string[]): boolean {
  for (const n of needles) {
    if (haystack.includes(n)) return true;
  }
  return false;
}
