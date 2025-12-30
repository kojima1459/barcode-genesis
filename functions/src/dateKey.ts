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
