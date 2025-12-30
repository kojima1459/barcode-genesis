import { describe, expect, it } from "vitest";
import { getMotif, getRarityTier, getRobotSeed } from "@/lib/rarity";

describe("rarity helpers", () => {
  it("computes a deterministic seed from parts", () => {
    const seed = getRobotSeed({
      head: 1,
      face: 2,
      body: 3,
      armLeft: 4,
      armRight: 5,
      legLeft: 6,
      legRight: 7,
      backpack: 8,
      weapon: 9,
      accessory: 10,
    });
    expect(seed).toBe(55);
  });

  it("returns the same tier and motif for the same seed", () => {
    const seed = 1234;
    expect(getRarityTier(seed)).toBe(getRarityTier(seed));
    expect(getMotif(seed)).toBe(getMotif(seed));
  });
});
