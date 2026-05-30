import type { PaymentCategoryMode } from "@/components/hotel/HotelInventoryPaymentCategoryPanel";

export const PAYMENT_CATEGORY_NAV: {
  id: string;
  mode: PaymentCategoryMode;
  label: string;
}[] = [
  { id: "payment-credit", mode: "credit", label: "Credit vouchers" },
  { id: "payment-paid", mode: "paid", label: "Paid receiving" },
  { id: "payment-with-vat", mode: "with-vat", label: "With VAT" },
  { id: "payment-without-vat", mode: "without-vat", label: "Without VAT" },
];

export const REQUEST_STATUS_NAV = [
  { id: "purchase-request-status", label: "Purchase requests" },
  { id: "stock-movement-status", label: "Stock movements" },
  { id: "item-registration-status", label: "Item registrations" },
] as const;

export type RequestStatusNavId = (typeof REQUEST_STATUS_NAV)[number]["id"];

export function isPaymentCategorySection(
  section: string,
): section is (typeof PAYMENT_CATEGORY_NAV)[number]["id"] {
  return PAYMENT_CATEGORY_NAV.some((n) => n.id === section);
}

export function paymentModeFromSection(
  section: string,
): PaymentCategoryMode | null {
  return PAYMENT_CATEGORY_NAV.find((n) => n.id === section)?.mode ?? null;
}
