export const SCAN_TOKEN_PER_SCAN = 1;

export const normalizeScanTokens = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export const applyScanTokenGrant = (current: number): number => {
  return normalizeScanTokens(current) + SCAN_TOKEN_PER_SCAN;
};

export type ScanDailyState = {
  barcodes: Record<string, true>;
  issuedCount: number;
};

export const normalizeScanDaily = (value: unknown): ScanDailyState => {
  const data = value as { barcodes?: Record<string, unknown>; issuedCount?: unknown } | null;
  const barcodes = data && typeof data.barcodes === "object" && data.barcodes !== null
    ? Object.keys(data.barcodes).reduce<Record<string, true>>((acc, key) => {
      if (data.barcodes && data.barcodes[key]) acc[key] = true;
      return acc;
    }, {})
    : {};
  const issuedCount = typeof data?.issuedCount === "number" && Number.isFinite(data.issuedCount)
    ? data.issuedCount
    : 0;
  return { barcodes, issuedCount };
};

export const applyScanDailyAward = (state: ScanDailyState, barcode: string) => {
  if (state.barcodes[barcode]) {
    return { awarded: false as const, nextState: state };
  }
  const nextState: ScanDailyState = {
    barcodes: { ...state.barcodes, [barcode]: true },
    issuedCount: state.issuedCount + 1,
  };
  return { awarded: true as const, nextState };
};
