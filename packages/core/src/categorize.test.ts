import { describe, expect, it } from "vitest";
import { categorize } from "./categorize.js";

describe("categorize — combat subcategories", () => {
  it("maps Battle keywords to combat/battle", () => {
    expect(categorize("Mighty Seas.mp3", "The Grand Fleet"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Man the Battlements.wav", "Grand Fleet"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Special Forces.mp3", "Grand Fleet"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Black Powder Musket.mp3", "Grand Fleet"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Molten Steel.mp3", "Shadows Fall"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Rise Against the Machines.mp3", "Hero's Journey"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Prepare for Battle.mp3", "Ominous Overtures"))
      .toEqual({ category: "combat", subcategory: "battle" });
  });

  it("maps Boss keywords to combat/boss", () => {
    expect(categorize("The Apocalypse.mp3", "Ominous Overtures"))
      .toEqual({ category: "combat", subcategory: "boss" });
    expect(categorize("Dawn of Apocalypse.mp3", "Ominous Overtures"))
      .toEqual({ category: "combat", subcategory: "boss" });
    expect(categorize("Mark of Davy Jones.mp3", "Haunted Harmonies"))
      .toEqual({ category: "combat", subcategory: "boss" });
    expect(categorize("Brut Apocalypse.mp3", "Haunted Harmonies"))
      .toEqual({ category: "combat", subcategory: "boss" });
  });

  it("maps Skirmish keywords to combat/skirmish", () => {
    expect(categorize("Skirmish Tide.mp3", "pack"))
      .toEqual({ category: "combat", subcategory: "skirmish" });
    expect(categorize("Random Encounter.mp3", "pack"))
      .toEqual({ category: "combat", subcategory: "skirmish" });
    expect(categorize("Bar Brawl.mp3", "pack"))
      .toEqual({ category: "combat", subcategory: "skirmish" });
  });
});

describe("categorize — horror", () => {
  it.each([
    ["Stairs Will Creek.mp3"],
    ["Only Your Imagination.mp3"],
    ["Grave Concerns.mp3"],
    ["Behind the Door.mp3"],
    ["Night Crawler.mp3"],
    ["Vampires Hunt at Night.mp3"],
    ["Scream.mp3"],
    ["Dark Tower.mp3"],
    ["Dark Horizon.mp3"],
    ["Haunted Halls.mp3"],
    ["Nightmare in the Crypt.mp3"],
  ])("classifies %s as horror", (filename) => {
    expect(categorize(filename, "Shadows Fall")).toEqual({ category: "horror" });
  });
});

describe("categorize — tension", () => {
  it.each([
    ["Doubt Creeps In.mp3"],
    ["Anticipating the Worst.mp3"],
    ["Destruction.mp3"],
    ["No Future.mp3"],
    ["Closing In.mp3"],
    ["Approach with Caution.mp3"],
    ["Faint of Heart.mp3"],
    ["City Chase.mp3"],
    ["Sparse Landscape.mp3"],
    ["Subtle Warning.mp3"],
    ["Storm Watch.mp3"],
    ["Pirates Hidden Lair.mp3"],
    ["Out of Control.mp3"],
    ["Distressed.mp3"],
    ["Unfinished Business.mp3"],
  ])("classifies %s as tension", (filename) => {
    expect(categorize(filename, "Drama")).toEqual({ category: "tension" });
  });
});

describe("categorize — tavern", () => {
  it.each([
    ["Celtic Homeland.mp3"],
    ["Planxties.mp3"],
    ["Kick Up Heels.mp3"],
    ["Aromatic Courtyard.mp3"],
    ["Jewel Bright.mp3"],
    ["Enchanted Connection.mp3"],
    ["Boar's Head Carol.mp3"],
    ["Good King Wenceslas.mp3"],
    ["Scotland the Brave.mp3"],
    ["Minuet in G.mp3"],
    ["March of Wooden Soldiers.mp3"],
    ["Folk Dance.mp3"],
    ["Festive Jig.mp3"],
  ])("classifies %s as tavern", (filename) => {
    expect(categorize(filename, "Legend Of The Round Table")).toEqual({ category: "tavern" });
  });
});

describe("categorize — rest", () => {
  it.each([
    ["Ave Maria.mp3"],
    ["Schubert Ave Maria.mp3"],
    ["Amazing Grace.mp3"],
    ["Praise My Soul.mp3"],
    ["Alleluia.mp3"],
    ["Gloria.mp3"],
    ["Crown Him.mp3"],
    ["Joyful Joyful.mp3"],
    ["Spiritual Retreat.mp3"],
    ["Bach Pastorale BWV 590.mp3"],
    ["Anthem to the Fallen.mp3"],
    ["Requesting Benediction.mp3"],
    ["Gymnopedie No 1.mp3"],
  ])("classifies %s as rest", (filename) => {
    expect(categorize(filename, "Enchanted Lands")).toEqual({ category: "rest" });
  });
});

describe("categorize — exploration", () => {
  it.each([
    ["Promise.mp3"],
    ["Big Adventure.mp3"],
    ["Mountain Festival.mp3"],
    ["Valinor.mp3"],
    ["Breaking In.mp3"],
    ["Sails Set.mp3"],
    ["Royal Fireworks.mp3"],
    ["Game Intro Overture.mp3"],
    ["William Tell Pastoral.mp3"],
    ["Silk Trader.mp3"],
    ["Peer Gynt.mp3"],
    ["Liszt Les Préludes.mp3"],
    ["Four Seasons Autumn.mp3"],
    ["Four Seasons Spring.mp3"],
    ["An Endless Voyage.mp3"],
  ])("classifies %s as exploration", (filename) => {
    expect(categorize(filename, "Hero's Journey")).toEqual({ category: "exploration" });
  });
});

describe("categorize — ambient", () => {
  it.each([
    ["Dream.mp3"],
    ["Inlaid Pearl.mp3"],
    ["Off The Grid.mp3"],
    ["Lucky Win.mp3"],
    ["Muscle Car.mp3"],
    ["Ice & Crystal.mp3"],
    ["Healing Spectrum.mp3"],
    ["Dream Sequence.mp3"],
    ["Arabesque.mp3"],
    ["Casta Diva.mp3"],
    ["Swan Lake Waltz.mp3"],
    ["May Nights.mp3"],
    ["Vivaldi Winter.mp3"],
    ["Sorrow's Echo.mp3"],
    ["Memorial Service.mp3"],
    ["Quiet Resilience.mp3"],
  ])("classifies %s as ambient", (filename) => {
    expect(categorize(filename, "Atmospheric Burn")).toEqual({ category: "ambient" });
  });
});

describe("categorize — scifi", () => {
  it.each([
    ["Outer Space.mp3", "Space Hord"],
    ["Outer Limits.mp3", "Space Hord"],
    ["Alien Planet.mp3", "Space Hord"],
    ["System Status OK.mp3", "Ominous Overtures"],
    ["SCI-FI-COMPUTER.mp3", "Drone Swarm Behavior"],
  ])("classifies %s as scifi", (filename, parent) => {
    expect(categorize(filename, parent)).toEqual({ category: "scifi" });
  });
});

describe("categorize — SFX override", () => {
  // Pack-folder signal still routes weather effects to SFX.
  it.each([
    ["Rain Loop.wav", "Weather Wounds"],
    ["Thunder Crash.wav", "Weather Wounds"],
    ["Heavy Wind.mp3", "Weather Wounds"],
    ["Lightning Strike.wav", "Weather Wounds"],
    ["Snow Storm.mp3", "Weather Wounds"],
  ])("weather pack folder triggers SFX for %s", (filename, parent) => {
    expect(categorize(filename, parent)).toEqual({ category: "sfx" });
  });

  // Weapons / specific SFX phrases override via filename alone.
  it.each([
    ["Gunfire Burst.wav", "Conflict Battle"],
    ["Cannon Volley.wav", "Conflict Battle"],
    ["Explosion Distant.wav", "Conflict Battle"],
    ["Crowd Battle.wav", "Conflict Battle"],
    ["Weapon Clash.wav", "Conflict Battle"],
    ["Propeller Drone.wav", "Drone Swarm Behavior"],
  ])("weapon/effect keyword in filename triggers SFX for %s", (filename, parent) => {
    expect(categorize(filename, parent)).toEqual({ category: "sfx" });
  });

  // SFX top-level ancestor folder catches anything inside it.
  it("ancestor 'SFX' folder classifies the whole subtree", () => {
    expect(categorize("Untitled_07.mp3", "/MUSIC/SFX/somepack")).toEqual({ category: "sfx" });
  });

  // The regression that started this pass: piano music in an ambient/rest
  // pack must NOT be classified as SFX just because the title contains a
  // weather word.
  it("song titles with weather words don't trigger SFX without folder context", () => {
    expect(
      categorize(
        "6 - Phat Phrog Studio - Alpine Peaks - Reflections on the Snow.mp3",
        "alpinepeaks_rpgpianomusiccollection",
      ).category,
    ).not.toBe("sfx");
    expect(
      categorize("Rainy Mountain.mp3", "ambient_collection").category,
    ).not.toBe("sfx");
    expect(
      categorize("Wind Beneath My Wings.mp3", "epic_film_score").category,
    ).not.toBe("sfx");
    expect(
      categorize("Thunder of Hooves.mp3", "battle_score").category,
    ).not.toBe("sfx");
  });
});

describe("categorize — composer/piece overrides", () => {
  it("Mozart Eine Kleine Nachtmusik -> tavern", () => {
    expect(categorize("Eine Kleine Nachtmusik.mp3", "Orchestral Dreams"))
      .toEqual({ category: "tavern" });
  });
  it("Flight of the Bumblebee -> tension", () => {
    expect(categorize("Flight of the Bumblebee.mp3", "Orchestral Dreams"))
      .toEqual({ category: "tension" });
  });
  it("Mozart Symphony No. 40 G Minor -> tension", () => {
    expect(categorize("Mozart Symphony 40 G Minor.mp3", "Orchestral Dreams"))
      .toEqual({ category: "tension" });
  });
  it("Schubert Ave Maria -> rest", () => {
    expect(categorize("Schubert Ave Maria.mp3", "Symphonic Majestic"))
      .toEqual({ category: "rest" });
  });
  it("Vivaldi Four Seasons Winter -> ambient", () => {
    expect(categorize("Four Seasons Winter.mp3", "Symphonic Majestic"))
      .toEqual({ category: "ambient" });
  });
  it("Vivaldi Four Seasons Spring -> exploration", () => {
    expect(categorize("Four Seasons Spring.mp3", "Symphonic Majestic"))
      .toEqual({ category: "exploration" });
  });
  it("Liszt Les Préludes -> exploration", () => {
    expect(categorize("Liszt Les Préludes.mp3", "Symphonic Majestic"))
      .toEqual({ category: "exploration" });
  });
  it("Tchaikovsky Swan Lake Waltz -> ambient", () => {
    expect(categorize("Tchaikovsky Swan Lake Waltz.mp3", "Orchestral Dreams"))
      .toEqual({ category: "ambient" });
  });
});

describe("categorize — folder rules", () => {
  it("'Alternates for - X' folder inherits parent track's category", () => {
    // "Mighty Seas" is Combat/Battle, so its alternates should be too.
    expect(categorize("Alt Take 2.mp3", "Alternates for - Mighty Seas"))
      .toEqual({ category: "combat", subcategory: "battle" });

    // "Ave Maria" alternates are Rest.
    expect(categorize("Take 03.mp3", "Alternates for - Ave Maria"))
      .toEqual({ category: "rest" });
  });

  it("strips short-version tags (15s/30s/60s/loop)", () => {
    expect(categorize("Mighty Seas (30s).mp3", "Grand Fleet"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Ave Maria 60s.mp3", "Enchanted Lands"))
      .toEqual({ category: "rest" });
    expect(categorize("Dream Loop.mp3", "Atmospheric Burn"))
      .toEqual({ category: "ambient" });
  });

  it("falls back to exploration when nothing matches", () => {
    expect(categorize("Untitled Audio.mp3", "Random Pack"))
      .toEqual({ category: "exploration" });
  });

  it("is case-insensitive", () => {
    expect(categorize("AVE MARIA.MP3", "ENCHANTED LANDS"))
      .toEqual({ category: "rest" });
    expect(categorize("battle royal.flac", "GRAND FLEET"))
      .toEqual({ category: "combat", subcategory: "battle" });
  });

  it("handles both forward and backslash paths", () => {
    expect(categorize("Mighty Seas.mp3", "C:\\Users\\me\\MUSIC\\Combat\\grandfleet_audiohero"))
      .toEqual({ category: "combat", subcategory: "battle" });
    expect(categorize("Mighty Seas.mp3", "/home/me/MUSIC/Combat/grandfleet_audiohero/"))
      .toEqual({ category: "combat", subcategory: "battle" });
  });
});

describe("categorize — ancestor folder walk", () => {
  it("uses grandparent folder when filename and immediate parent are mute", () => {
    // MUSIC/Combat/Battle/grandfleet_audiohero/Track_001.mp3 → combat/battle
    expect(categorize("Track_001.mp3", "C:\\MUSIC\\Combat\\Battle\\grandfleet_audiohero"))
      .toEqual({ category: "combat", subcategory: "battle" });
  });

  it("uses ancestor for Horror layout", () => {
    expect(categorize("Music_05.mp3", "/home/user/MUSIC/Horror/shadowsfall_audiohero"))
      .toEqual({ category: "horror" });
  });

  it("uses ancestor for Ambient layout (bare 'Ambient' folder)", () => {
    expect(categorize("BG_007.mp3", "/MUSIC/Ambient/atmosphericburn_audiohero"))
      .toEqual({ category: "ambient" });
  });

  it("uses ancestor for Tavern layout", () => {
    expect(categorize("Track_03.mp3", "/MUSIC/Tavern/legendroundtable_audiohero"))
      .toEqual({ category: "tavern" });
  });

  it("uses ancestor for Rest layout", () => {
    expect(categorize("Untitled_01.mp3", "/MUSIC/Rest/enchantedlands_audiohero"))
      .toEqual({ category: "rest" });
  });

  it("uses ancestor for Sci-Fi layout", () => {
    expect(categorize("Music_BG.mp3", "/MUSIC/Scifi/spacehord_audiohero"))
      .toEqual({ category: "scifi" });
  });

  it("Combat/Boss ancestor still picks subcategory boss", () => {
    expect(categorize("Untitled.mp3", "/MUSIC/Combat/Boss/herospack"))
      .toEqual({ category: "combat", subcategory: "boss" });
  });

  it("Combat/Skirmish ancestor picks subcategory skirmish", () => {
    expect(categorize("Untitled.mp3", "/MUSIC/Combat/Skirmish/packA"))
      .toEqual({ category: "combat", subcategory: "skirmish" });
  });

  it("filename still beats ancestor when filename matches", () => {
    // Track named "Ave Maria" inside Combat/Battle folder → rest, not combat.
    expect(categorize("Ave Maria.mp3", "/MUSIC/Combat/Battle/somepack"))
      .toEqual({ category: "rest" });
  });

  it("closer ancestor beats deeper ancestor", () => {
    // Combat/Battle/somepack — Battle wins, not Combat (both would match,
    // but Battle is the more specific signal nearest to the file).
    expect(categorize("Untitled.mp3", "/MUSIC/Combat/Battle/somepack"))
      .toEqual({ category: "combat", subcategory: "battle" });
  });

  it("ignores noise segments like MUSIC and drive letters", () => {
    expect(categorize("Untitled.mp3", "C:/MUSIC/Horror/somepack"))
      .toEqual({ category: "horror" });
    expect(categorize("Untitled.mp3", "C:\\MUSIC\\Horror\\somepack"))
      .toEqual({ category: "horror" });
  });
});

describe("categorize — pack-name defaults (flat library layout)", () => {
  // Every documented pack from CATEGORIZATION_GUIDE.md "Packs Already
  // Processed", classified by its dominant category. Tracks with names
  // that don't match any keyword should now resolve via the pack folder.

  it.each([
    ["actionpacked_audiohero", "combat", "battle"],
    ["adrenalinerush_audiohero", "combat", "battle"],
    ["grandfleet_audiohero", "combat", "battle"],
  ])("%s routes to combat/battle", (pack, category, sub) => {
    expect(categorize("Track_001.mp3", pack)).toEqual({
      category,
      subcategory: sub,
    });
  });

  it.each([
    ["atmosphericburn_audiohero", "ambient"],
    ["drama_audiohero", "ambient"],
    ["orchestraldreams_audiohero", "ambient"],
    ["spacehord_audiohero", "ambient"],
    ["symphonicmajestic_audiohero", "ambient"],
    ["dramascenes_audiohero", "ambient"],
    ["romanticemotional_audiohero", "ambient"],
  ])("%s routes to ambient", (pack, category) => {
    expect(categorize("Track_001.mp3", pack)).toEqual({ category });
  });

  it.each([
    ["conflictbattle_audiohero", "sfx"],
    ["droneswarm_audiohero", "sfx"],
    ["weatherwounds_audiohero", "sfx"],
  ])("%s routes to sfx", (pack, category) => {
    expect(categorize("Track_001.mp3", pack)).toEqual({ category });
  });

  it("enchantedlands_audiohero routes to rest", () => {
    expect(categorize("Track_001.mp3", "enchantedlands_audiohero")).toEqual({
      category: "rest",
    });
  });

  it.each([
    ["hauntedharmonies_audiohero", "horror"],
    ["shadowsfall_audiohero", "horror"],
  ])("%s routes to horror", (pack, category) => {
    expect(categorize("Track_001.mp3", pack)).toEqual({ category });
  });

  it.each([
    ["herosjourney_audiohero", "exploration"],
    ["legendarythemes_audiohero", "exploration"],
    ["blockbusterbeasts_audiohero", "exploration"],
  ])("%s routes to exploration", (pack, category) => {
    expect(categorize("Track_001.mp3", pack)).toEqual({ category });
  });

  it("legendroundtable_audiohero routes to tavern", () => {
    expect(categorize("Track_001.mp3", "legendroundtable_audiohero")).toEqual({
      category: "tavern",
    });
  });

  it("ominousovertures_audiohero routes to tension", () => {
    expect(categorize("Track_001.mp3", "ominousovertures_audiohero")).toEqual({
      category: "tension",
    });
  });

  it("is case- and separator-insensitive", () => {
    expect(categorize("X.mp3", "ShadowsFall_AudioHero")).toEqual({
      category: "horror",
    });
    expect(categorize("X.mp3", "shadowsfall-audiohero")).toEqual({
      category: "horror",
    });
    expect(categorize("X.mp3", "SHADOWSFALL_AUDIOHERO")).toEqual({
      category: "horror",
    });
  });

  it("filename match still beats pack default", () => {
    // "Mighty Seas" hits COMBAT_BATTLE keyword. atmosphericburn pack
    // defaults to ambient. Filename wins.
    expect(categorize("Mighty Seas.mp3", "atmosphericburn_audiohero")).toEqual({
      category: "combat",
      subcategory: "battle",
    });
  });

  it("ancestor folder match still beats pack default", () => {
    // MUSIC/Horror/atmosphericburn_audiohero/track.mp3 — ancestor "Horror"
    // matches HORROR keyword before pack default fires.
    expect(
      categorize("Track_001.mp3", "/MUSIC/Horror/atmosphericburn_audiohero"),
    ).toEqual({ category: "horror" });
  });

  it("unknown pack still falls back to exploration", () => {
    expect(categorize("Random.mp3", "totally_made_up_pack")).toEqual({
      category: "exploration",
    });
  });

  it("pack default works for nested layouts too (substring)", () => {
    // User-added suffix like a year folder shouldn't break recognition.
    expect(
      categorize("Track.mp3", "/MUSIC/2026/shadowsfall_audiohero_v2"),
    ).toEqual({ category: "horror" });
  });
});

describe("categorize — precedence rules", () => {
  it("SFX override wins over Combat keyword", () => {
    // "Cannon" is in SFX_OVERRIDE; would otherwise hit Combat via no match.
    expect(categorize("Cannon Volley.wav", "Combat Pack"))
      .toEqual({ category: "sfx" });
  });

  it("Horror wins over Tension when both could match", () => {
    // "Grave" (horror) and "Dread" (tension) both present.
    expect(categorize("Grave Dread.mp3", "pack"))
      .toEqual({ category: "horror" });
  });

  it("Composer override wins over generic keyword", () => {
    // "Waltz" alone might hit Tavern; "Swan Lake Waltz" is ambient.
    expect(categorize("Swan Lake Waltz.mp3", "Orchestral Dreams"))
      .toEqual({ category: "ambient" });
  });
});
