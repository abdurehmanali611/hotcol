/**
 * Café/restaurant sales tax helpers (Ethiopia).
 * Menu/order totals are treated as VAT-inclusive at the standard 15% rate
 * (VAT Proclamation No. 1341/2024).
 */
export const CAFE_SALES_VAT_RATE = 0.15;

export type CafeSalesVatBreakdown = {
  /** Gross sales including VAT (order line totals). */
  salesInclusiveETB: number;
  /** Taxable base excluding VAT. */
  salesExclusiveETB: number;
  /** VAT portion embedded in inclusive sales. */
  vatETB: number;
  rate: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split a VAT-inclusive amount into exclusive base + VAT. */
export function splitInclusiveVatETB(
  inclusiveETB: number,
  rate: number = CAFE_SALES_VAT_RATE,
): { exclusiveETB: number; vatETB: number } {
  const inclusive = Number(inclusiveETB) || 0;
  if (inclusive <= 0 || rate <= 0) {
    return { exclusiveETB: round2(Math.max(0, inclusive)), vatETB: 0 };
  }
  const exclusiveETB = inclusive / (1 + rate);
  const vatETB = inclusive - exclusiveETB;
  return { exclusiveETB: round2(exclusiveETB), vatETB: round2(vatETB) };
}

export function computeCafeSalesVatBreakdown(
  salesInclusiveETB: number,
  rate: number = CAFE_SALES_VAT_RATE,
): CafeSalesVatBreakdown {
  const salesInclusive = round2(Math.max(0, Number(salesInclusiveETB) || 0));
  const { exclusiveETB, vatETB } = splitInclusiveVatETB(salesInclusive, rate);
  return {
    salesInclusiveETB: salesInclusive,
    salesExclusiveETB: exclusiveETB,
    vatETB,
    rate,
  };
}
