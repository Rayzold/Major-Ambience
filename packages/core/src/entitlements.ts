// Entitlement registry — single source of truth for which tier
// unlocks which capability. The matrix mirrors DESIGN.md § 6.2.
//
// PR-7 of docs/CLOUD_SYNC.md. Today this module gates nothing in
// production code — `currentTier()` returns `BETA_TIER` ("major") so
// every user has every capability except the held-back Epic features.
// When IAP lands (PR-8) we swap `currentTier()` to read from the
// platform entitlement service; consumers calling `hasEntitlement()`
// don't change at all.
//
// Why now (per decision D3 in docs/CLOUD_SYNC.md): wiring the gate
// shape in advance — even when it grants everything — lets us
// instrument feature usage by tier-equivalent, A/B the eventual
// paywall messaging, and audit consumers across the codebase
// before the gate flips. The cost of doing it later is having to
// touch every gated surface twice.
//
// Three tiers ship at launch (DESIGN § 6.1): "demo" (free), "minor"
// ($14.99), "major" ($29.99). The Epic tier ($49.99) is intentionally
// not released at launch — its entitlements are listed below for
// completeness but `Tier` excludes it for now so the type system
// can't accidentally surface Epic-only features in the launch build.

export type Tier = "demo" | "minor" | "major";

export const TIERS: readonly Tier[] = ["demo", "minor", "major"] as const;

/**
 * Every binary capability the app can gate. NOT counts (scene slot limits,
 * soundboard page caps) — those are enforced at the consumer site against
 * tier-keyed constants in `TIER_LIMITS` below.
 *
 * Names match the rows of DESIGN.md § 6.2 verbatim where possible so
 * the table is a one-to-one map of this enum.
 */
export type Entitlement =
  | "user_library" // import own files (vs demo built-in pack)
  | "grades" // S/A/B/C/D/F grading + weighted shuffle
  | "favorites_recents" // Favorites + Recently played pseudo-views
  | "sfx_layer" // SFX layer + auto-ducking
  | "soundboard_full_pages" // A/B/C pages (vs Page A only)
  | "dm_mode" // Share-safe DM Mode for streaming
  | "cloud_sync" // Cross-device config blob sync
  | "themes" // Parchment + Arcane themes
  | "notes_on_tracks" // Per-track annotations
  | "per_category_volumes"; // Per-category volume offsets

/**
 * Numeric caps tied to each tier. Used by consumers that need to know
 * "how many" rather than "yes/no". Cloud sync, themes, etc. are binary
 * and live in `TIER_ENTITLEMENTS` instead.
 *
 * Demo Pad cap is 8 (Page A only); Minor is also 8 (Page A only); Major
 * gets all 24 (A + B + C). Matches DESIGN § 6.2.
 */
export type TierLimits = {
  /** Maximum scenes the user may save. */
  readonly scenes: number;
  /** Maximum soundboard slots across all pages. */
  readonly soundboardSlots: number;
};

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  demo: { scenes: 1, soundboardSlots: 8 },
  minor: { scenes: 5, soundboardSlots: 8 },
  major: { scenes: Infinity, soundboardSlots: 24 },
};

/**
 * Tier → entitlement set. Each tier grants every entitlement of the
 * tier below it plus its own. Computed at module load from a flat
 * map below so the source-of-truth stays easy to audit.
 */
const _GRANTS: Record<Tier, readonly Entitlement[]> = {
  demo: [],
  minor: ["user_library", "grades", "favorites_recents", "sfx_layer"],
  major: [
    "soundboard_full_pages",
    "dm_mode",
    "cloud_sync",
    "themes",
    "notes_on_tracks",
    "per_category_volumes",
  ],
};

export const TIER_ENTITLEMENTS: Record<Tier, ReadonlySet<Entitlement>> = (() => {
  const out: Record<Tier, Set<Entitlement>> = {
    demo: new Set(),
    minor: new Set(),
    major: new Set(),
  };
  let cumulative: Entitlement[] = [];
  for (const t of TIERS) {
    cumulative = [...cumulative, ..._GRANTS[t]];
    out[t] = new Set(cumulative);
  }
  return out;
})();

/**
 * The tier every user is treated as during beta. Per docs/CLOUD_SYNC.md
 * decision D3: ship cloud sync free, gate later. Bumping this to a
 * lower tier (or wiring `currentTier()` to a real IAP reader) is the
 * one-line change that flips the gate at launch.
 */
export const BETA_TIER: Tier = "major";

// ─── Runtime accessors ─────────────────────────────────────────────────

let _override: Tier | null = null;

/**
 * Force the tier reported by `currentTier()` regardless of any future
 * IAP wiring. Test-only — pass `null` to clear. Real code should never
 * call this in production paths.
 */
export function setTierOverride(tier: Tier | null): void {
  _override = tier;
}

/**
 * Current effective tier. During beta this is `BETA_TIER`. When PR-8
 * lands IAP, replace the body with a read from the platform
 * entitlement service. Consumers of `hasEntitlement` / `tierLimits`
 * don't change.
 */
export function currentTier(): Tier {
  return _override ?? BETA_TIER;
}

/** True iff the current tier (or its lower siblings) grants `ent`. */
export function hasEntitlement(ent: Entitlement): boolean {
  return TIER_ENTITLEMENTS[currentTier()].has(ent);
}

/** Tier-specific numeric limits — convenience accessor. */
export function tierLimits(): TierLimits {
  return TIER_LIMITS[currentTier()];
}

/**
 * Returns the lowest tier (cheapest) that includes the entitlement, or
 * null if no shipping tier does. Used by upgrade copy: "Cloud sync is
 * a Major Ambience feature" — surfaces the cheapest path.
 */
export function requiredTier(ent: Entitlement): Tier | null {
  for (const t of TIERS) {
    if (TIER_ENTITLEMENTS[t].has(ent)) return t;
  }
  return null;
}
