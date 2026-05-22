// Polyhedral dice roller. Pure logic separated from UI so the result
// shape is easy to test by eye and easy to render compactly.

export type Die = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type Advantage = "none" | "advantage" | "disadvantage";

export type RollSpec = {
  die: Die;
  count: number;
  modifier: number;
  advantage: Advantage;
};

export type RollResult = {
  spec: RollSpec;
  /** Individual die faces in roll order. For adv/dis with d20, this holds both rolls. */
  rolls: number[];
  /** Which roll(s) actually counted toward the total — indices into `rolls`. */
  kept: number[];
  total: number;
  /** Critical d20: 1 = nat 1, 20 = nat 20 on the kept die. */
  crit: "nat1" | "nat20" | null;
  rolledAt: number;
};

export const DICE: readonly Die[] = [4, 6, 8, 10, 12, 20, 100] as const;

export function rollDice(spec: RollSpec, rng: () => number = Math.random): RollResult {
  const safeCount = Math.max(1, Math.min(20, Math.floor(spec.count)));
  const rolls: number[] = [];
  const kept: number[] = [];

  if (spec.die === 20 && spec.advantage !== "none" && safeCount === 1) {
    // Roll twice, keep higher (adv) or lower (dis).
    const a = die(spec.die, rng);
    const b = die(spec.die, rng);
    rolls.push(a, b);
    const keepIndex = spec.advantage === "advantage" ? (a >= b ? 0 : 1) : (a <= b ? 0 : 1);
    kept.push(keepIndex);
  } else {
    for (let i = 0; i < safeCount; i++) {
      rolls.push(die(spec.die, rng));
      kept.push(i);
    }
  }

  const sum = kept.reduce((acc, idx) => acc + (rolls[idx] ?? 0), 0);
  const total = sum + spec.modifier;

  let crit: RollResult["crit"] = null;
  if (spec.die === 20 && kept.length === 1) {
    const value = rolls[kept[0]!];
    if (value === 20) crit = "nat20";
    else if (value === 1) crit = "nat1";
  }

  return { spec, rolls, kept, total, crit, rolledAt: Date.now() };
}

function die(sides: Die, rng: () => number): number {
  return 1 + Math.floor(rng() * sides);
}

export function formatSpec(spec: RollSpec): string {
  const base = `${spec.count}d${spec.die}`;
  const mod =
    spec.modifier === 0
      ? ""
      : spec.modifier > 0
        ? `+${spec.modifier}`
        : `${spec.modifier}`;
  const adv =
    spec.die === 20 && spec.advantage !== "none"
      ? ` (${spec.advantage === "advantage" ? "adv" : "dis"})`
      : "";
  return `${base}${mod}${adv}`;
}
