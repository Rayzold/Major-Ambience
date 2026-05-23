// Race-aware NPC name data for the Name Generator.
//
// Lists are ~40-60 names per slot per race. That's enough to make repeats
// rare within a session (a typical session generates 20-30 names);
// `rollName()` additionally takes recent-history awareness via
// `rollNameAvoiding()` below so back-to-back rolls don't collide on the
// same full name even when the random draw would.

export type Race = "any" | "human" | "elf" | "dwarf" | "orc" | "halfling";

type RaceData = {
  first: readonly string[];
  last: readonly string[];
};

const HUMAN: RaceData = {
  first: [
    "Aldric", "Alaric", "Anselm", "Branwen", "Brennan", "Brigid",
    "Cassian", "Cedric", "Clement", "Dietrich", "Damaris", "Doran",
    "Elara", "Edric", "Esme", "Falken", "Fenrik", "Felicity",
    "Gwyneth", "Gareth", "Greta", "Halvard", "Hadrian", "Helena",
    "Isolde", "Ivor", "Idris", "Jorah", "Jerrick", "Juniper",
    "Kestrel", "Kael", "Katarin", "Lyssa", "Lothar", "Lenore",
    "Magnus", "Mireille", "Marek", "Niamh", "Nathaniel", "Nyx",
    "Osric", "Odette", "Orin", "Petra", "Percival", "Phaedra",
    "Quill", "Quinn", "Roisin", "Rowan", "Rhett", "Soren",
    "Sable", "Sigrid", "Talia", "Tobias", "Thea", "Ulric",
    "Uriah", "Una", "Vesper", "Varian", "Vita", "Wynn",
    "Wilhelm", "Winifred", "Yara", "Yvain", "Zephyr", "Zara",
  ],
  last: [
    "Ashbrook", "Ashford", "Beaumont", "Blackwell", "Briar", "Carver",
    "Caldwell", "Crowley", "Drake", "Dunmore", "Eastwood", "Eddington",
    "Fallowmere", "Fairweather", "Greaves", "Grimwald", "Hartley",
    "Holloway", "Ironhill", "Kerrigan", "Kingsley", "Larkmoor",
    "Linwood", "Marsh", "Moreau", "Mosswood", "Nightingale",
    "Northcott", "Orin", "Pemberton", "Pennycross", "Quartermain",
    "Ravensworth", "Redgrave", "Rookwood", "Sterling", "Stormhaven",
    "Sutter", "Thatcher", "Thorne", "Underhill", "Vance",
    "Vanholt", "Wakefield", "Whitlock", "Wycliffe", "Yorke",
    "Ashgrove", "Bramble", "Caraway", "Demaine", "Eldritch",
    "Fenwick", "Greycastle", "Hollanby", "Maddox", "Selwyn",
    "Tarleton", "Westcliff", "Yarrow",
  ],
};

const ELF: RaceData = {
  first: [
    "Aelar", "Adran", "Aramil", "Beiro", "Berrian", "Caelynn",
    "Carric", "Dayereth", "Dryndren", "Enna", "Erevan", "Faelar",
    "Galinndan", "Hadarai", "Heian", "Himo", "Immeral", "Ielenia",
    "Iliphar", "Korfel", "Lael", "Laucian", "Lia", "Mindartis",
    "Meriele", "Miqael", "Naivara", "Nailo", "Paelias", "Quelenna",
    "Quarion", "Riardon", "Rolen", "Shanairra", "Soveliss", "Suhnaal",
    "Thamior", "Tharivol", "Theren", "Theriatis", "Uthemar", "Vadania",
    "Valanthe", "Vanuath", "Variel", "Xanaphia", "Xanthor", "Yhanell",
    "Ydraad", "Aerin", "Aramil", "Carnen", "Eliandra", "Fenian",
    "Galadriel", "Halaster", "Iaeven", "Jaerith", "Kethariel",
    "Liryn", "Maerith",
  ],
  last: [
    "Amakiir", "Amastacia", "Aloro", "Caerdonel", "Casilltenirra",
    "Eathalena", "Floshem", "Galanodel", "Goltorah", "Holimion",
    "Horineth", "Iathrana", "Ilphelkiir", "Liadon", "Meliamne",
    "Moonwhisper", "Naïlo", "Nordeladin", "Ofandrus", "Othronus",
    "Siannodel", "Silmeril", "Suithrasas", "Sylvaranth", "Tessarael",
    "Thelaerstil", "Withra", "Xiloscient", "Yaeldrin", "Yllaramoor",
    "Aelorothi", "Bryndoonal", "Caladrel", "Duirsar", "Eveningfall",
    "Floramaris", "Galadhrim", "Helderyn", "Ilithyiir", "Kyrith",
    "Leafsong", "Moonshadow", "Nightbreeze",
  ],
};

const DWARF: RaceData = {
  first: [
    "Adrik", "Alberich", "Baern", "Barendd", "Brottor", "Bruenor",
    "Dain", "Darrak", "Delg", "Eberk", "Einkil", "Elaim",
    "Erias", "Fargrim", "Flint", "Gardain", "Gilthur", "Gimgen",
    "Gorat", "Harbek", "Helek", "Kildrak", "Kilvar", "Morgran",
    "Morkral", "Orsik", "Oskar", "Rangrim", "Rurik", "Taklinn",
    "Tordek", "Thoradin", "Thorin", "Tordek", "Ulfgar", "Vondal",
    "Veit", "Amber", "Artin", "Audhild", "Bardryn", "Dagnal",
    "Diesa", "Eldeth", "Falkrunn", "Finellen", "Gunnloda", "Gurdis",
    "Helja", "Hlin", "Kathra", "Kristryd", "Ilde", "Liftrasa",
    "Mardred", "Riswynn", "Sannl", "Torgga", "Vistra",
  ],
  last: [
    "Balderk", "Battlehammer", "Brawnanvil", "Burnharrow", "Caebrek",
    "Dankil", "Daerdahk", "Eaglecleft", "Fireforge", "Foamtankard",
    "Frostbeard", "Gorunn", "Goldfinder", "Holderhek", "Ironfist",
    "Loderr", "Lutgehr", "Maevadeen", "Rumnaheim", "Strakeln",
    "Torevir", "Torunn", "Ungart", "Anvilfist", "Blackbeard",
    "Coalsmith", "Deepforge", "Emberheart", "Foehammer", "Granitejaw",
    "Hammerhand", "Ironhelm", "Mountainshoulder", "Oakencask",
    "Quartzbeard", "Rockseeker", "Stoneborn", "Thunderbrew",
    "Warbringer",
  ],
};

