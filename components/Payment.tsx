/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Order,
  createHotelCreditConsumptionApi,
  fetchHotelCreditCompanies,
  fetchHotelCreditParties,
  fetchTables,
  fetchWaiters,
  filterUnpaidOrders,
  transformOrderDataForTableUpdate,
  transformOrderDataForWaiterUpdate,
  updateOrderCredit,
  updateTablePayment,
  updateWaiterPayment,
  type HotelCreditCompanyRow,
  type HotelCreditPartyRow,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { isCompanyAuthorized } from "@/lib/hotelApproval";
import {
  corporateCreditorDisplayName,
  isCorporateCreditFormReady,
  ordersToConsumptionLines,
} from "@/lib/corporateCreditPayment";
import { CorporateCreditPaymentFields } from "@/components/payment/CorporateCreditPaymentFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Wallet,
  User,
  Search,
  Filter,
  Calendar,
  Clock1,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { toast } from "sonner";
import { formatCafeTableDisplay } from "@/lib/cafeTableOrder";

interface PaymentProps {
  orders: Order[];
  hotelName: string;
  onHandlePayment: (
    id: number,
    order: Order,
    sales: number,
    bank: boolean, 
  ) => Promise<any>;
  onRefresh: () => Promise<void>;
}

export default function PaymentComponent({
  orders,
  hotelName,
  onHandlePayment,
  onRefresh,
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
  const [creditCompanies, setCreditCompanies] = useState<HotelCreditCompanyRow[]>(
    [],
  );
  const [creditParties, setCreditParties] = useState<HotelCreditPartyRow[]>([]);
  const [creditCompanyId, setCreditCompanyId] = useState("");
  const [creditStaffName, setCreditStaffName] = useState("");
  const [creditStaffPhone, setCreditStaffPhone] = useState("");

  const [allCreditActive, setAllCreditActive] = useState(false);
  const [singleCreditActive, setSingleCreditActive] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "ready" | "pending">(
    "all",
  );

  // Filter unpaid orders
  useEffect(() => {
    const unpaid = filterUnpaidOrders(orders, hotelName);
    const payRequire = unpaid.filter(
      (item) =>
        item.status?.toLowerCase() !== "cancelled" &&
        (item.credit === false || item.credit === null) &&
        new Date(item.createdAt).toDateString() === new Date().toDateString(),
    );
    payRequire.sort((a, b) => a.id - b.id);
    setUnpaidOrders(payRequire);
  }, [orders, hotelName]);

  const authorizedCreditCompanies = useMemo(
    () =>
      creditCompanies.filter((c) =>
        rowHotelMatchesTenantScope(c.HotelName, hotelName) &&
        isCompanyAuthorized(c.approvalStatus),
      ),
    [creditCompanies, hotelName],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchHotelCreditCompanies();
        if (cancelled) return;
        setCreditCompanies(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load corporate credit companies",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (hotelName) void load();
    return () => {
      cancelled = true;
    };
  }, [hotelName]);

  useEffect(() => {
    if (!creditCompanyId) {
      setCreditParties([]);
      return;
    }
    let cancelled = false;
    void fetchHotelCreditParties(Number(creditCompanyId))
      .then((rows) => {
        if (!cancelled) setCreditParties(rows);
      })
      .catch(() => {
        if (!cancelled) setCreditParties([]);
      });
    return () => {
      cancelled = true;
    };
  }, [creditCompanyId]);

  const resetCorporateCreditFields = () => {
    setCreditCompanyId("");
    setCreditStaffName("");
    setCreditStaffPhone("");
    setCreditParties([]);
  };

  // Group orders by table
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
        return ordersA[0].id - ordersB[0].id;
      }),
    );
  }, [unpaidOrders]);

  // Filter grouped orders based on search and filter type
  const filteredGroupedOrders = useMemo(() => {
    return Object.entries(groupedOrders).filter(([tableNo, tableOrders]) => {
      const matchesSearch =
        searchQuery === "" || tableNo.toString().includes(searchQuery);

      const allCompleted = tableOrders.every(
        (order) => order.status === "Completed",
      );

      if (filterType === "ready") {
        return matchesSearch && allCompleted;
      } else if (filterType === "pending") {
        return matchesSearch && !allCompleted;
      }

      return matchesSearch;
    });
  }, [groupedOrders, searchQuery, filterType]);

  // Handle cash or bank payment for single order
  const handlePaymentMethod = async (
    id: number,
    order: Order,
    bank: boolean, // true for bank, false for cash
  ) => {
    setProcessingPayment(id);
    setDialogOpen(false);
    try {
      const result = await onHandlePayment(
        id,
        order,
        order.price * order.orderAmount,
        bank,
      );
      const updatedOrder = { ...order, ...result, payment: "Paid" };

      // Update waiter and table records
      const [waiter, Table] = await Promise.all([
        findWaiterForHotel(order.waiterName),
        findTableForHotel(order.tableNo),
      ]);

      if (waiter) {
        const waiterUpdateData = transformOrderDataForWaiterUpdate(
          [updatedOrder],
          waiter.id,
        );
        await updateWaiterPayment(waiterUpdateData);
      }
      if (Table) {
        const tableUpdateData = transformOrderDataForTableUpdate(
          [updatedOrder],
          Table.id,
          order.tableNo,
        );
        await updateTablePayment(tableUpdateData);
      }

      toast.success(`Payment processed via ${bank ? "Bank" : "Cash"}`);
      await onRefresh();
    } catch (error) {
      console.error("Payment processing error:", error);
      toast.error("Failed to complete payment process");
    } finally {
      setProcessingPayment(null);
      setSelectedOrderId(null);
    }
  };

  const recordCorporateCreditAndPayOrders = async (
    orders: Order[],
    totalAmount: number,
  ) => {
    const company = authorizedCreditCompanies.find(
      (c) => String(c.id) === creditCompanyId,
    );
    if (!company) {
      toast.error("Select an authorized company");
      return;
    }
    if (!isCorporateCreditFormReady(creditCompanyId, creditStaffName, creditStaffPhone)) {
      toast.error("Enter staff name and phone for this credit payment");
      return;
    }

    const lines = ordersToConsumptionLines(orders);
    if (lines.length === 0) {
      toast.error("No order lines to bill to corporate credit");
      return;
    }

    await createHotelCreditConsumptionApi({
      companyId: company.id,
      guestName: creditStaffName.trim(),
      guestPhone: creditStaffPhone.trim(),
      linesJson: JSON.stringify(lines),
      totalAmount,
      suppressSuccessToast: true,
    });

    const creditorLabel = corporateCreditorDisplayName(
      company.companyName,
      creditStaffName,
    );

    const updatedOrders: Order[] = [];
    for (const order of orders) {
      const lineAmount = order.price * order.orderAmount;
      const result = await updateOrderCredit(order.id, creditorLabel, lineAmount);
      updatedOrders.push({ ...order, ...result, payment: "Paid" });
    }

    const waiters = (await fetchWaiters()).filter((item) =>
      rowHotelMatchesTenantScope(item.HotelName, hotelName),
    );
    const ordersByWaiter = updatedOrders.reduce(
      (acc, order) => {
        if (!acc[order.waiterName]) acc[order.waiterName] = [];
        acc[order.waiterName].push(order);
        return acc;
      },
      {} as Record<string, Order[]>,
    );
    for (const [waiterName, waiterOrders] of Object.entries(ordersByWaiter)) {
      const waiter = waiters.find((item) => item.name === waiterName);
      if (waiter) {
        await updateWaiterPayment(
          transformOrderDataForWaiterUpdate(waiterOrders, waiter.id),
        );
      }
    }

    const tableNos = [...new Set(updatedOrders.map((o) => o.tableNo))];
    const tables = (await fetchTables()).filter((item) =>
      rowHotelMatchesTenantScope(item.HotelName, hotelName),
    );
    for (const tableNo of tableNos) {
      const table = tables.find((item) => item.tableNo === tableNo);
      const tableOrders = updatedOrders.filter((o) => o.tableNo === tableNo);
      if (table) {
        await updateTablePayment(
          transformOrderDataForTableUpdate(tableOrders, table.id, tableNo),
        );
      }
    }
  };

  const handleSingleCreditPayment = async (id: number, order: Order) => {
    setProcessingPayment(id);
    setDialogOpen(false);
    const amount = calculateSingleOrderTotal(order);

    try {
      await recordCorporateCreditAndPayOrders([order], amount);
      toast.success("Corporate credit payment recorded");
      await onRefresh();
    } catch (error) {
      console.error("Credit payment processing error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process credit payment",
      );
    } finally {
      setProcessingPayment(null);
      setSelectedOrderId(null);
      setSingleCreditActive(false);
      resetCorporateCreditFields();
    }
  };

  // Handle cash or bank payment for all orders at a table
  const handlePayAllForTable = async (tableNo: number, bank: boolean) => {
    const tableOrders = groupedOrders[tableNo];
    if (!tableOrders) return;

    setProcessingAll(tableNo);
    setDialogOpen(false);

    try {
      const completedOrders = tableOrders.filter(
        (order) => order.status?.toLowerCase() === "completed",
      );

      const updatedOrders: Order[] = [];
      for (const order of completedOrders) {
        const result = await onHandlePayment(
          order.id,
          order,
          order.price * order.orderAmount,
          bank,
        );
        updatedOrders.push({ ...order, ...result, payment: "Paid" });
      }

      // Update waiter records
      const waiters = (await fetchWaiters()).filter(
        (item) => rowHotelMatchesTenantScope(item.HotelName, hotelName),
      );
      const ordersByWaiter = updatedOrders.reduce(
        (acc, order) => {
          if (!acc[order.waiterName]) {
            acc[order.waiterName] = [];
          }
          acc[order.waiterName].push(order);
          return acc;
        },
        {} as Record<string, Order[]>,
      );

      for (const [waiterName, orders] of Object.entries(ordersByWaiter)) {
        const waiter = waiters.find((item) => item.name === waiterName);
        if (waiter) {
          const waiterUpdateData = transformOrderDataForWaiterUpdate(
            orders as Order[],
            waiter.id,
          );
          await updateWaiterPayment(waiterUpdateData);
        }
      }

      // Update table record
      const tables = (await fetchTables()).filter(
        (item) => rowHotelMatchesTenantScope(item.HotelName, hotelName),
      );
      const table = tables.find((item) => item.tableNo === tableNo);
      if (table) {
        const tableUpdateData = transformOrderDataForTableUpdate(
          updatedOrders,
          table.id,
          tableNo,
        );
        await updateTablePayment(tableUpdateData);
      }

      toast.success(`Batch payment processed via ${bank ? "Bank" : "Cash"}`);
      await onRefresh();
    } catch (error) {
      console.error("Batch payment processing error:", error);
      toast.error("Failed to complete batch payment process");
    } finally {
      setProcessingAll(null);
      setSelectedTableForAll(null);
    }
  };

  const handleCreditAllForTable = async (tableNo: number, totalAmount: number) => {
    const tableOrders = groupedOrders[tableNo];
    if (!tableOrders) return;

    setProcessingAll(tableNo);
    setDialogOpen(false);

    try {
      const completedOrders = tableOrders.filter(
        (order) => order.status?.toLowerCase() === "completed",
      );
      await recordCorporateCreditAndPayOrders(completedOrders, totalAmount);
      toast.success("Batch corporate credit payment recorded");
      await onRefresh();
    } catch (error) {
      console.error("Batch credit processing error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete batch credit process",
      );
    } finally {
      setProcessingAll(null);
      setSelectedTableForAll(null);
      setAllCreditActive(false);
      resetCorporateCreditFields();
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
      setAllCreditActive(false);
      setSingleCreditActive(false);
      resetCorporateCreditFields();
    }
  };

  const areAllOrdersCompleted = (tableOrders: Order[]) => {
    return tableOrders.every((order) => order.status === "Completed");
  };

  const calculateTableTotal = (tableOrders: Order[]) => {
    return tableOrders.reduce((total, order) => {
      return total + order.price * order.orderAmount;
    }, 0);
  };

  const calculateSingleOrderTotal = (order: Order) => {
    return order.price * order.orderAmount;
  };

  const findWaiterForHotel = async (waiterName: string) => {
    const waiters = await fetchWaiters();
    return waiters.find(
      (item) => item.name === waiterName && rowHotelMatchesTenantScope(item.HotelName, hotelName),
    );
  };

  const findTableForHotel = async (tableNo: number) => {
    const tables = await fetchTables();
    return tables.find(
      (item) => item.tableNo === tableNo && rowHotelMatchesTenantScope(item.HotelName, hotelName),
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="text-primary h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Pending Payments</h2>
            <p className="text-sm text-muted-foreground">
              {unpaidOrders.length} unpaid orders across{" "}
              {Object.keys(groupedOrders).length} tables
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
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

          <Tabs
            value={filterType}
            onValueChange={(v) =>
              setFilterType(v as "all" | "ready" | "pending")
            }
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-64">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="ready" className="text-xs">
                Ready
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                Pending
              </TabsTrigger>
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
            {filteredGroupedOrders.length}{" "}
            {filteredGroupedOrders.length === 1 ? "table" : "tables"} found
          </Badge>
        </div>
      )}

      {filteredGroupedOrders.length === 0 &&
      Object.keys(groupedOrders).length > 0 ? (
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
      ) : unpaidOrders.length === 0 ? (
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
            const pendingOrders = tableOrders.filter(
              (o) => o.status !== "Completed",
            );
            const completedOrders = tableOrders.filter(
              (o) => o.status === "Completed",
            );
            const serviceCaption = String(
              tableOrders.find((o) => o.serviceCaption)?.serviceCaption ?? "",
            ).trim();
            const tableDisplay = formatCafeTableDisplay(
              Number(tableNo),
              serviceCaption,
            );

            return (
              <Collapsible
                key={tableNo}
                defaultOpen={false}
                className="group/table"
              >
                <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full cursor-pointer rounded-none px-0 py-0 hover:bg-muted/40"
                    >
                      <CardHeader className="w-full bg-muted/30 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-base px-3 py-1 font-mono"
                              >
                                {tableDisplay}
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
                                {tableOrders[0]?.waiterName || "Self-Service"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className="text-sm px-3 py-1"
                            >
                              {tableOrders.length}{" "}
                              {tableOrders.length === 1 ? "order" : "orders"}
                            </Badge>
                            <span className="font-bold text-lg">
                              {tableTotal.toFixed(2)} ETB
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/table:rotate-180" />
                          </div>
                        </div>
                      </CardHeader>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
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
                            You can pay all {tableOrders.length} orders for
                            {` ${tableDisplay}`} at once to save time.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-black text-green-800">
                              {tableTotal.toFixed(2)} ETB
                            </div>
                            <div className="text-xs text-green-600">
                              Total Amount
                            </div>
                          </div>
                          <AlertDialog
                            open={
                              dialogOpen &&
                              selectedTableForAll ===
                                parseInt(tableNo.toString())
                            }
                            onOpenChange={handleDialogClose}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2 shadow-lg"
                                onClick={() =>
                                  openPayAllDialog(parseInt(tableNo.toString()))
                                }
                                disabled={
                                  processingAll === parseInt(tableNo.toString())
                                }
                              >
                                {processingAll ===
                                parseInt(tableNo.toString()) ? (
                                  <>
                                    <span className="animate-spin">⟳</span>{" "}
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Wallet className="h-4 w-4" /> Pay All Now
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent className="flex flex-col max-h-[90vh] p-0">
                              <AlertDialogHeader className="px-6 pt-6 pb-2">
                                <AlertDialogTitle className="text-xl">
                                  Pay All Orders
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-base">
                                  You are about to pay all {tableOrders.length}{" "}
                                  orders for {tableDisplay}
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <div className="flex-1 overflow-y-auto px-6">
                                <div className="py-4 border-y my-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-muted-foreground">
                                      Table Total:
                                    </span>
                                    <span className="text-2xl font-bold">
                                      {tableTotal.toFixed(2)} ETB
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    This will mark all completed orders for
                                    {` ${tableDisplay}`}{" "}
                                    as paid.
                                  </div>
                                </div>

                                <div className="space-y-4 pb-4">
                                  <h4 className="font-medium">
                                    Select Payment Method:
                                  </h4>

                                  {/* Cash and Bank buttons */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                    <Button
                                      size="lg"
                                      className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                      onClick={() =>
                                        handlePayAllForTable(
                                          parseInt(tableNo.toString()),
                                          false,
                                        )
                                      }
                                      disabled={
                                        processingAll ===
                                        parseInt(tableNo.toString())
                                      }
                                      variant="outline"
                                    >
                                      <Icon
                                        icon="streamline-ultimate-color:cash-briefcase"
                                        className="text-4xl mb-2"
                                      />
                                      <div>
                                        <h2 className="font-bold text-lg">
                                          Cash
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                          Pay with cash (withBank=false)
                                        </p>
                                      </div>
                                    </Button>
                                    <Button
                                      size="lg"
                                      className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                      onClick={() =>
                                        handlePayAllForTable(
                                          parseInt(tableNo.toString()),
                                          true, // true for bank
                                        )
                                      }
                                      disabled={
                                        processingAll ===
                                        parseInt(tableNo.toString())
                                      }
                                      variant="outline"
                                    >
                                      <Icon
                                        icon="streamline-kameleon-color:bank-duo"
                                        className="text-4xl mb-2"
                                      />
                                      <div>
                                        <h2 className="font-bold text-lg">
                                          Bank Transfer
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                          Electronic payment (withBank=true)
                                        </p>
                                      </div>
                                    </Button>
                                  </div>

                                  {/* Credit payment section */}
                                  <div className="flex flex-col gap-5">
                                    <Button
                                      size="lg"
                                      onClick={() =>
                                        setAllCreditActive(!allCreditActive)
                                      }
                                      className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                      variant="outline"
                                      disabled={
                                        processingAll ===
                                          parseInt(tableNo.toString()) ||
                                        authorizedCreditCompanies.length === 0
                                      }
                                    >
                                      <Icon
                                        icon="noto:credit-card"
                                        className="text-4xl mb-2"
                                      />
                                      <div>
                                        <h2 className="font-bold text-lg">
                                          Credit Transfer
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                          Corporate credit (company + staff)
                                        </p>
                                      </div>
                                    </Button>

                                    {allCreditActive && (
                                      <>
                                        <CorporateCreditPaymentFields
                                          companies={authorizedCreditCompanies}
                                          parties={creditParties}
                                          companyId={creditCompanyId}
                                          onCompanyIdChange={setCreditCompanyId}
                                          staffName={creditStaffName}
                                          onStaffNameChange={setCreditStaffName}
                                          staffPhone={creditStaffPhone}
                                          onStaffPhoneChange={setCreditStaffPhone}
                                          amountETB={tableTotal}
                                          ordersForDealCheck={tableOrders.filter(
                                            (o) =>
                                              o.status?.toLowerCase() ===
                                              "completed",
                                          )}
                                        />
                                        <Button
                                          disabled={
                                            !isCorporateCreditFormReady(
                                              creditCompanyId,
                                              creditStaffName,
                                              creditStaffPhone,
                                            ) ||
                                            processingAll ===
                                              parseInt(tableNo.toString())
                                          }
                                          onClick={() =>
                                            handleCreditAllForTable(
                                              parseInt(tableNo.toString()),
                                              tableTotal,
                                            )
                                          }
                                          className="flex gap-4 items-center bg-green-600 hover:bg-green-700"
                                        >
                                          <Wallet />
                                          Pay all with corporate credit
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t px-6 py-4 flex justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => handleDialogClose(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order items list */}
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
                      {pendingOrders.map((order: Order) => (
                        <div
                          key={order.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-lg p-4"
                        >
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
                                <h3 className="font-bold text-lg">
                                  {order.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                  <Badge
                                    variant={
                                      order.status === "Completed"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={`${
                                      order.status === "Completed"
                                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                                        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                    }`}
                                  >
                                    {order.status || "Pending"}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Qty:{" "}
                                    <span className="font-bold">
                                      {order.orderAmount}
                                    </span>
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    Unit:{" "}
                                    <span className="font-bold">
                                      {order.price.toFixed(2)} ETB
                                    </span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2 mt-3">
                                    <Calendar size={10} />
                                    <span className="text-sm">
                                      {new Date(order.createdAt).toDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-3">
                                    <Clock1 size={10} />
                                    <span className="text-sm">
                                      {new Date(
                                        order.createdAt,
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-primary">
                                  {(order.price * order.orderAmount).toFixed(2)}{" "}
                                  ETB
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Order ID: {order.id}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pay Now button for individual order */}
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
                                  variant={
                                    order.status === "Completed"
                                      ? "default"
                                      : "outline"
                                  }
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
                                    {order.title} -{" "}
                                    {(order.price * order.orderAmount).toFixed(
                                      2,
                                    )}{" "}
                                    ETB
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <div className="space-y-4 py-4">
                                  {/* Cash and Bank options for single order */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Button
                                      size="lg"
                                      className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                      onClick={() => {
                                        handlePaymentMethod(
                                          order.id,
                                          order,
                                          false, // false for cash
                                        );
                                      }}
                                      disabled={
                                        processingPayment === selectedOrderId
                                      }
                                      variant="outline"
                                    >
                                      <Icon
                                        icon="streamline-ultimate-color:cash-briefcase"
                                        className="text-3xl"
                                      />
                                      <h2 className="font-semibold">Cash</h2>
                                      <p className="text-xs text-muted-foreground">
                                        (withBank=false)
                                      </p>
                                    </Button>
                                    <Button
                                      size="lg"
                                      className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                      onClick={() => {
                                        handlePaymentMethod(
                                          order.id,
                                          order,
                                          true, // true for bank
                                        );
                                      }}
                                      disabled={
                                        processingPayment === selectedOrderId
                                      }
                                      variant="outline"
                                    >
                                      <Icon
                                        icon="streamline-kameleon-color:bank-duo"
                                        className="text-3xl"
                                      />
                                      <h2 className="font-semibold">Bank</h2>
                                      <p className="text-xs text-muted-foreground">
                                        (withBank=true)
                                      </p>
                                    </Button>
                                  </div>

                                  {/* Credit payment section for single order */}
                                  <div className="border-t pt-4">
                                    <Button
                                      size="lg"
                                      onClick={() =>
                                        setSingleCreditActive(
                                          !singleCreditActive,
                                        )
                                      }
                                      className="cursor-pointer w-full flex flex-col items-center gap-2 h-auto py-6 mb-4"
                                      variant="outline"
                                      disabled={
                                        processingPayment === order.id ||
                                        authorizedCreditCompanies.length === 0
                                      }
                                    >
                                      <Icon
                                        icon="noto:credit-card"
                                        className="text-4xl mb-2"
                                      />
                                      <div>
                                        <h2 className="font-bold text-lg">
                                          Corporate credit
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                          Company + staff phone
                                        </p>
                                      </div>
                                    </Button>

                                    {singleCreditActive && (
                                      <div className="space-y-4 mt-4">
                                        <CorporateCreditPaymentFields
                                          companies={authorizedCreditCompanies}
                                          parties={creditParties}
                                          companyId={creditCompanyId}
                                          onCompanyIdChange={setCreditCompanyId}
                                          staffName={creditStaffName}
                                          onStaffNameChange={setCreditStaffName}
                                          staffPhone={creditStaffPhone}
                                          onStaffPhoneChange={setCreditStaffPhone}
                                          amountETB={calculateSingleOrderTotal(
                                            order,
                                          )}
                                          ordersForDealCheck={[order]}
                                        />
                                        <Button
                                          disabled={
                                            !isCorporateCreditFormReady(
                                              creditCompanyId,
                                              creditStaffName,
                                              creditStaffPhone,
                                            ) ||
                                            processingPayment === order.id
                                          }
                                          onClick={() =>
                                            handleSingleCreditPayment(
                                              order.id,
                                              order,
                                            )
                                          }
                                          className="w-full bg-green-600 hover:bg-green-700"
                                        >
                                          Pay with corporate credit
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDialogClose(false)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}

                      {completedOrders.length > 0 ? (
                        <Collapsible
                          defaultOpen={pendingOrders.length === 0}
                          className="group/completed border rounded-lg"
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full flex items-center justify-between px-4 py-3 h-auto rounded-lg hover:bg-muted/50"
                            >
                              <span className="font-semibold text-sm">
                                Completed orders ({completedOrders.length})
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/completed:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-4 px-4 pb-4">
                            {completedOrders.map((order: Order) => (
                              <div
                                key={order.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-lg p-4"
                              >
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shrink-0">
                                  <Image
                                    src={
                                      order.imageUrl || "/placeholder-food.jpg"
                                    }
                                    alt={order.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 80px, 96px"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <h3 className="font-bold text-lg">
                                        {order.title}
                                      </h3>
                                      <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                          {order.status || "Completed"}
                                        </Badge>
                                        {order.serviceCaption ? (
                                          <Badge variant="outline">
                                            {order.serviceCaption}
                                          </Badge>
                                        ) : null}
                                        <span className="text-sm text-muted-foreground">
                                          Qty:{" "}
                                          <span className="font-bold">
                                            {order.orderAmount}
                                          </span>
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          Unit:{" "}
                                          <span className="font-bold">
                                            {order.price.toFixed(2)} ETB
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-primary">
                                        {(
                                          order.price * order.orderAmount
                                        ).toFixed(2)}{" "}
                                        ETB
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Order ID: {order.id}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 self-end sm:self-center">
                                  <AlertDialog
                                    open={
                                      dialogOpen && selectedOrderId === order.id
                                    }
                                    onOpenChange={handleDialogClose}
                                  >
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        className="w-full sm:w-auto gap-2 min-w-30"
                                        disabled={
                                          processingPayment === order.id
                                        }
                                        onClick={() =>
                                          openPaymentDialog(order.id)
                                        }
                                      >
                                        {processingPayment === order.id ? (
                                          <span className="animate-spin">⟳</span>
                                        ) : (
                                          <>
                                            <Wallet className="h-4 w-4" /> Pay
                                            Now
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
                                          {order.title} -{" "}
                                          {(
                                            order.price * order.orderAmount
                                          ).toFixed(2)}{" "}
                                          ETB
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>

                                      <div className="space-y-4 py-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <Button
                                            size="lg"
                                            className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                            onClick={() =>
                                              handlePaymentMethod(
                                                order.id,
                                                order,
                                                false,
                                              )
                                            }
                                            disabled={
                                              processingPayment ===
                                              selectedOrderId
                                            }
                                            variant="outline"
                                          >
                                            <Icon
                                              icon="streamline-ultimate-color:cash-briefcase"
                                              className="text-3xl"
                                            />
                                            <h2 className="font-semibold">
                                              Cash
                                            </h2>
                                          </Button>
                                          <Button
                                            size="lg"
                                            className="cursor-pointer flex flex-col items-center gap-2 h-auto py-6"
                                            onClick={() =>
                                              handlePaymentMethod(
                                                order.id,
                                                order,
                                                true,
                                              )
                                            }
                                            disabled={
                                              processingPayment ===
                                              selectedOrderId
                                            }
                                            variant="outline"
                                          >
                                            <Icon
                                              icon="streamline-kameleon-color:bank-duo"
                                              className="text-3xl"
                                            />
                                            <h2 className="font-semibold">
                                              Bank
                                            </h2>
                                          </Button>
                                        </div>

                                        <div className="border-t pt-4">
                                          <Button
                                            size="lg"
                                            onClick={() =>
                                              setSingleCreditActive(
                                                !singleCreditActive,
                                              )
                                            }
                                            className="cursor-pointer w-full flex flex-col items-center gap-2 h-auto py-6 mb-4"
                                            variant="outline"
                                            disabled={
                                              processingPayment === order.id ||
                                              authorizedCreditCompanies.length ===
                                                0
                                            }
                                          >
                                            <Icon
                                              icon="noto:credit-card"
                                              className="text-4xl mb-2"
                                            />
                                            <h2 className="font-bold text-lg">
                                              Corporate credit
                                            </h2>
                                          </Button>

                                          {singleCreditActive && (
                                            <div className="space-y-4 mt-4">
                                              <CorporateCreditPaymentFields
                                                companies={
                                                  authorizedCreditCompanies
                                                }
                                                parties={creditParties}
                                                companyId={creditCompanyId}
                                                onCompanyIdChange={
                                                  setCreditCompanyId
                                                }
                                                staffName={creditStaffName}
                                                onStaffNameChange={
                                                  setCreditStaffName
                                                }
                                                staffPhone={creditStaffPhone}
                                                onStaffPhoneChange={
                                                  setCreditStaffPhone
                                                }
                                                amountETB={calculateSingleOrderTotal(
                                                  order,
                                                )}
                                                ordersForDealCheck={[order]}
                                              />
                                              <Button
                                                disabled={
                                                  !isCorporateCreditFormReady(
                                                    creditCompanyId,
                                                    creditStaffName,
                                                    creditStaffPhone,
                                                  ) ||
                                                  processingPayment === order.id
                                                }
                                                onClick={() =>
                                                  handleSingleCreditPayment(
                                                    order.id,
                                                    order,
                                                  )
                                                }
                                                className="w-full bg-green-600 hover:bg-green-700"
                                              >
                                                Pay with corporate credit
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex justify-end">
                                        <Button
                                          variant="outline"
                                          onClick={() =>
                                            handleDialogClose(false)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </div>
                  </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
