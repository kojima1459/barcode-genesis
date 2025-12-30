const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveDailyLogin, getLoginBadgeId } = require("../lib/functions/src/dailyLogin");

test("daily login is idempotent for same JST day", () => {
  const result = resolveDailyLogin({
    todayKey: "2025-01-02",
    yesterdayKey: "2025-01-01",
    bonusAmount: 50,
    state: {
      lastDailyClaimDateKey: "2025-01-02",
      loginStreak: 4,
      maxLoginStreak: 10,
      badgeIds: [getLoginBadgeId(3)],
      titleId: getLoginBadgeId(3),
      credits: 100,
    },
  });
  assert.equal(result.claimed, false);
  assert.equal(result.streak, 4);
  assert.equal(result.creditsGained, 0);
  assert.equal(result.credits, 100);
});

test("daily login increments streak on consecutive day", () => {
  const result = resolveDailyLogin({
    todayKey: "2025-01-02",
    yesterdayKey: "2025-01-01",
    bonusAmount: 50,
    state: {
      lastDailyClaimDateKey: "2025-01-01",
      loginStreak: 2,
      maxLoginStreak: 2,
      badgeIds: [],
      credits: 0,
    },
  });
  assert.equal(result.claimed, true);
  assert.equal(result.streak, 3);
  assert.equal(result.maxStreak, 3);
  assert.equal(result.creditsGained, 50);
});

test("daily login resets streak when not consecutive", () => {
  const result = resolveDailyLogin({
    todayKey: "2025-01-05",
    yesterdayKey: "2025-01-04",
    bonusAmount: 50,
    state: {
      lastDailyClaimDateKey: "2025-01-02",
      loginStreak: 5,
      maxLoginStreak: 5,
      badgeIds: [],
      credits: 10,
    },
  });
  assert.equal(result.claimed, true);
  assert.equal(result.streak, 1);
  assert.equal(result.maxStreak, 5);
});

test("badge is awarded only once when threshold is reached", () => {
  const badgeId = getLoginBadgeId(3);
  const result = resolveDailyLogin({
    todayKey: "2025-01-03",
    yesterdayKey: "2025-01-02",
    bonusAmount: 50,
    state: {
      lastDailyClaimDateKey: "2025-01-02",
      loginStreak: 2,
      maxLoginStreak: 2,
      badgeIds: [badgeId],
      credits: 0,
    },
  });
  assert.equal(result.claimed, true);
  assert.equal(result.newBadges.length, 0);
  assert.equal(result.badgeIds.includes(badgeId), true);
});
