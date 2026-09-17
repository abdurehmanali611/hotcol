import { api, API_URL } from "./client";
import { toast } from "sonner";

export type WaiterPaymentApprovalRequest = {
  id: number;
  HotelName: string;
  waiterId: number;
  waiterName: string;
  orderIds: number[];
  tableNo?: number | null;
  amountPaid: number;
  paymentMethod: string;
  withBank: boolean;
  status: string;
  requestNote?: string | null;
  cashierNote?: string | null;
  resolvedByUserName?: string | null;
  requestedAt: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  selectedTotal?: number | null;
  remainderAmount?: number | null;
  remainderMethod?: string | null;
  fullyPaid?: boolean | null;
};

const REQUEST_FIELDS = `
  id HotelName waiterId waiterName orderIds tableNo
  amountPaid paymentMethod withBank status
  requestNote cashierNote resolvedByUserName
  requestedAt resolvedAt createdAt updatedAt
  selectedTotal remainderAmount remainderMethod fullyPaid
`;

function normalizeRequest(row: WaiterPaymentApprovalRequest): WaiterPaymentApprovalRequest {
  const ids = Array.isArray(row.orderIds)
    ? row.orderIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : [];
  return { ...row, orderIds: ids };
}

export async function fetchPendingWaiterPaymentApprovals(): Promise<
  WaiterPaymentApprovalRequest[]
> {
  const query = `
    query {
      pendingWaiterPaymentApprovals {
        ${REQUEST_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, { query });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message ||
        "Failed to load payment approval requests",
    );
  }
  const rows = response.data.data?.pendingWaiterPaymentApprovals || [];
  return rows.map(normalizeRequest);
}

export async function resolveWaiterPaymentApproval(input: {
  requestId: number;
  approve: boolean;
  cashierNote?: string | null;
  bankTransferAmount?: number | null;
  bankTipCashDeduction?: number | null;
}): Promise<WaiterPaymentApprovalRequest> {
  const mutation = `
    mutation ResolveWaiterPaymentApproval(
      $requestId: Int!
      $approve: Boolean!
      $cashierNote: String
      $bankTransferAmount: Float
      $bankTipCashDeduction: Float
    ) {
      resolveWaiterPaymentApproval(
        requestId: $requestId
        approve: $approve
        cashierNote: $cashierNote
        bankTransferAmount: $bankTransferAmount
        bankTipCashDeduction: $bankTipCashDeduction
      ) {
        ${REQUEST_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      requestId: input.requestId,
      approve: input.approve,
      cashierNote: input.cashierNote?.trim() || null,
      bankTransferAmount: input.bankTransferAmount ?? null,
      bankTipCashDeduction: input.bankTipCashDeduction ?? null,
    },
  });
  if (response.data.errors?.length) {
    const msg =
      response.data.errors[0]?.message ||
      "Failed to resolve payment approval request";
    toast.error(msg);
    throw new Error(msg);
  }
  const row = normalizeRequest(
    response.data.data.resolveWaiterPaymentApproval,
  );
  toast.success(
    input.approve
      ? "Payment approved — order marked paid"
      : "Payment approval request dismissed",
  );
  return row;
}
