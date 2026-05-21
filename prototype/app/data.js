// Mock data for the Music Companion mobile app.
// Mirrors the categories described in MUSIC_CATEGORIZATION_GUIDE.md.

window.CATEGORIES = [
  {
    id: 'combat',  name: 'Combat',  glyph: 'swords',
    count: 404,    color: '#d96a4a', dark: '#3b0f0a',
    desc: 'Battle, boss, and skirmish music for the heat of war.',
    subcats: ['Battle', 'Boss', 'Skirmish'],
  },
  {
    id: 'tavern', name: 'Tavern', glyph: 'mug',
    count: 98, color: '#e2a154', dark: '#3a1f0a',
    desc: 'Folk, jigs and reels for the smoke‑warm hearth.',
  },
  {
    id: 'exploration', name: 'Exploration', glyph: 'compass',
    count: 255, color: '#bcae54', dark: '#2a2810',
    desc: 'Journey, march, and the open road.',
  },
  {
    id: 'ambient', name: 'Ambient', glyph: 'leaf',
    count: 325, color: '#6fbfa6', dark: '#0f2a26',
    desc: 'Atmospheric, melancholic, dreamlike beds.',
  },
  {
    id: 'horror', name: 'Horror', glyph: 'skull',
    count: 385, color: '#9a6ed1', dark: '#1a0f2e',
    desc: 'Terror, undead, jump‑scare stingers.',
  },
  {
    id: 'tension', name: 'Tension', glyph: 'bolt',
    count: 206, color: '#d27a4a', dark: '#2e160a',
    desc: 'Suspense, pursuit, dread. Something is wrong.',
  },
  {
    id: 'rest', name: 'Rest', glyph: 'moon',
    count: 113, color: '#7d92dd', dark: '#10142e',
    desc: 'Sacred, hymns, the long recovery.',
  },
  {
    id: 'voices', name: 'Voices', glyph: 'mask',
    count: 2458, color: '#c084c0', dark: '#26102a',
    desc: 'Voice packs, narration, monster sounds.',
  },
  {
    id: 'sfx', name: 'SFX', glyph: 'spark',
    count: 373, color: '#5cc4d9', dark: '#0a2630',
    desc: 'Weather, weapons, ambience.',
  },
  {
    id: 'scifi', name: 'Sci‑Fi', glyph: 'rocket',
    count: 80, color: '#6e8be0', dark: '#0e1830',
    desc: 'Use sparingly. The stars between.',
  },
];

window.RECENT_TRACKS = [
  { id: 't1', title: 'Mountain High Bed',         pack: 'Blockbusterbeasts',     cat: 'exploration', dur: '2:33', grade: 'S' },
  { id: 't2', title: 'Stairs Will Creak',          pack: 'Shadows Fall',          cat: 'horror',      dur: '3:12', grade: 'A' },
  { id: 't3', title: 'Praise My Soul',             pack: 'Legend of the Round',   cat: 'rest',        dur: '4:07', grade: 'S' },
  { id: 't4', title: 'Closing In',                 pack: 'Ominous Overtures',     cat: 'tension',     dur: '2:48', grade: 'A' },
  { id: 't5', title: 'Celtic Homeland',            pack: 'Legend of the Round',   cat: 'tavern',      dur: '3:24', grade: 'B' },
  { id: 't6', title: 'Dawn of Apocalypse',         pack: 'Ominous Overtures',     cat: 'combat',      dur: '5:18', grade: 'S' },
];

window.NOW_PLAYING = {
  id: 'np',
  title: 'The Apocalypse',
  pack: 'Haunted Harmonies · Alt. Brut',
  cat: 'combat',
  sub: 'Boss',
  dur: 312,    // seconds
  cur: 124,
  grade: 'S',
  note: 'Use for final boss reveal. Drop on the dragon turn.',
};

window.UP_NEXT = [
  { title: 'Mark of Davy Jones',  pack: 'Haunted Harmonies', cat: 'combat',  dur: '4:18' },
  { title: 'Battle Lines Drawn',  pack: 'Haunted Harmonies', cat: 'combat',  dur: '3:44' },
  { title: 'Quiet Resilience',    pack: 'Ominous Overtures', cat: 'ambient', dur: '2:55' },
];

