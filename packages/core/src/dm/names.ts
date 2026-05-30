// Race-aware NPC name data for the Name Generator.
//
// Each race carries gendered first-name lists (`firstMale` / `firstFemale`)
// plus a shared `last`. Lists are ~25-40 names per slot per race — enough
// that repeats within a session stay rare; `rollNameAvoiding()` below also
// filters against recent history so back-to-back rolls don't collide on the
// same full name even when the random draw would.

export type Race = "any" | "human" | "elf" | "dwarf" | "orc" | "halfling";
export type Gender = "any" | "male" | "female";

type RaceData = {
  firstMale: readonly string[];
  firstFemale: readonly string[];
  last: readonly string[];
};

const HUMAN: RaceData = {
  firstMale: [
    "Aldric", "Alaric", "Anselm", "Brennan", "Cassian", "Cedric",
    "Clement", "Dietrich", "Doran", "Edric", "Falken", "Fenrik",
    "Gareth", "Halvard", "Hadrian", "Ivor", "Idris", "Jorah",
    "Jerrick", "Kael", "Lothar", "Magnus", "Marek", "Nathaniel",
    "Osric", "Orin", "Percival", "Quill", "Rhett", "Rowan",
    "Soren", "Tobias", "Ulric", "Uriah", "Varian", "Wilhelm",
    "Yvain", "Zephyr",
  ],
  firstFemale: [
    "Branwen", "Brigid", "Damaris", "Elara", "Esme", "Felicity",
    "Gwyneth", "Greta", "Helena", "Isolde", "Juniper", "Kestrel",
    "Katarin", "Lyssa", "Lenore", "Mireille", "Niamh", "Nyx",
    "Odette", "Petra", "Phaedra", "Quinn", "Roisin", "Sable",
    "Sigrid", "Talia", "Thea", "Una", "Vesper", "Vita",
    "Wynn", "Winifred", "Yara", "Zara",
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
  firstMale: [
    "Aelar", "Adran", "Aramil", "Beiro", "Berrian", "Carric",
    "Dayereth", "Dryndren", "Erevan", "Faelar", "Galinndan", "Hadarai",
    "Heian", "Himo", "Immeral", "Iliphar", "Korfel", "Laucian",
    "Mindartis", "Miqael", "Nailo", "Paelias", "Quarion", "Riardon",
    "Rolen", "Soveliss", "Suhnaal", "Thamior", "Tharivol", "Theren",
    "Theriatis", "Uthemar", "Vanuath", "Variel", "Xanthor", "Ydraad",
    "Aerin", "Carnen", "Fenian", "Halaster", "Jaerith", "Liryn",
  ],
  firstFemale: [
    "Caelynn", "Enna", "Ielenia", "Lael", "Lia", "Meriele",
    "Naivara", "Quelenna", "Shanairra", "Vadania", "Valanthe", "Xanaphia",
    "Yhanell", "Eliandra", "Galadriel", "Iaeven", "Kethariel", "Maerith",
    "Adrie", "Althaea", "Anastrianna", "Bethrynna", "Drusilia", "Felosial",
    "Jelenneth", "Keyleth", "Leshanna", "Mialee", "Quillathe", "Sariel",
    "Silaqui", "Thia",
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
  firstMale: [
    "Adrik", "Alberich", "Baern", "Barendd", "Brottor", "Bruenor",
    "Dain", "Darrak", "Delg", "Eberk", "Einkil", "Elaim",
    "Erias", "Fargrim", "Flint", "Gardain", "Gilthur", "Gimgen",
    "Gorat", "Harbek", "Helek", "Kildrak", "Kilvar", "Morgran",
    "Morkral", "Orsik", "Oskar", "Rangrim", "Rurik", "Taklinn",
    "Tordek", "Thoradin", "Thorin", "Ulfgar", "Vondal", "Veit",
    "Traubon", "Travok",
  ],
  firstFemale: [
    "Amber", "Artin", "Audhild", "Bardryn", "Dagnal", "Diesa",
    "Eldeth", "Falkrunn", "Finellen", "Gunnloda", "Gurdis", "Helja",
    "Hlin", "Kathra", "Kristryd", "Ilde", "Liftrasa", "Mardred",
    "Riswynn", "Sannl", "Torgga", "Vistra",
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
  firstMale: [
    "Argrak", "Bagrak", "Bork", "Brak", "Brughor", "Dench",
    "Dorg", "Druvor", "Feng", "Gantar", "Gell", "Ghuriak",
    "Grom", "Grukruk", "Henk", "Holg", "Imsh", "Karash",
    "Keth", "Krusk", "Mhurren", "Mugrash", "Omog", "Ozren",
    "Rendar", "Ronk", "Shump", "Thokk", "Thurg", "Ugnur",
    "Ulgrim", "Volen", "Zoraz", "Gomph",
  ],
  firstFemale: [
    "Nesha", "Vola", "Yevelda", "Baggi", "Bendoo", "Emen",
    "Engong", "Fistula", "Greeba", "Kansif", "Mhuri", "Myev",
    "Neega", "Ovak", "Ownka", "Sutha",
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
  firstMale: [
    "Alton", "Ander", "Bertram", "Beau", "Bilbo", "Cade",
    "Callum", "Corrin", "Dannad", "Danniel", "Eddie", "Eldon",
    "Errich", "Finnan", "Garret", "Garth", "Lindal", "Lyle",
    "Merric", "Milo", "Mungo", "Nebin", "Osborn", "Ostran",
    "Oswen", "Perrin", "Reed", "Roscoe", "Sam", "Shardon",
    "Tye", "Wellby", "Robbie",
  ],
  firstFemale: [
    "Andry", "Astrid", "Bree", "Callie", "Cora", "Euphemia",
    "Jasmine", "Jillian", "Kithri", "Lavinia", "Lidda", "Merla",
    "Nedda", "Paela", "Pearl", "Petunia", "Poppy", "Portia",
    "Rose", "Saral", "Seraphina", "Shaena", "Trym", "Vani",
    "Willow",
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
  gender: Exclude<Gender, "any">;
};

function pickGender(gender: Gender): Exclude<Gender, "any"> {
  if (gender === "any") return Math.random() < 0.5 ? "male" : "female";
  return gender;
}

function firstNames(data: RaceData, gender: Exclude<Gender, "any">): readonly string[] {
  return gender === "male" ? data.firstMale : data.firstFemale;
}

/**
 * Roll a single name. No history awareness — for tests and callers
 * that don't track recent rolls.
 */
export function rollName(race: Race, gender: Gender = "any"): RolledNameResult {
  const actualRace =
    race === "any" ? RACE_KEYS[Math.floor(Math.random() * RACE_KEYS.length)]! : race;
  const actualGender = pickGender(gender);
  const data = TABLES[actualRace];
  const pool = firstNames(data, actualGender);
  const first = pool[Math.floor(Math.random() * pool.length)] ?? "Unknown";
  const last = data.last[Math.floor(Math.random() * data.last.length)] ?? "";
  return { first, last, race: actualRace, gender: actualGender };
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
  gender: Gender,
  recent: ReadonlySet<string>,
  maxAttempts = 20,
): RolledNameResult {
  let last: RolledNameResult = rollName(race, gender);
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = rollName(race, gender);
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

export const GENDER_OPTIONS: Array<{ id: Gender; label: string }> = [
  { id: "any", label: "Any" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];
