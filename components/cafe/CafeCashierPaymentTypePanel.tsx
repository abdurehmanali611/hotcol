"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchTables,
  getPaymentMethod,
  isBankPayment,
  isCashPayment,
  updateOrderPayment,
  type Order,
  type Table,
} from "@/lib/actions";
import {
  formatCafeOrderBatchTime,
  formatCafeTableDisplayFromRegistry,
  groupCafePaidOrderBatches,
  isPaidCashOrBankCafeOrder,
  normalizeOrderTableNo,
  sumOrderLinesETB,
  type CafePaidOrderBatch,
} from "@/lib/cafeTableOrder";
import { CafeTableLabel } from "@/components/cafe/CafeTableLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cafeOrderLineTotalETB,
  distributeBankTransferAcrossOrders,
} from "@/lib/cafeBankPayment";
import {
  buildAmountTablePaymentPlan,
  type PrimaryAmountChannel,
} from "@/lib/cafeAmountPayment";
import { CafePaymentAmountSplitDialog } from "@/components/cafe/CafePaymentAmountSplitDialog";

type Props = {
  orders: Order[];
  hotelName: string;
  onRefresh: () => void | Promise<void>;
};

type PendingChange = "cash" | "bank" | null;
type PaymentTypeFilter = "all" | "cash" | "bank";
type TableFilter = "all" | number;

const FILTER_OPTIONS = [
  {
    value: "all" as const,
    label: "All",
    icon: ArrowLeftRight,
    active:
      "bg-background text-foreground shadow-sm ring-1 ring-border/60",
  },
  {
    value: "cash" as const,
    label: "Cash",
    icon: Banknote,
    active:
      "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900/60",
  },
  {
    value: "bank" as const,
    label: "Bank",
    icon: Building2,
    active:
      "bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-900/60",
  },
] as const;

const ROW_GRID =
  "md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,0.7fr)_minmax(0,0.65fr)_minmax(0,0.55fr)]";

function formatAmountETB(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function lineTotalETB(order: Order): number {
  return cafeOrderLineTotalETB(order);
}

function batchMatchesNameSearch(batch: CafePaidOrderBatch, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return batch.orders.some((order) =>
    String(order.title ?? "")
      .toLowerCase()
      .includes(q),
  );
}

/** Full multi-item batch selected — eligible for cash + bank amount split. */
function findFullSelectedBatch(
  selectedIds: Set<number>,
  batches: CafePaidOrderBatch[],
): CafePaidOrderBatch | null {
  if (selectedIds.size < 2) return null;
  for (const batch of batches) {
    if (batch.orders.length < 2) continue;
    const batchIdSet = new Set(batch.orders.map((order) => order.id));
    if (batchIdSet.size !== selectedIds.size) continue;
    if ([...selectedIds].every((id) => batchIdSet.has(id))) {
      return batch;
    }
  }
  return null;
}

function orderMatchesPaymentFilter(
  order: Order,
  filter: PaymentTypeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "cash") return isCashPayment(order);
  return isBankPayment(order);
}

function filterBatchByPaymentType(
  batch: CafePaidOrderBatch,
  filter: PaymentTypeFilter,
): CafePaidOrderBatch | null {
  if (filter === "all") return batch;
  const orders = batch.orders.filter((order) =>
    orderMatchesPaymentFilter(order, filter),
  );
  if (orders.length === 0) return null;
  return {
    ...batch,
    key: `${batch.key}:${filter}`,
    orders,
  };
}

function batchSelectionState(
  orderIds: number[],
  selectedIds: Set<number>,
): boolean | "indeterminate" {
  const selectedCount = orderIds.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === orderIds.length) return true;
  return "indeterminate";
}

function batchPaymentSummary(orders: Order[]): string {
  const methods = new Set(orders.map((order) => getPaymentMethod(order)));
  if (methods.size === 1) return [...methods][0];
  return "Mixed";
}

function PaymentMethodBadge({ order }: { order: Order }) {
  const method = getPaymentMethod(order);
  const isBank = isBankPayment(order);
  const isCash = isCashPayment(order);
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium shadow-none",
        isBank &&
          "border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
        isCash &&
          "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
      )}
    >
      {isBank ? (
        <Building2 className="h-3 w-3" />
      ) : (
        <Banknote className="h-3 w-3" />
      )}
      {method}
    </Badge>
  );
}

