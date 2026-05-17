"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPurchaseRequests,
  fetchStockOutRequests,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PendingButton } from "@/components/ui/pending-button";
import { DataTable } from "@/app/StoreItems/data-table";
import { buildStoreMyPurchaseColumns } from "@/lib/dataTableColumns/purchaseRequests";
import { buildStoreMyStockColumns } from "@/lib/dataTableColumns/stockMovement";
import {
  ClipboardList,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
function mergeStockOutRows(
  server: StockOutRequestRow[],
  injected: StockOutRequestRow[] | undefined,
): StockOutRequestRow[] {
  if (!injected?.length) return server;
  const byId = new Map<number, StockOutRequestRow>();
  for (const s of server) byId.set(s.id, s);
  for (const e of injected) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergePurchaseRows(
  server: PurchaseRequestRow[],
  injected: PurchaseRequestRow[] | undefined,
): PurchaseRequestRow[] {
  if (!injected?.length) return server;
  const byId = new Map<number, PurchaseRequestRow>();
  for (const s of server) byId.set(s.id, s);
  for (const e of injected) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function StoreRequestStatusTab({
  refreshSignal = 0,
  injectedStockRows,
  onClearInjectedStockIds,
  injectedPurchaseRows,
  onClearInjectedPurchaseIds,
}: {
  refreshSignal?: number;
  injectedStockRows?: StockOutRequestRow[];
  onClearInjectedStockIds?: (ids: number[]) => void;
  injectedPurchaseRows?: PurchaseRequestRow[];
  onClearInjectedPurchaseIds?: (ids: number[]) => void;
}) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [userName, setUserName] = useState("");
  const { isPending, run } = useConcurrentActions();
  const refreshKey = "request-status-refresh";

  const load = useCallback(async () => {
    try {
      const name =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      setUserName(name);
      const [pr, so] = await Promise.all([
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
      ]);
      setPurchases(pr);
      setStocks(so);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not load request status";
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      await load();
      setInitialLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    void run(refreshKey, load);
  }, [refreshSignal, load, run, refreshKey]);

  useEffect(() => {
    if (!onClearInjectedStockIds || !injectedStockRows?.length) return;
    const ids = new Set(stocks.map((s) => s.id));
    const consumed = injectedStockRows
      .filter((r) => ids.has(r.id))
      .map((r) => r.id);
    if (consumed.length) onClearInjectedStockIds(consumed);
  }, [stocks, injectedStockRows, onClearInjectedStockIds]);

  useEffect(() => {
    if (!onClearInjectedPurchaseIds || !injectedPurchaseRows?.length) return;
    const ids = new Set(purchases.map((p) => p.id));
    const consumed = injectedPurchaseRows
      .filter((r) => ids.has(r.id))
      .map((r) => r.id);
    if (consumed.length) onClearInjectedPurchaseIds(consumed);
  }, [purchases, injectedPurchaseRows, onClearInjectedPurchaseIds]);

  const mergedPurchases = useMemo(
    () => mergePurchaseRows(purchases, injectedPurchaseRows),
    [purchases, injectedPurchaseRows],
  );

  const mergedStocks = useMemo(
    () => mergeStockOutRows(stocks, injectedStockRows),
    [stocks, injectedStockRows],
  );

  const myPurchases = useMemo(
    () =>
      mergedPurchases.filter(
        (p) => userName && p.storeUserName === userName,
      ),
    [mergedPurchases, userName],
  );
  const myStocks = useMemo(
    () =>
      mergedStocks.filter(
        (s) => userName && s.requestedByUserName === userName,
      ),
    [mergedStocks, userName],
  );

  const sortByDateDesc = <T extends { createdAt: string }>(rows: T[]) =>
    [...rows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const purchasePending = myPurchases.filter((r) =>
    ["PENDING_CC", "PENDING_FINANCE"].includes(r.status),
  ).length;
  const stockPending = myStocks.filter((r) => r.status === "PENDING").length;

  const handleRefresh = () => {
    void run(refreshKey, load);
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your requests…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-br from-card via-card to-primary/5 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/45 to-cyan-500/40" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="flex gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-bold tracking-tight">
                Your request status
              </h2>
              <p className="text-sm text-muted-foreground text-pretty max-w-2xl">
                Purchase requests you opened and stock movements you submitted.
                After finance approves a purchase, register the item under{" "}
                <strong className="text-foreground font-medium">Register</strong>{" "}
                when it arrives.
              </p>
            </div>
          </div>
          <PendingButton
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            pending={isPending(refreshKey)}
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </PendingButton>
        </div>
      </div>

      {!userName && (
        <p className="text-sm text-amber-800 dark:text-amber-200 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
          Sign in again if your name is missing — requests are matched to your
          username.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-primary/15 bg-card/95 shadow-sm overflow-hidden">
          <div className="h-0.5 bg-linear-to-r from-primary/60 to-violet-400/50" />
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/15">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Purchase requests
              </p>
              <p className="text-2xl font-bold tabular-nums">{myPurchases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-card/95 shadow-sm overflow-hidden">
          <div className="h-0.5 bg-linear-to-r from-amber-500/70 to-orange-400/50" />
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Awaiting approval
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {purchasePending + stockPending}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/95 shadow-sm overflow-hidden">
          <div className="h-0.5 bg-linear-to-r from-cyan-500/50 to-teal-400/40" />
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted border border-border/60">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Movement requests
              </p>
              <p className="text-2xl font-bold tabular-nums">{myStocks.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-md overflow-hidden bg-card/95 ring-1 ring-black/3 dark:ring-white/6">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-4 w-4 text-primary opacity-80" />
            Purchase requests
          </CardTitle>
          <CardDescription>
            {myPurchases.length} request{myPurchases.length !== 1 ? "s" : ""}{" "}
            under your login
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {myPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center px-6">
              <Send className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No purchase requests from you yet.
              </p>
            </div>
          ) : (
            <div className="p-4 pt-0">
              <DataTable
                columns={buildStoreMyPurchaseColumns()}
                data={sortByDateDesc(myPurchases)}
                hideToolbar
                searchColumnId="itemName"
                emptyMessage="No purchase requests from you yet."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-md overflow-hidden bg-card/95 ring-1 ring-black/3 dark:ring-white/6">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400 opacity-90" />
            Stock / wastage / return requests
          </CardTitle>
          <CardDescription>
            {myStocks.length} movement request
            {myStocks.length !== 1 ? "s" : ""} you submitted
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {myStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center px-6">
              <Package className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No movement requests from you yet.
              </p>
            </div>
          ) : (
            <div className="p-4 pt-0">
              <DataTable
                columns={buildStoreMyStockColumns()}
                data={sortByDateDesc(myStocks)}
                hideToolbar
                searchColumnId="itemName"
                emptyMessage="No movement requests from you yet."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
