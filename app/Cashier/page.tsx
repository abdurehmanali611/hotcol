/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, Suspense } from "react"; // Added Suspense
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, CreditCard, Store, RefreshCw, Loader2 } from "lucide-react";
import {
  Item,
  Order,
  createOrder,
  fetchItems,
  fetchOrders,
  updateOrderPayment,
} from "@/lib/actions";
import OrderComponent from "@/components/Order";
import PaymentComponent from "@/components/Payment";
import CashoutForm from "@/components/CashoutForm";
import OrderDetailsModal from "@/components/orderDetailsModal";
import { Button } from "@/components/ui/button";

// 1. Logic moved to a internal component to allow Suspense wrapping
function CashierContent() {
  const searchParams = useSearchParams();
  const hotelName = searchParams.get("hotel") || "Hotel";
  const logoUrl = searchParams.get("logo") || "";

  const [activeView, setActiveView] = useState<"order" | "payment" | "cashout">(
    "order"
  );
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, ordersData] = await Promise.all([
        fetchItems(),
        fetchOrders(),
      ]);
      setItems(itemsData);
      setOrders(ordersData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelName) {
      loadData();
    }
  }, [hotelName]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setShowOrderModal(true);
  };

  const handleBatchOrderSuccess = async () => {
    try {
      await loadData();
      toast.success("Batch order created successfully!");
    } catch {
    }
  };

  const handleOrderSubmit = async (data: {
    tableNo: number;
    waiterName: string;
    orderAmount: number;
  }) => {
    if (!selectedItem) return;

    const orderData = {
      title: selectedItem.name,
      imageUrl: selectedItem.imageUrl || "",
      tableNo: data.tableNo,
      waiterName: data.waiterName,
      orderAmount: data.orderAmount,
      HotelName: hotelName,
      status: "Pending",
      payment: "Unpaid",
      category: selectedItem.category,
      type: selectedItem.type,
      price: selectedItem.price,
    };

    try {
      const result = await createOrder(orderData);
      toast.success("Order created successfully!");
      await loadData();
      setShowOrderModal(false);
      setSelectedItem(null);
      return result;
    } catch (error: any) {
      throw error;
    }
  };

  const handlePayment = async (id: number, order: Order, sales: number, bank: boolean) => {
    try {
      await updateOrderPayment(id, "Paid", bank);
      await loadData();
      toast.success(`Payment processed successfully via ${bank ? "Bank" : "Cash"}`);
      return { id, order, sales, bank };
    } catch (error) {
      toast.error("Failed to process payment");
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <header className="h-20 border-b bg-background px-6 flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-64 rounded-lg" />
        </header>
        <main className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="bg-background border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:h-20 py-4 md:py-0 items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/10">
                <AvatarImage src={logoUrl} alt={hotelName} className="object-cover" />
                <AvatarFallback className="bg-primary/5">
                  <Store className="text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight">{hotelName}</h1>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Cashier Terminal
                </span>
              </div>
            </div>
            <div className="flex gap-5 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadData()}
                disabled={loading}
                className={loading ? "animate-spin" : "cursor-pointer"}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Tabs
                value={activeView}
                onValueChange={(v) => setActiveView(v as "order" | "payment" | "cashout")}
                className="w-full md:w-auto"
              >
                <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted/50 border">
                  <TabsTrigger value="order" className="gap-2 data-[state=active]:shadow-sm">
                    <ShoppingCart size={16} />
                    <span>Order</span>
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="gap-2 data-[state=active]:shadow-sm">
                    <CreditCard size={16} />
                    <span>Payment</span>
                  </TabsTrigger>
                  <TabsTrigger value="cashout" className="gap-2 data-[state=active]:shadow-sm">
                    <CreditCard size={16} />
                    <span>Cashout</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 transition-all">
        <div className="bg-background rounded-2xl border shadow-sm min-h-[calc(100vh-160px)]">
          {activeView === "order" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <OrderComponent
                items={items}
                hotelName={hotelName}
                onItemSelect={handleItemSelect}
                onGoToPayment={() => setActiveView("payment")}
                onBatchOrderSuccess={handleBatchOrderSuccess}
              />
            </div>
          ) : activeView === "payment" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <PaymentComponent
                orders={orders}
                hotelName={hotelName}
                onHandlePayment={handlePayment}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CashoutForm />
            </div>
          )}
        </div>
      </main>

      <OrderDetailsModal
        item={selectedItem}
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setSelectedItem(null);
        }}
        hotelName={hotelName}
        onSubmit={handleOrderSubmit}
      />
    </div>
  );
}

// 2. Export the page wrapped in Suspense
export default function Cashier() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Initializing Terminal...</p>
      </div>
    }>
      <CashierContent />
    </Suspense>
  );
}