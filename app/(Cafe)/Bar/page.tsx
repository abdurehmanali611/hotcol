"use client";
import { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";

import {
  Order,
  fetchLiveCafeOrders,
  fetchItems,
  fetchTables,
  updateOrderStatus,
  filterBaristaOrders,
  logoutAction,
  CAFE_LIVE_ORDERS_POLL_MS,
  type Item,
  type Table,
} from "@/lib/actions";
import { isSameCafeBusinessDay } from "@/lib/cafeBusinessDay";
import { buildStationPrepQtyVisibleTitles } from "@/lib/cafeTableOrder";
import {
  effectiveTenantScopeForHotelTerminal,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Coffee,
  RefreshCw,
  Clock,
  LogOut,
} from "lucide-react";
import { subscribeCafeOrdersChanged } from "@/lib/cafeOrdersSync";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { CafeStationOrderCards } from "@/components/cafe/CafeStationOrderCards";
import { CafeStationOrdersLayout } from "@/components/cafe/CafeStationOrdersLayout";

function BaristaContent() {
  useTenantRouteGuard({ role: "Barista" });
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const displayLabel = displayName || "Cafe";
  const logoUrl = searchParams.get("logo") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [cafeTables, setCafeTables] = useState<
    Pick<Table, "tableNo" | "orderCaption">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingGroupKey, setUpdatingGroupKey] = useState<string | null>(null);
  const loadCoordinator = useLoadCoordinator();
  const propertyScope = effectiveTenantScopeForHotelTerminal(tenantScope);

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      await loadCoordinator.run(async (isStale) => {
        if (mode === "initial") setLoading(true);
        else if (mode === "refresh") setRefreshing(true);
        try {
          const [allOrders, allTables, allItems] = await Promise.all([
            fetchLiveCafeOrders(),
            fetchTables(),
            fetchItems(),
          ]);
          if (isStale()) return;
          const scope = effectiveTenantScopeForHotelTerminal(tenantScope);
          setCafeTables(
            allTables.filter((t) =>
              rowHotelMatchesTenantScope(t.HotelName, scope),
            ),
          );
          setMenuItems(
            allItems.filter((item) =>
              rowHotelMatchesTenantScope(item.HotelName, scope),
            ),
          );
          setOrders(filterBaristaOrders(allOrders, scope));
        } catch {
          if (!isStale() && mode !== "silent") {
            toast.error("Failed to load orders");
          }
        } finally {
          if (!isStale()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    },
    [tenantScope, loadCoordinator],
  );

  useEffect(() => {
    void loadOrders("initial");
    const refresh = () => void loadOrders("silent");
    const unsubSync = subscribeCafeOrdersChanged(refresh);
    return () => {
      unsubSync();
    };
  }, [propertyScope, loadOrders]);

  useVisibleInterval(() => void loadOrders("silent"), CAFE_LIVE_ORDERS_POLL_MS);

  const handleStatusUpdate = async (
    id: number,
    status: "Completed" | "Cancelled",
  ) => {
    setUpdatingId(id);
    try {
      await updateOrderStatus(id, status, { silent: true });
      toast.success(
        status === "Cancelled"
          ? `Order #${id} cancelled`
          : `Order #${id} ready for pickup`,
      );
      await loadOrders("silent");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update order",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCompleteAll = async (groupKey: string, ids: number[]) => {
    if (ids.length === 0) return;
    setUpdatingGroupKey(groupKey);
    try {
      for (const id of ids) {
        await updateOrderStatus(id, "Completed", { silent: true });
      }
      toast.success(
        ids.length === 1
          ? "Order marked ready for pickup"
          : `${ids.length} orders marked ready for pickup`,
      );
      await loadOrders("silent");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to complete batch",
      );
    } finally {
      setUpdatingGroupKey(null);
    }
  };

  const pendingOrders = orders.filter(
    (order) => {
      const status = String(order.status ?? "").toLowerCase();
      if (status === "cancelled") return false;
      return (
        order.status === null ||
        (order.status === "Pending" &&
          isSameCafeBusinessDay(order.createdAt))
      );
    },
  );

  pendingOrders.sort((a, b) => a.id - b.id);

  const qtyVisibleTitles = useMemo(
    () => buildStationPrepQtyVisibleTitles(menuItems),
    [menuItems],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="app-chrome-header sticky top-0 z-10 border-b">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={logoUrl} alt={displayLabel} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Coffee size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold leading-none">
                {displayLabel} Barista
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Live Order Monitor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex gap-1 py-1">
              <Clock size={12} className="text-orange-500" />
              {pendingOrders.length} Pending
            </Badge>
            <Button
              onClick={() => void loadOrders("refresh")}
              variant="outline"
              size="sm"
              disabled={
                loading ||
                refreshing ||
                updatingId != null ||
                updatingGroupKey != null
              }
              className="gap-2"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logoutAction()}
              className="gap-2"
            >
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-background p-8 rounded-full shadow-sm mb-6">
              <Coffee size={48} className="text-muted-foreground/30" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              No pending orders
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs">
              Great job! All Beverage orders have been cleared from the queue.
            </p>
          </div>
        ) : (
          <CafeStationOrdersLayout
            orders={pendingOrders}
            station="bar"
            qtyVisibleTitles={qtyVisibleTitles}
          >
            <CafeStationOrderCards
              orders={pendingOrders}
              cafeTables={cafeTables}
              updatingId={updatingId}
              updatingGroupKey={updatingGroupKey}
              onStatusUpdate={handleStatusUpdate}
              onCompleteAll={handleCompleteAll}
            />
          </CafeStationOrdersLayout>
        )}
      </main>
    </div>
  );
}

export default function Bar() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 p-4 md:p-8 flex items-center justify-center">
          <RefreshCw className="animate-spin text-muted-foreground" size={32} />
        </div>
      }
    >
      <BaristaContent />
    </Suspense>
  );
}
