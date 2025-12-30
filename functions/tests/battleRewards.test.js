const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyBattleRewards,
  CREDITS_REWARD,
  XP_REWARD,
  SCAN_TOKENS_REWARD,
  DAILY_CREDITS_CAP,
  levelFromXp,
} = require("../lib/functions/src/battleRewards");

test("battle rewards are fixed and idempotent per battle", () => {
  const userId = "user-1";
  const userData = { xp: 90 };
  const battleData = { status: "completed", rewardGranted: false };
  const todayKey = "2025-01-02";

  const first = applyBattleRewards({
    battleData,
    userData,
    userId,
    winnerUid: userId,
    todayKey,
  });

  assert.equal(first.granted, true);
  assert.equal(first.reward.creditsReward, CREDITS_REWARD);
  assert.equal(first.reward.xpReward, XP_REWARD);
  assert.equal(first.reward.scanTokensGained, SCAN_TOKENS_REWARD);
  assert.equal(first.scanTokensGained, SCAN_TOKENS_REWARD);
  assert.equal(first.creditsDelta, CREDITS_REWARD);
  assert.equal(first.reward.xpBefore, 90);
  assert.equal(first.reward.xpAfter, 90 + XP_REWARD);
  assert.equal(first.reward.levelBefore, levelFromXp(90));
  assert.equal(first.reward.levelAfter, levelFromXp(90 + XP_REWARD));

  const second = applyBattleRewards({
    battleData: { status: "completed", rewardGranted: true },
    userData: { xp: 90 + XP_REWARD },
    userId,
    winnerUid: userId,
    todayKey,
  });

  assert.equal(second.granted, false);
  assert.equal(second.creditsDelta, 0);
  assert.equal(second.xpAfter, 90 + XP_REWARD);
  assert.equal(second.levelAfter, levelFromXp(90 + XP_REWARD));
});

test("daily cap blocks reward gains after limit", () => {
  const todayKey = "2025-01-02";
  const userId = "user-2";
  const userData = {
    xp: 200,
    dailyBattleDateKey: todayKey,
    dailyBattleCreditsEarned: DAILY_CREDITS_CAP,
    dailyBattleXpEarned: 999,
  };

  const res = applyBattleRewards({
    battleData: { status: "completed", rewardGranted: false },
    userData,
    userId,
    winnerUid: userId,
    todayKey,
  });

  assert.equal(res.granted, true);
  assert.equal(res.reward.dailyCreditsCapApplied, true);
  assert.equal(res.reward.dailyCapApplied, true);
  assert.equal(res.reward.reason, "DAILY_CAP");
  assert.equal(res.reward.creditsReward, 0);
  assert.equal(res.reward.xpReward, XP_REWARD);
  assert.equal(res.reward.scanTokensGained, SCAN_TOKENS_REWARD);
  assert.equal(res.xpAfter, 200 + XP_REWARD);
  assert.equal(res.reward.xpAfter, 200 + XP_REWARD);
  assert.equal(res.dailyBattleCreditsEarned, DAILY_CREDITS_CAP);
  assert.equal(res.dailyBattleXpEarned, 999 + XP_REWARD);
});

test("daily cap resets on date rollover", () => {
  const todayKey = "2025-01-02";
  const userId = "user-3";
  const userData = {
    xp: 0,
    dailyBattleDateKey: "2025-01-01",
    dailyBattleCreditsEarned: DAILY_CREDITS_CAP,
    dailyBattleXpEarned: 0,
  };

  const res = applyBattleRewards({
    battleData: { status: "completed", rewardGranted: false },
    userData,
    userId,
    winnerUid: userId,
    todayKey,
  });

  assert.equal(res.reward.dailyCapApplied, false);
  assert.equal(res.reward.creditsReward, CREDITS_REWARD);
  assert.equal(res.reward.xpReward, XP_REWARD);
  assert.equal(res.dailyBattleCreditsEarned, CREDITS_REWARD);
  assert.equal(res.dailyBattleXpEarned, XP_REWARD);
  assert.equal(res.dailyBattleDateKey, todayKey);
});

test("daily cap applies remaining amount only", () => {
  const todayKey = "2025-01-02";
  const userId = "user-4";
  const userData = {
    xp: 50,
    dailyBattleDateKey: todayKey,
    dailyBattleCreditsEarned: DAILY_CREDITS_CAP - 5,
    dailyBattleXpEarned: 10,
  };

  const res = applyBattleRewards({
    battleData: { status: "completed", rewardGranted: false },
    userData,
    userId,
    winnerUid: userId,
    todayKey,
  });

  assert.equal(res.reward.creditsReward, 5);
  assert.equal(res.reward.xpReward, XP_REWARD);
  assert.equal(res.dailyBattleCreditsEarned, DAILY_CREDITS_CAP);
  assert.equal(res.dailyBattleXpEarned, 10 + XP_REWARD);
});
