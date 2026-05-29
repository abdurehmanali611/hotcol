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
import { isPaidCashOrBankCafeOrder } from "@/lib/cafeTableOrder";
import { CafeTableLabel } from "@/components/cafe/CafeTableLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  orders: Order[];
  hotelName: string;
  onRefresh: () => void | Promise<void>;
};

type PendingChange = "cash" | "bank" | null;

function formatOrderTime(createdAt: Date | string): string {
  return new Date(createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lineTotalETB(order: Order): number {
  return (Number(order.price) || 0) * (Number(order.orderAmount) || 0);
}

function PaymentMethodBadge({ order }: { order: Order }) {
  const method = getPaymentMethod(order);
  const isBank = isBankPayment(order);
  const isCash = isCashPayment(order);
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        isBank &&
          "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
        isCash &&
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
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

export function CafeCashierPaymentTypePanel({
  orders,
  hotelName,
  onRefresh,
}: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);
  const [saving, setSaving] = useState(false);

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

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return paidOrders;
    return paidOrders.filter((order) => {
      const haystack = [
        order.title,
        order.waiterName,
        String(order.tableNo),
        getPaymentMethod(order),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [paidOrders, search]);

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

  const selectedOrders = useMemo(
    () => paidOrders.filter((order) => selectedIds.has(order.id)),
    [paidOrders, selectedIds],
  );

  const canSetCash = selectedOrders.some((order) => !isCashPayment(order));
  const canSetBank = selectedOrders.some((order) => !isBankPayment(order));

  const applyPaymentType = async (target: "cash" | "bank") => {
    const withBank = target === "bank";
    const toUpdate = selectedOrders.filter((order) =>
      withBank ? !isBankPayment(order) : !isCashPayment(order),
    );
    if (!toUpdate.length) {
      toast.message("Selected orders already use that payment type.");
      return;
    }

    setSaving(true);
    try {
      let updated = 0;
      for (const order of toUpdate) {
        await updateOrderPayment(order.id, "Paid", withBank, { silent: true });
        updated += 1;
      }
      await onRefresh();
      setSelectedIds(new Set());
      toast.success(
        `Updated ${updated} order${updated === 1 ? "" : "s"} to ${target === "bank" ? "bank" : "cash"}.`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update payment type";
      toast.error(message);
    } finally {
      setSaving(false);
      setPendingChange(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Payment type correction
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Today&apos;s paid cash and bank orders. Select lines, then switch
                the payment channel if it was recorded incorrectly.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit tabular-nums">
              {paidOrders.length} paid line{paidOrders.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, table, waiter, or type…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canSetCash || saving || selectedOrders.length === 0}
                onClick={() => setPendingChange("cash")}
                className="gap-1.5"
              >
                <Banknote className="h-4 w-4" />
                Change to cash
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canSetBank || saving || selectedOrders.length === 0}
                onClick={() => setPendingChange("bank")}
                className="gap-1.5"
              >
                <Building2 className="h-4 w-4" />
                Change to bank
              </Button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
              <ArrowLeftRight className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium">No paid orders to correct</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {paidOrders.length === 0
                  ? "Paid cash and bank orders from today will appear here."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.5fr)] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
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
                <span>Table</span>
                <span>Qty</span>
                <span>Amount</span>
                <span>Current type</span>
                <span>Time</span>
              </div>

              <ul className="divide-y">
                {filteredOrders.map((order) => {
                  const selected = selectedIds.has(order.id);
                  return (
                    <li
                      key={order.id}
                      className={cn(
                        "grid gap-3 px-4 py-3 transition-colors md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.5fr)] md:items-center",
                        selected && "bg-primary/5",
                      )}
                    >
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            toggleRow(order.id, checked === true)
                          }
                          aria-label={`Select ${order.title}`}
                        />
                        <span className="text-xs text-muted-foreground md:hidden">
                          Select
                        </span>
                      </label>

                      <div className="min-w-0">
                        <p className="truncate font-medium">{order.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {order.waiterName}
                        </p>
                      </div>

                      <div>
                        <CafeTableLabel
                          tableNo={order.tableNo}
                          tables={tables}
                          serviceCaption={order.serviceCaption}
                          className="text-xs px-2 py-0.5"
                        />
                      </div>

                      <p className="tabular-nums text-sm">{order.orderAmount}</p>

                      <p className="tabular-nums text-sm font-medium">
                        {lineTotalETB(order).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ETB
                      </p>

                      <div>
                        <PaymentMethodBadge order={order} />
                      </div>

                      <p className="text-sm text-muted-foreground tabular-nums">
                        {formatOrderTime(order.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {selectedOrders.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {selectedOrders.length} order
              {selectedOrders.length === 1 ? "" : "s"} selected
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change to {pendingChange === "bank" ? "bank" : "cash"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates the payment channel on{" "}
              {
                selectedOrders.filter((order) =>
                  pendingChange === "bank"
                    ? !isBankPayment(order)
                    : !isCashPayment(order),
                ).length
              }{" "}
              selected order
              {selectedOrders.length === 1 ? "" : "s"}. Credit payments are not
              changed here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || pendingChange === null}
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
    </div>
  );
}
