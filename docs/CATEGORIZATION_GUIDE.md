# D&D Music Companion — Categorization Guide

> This file helps Claude (or anyone) quickly categorize and copy new audio packs into the correct folders.
> Last updated: 2026-05-20

---

## Folder Paths

| Role | Path |
|------|------|
| **Destination (MUSIC app)** | `C:\Users\marko\Desktop\MUSIC\` |
| **Incoming (unsorted)** | `C:\Users\marko\Desktop\Music Uncategorized\` |
| **D&D App HTML** | `C:\Users\marko\Desktop\dnd-music.html` |

> **Note on moving files:** The sandbox can only **copy**, not delete, from the Music Uncategorized folder due to filesystem permissions.
> After verifying the copy succeeded, **delete Music Uncategorized manually** in Windows Explorer.

---

## Destination Category Structure

```
MUSIC/
├── Combat/
│   ├── Battle/       ← Main fights, army clashes, action, naval battles
│   ├── Boss/         ← Epic single-enemy encounters, apocalyptic, legendary foes
│   └── Skirmish/     ← Small skirmishes, quick fights
├── Ambient/          ← Atmospheric, emotional, melancholic, sad, dreamlike
├── Exploration/      ← Travel, adventure, discovery, marching overtures
├── Horror/           ← Terror, undead, jump-scare stingers, dark haunting
├── Tension/          ← Suspense, pursuit, dread, dark minors, "something's wrong"
├── Tavern/           ← Lively, folk, dance, festive, medieval social
├── Rest/             ← Peaceful, sacred, hymns, quiet recovery, downtime
├── Scifi/            ← Space, robots, futuristic (use sparingly in D&D)
├── SFX/              ← Non-musical: sound effects, ambience, weather, weapons
├── Electronic/       ← EDM, synthwave (rarely D&D-relevant)
├── Voices/           ← Voice packs, narration, monster sounds
└── Racing/           ← Not D&D relevant, ignore
```

---

## Categorization Decision Rules

### By name keywords

| If the track/pack name contains… | → Category |
|----------------------------------|------------|
| Battle, Fight, Combat, Army, Musket, Forces, Charge | Combat/Battle |
| Apocalypse, Boss, Davy Jones, Brut, Mark of, Legendary foe | Combat/Boss |
| Skirmish, Encounter, Brawl | Combat/Skirmish |
| Horror, Vampire, Nightmare, Crawl, Stair, Imagination, Grave, Haunt | Horror |
| Tension, Ominous, Creep, Doubt, Dread, Chase, Closing In, Caution | Tension |
| Tavern, Celtic, Folk, Jig, Reel, Dance, Whirl, Carol | Tavern |
| Rest, Sacred, Hymn, Ave Maria, Grace, Praise, Benediction, Gymnopedie | Rest |
| Exploration, Journey, Adventure, Quest, Voyage, Sails | Exploration |
| Alien, Space, Robot, Sci-Fi, Outer, Computer, Drone | Scifi |
| Rain, Thunder, Wind, Snow, Weather, Lightning, Ambience (non-music) | SFX |
| Gunfire, Explosion, Weapon, Crowd (battle), Cannon | SFX |
| Sad, Sorrow, Grief, Tragedy, Memorial, Farewell, Melancholy, Lament | Ambient |
| Dream, Crystal, Healing, Peaceful, Gentle | Ambient |

### By classical composer / piece
| Piece | → Category |
|-------|------------|
| Mozart Eine Kleine Nachtmusik | Tavern (bright, lively) |
| Tchaikovsky Waltz of Flowers, Nutcracker | Tavern (festive) |
| Bach Minor key (C Minor, D Minor) | Tension (dark) |
| Vivaldi Four Seasons (Spring/Autumn) | Exploration |
| Vivaldi Four Seasons (Winter slow) | Ambient |
| Tchaikovsky Swan Lake Waltz | Ambient |
| Grieg Peer Gynt | Exploration (adventurous) |
| Rimsky-Korsakov Flight of Bumblebee | Tension (frantic rush) |
| Mozart Symphony No. 40 G Minor | Tension (dark dramatic) |
| Schubert Ave Maria | Rest |
| Liszt Les Préludes | Exploration (romantic/adventurous) |
| Hymns (Alleluia, Gloria, Crown Him, Joyful Joyful) | Rest |
| Bach Pastorale BWV 590 | Rest |
| Chopin, Debussy Arabesque | Ambient (dreamlike) |
| Minuet, Beethoven Quartet | Tavern / Rest |

---

## How to Copy New Packs (Python snippet)

```python
import os, shutil

