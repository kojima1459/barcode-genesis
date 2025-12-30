export type LedgerEntryType = "SCAN" | "CRAFT" | "BATTLE_REWARD" | "ENTRY_FEE";

export const buildLedgerEntry = (params: {
  type: LedgerEntryType;
  deltaCredits?: number;
  deltaXp?: number;
  deltaScanTokens?: number;
  refId: string;
}) => {
  return {
    type: params.type,
    deltaCredits: Number.isFinite(params.deltaCredits) ? params.deltaCredits : 0,
    deltaXp: Number.isFinite(params.deltaXp) ? params.deltaXp : 0,
    deltaScanTokens: Number.isFinite(params.deltaScanTokens) ? params.deltaScanTokens : 0,
    refId: params.refId,
  };
};
