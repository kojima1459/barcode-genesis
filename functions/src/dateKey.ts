const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const getJstDateKey = (date: Date = new Date()): string => {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
};

export const getYesterdayJstDateKey = (): string => {
  const jst = new Date(Date.now() + JST_OFFSET_MS);
  jst.setUTCDate(jst.getUTCDate() - 1);
  return jst.toISOString().slice(0, 10);
};

/**
 * Get JST-based week key in YYYY-WW format
 * Uses ISO week number calculation
 */
export const getJstWeekKey = (date: Date = new Date()): string => {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);

  // ISO week calculation: Week 1 is the week containing January 4th
  const jan4 = new Date(Date.UTC(jst.getUTCFullYear(), 0, 4));
  const dayOfYear = Math.floor((jst.getTime() - new Date(Date.UTC(jst.getUTCFullYear(), 0, 1)).getTime()) / 86400000);

  // Adjust for the start of the week (Monday)
  const jan4DayOfWeek = (jan4.getUTCDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const weekNum = Math.floor((dayOfYear + jan4DayOfWeek + 1) / 7) + 1;

  // Handle edge case: week 53+ may belong to next year's week 1
  const year = jst.getUTCFullYear();
  const adjustedWeekNum = Math.min(weekNum, 52);

  return `${year}-${String(adjustedWeekNum).padStart(2, '0')}`;
};
