export const LOGIN_BADGE_THRESHOLDS = [3, 7, 14, 30, 60, 100, 365] as const;

export type LoginBadgeId = `streak_${number}`;

export const getLoginBadgeId = (threshold: number): LoginBadgeId => {
  return `streak_${threshold}` as LoginBadgeId;
};

export const getTitleIdForStreak = (maxStreak: number): LoginBadgeId | null => {
  const reached = LOGIN_BADGE_THRESHOLDS.filter((threshold) => maxStreak >= threshold);
  if (reached.length === 0) return null;
  const maxThreshold = Math.max(...reached);
  return getLoginBadgeId(maxThreshold);
};

export type DailyLoginState = {
  lastDailyClaimDateKey?: string | null;
  loginStreak?: number;
  maxLoginStreak?: number;
  badgeIds?: string[];
  titleId?: string | null;
  credits?: number;
};

export type DailyLoginResult = {
  claimed: boolean;
  dateKey: string;
  streak: number;
  maxStreak: number;
  badgeIds: string[];
  newBadges: string[];
  titleId: string | null;
  creditsGained: number;
  credits: number;
};

export const resolveDailyLogin = (params: {
  todayKey: string;
  yesterdayKey: string;
  state: DailyLoginState;
  bonusAmount: number;
}): DailyLoginResult => {
  const { todayKey, yesterdayKey, state, bonusAmount } = params;
  const lastClaim = typeof state.lastDailyClaimDateKey === "string" ? state.lastDailyClaimDateKey : null;
  const currentStreak = typeof state.loginStreak === "number" && Number.isFinite(state.loginStreak) ? state.loginStreak : 0;
  const currentMax = typeof state.maxLoginStreak === "number" && Number.isFinite(state.maxLoginStreak)
    ? state.maxLoginStreak
    : currentStreak;
  const currentBadges = Array.isArray(state.badgeIds) ? state.badgeIds.filter((id) => typeof id === "string") : [];
  const currentTitle = typeof state.titleId === "string" ? state.titleId : null;
  const currentCredits = typeof state.credits === "number" && Number.isFinite(state.credits) ? state.credits : 0;

  if (lastClaim === todayKey) {
    return {
      claimed: false,
      dateKey: todayKey,
      streak: currentStreak,
      maxStreak: currentMax,
      badgeIds: currentBadges,
      newBadges: [],
      titleId: currentTitle,
      creditsGained: 0,
      credits: currentCredits,
    };
  }

  const nextStreak = lastClaim === yesterdayKey ? currentStreak + 1 : 1;
  const nextMax = Math.max(currentMax, nextStreak);
  const newBadges = LOGIN_BADGE_THRESHOLDS
    .map((threshold) => getLoginBadgeId(threshold))
    .filter((id, index) => nextStreak >= LOGIN_BADGE_THRESHOLDS[index] && !currentBadges.includes(id));
  const nextBadgeIds = newBadges.length > 0
    ? Array.from(new Set([...currentBadges, ...newBadges]))
    : currentBadges;
  const nextTitle = getTitleIdForStreak(nextMax) ?? currentTitle;
  const nextCredits = currentCredits + bonusAmount;

  return {
    claimed: true,
    dateKey: todayKey,
    streak: nextStreak,
    maxStreak: nextMax,
    badgeIds: nextBadgeIds,
    newBadges,
    titleId: nextTitle,
    creditsGained: bonusAmount,
    credits: nextCredits,
  };
};