type OrderRowProps = {
  order: Order;
  tables: Table[];
  selected: boolean;
  onToggle: (id: number, checked: boolean) => void;
  compact?: boolean;
};

function PaymentTypeOrderRow({
  order,
  tables,
  selected,
  onToggle,
  compact = false,
}: OrderRowProps) {
  const lineTotal = lineTotalETB(order);
  const time = formatCafeOrderBatchTime(order.createdAt);

  return (
    <li
      className={cn(
        "transition-colors",
        compact
          ? "border-t border-border/40 first:border-t-0"
          : "border-b border-border/40 last:border-b-0",
        selected && "bg-primary/6",
      )}
    >
      {/* Mobile card */}
      <div
        className={cn(
          "flex gap-3 p-3.5 md:hidden",
          compact && "pl-8",
        )}
      >
        <label
          className="flex shrink-0 items-start pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggle(order.id, checked === true)}
            aria-label={`Select order ${order.id}, ${order.title}`}
          />
        </label>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium leading-snug">{order.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{order.waiterName}</span>
              </p>
            </div>
            <PaymentMethodBadge order={order} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!compact ? (
              <CafeTableLabel
                tableNo={order.tableNo}
                tables={tables}
                serviceCaption={order.serviceCaption}
                className="px-2 py-0.5 text-xs"
              />
            ) : null}
            <Badge variant="outline" className="tabular-nums text-[10px]">
              #{order.id}
            </Badge>
            <Badge variant="secondary" className="tabular-nums text-[10px]">
              Qty {order.orderAmount}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {time}
            </span>
            <span className="font-semibold tabular-nums">
              {formatAmountETB(lineTotal)} ETB
            </span>
          </div>
        </div>
      </div>

      {/* Desktop row */}
      <div
        className={cn(
          "hidden gap-3 px-4 py-3 md:grid md:items-center",
          ROW_GRID,
          compact && "bg-muted/15",
        )}
      >
        <label
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggle(order.id, checked === true)}
            aria-label={`Select order ${order.id}, ${order.title}`}
          />
        </label>

        <div className="min-w-0">
          <p className="truncate font-medium">{order.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {order.waiterName}
            {!compact ? (
              <>
                {" · "}
                <span className="tabular-nums">#{order.id}</span>
              </>
            ) : null}
          </p>
        </div>

        <div>
          {!compact ? (
            <CafeTableLabel
              tableNo={order.tableNo}
              tables={tables}
              serviceCaption={order.serviceCaption}
              className="px-2 py-0.5 text-xs"
            />
          ) : (
            <Badge variant="outline" className="tabular-nums text-[10px]">
              #{order.id}
            </Badge>
          )}
        </div>

        <p className="tabular-nums text-sm text-muted-foreground">
          {order.orderAmount}
        </p>

        <p className="tabular-nums text-sm font-semibold">
          {formatAmountETB(lineTotal)}{" "}
          <span className="text-xs font-normal text-muted-foreground">ETB</span>
        </p>

        <div>
          <PaymentMethodBadge order={order} />
        </div>

        <p className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {time}
        </p>
      </div>
    </li>
  );
}

type BatchBlockProps = {
  batch: CafePaidOrderBatch;
  tables: Table[];
  selectedIds: Set<number>;
  onToggleRow: (id: number, checked: boolean) => void;
  onToggleBatch: (orderIds: number[], checked: boolean) => void;
};

