export type RarityTier = "A_MASS" | "B_ACE";
export type Motif = "ZAKU" | "EVA";

export type RobotPartsSeed = {
  head: number;
  face: number;
  body: number;
  armLeft: number;
  armRight: number;
  legLeft: number;
  legRight: number;
  backpack: number;
  weapon: number;
  accessory: number;
};

const toSafeSeed = (seed: number) => (Number.isFinite(seed) ? seed : 0);

export const getRobotSeed = (parts: RobotPartsSeed): number => {
  return Object.values(parts).reduce((acc, val) => acc + (Number.isFinite(val) ? val : 0), 0);
};

export const getRarityTier = (seed: number): RarityTier => {
  const roll = Math.abs(toSafeSeed(seed)) % 1000;
  return roll < 50 ? "B_ACE" : "A_MASS";
};

export const getRarityLabel = (tier: RarityTier): string => {
  return tier === "B_ACE" ? "ACE" : "MASS";
};

export const getMotif = (seed: number): Motif => {
  const roll = Math.abs(toSafeSeed(seed)) % 100;
  return roll < 50 ? "ZAKU" : "EVA";
};

export const getMotifLabel = (motif: Motif): string => {
  return motif === "EVA" ? "EVA" : "ZAKU";
};
