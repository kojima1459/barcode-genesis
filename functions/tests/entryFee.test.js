const test = require("node:test");
const assert = require("node:assert/strict");
const { ENTRY_FEE_CREDITS, resolveEntryFee } = require("../lib/functions/src/battleEntryFee");

test("entry fee charges once per battle id", () => {
  const first = resolveEntryFee({ credits: 20, entryFeeCharged: false });
  assert.equal(first.charged, true);
  assert.equal(first.fee, ENTRY_FEE_CREDITS);
  assert.equal(first.insufficient, false);

  const second = resolveEntryFee({ credits: 20, entryFeeCharged: true });
  assert.equal(second.charged, false);
  assert.equal(second.fee, 0);
  assert.equal(second.insufficient, false);
});

test("entry fee fails when credits are insufficient", () => {
  const result = resolveEntryFee({ credits: ENTRY_FEE_CREDITS - 1, entryFeeCharged: false });
  assert.equal(result.charged, false);
  assert.equal(result.insufficient, true);
});