function PaymentTypeBatchBlock({
  batch,
  tables,
  selectedIds,
  onToggleRow,
  onToggleBatch,
}: BatchBlockProps) {
  const orderIds = batch.orders.map((order) => order.id);
  const batchTotal = sumOrderLinesETB(batch.orders);
  const batchTime = formatCafeOrderBatchTime(batch.createdAt);
  const selection = batchSelectionState(orderIds, selectedIds);
  const anchor = batch.orders[0];

  if (batch.orders.length === 1) {
    return (
      <li className="p-2 sm:p-2.5">
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:border-border hover:shadow-md",
            selectedIds.has(anchor.id) && "border-primary/30 ring-1 ring-primary/15",
          )}
        >
          <PaymentTypeOrderRow
            order={anchor}
            tables={tables}
            selected={selectedIds.has(anchor.id)}
            onToggle={onToggleRow}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="p-2 sm:p-2.5">
      <Collapsible defaultOpen={false} className="group/batch">
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:border-border hover:shadow-md",
            selection !== false && "border-primary/30 ring-1 ring-primary/15",
          )}
        >
          <div className="border-l-4 border-l-primary/70">
            <div
              className={cn(
                "flex items-start gap-3 bg-linear-to-r from-muted/50 via-muted/20 to-transparent px-3.5 py-3.5 sm:px-4",
                selection !== false && "from-primary/8",
              )}
            >
              <label
                className="flex shrink-0 items-center pt-0.5 sm:pt-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selection}
                  onCheckedChange={(checked) =>
                    onToggleBatch(orderIds, checked === true)
                  }
                  aria-label={`Select batch at table ${batch.tableNo}, ${batchTime}`}
                />
              </label>

              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:items-center"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CafeTableLabel
                        tableNo={batch.tableNo}
                        tables={tables}
                        serviceCaption={anchor.serviceCaption}
                        className="px-2.5 py-0.5 text-xs font-medium"
                      />
                      <Badge
                        variant="secondary"
                        className="tabular-nums text-[10px] font-semibold"
                      >
                        {batch.orders.length} items
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "tabular-nums text-[10px]",
                          batchPaymentSummary(batch.orders) === "Mixed" &&
                            "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
                        )}
                      >
                        {batchPaymentSummary(batch.orders)}
                      </Badge>
                    </div>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {anchor.waiterName}
                      </span>
                      <span className="hidden text-border sm:inline">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {batchTime}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    <div className="rounded-lg bg-background/80 px-2.5 py-1.5 text-right ring-1 ring-border/50">
                      <p className="text-sm font-bold tabular-nums tracking-tight">
                        {formatAmountETB(batchTotal)}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        ETB total
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/batch:rotate-180" />
                  </div>
                </button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
              <ul className="border-t border-border/50 bg-muted/10">
                {batch.orders.map((order) => (
                  <PaymentTypeOrderRow
                    key={order.id}
                    order={order}
                    tables={tables}
                    selected={selectedIds.has(order.id)}
                    onToggle={onToggleRow}
                    compact
                  />
                ))}
              </ul>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>
    </li>
  );
}

