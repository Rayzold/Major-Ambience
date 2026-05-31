// Coverage matrix for the entitlement registry. Pins down the
// DESIGN.md §6.2 table — if any of these flip, the design lies.

import { afterEach, describe, expect, it } from "vitest";
import {
  BETA_TIER,
  TIERS,
  TIER_ENTITLEMENTS,
  TIER_LIMITS,
  currentTier,
  hasEntitlement,
  requiredTier,
  setTierOverride,
  tierLimits,
  type Tier,
} from "./entitlements.js";

// Restore the global override between every test so leaks don't
// contaminate other cases.
afterEach(() => {
  setTierOverride(null);
});

describe("TIERS — shipping set", () => {
  it("excludes the held-back Epic tier", () => {
    expect(TIERS).toEqual(["demo", "minor", "major"]);
    // @ts-expect-error — "epic" is not a Tier (held for v2)
    const _bad: Tier = "epic";
    void _bad;
  });
});

describe("TIER_ENTITLEMENTS — cumulative grants", () => {
  it("Demo grants nothing", () => {
    expect(TIER_ENTITLEMENTS.demo.size).toBe(0);
  });

  it("Minor grants the four 'paid library' capabilities", () => {
    expect([...TIER_ENTITLEMENTS.minor].sort()).toEqual(
      ["favorites_recents", "grades", "sfx_layer", "user_library"].sort(),
    );
  });

  it("Major is a superset of Minor (cumulative)", () => {
    for (const ent of TIER_ENTITLEMENTS.minor) {
      expect(TIER_ENTITLEMENTS.major.has(ent)).toBe(true);
    }
  });

  it("Major adds the six DESIGN §6.2 Major-only capabilities", () => {
    const majorOnly = [...TIER_ENTITLEMENTS.major].filter(
      (e) => !TIER_ENTITLEMENTS.minor.has(e),
    );
    expect(majorOnly.sort()).toEqual(
      [
        "cloud_sync",
        "dm_mode",
        "notes_on_tracks",
        "per_category_volumes",
        "soundboard_full_pages",
        "themes",
      ].sort(),
    );
  });

  it("includes cloud_sync only at Major (PR-7's gating reason for existing)", () => {
    expect(TIER_ENTITLEMENTS.demo.has("cloud_sync")).toBe(false);
    expect(TIER_ENTITLEMENTS.minor.has("cloud_sync")).toBe(false);
    expect(TIER_ENTITLEMENTS.major.has("cloud_sync")).toBe(true);
  });
});

describe("TIER_LIMITS — numeric caps", () => {
  it("matches DESIGN §6.2 row counts", () => {
    expect(TIER_LIMITS.demo.scenes).toBe(1);
    expect(TIER_LIMITS.minor.scenes).toBe(5);
    expect(TIER_LIMITS.major.scenes).toBe(Infinity);

    expect(TIER_LIMITS.demo.soundboardSlots).toBe(8);
    expect(TIER_LIMITS.minor.soundboardSlots).toBe(8);
    expect(TIER_LIMITS.major.soundboardSlots).toBe(24);
  });
});

describe("BETA_TIER — D3 decision wired", () => {
  it("is 'major' so every gated capability is unlocked during beta", () => {
    expect(BETA_TIER).toBe("major");
  });

  it("currentTier() defaults to BETA_TIER (no override)", () => {
    expect(currentTier()).toBe(BETA_TIER);
  });

  it("hasEntitlement('cloud_sync') is true during beta", () => {
    expect(hasEntitlement("cloud_sync")).toBe(true);
  });

  it("tierLimits() returns the Major caps during beta", () => {
    expect(tierLimits()).toEqual(TIER_LIMITS.major);
  });
});

describe("setTierOverride — test-only escape hatch", () => {
  it("forces currentTier() until cleared", () => {
    setTierOverride("demo");
    expect(currentTier()).toBe("demo");
    setTierOverride(null);
    expect(currentTier()).toBe(BETA_TIER);
  });

  it("hasEntitlement responds to the override", () => {
    setTierOverride("demo");
    expect(hasEntitlement("cloud_sync")).toBe(false);
    expect(hasEntitlement("user_library")).toBe(false);
    setTierOverride("minor");
    expect(hasEntitlement("cloud_sync")).toBe(false);
    expect(hasEntitlement("user_library")).toBe(true);
    setTierOverride("major");
    expect(hasEntitlement("cloud_sync")).toBe(true);
  });

  it("tierLimits responds to the override", () => {
    setTierOverride("demo");
    expect(tierLimits().scenes).toBe(1);
    setTierOverride("minor");
    expect(tierLimits().scenes).toBe(5);
  });
});

describe("requiredTier", () => {
  it("returns the cheapest tier that includes the entitlement", () => {
    expect(requiredTier("user_library")).toBe("minor");
    expect(requiredTier("cloud_sync")).toBe("major");
    expect(requiredTier("grades")).toBe("minor");
    expect(requiredTier("dm_mode")).toBe("major");
  });

  it("returns null for entitlements no shipping tier includes", () => {
    // @ts-expect-error — "epic_only_thing" isn't a real Entitlement
    expect(requiredTier("epic_only_thing")).toBe(null);
  });
});
