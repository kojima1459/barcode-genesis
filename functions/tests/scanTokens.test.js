const test = require("node:test");
const assert = require("node:assert/strict");
const { SCAN_TOKEN_PER_SCAN, applyScanTokenGrant, applyScanDailyAward, normalizeScanDaily } = require("../lib/functions/src/scanTokens");
const { getJstDateKey } = require("../lib/functions/src/dateKey");

test("scan token grant is fixed to 1 per scan", () => {
  assert.equal(SCAN_TOKEN_PER_SCAN, 1);
  assert.equal(applyScanTokenGrant(0), 1);
  assert.equal(applyScanTokenGrant(4), 5);
});

test("scan daily award only once per barcode", () => {
  const state = normalizeScanDaily({});
  const first = applyScanDailyAward(state, "4901234567890");
  assert.equal(first.awarded, true);
  assert.equal(first.nextState.issuedCount, 1);
  const second = applyScanDailyAward(first.nextState, "4901234567890");
  assert.equal(second.awarded, false);
  assert.equal(second.nextState.issuedCount, 1);
});

test("JST date key rolls over at 15:00 UTC", () => {
  const before = new Date(Date.UTC(2024, 0, 1, 14, 59, 59));
  const after = new Date(Date.UTC(2024, 0, 1, 15, 0, 0));
  assert.equal(getJstDateKey(before), "2024-01-01");
  assert.equal(getJstDateKey(after), "2024-01-02");
});