export function CafeCashierPaymentTypePanel({
  orders,
  hotelName,
  onRefresh,
}: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentTypeFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);
  const [bankTransferInput, setBankTransferInput] = useState("");
  const [amountSplitOpen, setAmountSplitOpen] = useState(false);
  const [splitPrimaryChannel, setSplitPrimaryChannel] =
    useState<PrimaryAmountChannel>("cash");
  const [splitAmountInput, setSplitAmountInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [paymentFilter, tableFilter]);

  useEffect(() => {
    void fetchTables()
      .then(setTables)
      .catch(() => {});
  }, []);

  const paidOrders = useMemo(
    () =>
      orders
        .filter((order) => isPaidCashOrBankCafeOrder(order, hotelName))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [orders, hotelName],
  );

  const paidBatches = useMemo(
    () =>
      groupCafePaidOrderBatches(paidOrders, {
        sessionSourceOrders: orders,
        hotelName,
      }),
    [orders, paidOrders, hotelName],
  );

  const paymentFilterCounts = useMemo(
    () => ({
      all: paidOrders.length,
      cash: paidOrders.filter((order) => isCashPayment(order)).length,
      bank: paidOrders.filter((order) => isBankPayment(order)).length,
    }),
    [paidOrders],
  );

  const paidTableOptions = useMemo(() => {
    const tableNos = [...new Set(paidBatches.map((batch) => batch.tableNo))].sort(
      (a, b) => a - b,
    );
    return tableNos.map((tableNo) => {
      const sampleOrder = paidOrders.find(
        (order) => normalizeOrderTableNo(order) === tableNo,
      );
      return {
        tableNo,
        label: formatCafeTableDisplayFromRegistry(
          tableNo,
          tables,
          sampleOrder?.serviceCaption,
        ),
      };
    });
  }, [paidBatches, paidOrders, tables]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paidBatches
      .map((batch) => filterBatchByPaymentType(batch, paymentFilter))
      .filter((batch): batch is CafePaidOrderBatch => batch !== null)
      .filter((batch) => tableFilter === "all" || batch.tableNo === tableFilter)
      .filter((batch) => batchMatchesNameSearch(batch, q));
  }, [paidBatches, paymentFilter, search, tableFilter]);

  const filteredOrders = useMemo(
    () => filteredBatches.flatMap((batch) => batch.orders),
    [filteredBatches],
  );

  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedIds.has(order.id));

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredOrders.map((order) => order.id)));
  };

  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleBatch = (orderIds: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of orderIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => paidOrders.filter((order) => selectedIds.has(order.id)),
    [paidOrders, selectedIds],
  );

  const selectedFullBatch = useMemo(
    () => findFullSelectedBatch(selectedIds, paidBatches),
    [selectedIds, paidBatches],
  );

  const canSplitByAmount = selectedFullBatch != null;

  const canSetCash = selectedOrders.some((order) => !isCashPayment(order));
  const canSetBank = selectedOrders.some((order) => !isBankPayment(order));

  const ordersPendingTypeChange = useMemo(() => {
    if (!pendingChange) return [];
    return selectedOrders.filter((order) =>
      pendingChange === "bank"
        ? !isBankPayment(order)
        : !isCashPayment(order),
    );
  }, [pendingChange, selectedOrders]);

  const pendingOrderTotalETB = useMemo(
    () =>
      ordersPendingTypeChange.reduce(
        (sum, order) => sum + lineTotalETB(order),
        0,
      ),
    [ordersPendingTypeChange],
  );

  const parsedBankTransferAmount = useMemo(() => {
    const value = Number(bankTransferInput.replace(/,/g, "").trim());
    return Number.isFinite(value) ? value : NaN;
  }, [bankTransferInput]);

  const pendingTipCashDeduction = useMemo(() => {
    if (!Number.isFinite(parsedBankTransferAmount)) return 0;
    return Math.max(0, parsedBankTransferAmount - pendingOrderTotalETB);
  }, [parsedBankTransferAmount, pendingOrderTotalETB]);

  const openPendingChange = (target: "cash" | "bank") => {
    const toUpdate = selectedOrders.filter((order) =>
      target === "bank" ? !isBankPayment(order) : !isCashPayment(order),
    );
    if (!toUpdate.length) {
      toast.message("Selected orders already use that payment type.");
      return;
    }
    const orderTotal = toUpdate.reduce(
      (sum, order) => sum + lineTotalETB(order),
      0,
    );
    setBankTransferInput(orderTotal > 0 ? orderTotal.toFixed(2) : "");
    setPendingChange(target);
  };

  const applyPaymentType = async (target: "cash" | "bank") => {
    const withBank = target === "bank";
    const toUpdate = ordersPendingTypeChange;
    if (!toUpdate.length) {
      toast.message("Selected orders already use that payment type.");
      return;
    }

    let bankDistribution:
      | ReturnType<typeof distributeBankTransferAcrossOrders>
      | null = null;

    if (withBank) {
      if (!Number.isFinite(parsedBankTransferAmount)) {
        toast.error("Enter the total amount transferred through the bank.");
        return;
      }
      if (parsedBankTransferAmount < pendingOrderTotalETB) {
        toast.error(
          `Bank transfer must be at least ${formatAmountETB(pendingOrderTotalETB)} ETB (order total).`,
        );
        return;
      }
      bankDistribution = distributeBankTransferAcrossOrders(
        toUpdate,
        parsedBankTransferAmount,
      );
    }

    setSaving(true);
    try {
      let updated = 0;
      for (const order of toUpdate) {
        const distribution = bankDistribution?.find(
          (row) => row.id === order.id,
        );
        await updateOrderPayment(order.id, "Paid", withBank, {
          silent: true,
          bankTransferAmount: withBank
            ? (distribution?.bankTransferAmount ?? pendingOrderTotalETB)
            : null,
          bankTipCashDeduction: withBank
            ? (distribution?.bankTipCashDeduction ?? 0)
            : null,
        });
        updated += 1;
      }
      await onRefresh();
      setSelectedIds(new Set());
      const tipNote =
        withBank && pendingTipCashDeduction > 0
          ? ` ${formatAmountETB(pendingTipCashDeduction)} ETB tip deducted from cash sales.`
          : "";
      toast.success(
        `Updated ${updated} order${updated === 1 ? "" : "s"} to ${target === "bank" ? "bank" : "cash"}.${tipNote}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update payment type";
      toast.error(message);
    } finally {
      setSaving(false);
      setPendingChange(null);
      setBankTransferInput("");
    }
  };

  const openAmountSplit = () => {
    if (!selectedFullBatch) return;
    setSplitPrimaryChannel("cash");
    setSplitAmountInput("");
    setAmountSplitOpen(true);
  };

  const applyAmountSplit = async () => {
    if (!selectedFullBatch) return;

    const batchOrders = selectedFullBatch.orders;
    const amount = Number(splitAmountInput.replace(/,/g, "").trim());
    const batchTotal = batchOrders.reduce(
      (sum, order) => sum + lineTotalETB(order),
      0,
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }
    if (amount > batchTotal + 0.001) {
      toast.error("Amount cannot exceed batch total");
      return;
    }

    const plan = buildAmountTablePaymentPlan(
      batchOrders,
      amount,
      splitPrimaryChannel,
    );
    const channels = [...plan.cashChannels, ...plan.bankChannels];
    if (channels.length === 0) {
      toast.error("Could not build a cash and bank split for this batch");
      return;
    }

    setSaving(true);
    try {
      for (const channel of channels) {
        const payWithBank = channel.withBank === true;
        await updateOrderPayment(channel.order.id, "Paid", payWithBank, {
          silent: true,
          bankTransferAmount:
            payWithBank && channel.bankTransferAmount != null
              ? channel.bankTransferAmount
              : null,
          bankTipCashDeduction:
            payWithBank && channel.bankTipCashDeduction != null
              ? channel.bankTipCashDeduction
              : null,
        });
      }
      await onRefresh();
      setSelectedIds(new Set());
      toast.success(
        `Updated batch — cash ${plan.requestedCash.toFixed(2)} ETB, bank ${plan.requestedBank.toFixed(2)} ETB`,
      );
      setAmountSplitOpen(false);
      setSplitAmountInput("");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to apply cash and bank split";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const selectedFullBatchLabel = useMemo(() => {
    if (!selectedFullBatch) return "";
    const anchor = selectedFullBatch.orders[0];
    return formatCafeTableDisplayFromRegistry(
      selectedFullBatch.tableNo,
      tables,
      anchor?.serviceCaption,
    );
  }, [selectedFullBatch, tables]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="h-1 bg-linear-to-r from-primary/80 via-primary/40 to-transparent" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2.5 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                Payment type correction
              </CardTitle>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Review today&apos;s paid orders, filter by channel, and correct
                cash or bank entries — per line, all to one channel, or split a
                full table batch by amount (cash + bank).
              </p>
            </div>
            <Badge
              variant="secondary"
              className="h-fit w-fit px-3 py-1 tabular-nums"
            >
              {paidOrders.length} line{paidOrders.length === 1 ? "" : "s"} today
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-border/50 bg-background/60 p-1 sm:w-auto">
                {FILTER_OPTIONS.map(({ value, label, icon: Icon, active }) => {
                  const isActive = paymentFilter === value;
                  const count = paymentFilterCounts[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentFilter(value)}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:flex-none",
                        isActive
                          ? active
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                      <span
                        className={cn(
                          "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
                          isActive
                            ? "bg-black/5 dark:bg-white/10"
                            : "bg-muted",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSplitByAmount || saving}
                  onClick={openAmountSplit}
                  className="gap-1.5 border-violet-200/80 bg-violet-50/50 text-violet-900 hover:bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100 dark:hover:bg-violet-950/50"
                >
                  <Wallet className="h-4 w-4" />
                  Split cash + bank
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSetCash || saving || selectedOrders.length === 0}
                  onClick={() => openPendingChange("cash")}
                  className="gap-1.5 border-emerald-200/80 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                >
                  <Banknote className="h-4 w-4" />
                  Change to cash
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSetBank || saving || selectedOrders.length === 0}
                  onClick={() => openPendingChange("bank")}
                  className="gap-1.5 border-sky-200/80 bg-sky-50/50 text-sky-900 hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/50"
                >
                  <Building2 className="h-4 w-4" />
                  Change to bank
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by item name…"
                  className="h-10 rounded-lg border-border/60 bg-background/80 pl-10 shadow-none"
                />
              </div>
              <Select
                value={tableFilter === "all" ? "all" : String(tableFilter)}
                onValueChange={(value) =>
                  setTableFilter(value === "all" ? "all" : parseInt(value, 10))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-background/80 shadow-none sm:w-52">
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  {paidTableOptions.map(({ tableNo, label }) => (
                    <SelectItem key={tableNo} value={String(tableNo)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedOrders.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/6 px-4 py-3">
              <p className="text-sm font-medium">
                <span className="tabular-nums text-primary">
                  {selectedOrders.length}
                </span>{" "}
                order{selectedOrders.length === 1 ? "" : "s"} selected
                {canSplitByAmount ? (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Full table batch selected — use Split cash + bank for mixed
                    payment, or change all lines to one channel.
                  </span>
                ) : selectedOrders.length === 1 ? (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Single line — use Change to cash or Change to bank.
                  </span>
                ) : null}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear selection
              </Button>
            </div>
          ) : null}

          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-linear-to-b from-muted/30 to-muted/10 px-4 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/60">
                <ArrowLeftRight className="h-7 w-7 text-muted-foreground/70" />
              </div>
              <p className="font-semibold">No paid orders to correct</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                {paidOrders.length === 0
                  ? "Paid cash and bank orders from today will appear here."
                  : paymentFilter === "cash"
                    ? "No cash-paid orders match your filters."
                    : paymentFilter === "bank"
                      ? "No bank-paid orders match your filters."
                      : tableFilter !== "all"
                        ? "No paid orders for this table match your filters."
                        : search.trim()
                          ? "No items match that name."
                          : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/15">
              <div
                className={cn(
                  "hidden gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid",
                  ROW_GRID,
                )}
              >
                <label className="flex items-center gap-2 normal-case">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) =>
                      toggleSelectAll(checked === true)
                    }
                    aria-label="Select all visible orders"
                  />
                  Select
                </label>
                <span>Item</span>
                <span>Table / ID</span>
                <span>Qty</span>
                <span>Amount</span>
                <span>Type</span>
                <span>Time</span>
              </div>

              <ul className="space-y-0 p-1 sm:p-2">
                {filteredBatches.map((batch) => (
                  <PaymentTypeBatchBlock
                    key={batch.key}
                    batch={batch}
                    tables={tables}
                    selectedIds={selectedIds}
                    onToggleRow={toggleRow}
                    onToggleBatch={toggleBatch}
                  />
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingChange(null);
            setBankTransferInput("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change to {pendingChange === "bank" ? "bank" : "cash"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This updates the payment channel on{" "}
                  {ordersPendingTypeChange.length} selected order
                  {ordersPendingTypeChange.length === 1 ? "" : "s"}. Credit
                  payments are not changed here.
                </p>
                {pendingChange === "bank" ? (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-foreground">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>Order total</span>
                      <span className="font-semibold tabular-nums">
                        {formatAmountETB(pendingOrderTotalETB)} ETB
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="bank-transfer-amount"
                        className="text-sm font-medium"
                      >
                        Total bank transfer received
                      </label>
                      <Input
                        id="bank-transfer-amount"
                        type="number"
                        min={pendingOrderTotalETB}
                        step="0.01"
                        inputMode="decimal"
                        value={bankTransferInput}
                        onChange={(e) => setBankTransferInput(e.target.value)}
                        placeholder="Enter amount from customer receipt"
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the full amount the customer transferred. If it
                        includes a waiter tip, the extra is deducted from cash
                        sales and counted in bank revenue.
                      </p>
                    </div>
                    {pendingTipCashDeduction > 0 ? (
                      <div className="rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-medium">Tip cash payout</p>
                        <p className="mt-1 tabular-nums">
                          {formatAmountETB(pendingTipCashDeduction)} ETB will be
                          deducted from cash revenue and paid to the waiter from
                          the till.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                saving ||
                pendingChange === null ||
                (pendingChange === "bank" &&
                  (!Number.isFinite(parsedBankTransferAmount) ||
                    parsedBankTransferAmount < pendingOrderTotalETB))
              }
              onClick={(e) => {
                e.preventDefault();
                if (pendingChange) void applyPaymentType(pendingChange);
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CafePaymentAmountSplitDialog
        open={amountSplitOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setAmountSplitOpen(false);
            setSplitAmountInput("");
          }
        }}
        title="Split table batch — cash + bank"
        description={`Reassign payment types for every line in this ${selectedFullBatchLabel || "table"} batch. Enter what the customer paid on one channel; the other is calculated automatically.`}
        orders={selectedFullBatch?.orders ?? []}
        primaryChannel={splitPrimaryChannel}
        onPrimaryChannelChange={setSplitPrimaryChannel}
        amountInput={splitAmountInput}
        onAmountInputChange={setSplitAmountInput}
        saving={saving}
        onConfirm={() => void applyAmountSplit()}
      />
    </div>
  );
}
