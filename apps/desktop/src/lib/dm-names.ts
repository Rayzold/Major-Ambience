// Race-aware NPC name data for the Name Generator.
// Lists are intentionally modest (~25 each) to avoid bloating the bundle;
// rolling repeatedly will recombine first + last for variety.

export type Race = "any" | "human" | "elf" | "dwarf" | "orc" | "halfling";

type RaceData = {
  first: readonly string[];
  last: readonly string[];
};

const HUMAN: RaceData = {
  first: [
    "Aldric", "Branwen", "Cassian", "Dietrich", "Elara", "Falken",
    "Gwyneth", "Halvard", "Isolde", "Jorah", "Kestrel", "Lyssa",
    "Magnus", "Niamh", "Osric", "Petra", "Quill", "Roisin",
    "Soren", "Talia", "Ulric", "Vesper", "Wynn", "Yara", "Zephyr",
  ],
  last: [
    "Ashbrook", "Blackwell", "Carver", "Dunmore", "Eastwood", "Fallowmere",
    "Grimwald", "Holloway", "Ironhill", "Kingsley", "Larkmoor", "Mosswood",
    "Nightingale", "Orin", "Pemberton", "Quartermain", "Rookwood", "Stormhaven",
    "Thatcher", "Underhill", "Vance", "Whitlock", "Yorke",
  ],
};

const ELF: RaceData = {
  first: [
    "Aelar", "Beiro", "Carric", "Dayereth", "Enna", "Galinndan",
    "Hadarai", "Immeral", "Ielenia", "Korfel", "Lia", "Mindartis",
    "Naivara", "Paelias", "Quarion", "Riardon", "Shanairra", "Thamior",
    "Vanuath", "Xanaphia", "Yhanell",
  ],
  last: [
    "Amakiir", "Galanodel", "Holimion", "Liadon", "Meliamne", "Naïlo",
    "Siannodel", "Xiloscient", "Aloro", "Caerdonel", "Eathalena", "Floshem",
    "Iathrana", "Ofandrus", "Tessarael", "Yaeldrin",
  ],
};

const DWARF: RaceData = {
  first: [
    "Adrik", "Baern", "Darrak", "Eberk", "Fargrim", "Gardain",
    "Harbek", "Kildrak", "Morgran", "Orsik", "Rurik", "Taklinn",
    "Thoradin", "Ulfgar", "Veit", "Amber", "Bardryn", "Dagnal",
    "Eldeth", "Gunnloda", "Helja", "Kathra", "Mardred", "Sannl",
  ],
  last: [
    "Balderk", "Battlehammer", "Brawnanvil", "Dankil", "Fireforge", "Frostbeard",
    "Gorunn", "Holderhek", "Ironfist", "Loderr", "Lutgehr", "Rumnaheim",
    "Strakeln", "Torunn", "Ungart",
  ],
};

const ORC: RaceData = {
  first: [
    "Bagrak", "Dench", "Feng", "Gell", "Henk", "Holg",
    "Imsh", "Keth", "Krusk", "Mhurren", "Mugrash", "Nesha",
    "Ronk", "Shump", "Thokk", "Vola", "Volen", "Yevelda",
    "Baggi", "Emen", "Engong", "Kansif", "Myev", "Neega", "Sutha",
  ],
  last: [
    "of the Bloodied Tusk", "Skullsplitter", "Boneripper", "Ironjaw", "Stormfang",
    "Bloodfist", "Doomhammer", "Warhowl", "Ashfang", "Grimscar", "Wolfborn",
    "of Clan Karash", "of Clan Mor",
  ],
};

const HALFLING: RaceData = {
  first: [
    "Alton", "Beau", "Cade", "Eldon", "Garret", "Lyle",
    "Milo", "Osborn", "Roscoe", "Wellby", "Andry", "Bree",
    "Callie", "Cora", "Euphemia", "Jillian", "Kithri", "Lavinia",
    "Lidda", "Merla", "Nedda", "Paela", "Portia", "Seraphina", "Vani",
  ],
  last: [
    "Brushgather", "Goodbarrel", "Greenbottle", "High-hill", "Hilltopple", "Leagallow",
    "Tealeaf", "Thorngage", "Tosscobble", "Underbough", "Riverwise", "Quickfoot",
  ],
};

const TABLES: Record<Exclude<Race, "any">, RaceData> = {
  human: HUMAN,
  elf: ELF,
  dwarf: DWARF,
  orc: ORC,
  halfling: HALFLING,
};

const RACE_KEYS = Object.keys(TABLES) as Array<Exclude<Race, "any">>;

export function rollName(race: Race): { first: string; last: string; race: Exclude<Race, "any"> } {
  const actual = race === "any" ? RACE_KEYS[Math.floor(Math.random() * RACE_KEYS.length)]! : race;
  const data = TABLES[actual];
  const first = data.first[Math.floor(Math.random() * data.first.length)] ?? "Unknown";
  const last = data.last[Math.floor(Math.random() * data.last.length)] ?? "";
  return { first, last, race: actual };
}

export const RACE_OPTIONS: Array<{ id: Race; label: string }> = [
  { id: "any", label: "Any" },
  { id: "human", label: "Human" },
  { id: "elf", label: "Elf" },
  { id: "dwarf", label: "Dwarf" },
  { id: "orc", label: "Orc" },
  { id: "halfling", label: "Halfling" },
];
