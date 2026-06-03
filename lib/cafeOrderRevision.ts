type RevisionOrder = {
  orderRevisedAt?: string | Date | null;
  /** @deprecated GraphQL may still return during rollout */
  quantityRevisedAt?: string | Date | null;
  orderRevisionCount?: number | null;
  status?: string | null;
};

export type OrderRevisionTier = {
  round: number;
  border: string;
  emphasisText: string;
  badge: string;
  label: string;
};

const TIERS: Omit<OrderRevisionTier, "round">[] = [
  {
    border: "border-l-amber-500",
    emphasisText: "text-amber-700 dark:text-amber-400",
    badge:
      "border-amber-400/80 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    label: "Order updated",
  },
  {
    border: "border-l-red-500",
    emphasisText: "text-red-700 dark:text-red-400",
    badge:
      "border-red-400/80 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    label: "Order updated again",
  },
  {
    border: "border-l-violet-500",
    emphasisText: "text-violet-700 dark:text-violet-400",
    badge:
      "border-violet-400/80 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    label: "Order updated again",
  },
];

function revisedTimestamp(order: RevisionOrder): number {
  const raw = order.orderRevisedAt ?? order.quantityRevisedAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** 0 = no highlight; 1+ = cycling color tier (amber → red → violet) on kitchen/bar. */
export function getOrderRevisionRound(order: RevisionOrder): number {
  const status = String(order.status ?? "").toLowerCase();
  if (status === "completed" || status === "cancelled") return 0;
  const ts = revisedTimestamp(order);
  if (ts <= 0) return 0;
  const count = Number(order.orderRevisionCount);
  if (Number.isFinite(count) && count > 0) return Math.floor(count);
  return 1;
}

export function isOrderRevised(order: RevisionOrder): boolean {
  return getOrderRevisionRound(order) > 0;
}

export function getOrderRevisionTier(round: number): OrderRevisionTier | null {
  if (round < 1) return null;
  const idx = (round - 1) % TIERS.length;
  const base = TIERS[idx];
  return { round, ...base };
}

export function maxRevisionRoundInGroup(orders: RevisionOrder[]): number {
  let max = 0;
  for (const o of orders) {
    max = Math.max(max, getOrderRevisionRound(o));
  }
  return max;
}
