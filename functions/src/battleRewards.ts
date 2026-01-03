export const CREDITS_REWARD = 10;
export const XP_REWARD = 25;
export const SCAN_TOKENS_REWARD = 1;
export const MAX_LEVEL = 99;
export const DAILY_CREDITS_CAP = 100;
export const DAILY_XP_CAP = 200;

export type BattleRewardReason = "DAILY_CAP" | null;

export type BattleRewardPayload = {
  creditsReward: number;
  xpReward: number;
  scanTokensGained: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  dailyCapApplied: boolean;
  dailyCreditsCapApplied: boolean;
  capped: boolean;
  capRemaining: number;
  reason: BattleRewardReason;
};

export const levelFromXp = (xp: number): number => {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const rawLevel = 1 + Math.floor(Math.sqrt(safeXp / 100));
  return Math.min(MAX_LEVEL, Math.max(1, rawLevel));
};

const getUserXp = (userData: Record<string, unknown>): number => {
  const value = userData?.xp;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export type BattleRewardApplication = {
  granted: boolean;
  reward: BattleRewardPayload;
  creditsDelta: number;
  scanTokensGained: number;
  xpAfter: number;
  levelAfter: number;
  dailyBattleDateKey: string | null;
  dailyBattleCreditsEarned: number | null;
  dailyBattleXpEarned: number | null;
};

export const applyBattleRewards = (params: {
  battleData: Record<string, unknown>;
  userData: Record<string, unknown>;
  userId: string;
  winnerUid: string | null;
  todayKey: string;
  dailyCreditsCap?: number;
  dailyXpCap?: number;
  isPremium?: boolean;  // NEW: Premium user flag
}): BattleRewardApplication => {
  const { battleData, userData, userId, winnerUid, todayKey, dailyCreditsCap, isPremium } = params;
  const rewardGranted = battleData?.rewardGranted === true;
  const isCompleted = battleData?.status === "completed" || !!battleData?.winner;
  const isWinner = !!winnerUid && winnerUid === userId;

  const creditsCap = typeof dailyCreditsCap === "number" && Number.isFinite(dailyCreditsCap)
    ? Math.max(0, dailyCreditsCap)
    : DAILY_CREDITS_CAP;
  const storedDate = typeof userData?.dailyBattleDateKey === "string" ? userData.dailyBattleDateKey : null;
  const storedCredits = typeof userData?.dailyBattleCreditsEarned === "number" && Number.isFinite(userData.dailyBattleCreditsEarned)
    ? userData.dailyBattleCreditsEarned
    : 0;
  const storedXp = typeof userData?.dailyBattleXpEarned === "number" && Number.isFinite(userData.dailyBattleXpEarned)
    ? userData.dailyBattleXpEarned
    : 0;
  const effectiveCredits = storedDate === todayKey ? storedCredits : 0;
  const effectiveXp = storedDate === todayKey ? storedXp : 0;

  const creditsRemaining = Math.max(0, creditsCap - effectiveCredits);
  const creditsReward = isWinner ? Math.min(CREDITS_REWARD, creditsRemaining) : 0;

  // NEW: Premium XP Bonus (150%)
  const baseXpReward = isWinner ? XP_REWARD : 0;
  const xpReward = isPremium ? Math.floor(baseXpReward * 1.5) : baseXpReward;

  const scanTokensGained = isWinner ? SCAN_TOKENS_REWARD : 0;
  const dailyCreditsCapApplied = isWinner && creditsReward === 0;
  const dailyCapApplied = dailyCreditsCapApplied;
  const capped = dailyCreditsCapApplied;
  const reason: BattleRewardReason = dailyCreditsCapApplied ? "DAILY_CAP" : null;
  const nextCredits = isWinner ? effectiveCredits + creditsReward : effectiveCredits;
  const nextXp = isWinner ? effectiveXp + xpReward : effectiveXp;
  const capRemaining = Math.max(0, creditsCap - nextCredits);
  const xpBefore = getUserXp(userData);
  const xpAfter = xpBefore + xpReward;
  const levelBefore = levelFromXp(xpBefore);
  const levelAfter = levelFromXp(xpAfter);

  const reward = {
    creditsReward,
    xpReward,
    scanTokensGained,
    xpBefore,
    xpAfter,
    levelBefore,
    levelAfter,
    dailyCapApplied,
    dailyCreditsCapApplied,
    capped,
    capRemaining,
    reason,
  };

  if (!isCompleted || rewardGranted) {
    return {
      granted: false,
      reward,
      creditsDelta: 0,
      scanTokensGained: 0,
      xpAfter: xpBefore,
      levelAfter: levelBefore,
      dailyBattleDateKey: storedDate,
      dailyBattleCreditsEarned: storedCredits,
      dailyBattleXpEarned: storedXp,
    };
  }

  return {
    granted: true,
    reward,
    creditsDelta: creditsReward,
    scanTokensGained,
    xpAfter,
    levelAfter,
    dailyBattleDateKey: isWinner ? todayKey : null,
    dailyBattleCreditsEarned: isWinner ? nextCredits : null,
    dailyBattleXpEarned: isWinner ? nextXp : null,
  };
};
