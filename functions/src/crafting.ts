export const CRAFT_RECIPES = {
  BOOST: { tokens: 1, credits: 10 },
  SHIELD: { tokens: 1, credits: 10 },
  JAMMER: { tokens: 2, credits: 25 },
  DRONE: { tokens: 3, credits: 0 },
} as const;

export type CraftItemId = keyof typeof CRAFT_RECIPES;

export const isCraftItemId = (itemId: string): itemId is CraftItemId => {
  return Object.prototype.hasOwnProperty.call(CRAFT_RECIPES, itemId);
};

export const getCraftCosts = (itemId: CraftItemId, qty: number) => {
  const recipe = CRAFT_RECIPES[itemId];
  const safeQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
  return {
    tokenCost: recipe.tokens,
    creditCost: recipe.credits,
    totalTokenCost: recipe.tokens * safeQty,
    totalCreditCost: recipe.credits * safeQty,
  };
};

export type CraftCheckFailure = "insufficient-tokens" | "insufficient-credits";
export type CraftCheckResult =
  | { ok: true }
  | { ok: false; reason: CraftCheckFailure };

export const checkCraftResources = (params: {
  scanTokens: number;
  credits: number;
  totalTokenCost: number;
  totalCreditCost: number;
}): CraftCheckResult => {
  const scanTokens = Number.isFinite(params.scanTokens) ? params.scanTokens : 0;
  const credits = Number.isFinite(params.credits) ? params.credits : 0;

  if (scanTokens < params.totalTokenCost) {
    return { ok: false, reason: "insufficient-tokens" };
  }
  if (credits < params.totalCreditCost) {
    return { ok: false, reason: "insufficient-credits" };
  }
  return { ok: true };
};

export const applyCraftBalances = (params: {
  currentTokens: number;
  currentCredits: number;
  currentQty: number;
  itemId: CraftItemId;
  qty: number;
}) => {
  const { totalTokenCost, totalCreditCost } = getCraftCosts(params.itemId, params.qty);
  const check = checkCraftResources({
    scanTokens: params.currentTokens,
    credits: params.currentCredits,
    totalTokenCost,
    totalCreditCost,
  });
  if (!check.ok) {
    return { ok: false as const, reason: check.reason };
  }
  return {
    ok: true as const,
    nextTokens: params.currentTokens - totalTokenCost,
    nextCredits: params.currentCredits - totalCreditCost,
    nextQty: params.currentQty + params.qty,
  };
};
