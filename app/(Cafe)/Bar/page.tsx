"use client";
import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast, Toaster } from "sonner";

import {
  Order,
  fetchLiveCafeOrders,
  fetchTables,
  updateOrderStatus,
  filterBaristaOrders,
  logoutAction,
  CAFE_LIVE_ORDERS_POLL_MS,
  type Table,
} from "@/lib/actions";
import { isSameCafeBusinessDay } from "@/lib/cafeBusinessDay";
import { normalizeOrderTableNo } from "@/lib/cafeTableOrder";
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
  XCircle,
  Clock,
  CheckCircle,
  Hash,
  User,
  LogOut,
} from "lucide-react";
import { subscribeCafeOrdersChanged } from "@/lib/cafeOrdersSync";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { CafeTableLabel } from "@/components/cafe/CafeTableLabel";

function BaristaContent() {
  useTenantRouteGuard({ role: "Barista" });
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const displayLabel = displayName || "Cafe";
  const logoUrl = searchParams.get("logo") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [cafeTables, setCafeTables] = useState<
    Pick<Table, "tableNo" | "orderCaption">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const loadCoordinator = useLoadCoordinator();
  const propertyScope = effectiveTenantScopeForHotelTerminal(tenantScope);

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      await loadCoordinator.run(async (isStale) => {
        if (mode === "initial") setLoading(true);
        else if (mode === "refresh") setRefreshing(true);
        try {
          const [allOrders, allTables] = await Promise.all([
            fetchLiveCafeOrders(),
            fetchTables(),
          ]);
          if (isStale()) return;
          const scope = effectiveTenantScopeForHotelTerminal(tenantScope);
          setCafeTables(
            allTables.filter((t) =>
              rowHotelMatchesTenantScope(t.HotelName, scope),
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

  const groupedOrders = pendingOrders.reduce(
    (acc, order) => {
      const key = order.tableNo;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(order);
      return acc;
    },
    {} as Record<number, Order[]>,
  );

  // Sort groups by the smallest order id in each group
  const sortedGroupedOrders = Object.fromEntries(
    Object.entries(groupedOrders).sort(([, ordersA], [, ordersB]) => {
      return ordersA[0].id - ordersB[0].id;
    }),
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
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
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
              disabled={loading || refreshing || updatingId != null}
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
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {Object.keys(sortedGroupedOrders).length === 0 ? (
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
          <div className="grid gap-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow flex flex-col gap-8"
              >
                <div className="flex items-center gap-5">
                  <CafeTableLabel
                    tableNo={normalizeOrderTableNo(order)}
                    tables={cafeTables}
                    serviceCaption={order.serviceCaption}
                  />
                  <h3 className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5"/>
                    {order.waiterName}
                  </h3>
                </div>
                <div className="flex items-center border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                  {/* Order image */}
                  <div className="relative w-20 h-20 rounded-md overflow-hidden shrink-0">
                    <Image
                      src={order.imageUrl || "/placeholder-food.jpg"}
                      alt={order.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Order details */}
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{order.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                          <Hash size={12} />
                          <span className="text-xs font-mono">
                            ID: {order.id}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Qty: {order.orderAmount} • each @{" "}
                          {order.price.toFixed(2)} ETB
                        </p>
                      </div>
                      <span className="font-bold text-lg">
                        {(order.price * order.orderAmount).toFixed(2)} ETB
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleStatusUpdate(order.id, "Cancelled")}
                      disabled={updatingId === order.id}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-10"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(order.id, "Completed")}
                      disabled={updatingId === order.id}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-10"
                    >
                      {updatingId === order.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Ready
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-base px-3 py-1 font-mono"
                  >
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-base px-3 py-1 font-mono"
                  >
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
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
