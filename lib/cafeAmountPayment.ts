import type { Order } from "@/lib/api/types";
import {
  cafeOrderLineTotalETB,
  distributeBankTransferAcrossOrders,
} from "@/lib/cafeBankPayment";

export type OrderPaymentChannel = {
  order: Order;
  withBank: boolean;
  bankTransferAmount?: number;
  bankTipCashDeduction?: number;
};

export type PrimaryAmountChannel = "cash" | "bank";

export type AmountTablePaymentPlan = {
  cashChannels: OrderPaymentChannel[];
  bankChannels: OrderPaymentChannel[];
  /** Amount customer paid in cash (entered or auto remainder). */
  requestedCash: number;
  /** Amount customer paid by bank (entered or auto remainder). */
  requestedBank: number;
  /** Sum of cash order line totals assigned to cash. */
  cashLineTotal: number;
  /** Sum of bank order line totals assigned to bank. */
  bankLineTotal: number;
};

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

type PartitionResult = { cashOrders: Order[]; bankOrders: Order[] };

/**
 * Pick orders for the primary channel (max sum <= primaryBudget), rest go to secondary.
 */
function pickMaxSubsetWithinBudget(
  orders: Order[],
  primaryBudget: number,
): { primaryOrders: Order[]; secondaryOrders: Order[] } {
  if (orders.length === 0) {
    return { primaryOrders: [], secondaryOrders: [] };
  }

  const sorted = [...orders].sort((a, b) => a.id - b.id);
  const totals = sorted.map((o) => cafeOrderLineTotalETB(o));
  const n = sorted.length;
  const limit = 1 << n;

  let bestMask = 0;
  let bestSum = 0;

  for (let mask = 0; mask < limit; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) sum += totals[i];
    }
    if (sum <= primaryBudget + 0.001 && sum > bestSum) {
      bestSum = sum;
      bestMask = mask;
    }
  }

  const primaryOrders: Order[] = [];
  const secondaryOrders: Order[] = [];
  for (let i = 0; i < n; i++) {
    if (bestMask & (1 << i)) primaryOrders.push(sorted[i]);
    else secondaryOrders.push(sorted[i]);
  }

  return { primaryOrders, secondaryOrders };
}

function partitionOrdersForPrimaryChannel(
  orders: Order[],
  primaryBudget: number,
  primaryChannel: PrimaryAmountChannel,
): PartitionResult {
  const { primaryOrders, secondaryOrders } = pickMaxSubsetWithinBudget(
    orders,
    primaryBudget,
  );

  if (primaryChannel === "cash") {
    return { cashOrders: primaryOrders, bankOrders: secondaryOrders };
  }
  return { cashOrders: secondaryOrders, bankOrders: primaryOrders };
}

/**
 * Cash-first: assign whole lines to cash up to entered amount; never leave all
 * items on bank when customer paid cash (e.g. one 520 ETB line with 200 cash).
 */
function partitionOrdersForCashFirst(
  orders: Order[],
  cashBudget: number,
): PartitionResult {
  const { primaryOrders, secondaryOrders } = pickMaxSubsetWithinBudget(
    orders,
    cashBudget,
  );

  if (primaryOrders.length === 0 && cashBudget > 0.001 && orders.length > 0) {
    const smallest = [...orders].sort(
      (a, b) => cafeOrderLineTotalETB(a) - cafeOrderLineTotalETB(b),
    )[0];
    return {
      cashOrders: [smallest],
      bankOrders: orders.filter((order) => order.id !== smallest.id),
    };
  }

  return { cashOrders: primaryOrders, bankOrders: secondaryOrders };
}

/**
 * Cash-first bank lines: scale transfer to the amount paid by bank and record any
 * extra cash (entered cash above assigned cash item totals) as a negative tip
 * deduction so net cash revenue matches what the customer paid in cash.
 */
function buildCashFirstBankChannels(
  orders: Order[],
  requestedBank: number,
  cashSupplement: number,
): OrderPaymentChannel[] {
  if (orders.length === 0) return [];

  const lineSum = orders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );
  const supplement = roundMoney(Math.max(0, cashSupplement));

  if (Math.abs(requestedBank - lineSum) < 0.001 && supplement < 0.001) {
    return buildPlainBankChannels(orders);
  }

  if (requestedBank > lineSum + 0.001) {
    return buildScaledBankChannels(orders, requestedBank);
  }

  const rows = orders.map((order) => ({
    order,
    lineTotal: cafeOrderLineTotalETB(order),
  }));

  let assignedTransfer = 0;
  let assignedSupplement = 0;

  return rows.map((row, index) => {
    const isLast = index === rows.length - 1;
    const share =
      lineSum > 0 ? row.lineTotal / lineSum : 1 / rows.length;

    const bankTransferAmount = isLast
      ? roundMoney(requestedBank - assignedTransfer)
      : roundMoney(requestedBank * share);

    const bankTipCashDeduction = isLast
      ? roundMoney(-(supplement - assignedSupplement))
      : roundMoney(-supplement * share);

    assignedTransfer = roundMoney(assignedTransfer + bankTransferAmount);
    assignedSupplement = roundMoney(
      assignedSupplement + Math.abs(bankTipCashDeduction),
    );

    return {
      order: row.order,
      withBank: true,
      bankTransferAmount,
      bankTipCashDeduction,
    };
  });
}

