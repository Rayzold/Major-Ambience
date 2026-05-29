// Shared data types. Mirrors docs/BUILD_GUIDE.md § 5.

export type Grade = "S" | "A" | "B" | "C" | "D" | "F" | null;

export type CategoryId =
  | "combat"
  | "tavern"
  | "exploration"
  | "ambient"
  | "horror"
  | "tension"
  | "rest"
  | "voices"
  | "sfx"
  | "scifi"
  | "removed";

export type CombatSubcategory = "battle" | "boss" | "skirmish";

export type Track = {
  id: string;
  uri: string;
  title: string;
  pack: string;
  category: CategoryId;
  subcategory?: string;
  durationMs: number;
  grade: Grade;
  playCount: number;
  lastPlayedAt?: number;
  note?: string;
  tags?: string[];
};

export type Scene = {
  id: string;
  name: string;
  glyph?: string;
  primaryCategory: CategoryId;
  accentCategories: CategoryId[];
  trackIds: string[];
  soundboardPage: "A" | "B" | "C";
  fadeMs: number;
  duckingPct: number;
  volumes: Partial<Record<CategoryId, number>>;
  createdAt: number;
};

export type SoundboardSlot = {
  page: "A" | "B" | "C";
  slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  trackId?: string;
  loop: boolean;
  volume: number;
};

export type AppConfig = {
  duckingPct: number;
  fadeMs: number;
  largeUI: boolean;
  theme: "gold-dark" | "parchment" | "arcane";
  rootFolderUri: string;
  schemaVersion: number;
};
