export const MAX_LEVEL = 99;

export const levelFromXp = (xp: number): number => {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const rawLevel = 1 + Math.floor(Math.sqrt(safeXp / 100));
  return Math.min(MAX_LEVEL, Math.max(1, rawLevel));
};
