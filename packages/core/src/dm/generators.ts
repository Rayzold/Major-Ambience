// Standalone roll-table generators for the DM Toolkit.
//
// Each generator is a list of "facets"; rolling picks one option per facet.
// Single-result generators (loot, weather, crit, fumble, wild magic) have
// one facet; composite ones (NPC, tavern, town, trap, quest) have several
// and read as a little stat block. Pure data — no audio, no persistence.

export type GeneratorFacet = {
  /** Shown beside the rolled value, e.g. "Trait", "Drink". Empty for single-facet. */
  label: string;
  options: readonly string[];
};

export type Generator = {
  id: string;
  name: string;
  /** One-line description shown under the selector. */
  blurb: string;
  facets: readonly GeneratorFacet[];
};

export type GeneratorResultPart = { label: string; value: string };
export type GeneratorResult = {
  generatorId: string;
  generatorName: string;
  parts: GeneratorResultPart[];
  at: number;
};

const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!;

/** Roll one option per facet. */
export function rollGenerator(g: Generator): GeneratorResult {
  return {
    generatorId: g.id,
    generatorName: g.name,
    parts: g.facets.map((f) => ({ label: f.label, value: pick(f.options) })),
    at: Date.now(),
  };
}

/** Flatten a result to a single copyable line. */
export function resultToText(r: GeneratorResult): string {
  if (r.parts.length === 1) return r.parts[0]!.value;
  return r.parts.map((p) => `${p.label}: ${p.value}`).join(" · ");
}

