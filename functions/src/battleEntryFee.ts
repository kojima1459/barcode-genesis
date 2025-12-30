export const ENTRY_FEE_CREDITS = 5;

export const resolveEntryFee = (params: {
  credits: number;
  entryFeeCharged: boolean;
}) => {
  const credits = Number.isFinite(params.credits) ? params.credits : 0;
  if (params.entryFeeCharged) {
    return { charged: false, fee: 0, insufficient: false };
  }
  if (credits < ENTRY_FEE_CREDITS) {
    return { charged: false, fee: ENTRY_FEE_CREDITS, insufficient: true };
  }
  return { charged: true, fee: ENTRY_FEE_CREDITS, insufficient: false };
};
