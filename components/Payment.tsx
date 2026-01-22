/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Order, filterUnpaidOrders } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CreditCard, Wallet, User, Search, Filter } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Icon } from "@iconify/react";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface PaymentProps {
  orders: Order[];
  hotelName: string;
  onHandlePayment: (
    id: number,
    order: Order,
    sales: number,
    bank: boolean,
  ) => Promise<any>;
}

export default function PaymentComponent({
  orders,
  hotelName,
  onHandlePayment,
}: PaymentProps) {
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [processingPayment, setProcessingPayment] = useState<number | null>(
    null,
  );
  const [processingAll, setProcessingAll] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedTableForAll, setSelectedTableForAll] = useState<number | null>(
    null,
  );
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "ready" | "pending">("all");

  useEffect(() => {
    const unpaid = filterUnpaidOrders(orders, hotelName);
    const payRequire = unpaid.filter((item) => item.status != "Cancelled");
    // Sort by ID (FIFO - auto-increment IDs)
    payRequire.sort((a, b) => a.id - b.id);
    setUnpaidOrders(payRequire);
  }, [orders, hotelName]);

  const groupedOrders = useMemo(() => {
    const groups: Record<number, Order[]> = {};
    
    unpaidOrders.forEach((order) => {
      const key = order.tableNo;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });
    
    return Object.fromEntries(
      Object.entries(groups).sort(([, ordersA], [, ordersB]) => {
        const minIdA = Math.min(...ordersA.map(o => o.id));
        const minIdB = Math.min(...ordersB.map(o => o.id));
        return minIdA - minIdB;
      })
    );
  }, [unpaidOrders]);

  const filteredGroupedOrders = useMemo(() => {
    return Object.entries(groupedOrders).filter(([tableNo, tableOrders]) => {
      const matchesSearch = searchQuery === "" || 
        tableNo.includes(searchQuery);
      
      const allCompleted = tableOrders.every((order) => order.status === "Completed");
      
      if (filterType === "ready") {
        return matchesSearch && allCompleted;
      } else if (filterType === "pending") {
        return matchesSearch && !allCompleted;
      }
      
      return matchesSearch;
    });
  }, [groupedOrders, searchQuery, filterType]);

  const handlePaymentMethod = async (
    id: number,
    order: Order,
    bank: boolean,
  ) => {
    setProcessingPayment(id);
    setDialogOpen(false);
    try {
      await onHandlePayment(id, order, order.price * order.orderAmount, bank);
    } finally {
      setProcessingPayment(null);
      setSelectedOrderId(null);
    }
  };

  const handlePayAllForTable = async (tableNo: number, bank: boolean) => {
    const tableOrders = groupedOrders[tableNo];
    if (!tableOrders) return;

    setProcessingAll(tableNo);
    setDialogOpen(false);

    try {
      for (const order of tableOrders) {
        if (order.status === "Completed") {
          await onHandlePayment(
            order.id,
            order,
            order.price * order.orderAmount,
            bank,
          );
        }
      }
    } finally {
      setProcessingAll(null);
      setSelectedTableForAll(null);
    }
  };

  const openPaymentDialog = (orderId: number) => {
    setSelectedOrderId(orderId);
    setDialogOpen(true);
  };

  const openPayAllDialog = (tableNo: number) => {
    setSelectedTableForAll(tableNo);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedOrderId(null);
      setSelectedTableForAll(null);
    }
  };

  // Check if all orders for a table are completed
  const areAllOrdersCompleted = (tableOrders: Order[]) => {
    return tableOrders.every((order) => order.status === "Completed");
  };

  // Calculate total amount for a table
  const calculateTableTotal = (tableOrders: Order[]) => {
    return tableOrders.reduce((total, order) => {
      return total + order.price * order.orderAmount;
    }, 0);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header with search and filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="text-primary h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Pending Payments</h2>
            <p className="text-sm text-muted-foreground">
              {unpaidOrders.length} unpaid orders across {Object.keys(groupedOrders).length} tables
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                ×
              </Button>
            )}
          </div>
          
          {/* Filter tabs */}
          <Tabs 
            value={filterType} 
            onValueChange={(v) => setFilterType(v as "all" | "ready" | "pending")}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-64">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="ready" className="text-xs">Ready</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {searchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800 text-sm">
              Searching for: <strong>Table No: {searchQuery} </strong>
            </span>
          </div>
          <Badge variant="outline" className="bg-white">
            {filteredGroupedOrders.length} {filteredGroupedOrders.length === 1 ? 'table' : 'tables'} found
          </Badge>
        </div>
      )}

      {/* No results message */}
      {filteredGroupedOrders.length === 0 && Object.keys(groupedOrders).length > 0 && (
        <Card className="border-dashed py-12 text-center">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tables found</h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? `No tables matching "${searchQuery}"` 
              : "No tables match the current filter"}
          </p>
          {(searchQuery || filterType !== "all") && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </Card>
      )}

      {Object.keys(groupedOrders).length === 0 ? (
        <Card className="border-dashed py-16 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
          <p className="text-muted-foreground">
            All orders have been settled and paid.
          </p>
        </Card>
      ) : filteredGroupedOrders.length > 0 ? (
        <div className="space-y-6">
          {filteredGroupedOrders.map(([tableNo, tableOrders]) => {
            const allCompleted = areAllOrdersCompleted(tableOrders);
            const tableTotal = calculateTableTotal(tableOrders);

            return (
              <Card key={tableNo} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-base px-3 py-1 font-mono">
                          Table {tableNo}
                        </Badge>
                        {allCompleted && (
                          <Badge className="bg-green-100 text-green-800 text-sm px-2 py-1">
                            Ready
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {tableOrders[0].waiterName || "Self-Service"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {tableOrders.length} {tableOrders.length === 1 ? 'order' : 'orders'}
                      </Badge>
                      <span className="font-bold text-lg">
                        {tableTotal.toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {allCompleted && (
                    <div className="mb-6 p-4 bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h3 className="font-bold text-lg text-green-800">
                              All orders ready for payment!
                            </h3>
                          </div>
                          <p className="text-green-700 text-sm">
                            You can pay all {tableOrders.length} orders for Table{" "}
                            {tableNo} at once to save time.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-black text-green-800">
                              {tableTotal.toFixed(2)} ETB
                            </div>
                            <div className="text-xs text-green-600">Total Amount</div>
                          </div>
                          <AlertDialog
                            open={
                              dialogOpen &&
                              selectedTableForAll === parseInt(tableNo)
                            }
                            onOpenChange={handleDialogClose}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2 shadow-lg"
                                onClick={() =>
                                  openPayAllDialog(parseInt(tableNo))
                                }
                                disabled={processingAll === parseInt(tableNo)}
                              >
                                {processingAll === parseInt(tableNo) ? (
                                  <>
                                    <span className="animate-spin">⟳</span> Processing...
                                  </>
                                ) : (
                                  <>
                                    <Wallet className="h-4 w-4" /> Pay All Now
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl">
                                  Pay All Orders
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-base">
                                  You are about to pay all {tableOrders.length} orders for Table {tableNo}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              
                              <div className="py-4 border-y my-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-muted-foreground">Table Total:</span>
                                  <span className="text-2xl font-bold">{tableTotal.toFixed(2)} ETB</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  This will mark all completed orders for Table {tableNo} as paid.
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <h4 className="font-medium">Select Payment Method:</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <Button
                                    size="lg"
                                    className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                    onClick={() =>
                                      handlePayAllForTable(
                                        parseInt(tableNo),
                                        false,
                                      )
                                    }
                                    disabled={processingAll === parseInt(tableNo)}
                                    variant="outline"
                                  >
                                    <Icon
                                      icon="streamline-ultimate-color:cash-briefcase"
                                      className="text-4xl mb-2"
                                    />
                                    <div>
                                      <h2 className="font-bold text-lg">Cash</h2>
                                      <p className="text-xs text-muted-foreground">Pay with cash</p>
                                    </div>
                                  </Button>
                                  <Button
                                    size="lg"
                                    className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                    onClick={() =>
                                      handlePayAllForTable(
                                        parseInt(tableNo),
                                        true,
                                      )
                                    }
                                    disabled={processingAll === parseInt(tableNo)}
                                    variant="outline"
                                  >
                                    <Icon
                                      icon="streamline-kameleon-color:bank-duo"
                                      className="text-4xl mb-2"
                                    />
                                    <div>
                                      <h2 className="font-bold text-lg">Bank Transfer</h2>
                                      <p className="text-xs text-muted-foreground">Electronic payment</p>
                                    </div>
                                  </Button>
                                </div>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                        Order Items
                      </h4>
                      {!allCompleted && (
                        <Badge variant="outline" className="text-xs">
                          Some items pending
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {tableOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-lg p-4"
                        >
                          {/* Order Image */}
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shrink-0">
                            <Image
                              src={order.imageUrl || "/placeholder-food.jpg"}
                              alt={order.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 80px, 96px"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{order.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                  <Badge
                                    variant={order.status === "Completed" ? "default" : "secondary"}
                                    className={
                                      order.status === "Completed"
                                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                                        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                    }
                                  >
                                    {order.status || "Pending"}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Qty: <span className="font-bold">{order.orderAmount}</span>
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    Unit: <span className="font-bold">{order.price.toFixed(2)} ETB</span>
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-primary">
                                  {(order.price * order.orderAmount).toFixed(2)} ETB
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Order ID: {order.id}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 self-end sm:self-center">
                            <AlertDialog
                              open={dialogOpen && selectedOrderId === order.id}
                              onOpenChange={handleDialogClose}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  className="w-full sm:w-auto gap-2 min-w-30"
                                  disabled={
                                    order.status !== "Completed" ||
                                    processingPayment === order.id
                                  }
                                  onClick={() => openPaymentDialog(order.id)}
                                  variant={order.status === "Completed" ? "default" : "outline"}
                                >
                                  {processingPayment === order.id ? (
                                    <span className="animate-spin">⟳</span>
                                  ) : order.status !== "Completed" ? (
                                    <>
                                      <Clock className="h-4 w-4" /> Waiting
                                    </>
                                  ) : (
                                    <>
                                      <Wallet className="h-4 w-4" /> Pay Now
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Pay Order #{order.id}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {order.title} - {(order.price * order.orderAmount).toFixed(2)} ETB
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
                                  <Button
                                    size="lg"
                                    className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                    onClick={() => {
                                      handlePaymentMethod(order.id, order, false);
                                    }}
                                    disabled={processingPayment === selectedOrderId}
                                    variant="outline"
                                  >
                                    <Icon
                                      icon="streamline-ultimate-color:cash-briefcase"
                                      className="text-3xl"
                                    />
                                    <h2 className="font-semibold">Cash</h2>
                                  </Button>
                                  <Button
                                    size="lg"
                                    className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                    onClick={() => {
                                      handlePaymentMethod(order.id, order, true);
                                    }}
                                    disabled={processingPayment === selectedOrderId}
                                    variant="outline"
                                  >
                                    <Icon
                                      icon="streamline-kameleon-color:bank-duo"
                                      className="text-3xl"
                                    />
                                    <h2 className="font-semibold">Bank</h2>
                                  </Button>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}