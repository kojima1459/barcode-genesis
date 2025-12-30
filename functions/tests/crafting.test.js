const test = require("node:test");
const assert = require("node:assert/strict");
const { applyCraftBalances, getCraftCosts, isCraftItemId } = require("../lib/functions/src/crafting");

test("craft costs scale with quantity", () => {
  assert.equal(isCraftItemId("BOOST"), true);
  const costs = getCraftCosts("BOOST", 3);
  assert.equal(costs.totalTokenCost, 3);
  assert.equal(costs.totalCreditCost, 30);
});

test("craft fails when tokens are insufficient", () => {
  const result = applyCraftBalances({
    currentTokens: 0,
    currentCredits: 100,
    currentQty: 0,
    itemId: "JAMMER",
    qty: 1,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "insufficient-tokens");
});

test("craft fails when credits are insufficient", () => {
  const result = applyCraftBalances({
    currentTokens: 5,
    currentCredits: 0,
    currentQty: 0,
    itemId: "BOOST",
    qty: 1,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "insufficient-credits");
});

test("craft succeeds and updates balances", () => {
  const result = applyCraftBalances({
    currentTokens: 5,
    currentCredits: 50,
    currentQty: 2,
    itemId: "SHIELD",
    qty: 2,
  });
  assert.equal(result.ok, true);
  assert.equal(result.nextTokens, 3);
  assert.equal(result.nextCredits, 30);
  assert.equal(result.nextQty, 4);
});
