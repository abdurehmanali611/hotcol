/**
 * Lodging corporate-credit plug-in (deferred).
 *
 * Room checkout stays on cash / bank / Telebirr until the hotel credit module
 * is finished. Flip `LODGING_CREDIT_PAYMENT_ENABLED` (or wire tenant settings)
 * and implement `applyLodgingCreditSettlement` when ready — Reception UI and
 * GraphQL checkout already call these helpers so the path is one place.
 */

export const LODGING_CREDIT_PAYMENT_ENABLED = false;

export function isLodgingCreditPaymentEnabled(): boolean {
  return Boolean(LODGING_CREDIT_PAYMENT_ENABLED);
}

export type LodgingCreditSettlementInput = {
  stayId: number;
  HotelName: string;
  amountETB: number;
  companyId?: number;
  staffName?: string;
  staffPhone?: string;
};

/**
 * Placeholder for future lodging credit settlement.
 * Throws until credit is enabled and wired to HotelCredit* tables.
 */
export async function applyLodgingCreditSettlement(
  _input: LodgingCreditSettlementInput,
): Promise<{ ok: true; reference: string }> {
  if (!isLodgingCreditPaymentEnabled()) {
    throw new Error(
      "Lodging corporate credit is not enabled yet — settle with cash, bank, or Telebirr",
    );
  }
  throw new Error(
    "Lodging credit settlement is enabled but not wired — implement applyLodgingCreditSettlement",
  );
}