SRC = "/sessions/.../mnt/Music Uncategorized"
DST = "/sessions/.../mnt/MUSIC"

def cp(src, dest_category, dest_subfolder):
    """Copy a single file or directory to DST/dest_category/dest_subfolder/"""
    dd = os.path.join(DST, dest_category, dest_subfolder)
    os.makedirs(dd, exist_ok=True)
    nm = os.path.basename(src)
    dp = os.path.join(dd, nm)
    if not os.path.exists(src) or os.path.exists(dp):
        return  # skip missing or already-copied
    shutil.copytree(src, dp) if os.path.isdir(src) else shutil.copy2(src, dd)
    print(f"OK: {nm} → {dest_category}/{dest_subfolder}/")

def cp_all(src_dir, dest_category, dest_subfolder):
    """Copy every item in src_dir (catch-all for remaining files)"""
    if not os.path.isdir(src_dir):
        return
    for item in sorted(os.listdir(src_dir)):
        cp(os.path.join(src_dir, item), dest_category, dest_subfolder)
```

**Naming convention for subfolders:** `packname_publisher` (lowercase, no spaces)
Examples: `actionpacked_audiohero`, `grandfleet_audiohero`, `shadowsfall_audiohero`

**Pattern:** Assign specific tracks first, then use `cp_all()` to catch remaining files in a default category.

---

## Packs Already Processed (May 2026)

### From `Music Uncategorized` → `MUSIC`

| Source Pack | Subfolder Name | Categories Used |
|---|---|---|
| Action Packed | `actionpacked_audiohero` | Combat/Battle |
| Adrenaline Rush | `adrenalinerush_audiohero` | Combat/Battle (most), Tension (Pocket Pressure, Descent Into Darkness) |
| Atmospheric Burn | `atmosphericburn_audiohero` | Ambient (Dream, Inlaid Pearl, Off The Grid, Lucky Win, Muscle Car), Tension (Distressed, Unfinished Business, Out of Control), Combat/Battle (Sure Thing), Horror (Scream) |
| Conflict Battle | `conflictbattle_audiohero` | SFX (all — gunfire, explosions, crowd, weapons) |
| Drama | `drama_audiohero` | Ambient (most sorrowful pieces), Rest (Requesting Benediction, Faith, Gymnopedie, June Bacarolle, Look Up, Anthem to the Fallen), Tension (Doubt Creeps In, Anticipating the Worst, Destruction, No Future) |
| Drone Swarm Behavior | `droneswarm_audiohero` | SFX (propellers, robots, torpedoes), Horror (AlienHive, DarkAmbiences, SwarmTransform), Scifi (SCI-FI-COMPUTER) |
| Enchanted Lands | `enchantedlands_audiohero` | Rest (hymns: Crown Him, All Hail, Joyful Joyful, Spiritual Retreat, Wer nur), Ambient (Ice & Crystal, Healing Spectrum, Dream Sequence), Tavern (Dance of Toy Flutes, Musical Snuff Box, Opening Presents, Holiday Wish) |
| Haunted Harmonies | `hauntedharmonies_audiohero` / `hauntedharmonies_new` | Horror (Dark Tower, Dark Horizon, Earliest Memories), Combat/Boss (All Brut, The Apocalypse, Mark of Davy Jones, Battle Lines Are Drawn), Tension (Magic Revue, Circle Tightens, Oracle of Delphi, Revelations, Light Into Darkness) |
| Hero's Journey | `herosjourney_audiohero` | Exploration (most: Promise, Positioning, Provoking, Big Adventure, Understanding, Mountain Festival, Chill Africa, Valinor, Breaking In), Combat/Battle (Rise Against the Machines), Tension (Pirates Hidden Lair, Clock's Ticking) |
| Legend Of The Round Table | `legendroundtable_audiohero` | Tavern (Celtic Homeland, Planxties, Kick Up Heels, Aromatic Courtyard, Jewel Bright, Enchanted Connection, Boar's Head Carol, Good King Wenceslas), Rest (Praise My Soul, Amazing Grace), Exploration (Royal Fireworks, Grand Affair) |
| Ominous Overtures | `ominousovertures_audiohero` | Tension (most: Precarious Personality, Faint of Heart, City Chase, Approach with Caution, Closing In), Ambient (Quiet Resilience), Exploration (Game Intro Overture, William Tell Pastoral), Combat/Battle (Prepare for Battle), Combat/Boss (The Apocalypse, Dawn of Apocalypse), Scifi (System Status OK) |
| Orchestral Dreams | `orchestraldreams_audiohero` | Ambient (Arabesque, Casta Diva), Tavern (Minuet, March of Wooden Soldiers), Rest (Beethoven Quartet 4, Ave Maria, Dolly Is Ill), Exploration (Four Seasons Autumn, Grieg Peer Gynt, Schubert Symphony 5), Tension (Flight of Bumblebee, Mozart Symphony 40) |
| Shadows Fall | `shadowsfall_audiohero` | Horror (Stairs Will Creek, Only Your Imagination, Grave Concerns, Behind the Door, Night Crawler, Vampires Hunt at Night), Combat/Battle (Molten Steel), Tension (all others: Sparse Landscape, Subtle Warning, Grim Prospects, Storm Watch, Walk the Walk) |
| Space Hord | `spacehord_audiohero` | Scifi (Outer Space, Outer Limits, Alien Planet), Rest (Dreams & Meditation, Alleluia, By the Fireside, Gloria, Pastorale, Wie Schon), Tavern (Mozart Eine Kleine, Tchaikovsky Waltz of Flowers), Tension (Captious, Dragma, Bach C Minor), Exploration (Silk Trader, Liszt), Ambient (all others: Coastal Waters, Distant Perspective, Vocal Dreams, Ambient Dreams, Belle View, May Nights, Swan Lake, Vivaldi Winter, etc.) |
| Symphonic Majestic | `symphonicmajestic_audiohero` | Rest (Alleluia, By the Fireside, Gloria, Pastorale, Wie Schon), Tavern (Mozart Eine Kleine, Tchaikovsky Waltz of Flowers), Ambient (May Nights, Swan Lake, Vivaldi Four Seasons Winter), Exploration (Liszt Les Préludes), Tension (Bach C Minor) |
| The Grand Fleet | `grandfleet_audiohero` | Combat/Battle (Mighty Seas, Man the Battlements, Undefeated Army, Special Forces, Black Powder Musket, Fight the Losing Battle, Claiming Glory + alternates), Exploration (Sails Set, Spinning a Legendary Tale), Tavern (Scotland the Brave) |
| Weather Wounds | `weatherwounds_audiohero` | SFX (all — rain, thunder, lightning, wind, snow) |

---

## Tips for Future Categorization

1. **"Alternates for - X" folders** always go to the same category as their parent track X.
2. **Short versions** (15s, 30s, 60s) go to the same category as the FULL version.
3. **Conflict**: When a track name is ambiguous, listen to 10–15 seconds mentally based on the name, then decide.
4. **SFX rule**: If it's a non-musical sound effect (ambience, weapon, weather, creature), it's SFX regardless of the folder name.
5. **Scifi**: Only assign if clearly futuristic. Prefer Tension/Horror for robot-monster sounds in a D&D context.
6. **"Alternate" packs**: Some audiohero packs already existed in MUSIC before this batch. Check with `ls MUSIC/<category>/` before creating a new subfolder — append `_new` if the name is taken and you're unsure if it's the same pack.
7. **cp_all as catch-all**: Always run `cp_all(src, default_category, subfolder)` last so nothing is missed.
8. **Verify counts** at the end: `find MUSIC/<category> -name "*.mp3" | wc -l`

---

## Quick Reference: D&D Scene → Category

| D&D Scene | Best Category |
|---|---|
| Party enters dungeon | Tension → Horror |
| Random encounter in forest | Combat/Battle or Skirmish |
| Final boss fight | Combat/Boss |
| Travelling on the road | Exploration |
| Arriving at a village | Tavern or Ambient |
| Long rest at camp | Rest |
| Creepy abandoned keep | Horror |
| Political intrigue scene | Tension |
| Sad character backstory revealed | Ambient |
| Storm / Weather event | SFX (weatherwounds) |
| Ancient dragon ambush | Combat/Boss |
| Bar fight | Combat/Skirmish or Tavern |
