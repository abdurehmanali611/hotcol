/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast, Toaster } from "sonner";

import {
  Order,
  fetchOrders,
  updateOrderStatus,
  filterBaristaOrders,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

function BaristaContent() {
  const searchParams = useSearchParams();
  const hotelName = searchParams.get("hotel") || "Hotel";
  const logoUrl = searchParams.get("logo") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allOrders = await fetchOrders();
      const filteredOrders = filterBaristaOrders(allOrders, hotelName);
      setOrders(filteredOrders);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [hotelName]);

  const handleStatusUpdate = async (
    id: number,
    status: "Completed" | "Cancelled",
  ) => {
    setUpdatingId(id);
    const promise = updateOrderStatus(id, status);

    toast.promise(promise, {
      loading: `Marking order as ${status.toLowerCase()}...`,
      success: () => {
        loadOrders(true);
        return `Order #${id} ${status.toLowerCase()}!`;
      },
      error: "Failed to update order status.",
    });

    try {
      await promise;
    } catch {
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrders = orders.filter(
    (order) => order.status === null || order.status === "Pending",
  );

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
              <AvatarImage src={logoUrl} alt={hotelName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Coffee size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold leading-none">
                {hotelName} Barista
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
              onClick={() => loadOrders()}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {Object.keys(groupedOrders).length === 0 ? (
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
          <div className="grid gap-6">
            {Object.entries(groupedOrders).map(([tableNo, tableOrders]) => (
              <Card
                key={tableNo}
                className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all"
              >
                <CardContent className="p-6">
                  {/* Table header */}
                  <div className="mb-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">
                        {Number(tableNo) > 0 ? `Table ${tableNo}` : "Delivery"}
                      </h2>
                      <Badge variant="outline" className="text-sm">
                        {tableOrders.length}{" "}
                        {tableOrders.length === 1 ? "order" : "orders"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2">
                      Waiter: {tableOrders[0].waiterName || "Self-Service"}
                    </p>
                  </div>

                  {/* Orders grid */}
                  <div className="grid gap-4">
                    {tableOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center border rounded-lg p-4 bg-card"
                      >
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
                            onClick={() =>
                              handleStatusUpdate(order.id, "Cancelled")
                            }
                            disabled={updatingId === order.id}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 h-10"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            onClick={() =>
                              handleStatusUpdate(order.id, "Completed")
                            }
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
                    ))}
                  </div>
                </CardContent>
              </Card>
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