window.SCENES = [
  {
    id: 's1', name: 'Battle: High Boss', glyph: 'skull-crown',
    primary: 'combat', accents: ['tension', 'sfx'],
    tracks: 14, soundboardPage: 'A',
    sub: 'Final dragon · S‑tier only',
  },
  {
    id: 's2', name: 'Nature Walk', glyph: 'moon',
    primary: 'exploration', accents: ['ambient', 'rest'],
    tracks: 22, soundboardPage: 'B',
    sub: 'Travel days, no combat',
  },
  {
    id: 's3', name: 'Explore the Crypt', glyph: 'torch',
    primary: 'horror', accents: ['tension', 'ambient'],
    tracks: 18, soundboardPage: 'C',
    sub: 'Dripping, creaks, distant chants',
  },
  {
    id: 's4', name: 'Smoke & Mead', glyph: 'mug',
    primary: 'tavern', accents: ['voices'],
    tracks: 12, soundboardPage: 'A',
    sub: 'NPC negotiation, festival nights',
  },
  {
    id: 's5', name: 'Long Rest', glyph: 'moon',
    primary: 'rest', accents: ['ambient'],
    tracks: 9, soundboardPage: 'B',
    sub: 'Camp by a stream, dawn approaching',
  },
  {
    id: 's6', name: 'Ambush!', glyph: 'bolt',
    primary: 'combat', accents: ['tension'],
    tracks: 11, soundboardPage: 'A',
    sub: 'Cold open from silence',
  },
];

// 8 slots per page, 3 pages (A/B/C)
window.SOUNDBOARD = {
  A: [
    { slot: 1, title: 'Sword Hit',      cat: 'sfx',    dur: '0:01', loop: false },
    { slot: 2, title: 'Thunder Roll',   cat: 'sfx',    dur: '0:08', loop: false },
    { slot: 3, title: 'Tavern Cheer',   cat: 'voices', dur: '0:04', loop: false },
    { slot: 4, title: 'Dragon Roar',    cat: 'voices', dur: '0:06', loop: false, active: true },
    { slot: 5, title: 'Heartbeat',      cat: 'horror', dur: '0:02', loop: true,  active: true },
    { slot: 6 },
    { slot: 7, title: 'Coin Pour',      cat: 'sfx',    dur: '0:03', loop: false },
    { slot: 8, title: 'Door Slam',      cat: 'sfx',    dur: '0:01', loop: false },
  ],
  B: [
    { slot: 1, title: 'Rain Loop',      cat: 'sfx',    dur: '1:00', loop: true },
    { slot: 2, title: 'Wind Howl',      cat: 'sfx',    dur: '0:30', loop: true },
    { slot: 3, title: 'Crow',           cat: 'voices', dur: '0:02' },
    { slot: 4 }, { slot: 5 },
    { slot: 6, title: 'Footsteps',      cat: 'sfx',    dur: '0:08', loop: true },
    { slot: 7 }, { slot: 8 },
  ],
  C: Array.from({ length: 8 }, (_, i) => ({ slot: i+1 })),
};

window.ACTIVE_SFX = [
  { title: 'Heartbeat', cat: 'horror', vol: 0.4, loop: true },
  { title: 'Dragon Roar', cat: 'voices', vol: 0.7, loop: false },
];

window.SEARCH_RECENT = ['dragon', 'rain', 'ave maria', 'tavern celtic', 'apocalypse'];
window.SEARCH_RESULTS = [
  { title: 'Dragon Roar',          pack: 'Voices · Monsters',     cat: 'voices', dur: '0:06', grade: 'S' },
  { title: 'Dragon Wings',          pack: 'Conflict Battle',       cat: 'sfx',    dur: '0:04', grade: 'A' },
  { title: 'Dragon Approach',       pack: 'Blockbusterbeasts',     cat: 'tension',dur: '2:14', grade: 'A' },
  { title: 'Dragon Bones',          pack: 'Haunted Harmonies',     cat: 'horror', dur: '3:52', grade: 'B' },
  { title: 'Dragonfire',            pack: 'SFX · Weapons',         cat: 'sfx',    dur: '0:02', grade: 'B' },
];
