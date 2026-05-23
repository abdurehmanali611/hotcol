"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cashout,
  fetchCashout,
  invalidateGraphqlListCache,
} from "@/lib/actions";
import CashoutForm from "@/components/CashoutForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((v) => Number(v) || 0);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => Number(v) || 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isToday(iso: string | Date | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TodayCashoutCard({ entry }: { entry: Cashout }) {
  const items = asStringArray(entry.items);
  const prices = asNumberArray(entry.prices);
  const amounts = asNumberArray(entry.requiredAmount);
  const units = asStringArray(entry.measuredBy);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {formatTime(entry.createdAt)}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">
            {Number(entry.totalCalc).toLocaleString()} ETB
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {items.length} line{items.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <ul className="mt-3 space-y-1.5 border-t pt-3">
        {items.map((name, i) => (
          <li
            key={`${entry.id}-${i}`}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span className="min-w-0 truncate font-medium">{name || "—"}</span>
            <span className="shrink-0 text-muted-foreground">
              {amounts[i] ?? 0} {units[i] || "unit"} ·{" "}
              {((prices[i] ?? 0) * (amounts[i] ?? 0)).toLocaleString()} ETB
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TodayCashoutsList({
  entries,
  loading,
  onRefresh,
}: {
  entries: Cashout[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const todayTotal = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.totalCalc) || 0), 0),
    [entries],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Today&apos;s cashouts</p>
          <p className="text-xs text-muted-foreground">
            {entries.length} submission{entries.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-medium text-foreground">
              {todayTotal.toLocaleString()} ETB total
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Receipt className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">No cashouts recorded today</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Expense lines you submit on the Record tab will appear here for
            quick review.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[min(60vh,520px)] pr-3">
          <div className="space-y-3 pb-2">
            {entries.map((entry) => (
              <TodayCashoutCard key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export function CafeCashierCashoutPanel({
  tenantScope,
  propertyName,
}: {
  tenantScope: string;
  propertyName: string;
}) {
  const [cashouts, setCashouts] = useState<Cashout[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!tenantScope) return;
    setLoadingHistory(true);
    try {
      invalidateGraphqlListCache("finance:cashouts");
      const data = await fetchCashout(tenantScope);
      setCashouts(Array.isArray(data) ? data : []);
    } catch {
      setCashouts([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const todayEntries = useMemo(
    () =>
      [...cashouts]
        .filter((c) => isToday(c.createdAt))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [cashouts],
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium">Petty-cash expenses at the register</p>
          <p className="mt-0.5 text-muted-foreground">
            Record purchases paid from the till (supplies, top-ups, etc.). Totals
            feed into Admin reports. Store inventory petty-cash vouchers are
            printed separately under{" "}
            <span className="font-medium text-foreground">
              Store → Item receipts
            </span>
            .
          </p>
        </div>
      </div>

      <Tabs defaultValue="record" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="record">Record cashout</TabsTrigger>
          <TabsTrigger value="today">
            Today
            {todayEntries.length > 0 ? (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {todayEntries.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-4">
          <CashoutForm
            tenantScope={tenantScope}
            propertyName={propertyName}
            onSuccess={loadHistory}
          />
        </TabsContent>

        <TabsContent value="today" className="mt-4">
          <TodayCashoutsList
            entries={todayEntries}
            loading={loadingHistory}
            onRefresh={loadHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
