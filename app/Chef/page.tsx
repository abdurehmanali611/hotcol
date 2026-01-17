/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, Suspense } from "react"; // Added Suspense
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast, Toaster } from "sonner";
import {
  Order,
  fetchOrders,
  updateOrderStatus,
  filterChefOrders,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  ChefHat,
  RefreshCw,
  CheckCircle,
  XCircle,
  Utensils,
  Hash,
} from "lucide-react";

// 1. Logic moved to a child component to allow Suspense wrapping
function ChefContent() {
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
      const filteredOrders = filterChefOrders(allOrders, hotelName);
      setOrders(filteredOrders);
    } catch (error: any) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 45000);
    return () => clearInterval(interval);
  }, [hotelName]);

  const handleStatusUpdate = async (
    id: number,
    status: "Completed" | "Cancelled"
  ) => {
    setUpdatingId(id);
    try {
      await updateOrderStatus(id, status);
      toast.success(`Order #${id} marked as ${status.toLowerCase()}`);
      await loadOrders(true);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrders = orders.filter((order) => order.status === null || order.status === "Pending");

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-10">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 h-18 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage
                src={logoUrl}
                alt={hotelName}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <ChefHat size={24} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {hotelName} Kitchen
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Live Kitchen Feed
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => loadOrders()}
            variant="outline"
            size="sm"
            className="gap-2 shadow-sm"
          >
            <RefreshCw size={14} className={updatingId ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-background p-8 rounded-full shadow-sm mb-6">
              <Utensils size={48} className="text-muted-foreground/30" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              No pending orders
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs">
              Great job! All food orders have been cleared from the queue.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {pendingOrders.map((order) => (
              <Card
                key={order.id}
                className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="relative w-full md:w-64 h-56 md:h-auto bg-muted">
                      <Image
                        src={order.imageUrl || "/placeholder-food.jpg"}
                        alt={order.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 256px"
                      />
                      <Badge className="absolute top-3 left-3 px-3 py-1">
                        Table {order.tableNo}
                      </Badge>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-green-500">
                              {order.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                              <Hash size={14} />
                              <span className="text-xs font-mono uppercase">
                                Order ID: {order.id}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-muted-foreground uppercase block">
                              Qty
                            </span>
                            <span className="text-3xl font-black text-primary leading-none">
                              {order.orderAmount}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                              Waiter
                            </p>
                            <p className="font-semibold truncate">
                              {order.waiterName || "Self-Service"}
                            </p>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                              Table No
                            </p>
                            <Badge
                              variant="outline"
                              className="mt-0.5 bg-background"
                            >
                              {order.tableNo}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Chef Actions */}
                      <div className="flex gap-4 mt-8">
                        <Button
                          onClick={() =>
                            handleStatusUpdate(order.id, "Cancelled")
                          }
                          disabled={updatingId === order.id}
                          variant="ghost"
                          className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive h-12"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          onClick={() =>
                            handleStatusUpdate(order.id, "Completed")
                          }
                          disabled={updatingId === order.id}
                          className="flex-2 bg-green-600 hover:bg-green-700 text-white h-12 shadow-md"
                        >
                          {updatingId === order.id ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Mark Ready
                        </Button>
                      </div>
                    </div>
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

// 2. Final Export with Suspense Wrapper
export default function Chef() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ChefContent />
    </Suspense>
  );
}