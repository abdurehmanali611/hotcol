import type { Order } from "@/lib/api/types";
import { isBankPayment, isCashPayment } from "@/lib/api/cafeOrders";

export function cafeOrderLineTotalETB(order: Order): number {
  return (Number(order.price) || 0) * (Number(order.orderAmount) || 0);
}

export function getOrderBankTransferAmount(order: Order): number {
  if (!isBankPayment(order)) return 0;
  const lineTotal = cafeOrderLineTotalETB(order);
  const transfer = Number(order.bankTransferAmount);
  if (Number.isFinite(transfer) && transfer > 0) return transfer;
  return lineTotal;
}

export function getOrderBankTipCashDeduction(order: Order): number {
  if (!isBankPayment(order)) return 0;
  const stored = Number(order.bankTipCashDeduction);
  if (Number.isFinite(stored)) return stored;
  const lineTotal = cafeOrderLineTotalETB(order);
  const transfer = Number(order.bankTransferAmount);
  if (Number.isFinite(transfer) && transfer > lineTotal) {
    return transfer - lineTotal;
  }
  return 0;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export type BankTransferDistribution = {
  id: number;
  bankTransferAmount: number;
  bankTipCashDeduction: number;
};

/** Split one bank transfer total across selected orders (tip share by line total). */
export function distributeBankTransferAcrossOrders(
  orders: Order[],
  totalTransferAmount: number,
): BankTransferDistribution[] {
  if (!orders.length) return [];

  const rows = orders.map((order) => ({
    id: order.id,
    lineTotal: cafeOrderLineTotalETB(order),
  }));
  const batchTotal = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const tipTotal = Math.max(0, roundMoney(totalTransferAmount - batchTotal));

  const distributions: BankTransferDistribution[] = [];
  let assignedTransfer = 0;
  let assignedTip = 0;

  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    const share = batchTotal > 0 ? row.lineTotal / batchTotal : 1 / rows.length;
    const tipShare = isLast
      ? roundMoney(tipTotal - assignedTip)
      : roundMoney(tipTotal * share);
    const transferShare = isLast
      ? roundMoney(totalTransferAmount - assignedTransfer)
      : roundMoney(row.lineTotal + tipShare);

    assignedTip = roundMoney(assignedTip + tipShare);
    assignedTransfer = roundMoney(assignedTransfer + transferShare);

    distributions.push({
      id: row.id,
      bankTransferAmount: transferShare,
      bankTipCashDeduction: tipShare,
    });
  });

  return distributions;
}

export function sumCashOrderRevenueETB(orders: Order[]): number {
  return orders
    .filter(isCashPayment)
    .reduce((sum, order) => sum + cafeOrderLineTotalETB(order), 0);
}

export function sumBankOrderRevenueETB(orders: Order[]): number {
  return orders
    .filter(isBankPayment)
    .reduce((sum, order) => sum + getOrderBankTransferAmount(order), 0);
}

export function sumBankTipCashDeductionsETB(orders: Order[]): number {
  return orders
    .filter(isBankPayment)
    .reduce((sum, order) => sum + getOrderBankTipCashDeduction(order), 0);
}

export function sumNetCashRevenueETB(orders: Order[]): number {
  return (
    sumCashOrderRevenueETB(orders) - sumBankTipCashDeductionsETB(orders)
  );
}