export const GENERATORS: readonly Generator[] = [
  {
    id: "loot",
    name: "Loot",
    blurb: "A quick find — pocket treasure and minor magic.",
    facets: [
      {
        label: "",
        options: [
          "a pouch of 2d6 × 10 gold",
          "a silver locket (25 gp)",
          "a +1 dagger, plain but keen",
          "a potion of healing",
          "a scroll of a random 1st-level spell",
          "a finely-made traveling cloak (15 gp)",
          "an uncut gemstone (50 gp)",
          "an old map marking a nearby ruin",
          "a well-kept set of thieves' tools",
          "a vial of antitoxin",
          "a tarnished holy symbol of a forgotten god",
          "a masterwork weapon of the wielder's choice",
          "a heavy bag of 3d6 silver",
          "a jeweled ring (75 gp)",
          "a brass spyglass, slightly scratched",
          "a healer's kit, half used",
          "a quiver with 12 fine arrows",
          "a curious brass key with no obvious lock",
          "a single page torn from a spellbook",
          "a sealed letter bearing a noble's crest",
        ],
      },
    ],
  },
  {
    id: "npc",
    name: "NPC",
    blurb: "Flesh out a face on the fly — trait, flaw, ideal, voice.",
    facets: [
      {
        label: "Trait",
        options: [
          "blunt to a fault",
          "endlessly cheerful",
          "nervously watchful",
          "slow and deliberate",
          "quick-witted",
          "guarded and quiet",
          "loudly boastful",
          "unexpectedly kind",
          "coldly calculating",
          "easily distracted",
          "fiercely loyal",
          "perpetually exhausted",
        ],
      },
      {
        label: "Flaw",
        options: [
          "drinks far too much",
          "owes a dangerous debt",
          "cannot keep a secret",
          "greedy past reason",
          "a coward when it counts",
          "holds every grudge",
          "deeply superstitious",
          "vain about appearances",
          "addicted to gambling",
          "haunted by a past failure",
        ],
      },
      {
        label: "Ideal",
        options: [
          "freedom above all",
          "the law must hold",
          "family comes first",
          "wealth is the only power",
          "knowledge is sacred",
          "the strong protect the weak",
          "tradition guides us",
          "change is overdue",
        ],
      },
      {
        label: "Voice",
        options: [
          "a raspy whisper",
          "booming and slow",
          "clipped and formal",
          "a sing-song lilt",
          "a constant nervous laugh",
          "speaks only in proverbs",
          "long, uneasy pauses",
          "never finishes sentences",
          "exhaustingly polite",
          "gruff monosyllables",
        ],
      },
    ],
  },
  {
    id: "tavern",
    name: "Tavern",
    blurb: "Name, drink, a patron worth noticing, and a rumor.",
    facets: [
      {
        label: "Name",
        options: [
          "The Gilded Boar",
          "The Crooked Lantern",
          "The Salty Mermaid",
          "The Sleeping Dragon",
          "The Broken Wheel",
          "The Black Stag",
          "The Rusty Anchor",
          "The Laughing Maiden",
          "The Three Crowns",
          "The Hangman's Rest",
        ],
      },
      {
        label: "Drink",
        options: [
          "spiced honey mead",
          "bitter black ale",
          "cloudy apple cider",
          "dwarven firewine",
          "watered-down house wine",
          "mulled cinnamon brandy",
          "a suspicious green spirit",
          "cold pine tea",
        ],
      },
      {
        label: "Patron",
        options: [
          "a one-eyed mercenary nursing a drink",
          "an off-duty guard, already drunk",
          "a hooded stranger in the far corner",
          "a merchant loudly bragging of profits",
          "a quiet bard tuning a battered lute",
          "twin halflings running a dice game",
          "a retired adventurer telling tall tales",
          "a nervous courier watching the door",
        ],
      },
      {
        label: "Rumor",
        options: [
          "the old mill is haunted again",
          "the baron hasn't been seen in weeks",
          "bandits hit a caravan on the north road",
          "there's a reward posted for a missing child",
          "something's been killing livestock at night",
          "a noble's signet ring was stolen at the festival",
          "the well water's tasted of iron lately",
          "strange lights drift over the marsh after dark",
        ],
      },
    ],
  },
  {
    id: "settlement",
    name: "Settlement",
    blurb: "Size, a notable feature, and the mood on the streets.",
    facets: [
      {
        label: "Size",
        options: [
          "a lonely hamlet (~40 souls)",
          "a farming village (~200)",
          "a market town (~1,500)",
          "a walled town (~4,000)",
          "a small city (~9,000)",
        ],
      },
      {
        label: "Feature",
        options: [
          "an oversized, half-finished temple",
          "a crumbling old keep on the hill",
          "a famous weekly market",
          "a notorious fighting pit",
          "a sacred grove the locals won't enter",
          "a deep mineshaft, recently reopened",
          "a toll bridge over a fast river",
          "a shrine to a god no one remembers",
        ],
      },
      {
        label: "Mood",
        options: [
          "tense — soldiers on every corner",
          "festive — a holiday is underway",
          "grieving — a recent tragedy",
          "suspicious of every outsider",
          "desperate — the harvest failed",
          "prosperous and welcoming",
          "uneasy — something is clearly wrong",
          "sleepy and indifferent",
        ],
      },
    ],
  },
  {
    id: "weather",
    name: "Weather",
    blurb: "Current conditions for the road or the wilds.",
    facets: [
      {
        label: "",
        options: [
          "clear and cold",
          "overcast, still air",
          "light rain under gray skies",
          "a heavy, drenching downpour",
          "thick morning fog, slow to lift",
          "a biting wind out of the north",
          "unseasonably warm and humid",
          "fitful snow flurries",
          "distant thunder, a storm building",
          "blistering, shimmering heat",
          "a cold drizzle and ankle-deep mud",
          "crisp, bright, and windless",
        ],
      },
    ],
  },
  {
    id: "crit",
    name: "Critical hit",
    blurb: "Flavor a natural 20 with a little extra bite.",
    facets: [
      {
        label: "",
        options: [
          "a clean strike — maximum damage",
          "you find a gap in the armor (+1d6)",
          "a staggering blow — they lose their next reaction",
          "a brutal hit — the target is knocked prone",
          "you sever a strap — their shield clatters away",
          "blood in their eyes — disadvantage on their next attack",
          "a bone-cracking blow — their speed is halved until their turn",
          "a showpiece strike — allies have advantage against them next round",
        ],
      },
    ],
  },
  {
    id: "fumble",
    name: "Fumble",
    blurb: "Make a natural 1 memorable (use sparingly).",
    facets: [
      {
        label: "",
        options: [
          "your weapon slips — you're disarmed (it lands 5 ft away)",
          "you overextend and fall prone",
          "you clip the nearest ally for half your damage",
          "your bowstring snaps — a turn to restring",
          "you lose your footing — no movement next turn",
          "your weapon lodges in something — an action to free it",
          "you misjudge wildly — the enemy gets a free swing",
          "your grip fails — you drop a held item",
        ],
      },
    ],
  },
  {
    id: "wildmagic",
    name: "Wild magic",
    blurb: "A chaotic surge bubbles up.",
    facets: [
      {
        label: "",
        options: [
          "your skin turns vivid blue for 1 minute",
          "a harmless burst of colored sparks",
          "you cast fireball centered on yourself",
          "flowers bloom in a 10-ft radius around you",
          "you turn invisible until you attack or cast",
          "you regain your lowest-level expended spell slot",
          "everyone within 30 ft hears distant bells",
          "you shrink one size category for 1 minute",
          "a spectral cat trails you for the next hour",
          "you can only speak in rhyme for 1 minute",
          "your hair (or equivalent) changes color",
          "a harmless minor creature appears beside you, then vanishes",
        ],
      },
    ],
  },
  {
    id: "trap",
    name: "Trap",
    blurb: "Type, the save it calls for, and what it does.",
    facets: [
      {
        label: "Type",
        options: [
          "a pressure plate",
          "a near-invisible tripwire",
          "a concealed pit",
          "a dart-firing wall",
          "a swinging blade",
          "a collapsing ceiling",
          "a poison needle in the lock",
          "a glowing rune ward",
          "a net snare",
          "a chamber that floods fast",
        ],
      },
      {
        label: "Save",
        options: [
          "Dex DC 12",
          "Dex DC 15",
          "Con DC 13",
          "Wis DC 14",
          "Dex DC 17",
          "Str DC 13",
        ],
      },
      {
        label: "Effect",
        options: [
          "2d6 piercing",
          "2d6 bludgeoning and restrained",
          "1d6 plus poisoned for 1 minute",
          "3d6 bludgeoning, half on a save",
          "no damage — but it alerts everything nearby",
          "4d6 fire in a 15-ft cone",
          "2d10 slashing as the blade sweeps",
          "magical sleep on a failed save",
        ],
      },
    ],
  },
  {
    id: "quest",
    name: "Quest hook",
    blurb: "Premise, obstacle, reward, and the catch.",
    facets: [
      {
        label: "Premise",
        options: [
          "a merchant needs goods escorted",
          "a child has gone missing",
          "an heirloom was stolen",
          "a ruin has just been uncovered",
          "a creature is terrorizing the area",
          "a noble wants a discreet favor",
          "the village's water has gone foul",
          "a rival is undercutting an honest trade",
        ],
      },
      {
        label: "Obstacle",
        options: [
          "a rival party is already on the job",
          "the road is watched by bandits",
          "the trail leads into hostile territory",
          "the only witness has vanished",
          "a powerful local forbids any meddling",
          "time is running out fast",
          "the client is lying about something",
          "a storm has cut off the route",
        ],
      },
      {
        label: "Reward",
        options: [
          "a heavy purse of gold",
          "a minor magic item",
          "a powerful favor, owed",
          "the deed to a property",
          "rare and dangerous information",
          "a noble's gratitude and connections",
          "first claim on whatever's found",
          "a fine mount or vehicle",
        ],
      },
      {
        label: "Catch",
        options: [
          "the reward is cursed",
          "the client means to double-cross you",
          "the missing person doesn't want to be found",
          "the 'monster' is actually a victim",
          "doing this angers a powerful faction",
          "the heirloom is a forgery",
          "an old enemy is tangled up in it",
          "succeeding creates a far worse problem",
        ],
      },
    ],
  },
];