/**
 * Bank lines at item totals (same as Pay Now → Bank).
 */
function buildPlainBankChannels(orders: Order[]): OrderPaymentChannel[] {
  return orders.map((order) => ({
    order,
    withBank: true,
  }));
}

/**
 * Bank-primary: scale transfer to the amount customer paid by bank (supports tips when over).
 */
function buildScaledBankChannels(
  orders: Order[],
  transferTotal: number,
): OrderPaymentChannel[] {
  if (orders.length === 0) return [];

  const lineSum = orders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );

  if (Math.abs(transferTotal - lineSum) < 0.001) {
    return buildPlainBankChannels(orders);
  }

  const distributions = distributeBankTransferAcrossOrders(orders, transferTotal);
  const distMap = new Map(distributions.map((d) => [d.id, d]));

  return orders.map((order) => {
    const dist = distMap.get(order.id);
    return {
      order,
      withBank: true,
      bankTransferAmount:
        dist?.bankTransferAmount ?? cafeOrderLineTotalETB(order),
      bankTipCashDeduction: dist?.bankTipCashDeduction ?? 0,
    };
  });
}

function buildCashFirstAmountPlan(
  completedOrders: Order[],
  enteredAmount: number,
): AmountTablePaymentPlan {
  const total = completedOrders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );
  const requestedCash = roundMoney(Math.max(0, Math.min(enteredAmount, total)));
  const requestedBank = roundMoney(Math.max(0, total - requestedCash));

  const { cashOrders, bankOrders } = partitionOrdersForCashFirst(
    completedOrders,
    requestedCash,
  );

  const cashLineTotal = cashOrders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );
  const bankLineTotal = bankOrders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );
  const cashSupplement = roundMoney(Math.max(0, requestedCash - cashLineTotal));

  return {
    cashChannels: cashOrders.map((order) => ({
      order,
      withBank: false as const,
    })),
    bankChannels: buildCashFirstBankChannels(
      bankOrders,
      requestedBank,
      cashSupplement,
    ),
    requestedCash,
    requestedBank,
    cashLineTotal: roundMoney(cashLineTotal),
    bankLineTotal: roundMoney(bankLineTotal),
  };
}

function buildBankFirstAmountPlan(
  completedOrders: Order[],
  enteredAmount: number,
): AmountTablePaymentPlan {
  const total = completedOrders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );
  const requestedBank = roundMoney(Math.max(0, Math.min(enteredAmount, total)));
  const requestedCash = roundMoney(Math.max(0, total - requestedBank));

  const { cashOrders, bankOrders } = partitionOrdersForPrimaryChannel(
    completedOrders,
    requestedBank,
    "bank",
  );

  const cashLineTotal = cashOrders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );
  const bankLineTotal = bankOrders.reduce(
    (sum, order) => sum + cafeOrderLineTotalETB(order),
    0,
  );

  return {
    cashChannels: cashOrders.map((order) => ({
      order,
      withBank: false as const,
    })),
    bankChannels: buildScaledBankChannels(bankOrders, requestedBank),
    requestedCash,
    requestedBank,
    cashLineTotal: roundMoney(cashLineTotal),
    bankLineTotal: roundMoney(bankLineTotal),
  };
}

/**
 * Split table settlement: entered amount on one channel; arithmetic remainder on the other.
 *
 * - Cash-first: cash items at line totals; bank transfer scaled to remainder; extra
 *   cash above assigned items recorded via negative bank tip (mirrors bank-first).
 * - Bank-first: items through bank up to entered amount; bank transfer scaled to entered amount.
 */
export function buildAmountTablePaymentPlan(
  completedOrders: Order[],
  enteredAmount: number,
  primaryChannel: PrimaryAmountChannel,
): AmountTablePaymentPlan {
  if (primaryChannel === "cash") {
    return buildCashFirstAmountPlan(completedOrders, enteredAmount);
  }
  return buildBankFirstAmountPlan(completedOrders, enteredAmount);
}
