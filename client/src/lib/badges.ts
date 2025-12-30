export type LoginBadge = {
  id: string;
  threshold: number;
  name: string;
  description: string;
};

export const LOGIN_BADGES: LoginBadge[] = [
  { id: "streak_3", threshold: 3, name: "連続3日", description: "3日連続でログイン達成" },
  { id: "streak_7", threshold: 7, name: "連続7日", description: "1週間連続でログイン達成" },
  { id: "streak_14", threshold: 14, name: "連続14日", description: "2週間連続でログイン達成" },
  { id: "streak_30", threshold: 30, name: "連続30日", description: "1ヶ月連続でログイン達成" },
  { id: "streak_60", threshold: 60, name: "連続60日", description: "2ヶ月連続でログイン達成" },
  { id: "streak_100", threshold: 100, name: "連続100日", description: "100日連続でログイン達成" },
  { id: "streak_365", threshold: 365, name: "連続365日", description: "1年連続でログイン達成" },
];

export const getBadgeById = (id?: string | null): LoginBadge | undefined => {
  if (!id) return undefined;
  return LOGIN_BADGES.find((badge) => badge.id === id);
};

export const getBadgeLabel = (id?: string | null): string | null => {
  const badge = getBadgeById(id);
  return badge ? badge.name : null;
};