const ORC: RaceData = {
  first: [
    "Argrak", "Bagrak", "Bork", "Brak", "Brughor", "Dench",
    "Dorg", "Druvor", "Feng", "Gantar", "Gell", "Ghuriak",
    "Grom", "Grukruk", "Henk", "Holg", "Imsh", "Karash",
    "Keth", "Krusk", "Mhurren", "Mugrash", "Nesha", "Omog",
    "Ozren", "Rendar", "Ronk", "Shump", "Thokk", "Thurg",
    "Ugnur", "Ulgrim", "Vola", "Volen", "Yevelda", "Zoraz",
    "Baggi", "Bendoo", "Emen", "Engong", "Fistula", "Gomph",
    "Greeba", "Kansif", "Mhuri", "Myev", "Neega", "Ovak",
    "Ownka", "Sutha", "Vola", "Yevelda",
  ],
  last: [
    "Skullsplitter", "Boneripper", "Ironjaw", "Stormfang",
    "Bloodfist", "Doomhammer", "Warhowl", "Ashfang", "Grimscar",
    "Wolfborn", "of the Bloodied Tusk", "of Clan Karash",
    "of Clan Mor", "Steelmaw", "Blackeye", "Bonebreaker",
    "Skullcrusher", "Heart-eater", "Ironclaw", "Manslayer",
    "Spine-render", "Rage-tooth", "Stormbringer", "Thundergut",
    "Wolfslayer", "of the Black Spear", "of the Burning Eye",
    "of the Crimson Banner", "of the Ravaged Plain",
    "Foe-cleaver", "Gut-render", "Soul-eater",
  ],
};

const HALFLING: RaceData = {
  first: [
    "Alton", "Ander", "Bertram", "Beau", "Bilbo", "Cade",
    "Callum", "Corrin", "Dannad", "Danniel", "Eddie", "Eldon",
    "Errich", "Finnan", "Garret", "Garth", "Lindal", "Lyle",
    "Merric", "Milo", "Mungo", "Nebin", "Osborn", "Ostran",
    "Oswen", "Perrin", "Poppy", "Reed", "Roscoe", "Sam",
    "Shardon", "Tye", "Wellby", "Andry", "Astrid", "Bree",
    "Callie", "Cora", "Euphemia", "Jasmine", "Jillian", "Kithri",
    "Lavinia", "Lidda", "Merla", "Nedda", "Paela", "Pearl",
    "Petunia", "Portia", "Robbie", "Rose", "Saral", "Seraphina",
    "Shaena", "Trym", "Vani", "Willow",
  ],
  last: [
    "Brushgather", "Bramble", "Bramblefoot", "Cherrycheeks",
    "Goodbarrel", "Greenbottle", "Greenshield", "Hilltopple",
    "Hogcollar", "Honeypot", "Hopeswallow", "Leagallow",
    "Littlefoot", "Meadowsong", "Mosshollow", "Nimblefingers",
    "Quickfoot", "Riverwise", "Roseroot", "Shadowquick",
    "Silvereye", "Smallburrow", "Sweetgrass", "Tealeaf",
    "Tenpenny", "Thistlewood", "Thorngage", "Tosscobble",
    "Underbough", "Warmhearth", "Wildcloak",
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

export type RolledNameResult = {
  first: string;
  last: string;
  race: Exclude<Race, "any">;
};

/**
 * Roll a single name. No history awareness — for tests and callers
 * that don't track recent rolls.
 */
export function rollName(race: Race): RolledNameResult {
  const actual =
    race === "any" ? RACE_KEYS[Math.floor(Math.random() * RACE_KEYS.length)]! : race;
  const data = TABLES[actual];
  const first = data.first[Math.floor(Math.random() * data.first.length)] ?? "Unknown";
  const last = data.last[Math.floor(Math.random() * data.last.length)] ?? "";
  return { first, last, race: actual };
}

/**
 * Roll a name, avoiding any full name in `recent`. Tries up to
 * `maxAttempts` rolls; if every attempt collides (unlikely given list
 * sizes), returns the last one rolled. This makes a session of 20-30
 * rolls feel actually varied — `Math.random()` alone is happy to draw
 * the same name twice in a row.
 */
export function rollNameAvoiding(
  race: Race,
  recent: ReadonlySet<string>,
  maxAttempts = 20,
): RolledNameResult {
  let last: RolledNameResult = rollName(race);
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = rollName(race);
    const fullName = `${candidate.first} ${candidate.last}`.trim();
    if (!recent.has(fullName)) return candidate;
    last = candidate;
  }
  return last;
}

export const RACE_OPTIONS: Array<{ id: Race; label: string }> = [
  { id: "any", label: "Any" },
  { id: "human", label: "Human" },
  { id: "elf", label: "Elf" },
  { id: "dwarf", label: "Dwarf" },
  { id: "orc", label: "Orc" },
  { id: "halfling", label: "Halfling" },
];
