/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo, useRef } from "react";
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
  type Item,
} from "@/lib/actions";
import { CafeCashierOrderUpdatePanel } from "@/components/cafe/CafeCashierOrderUpdatePanel";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  LayoutGrid,
  Loader2,
  X,
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
import { isSameCafeBusinessDay } from "@/lib/cafeBusinessDay";
import { formatCafeTableDisplayFromRegistry } from "@/lib/cafeTableOrder";
import {
  buildAmountTablePaymentPlan,
  type OrderPaymentChannel,
  type PrimaryAmountChannel,
} from "@/lib/cafeAmountPayment";
import {
  CafeTablePaymentModePanel,
  type TablePaymentMode,
} from "@/components/cafe/CafeTablePaymentModePanel";
import { cn } from "@/lib/utils";
import { useCafeOrderMode } from "@/hooks/useCafeOrderMode";
import { useCashierCancelOrdersEnabled } from "@/hooks/useCashierCancelOrdersEnabled";
import { isAnalogCafeOrderMode } from "@/lib/cafeOrderMode";

type ReadyTableSummary = {
  tableNo: number;
  display: string;
  orderCount: number;
  total: number;
  waiterName: string;
};

interface PaymentProps {
  orders: Order[];
  items: Item[];
  hotelName: string;
  onHandlePayment: (
    id: number,
    order: Order,
    sales: number,
    bank: boolean,
    options?: {
      bankTransferAmount?: number;
      bankTipCashDeduction?: number;
      silent?: boolean;
    },
  ) => Promise<any>;
  onRefresh: () => Promise<void>;
}

export default function PaymentComponent({
  orders,
  items,
  hotelName,
  onHandlePayment,
  onRefresh,
}: PaymentProps) {
  const analog = isAnalogCafeOrderMode(useCafeOrderMode());
  const cashierCanCancel = useCashierCancelOrdersEnabled();
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [processingPayment, setProcessingPayment] = useState<number | null>(
    null,
  );
  const [processingAll, setProcessingAll] = useState<number | null>(null);
  const [processingMultiTable, setProcessingMultiTable] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedTableForAll, setSelectedTableForAll] = useState<number | null>(
    null,
  );
  const [multiTablePayOpen, setMultiTablePayOpen] = useState(false);
  const [selectedReadyTables, setSelectedReadyTables] = useState<Set<number>>(
    new Set(),
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
  const [cafeTables, setCafeTables] = useState<
    Awaited<ReturnType<typeof fetchTables>>
  >([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "ready" | "pending">(
    "all",
  );
  const [tablePaymentModes, setTablePaymentModes] = useState<
    Record<number, TablePaymentMode>
  >({});
  const [tableAmountForm, setTableAmountForm] = useState<
    Record<
      number,
      {
        primaryChannel: "cash" | "bank";
        amount: string;
      }
    >
  >({});
  const [processingAmountTable, setProcessingAmountTable] = useState<
    number | null
  >(null);
  const tableAmountPrimaryChannelRef = useRef<
    Record<number, PrimaryAmountChannel>
  >({});

  const isReadyForPayment = useCallback(
    (order: Order) => {
      const status = String(order.status || "").toLowerCase();
      if (status === "cancelled" || status === "failed") return false;
      return analog ? true : status === "completed";
    },
    [analog],
  );

  // Filter unpaid orders
  useEffect(() => {
    const unpaid = filterUnpaidOrders(orders, hotelName);
    const payRequire = unpaid.filter(
      (item) =>
        item.status?.toLowerCase() !== "cancelled" &&
        item.status?.toLowerCase() !== "failed" &&
        (item.credit === false || item.credit === null) &&
        isSameCafeBusinessDay(item.createdAt),
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
        const [companies, tables] = await Promise.all([
          fetchHotelCreditCompanies(),
          fetchTables(),
        ]);
        if (cancelled) return;
        setCreditCompanies(Array.isArray(companies) ? companies : []);
        setCafeTables(
          tables.filter((t) =>
            rowHotelMatchesTenantScope(t.HotelName, hotelName),
          ),
        );
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
    const q = searchQuery.trim().toLowerCase();
    return Object.entries(groupedOrders).filter(([tableNo, tableOrders]) => {
      const tableLabel = formatCafeTableDisplayFromRegistry(
        Number(tableNo),
        cafeTables,
        tableOrders.find((o) => o.serviceCaption)?.serviceCaption,
      ).toLowerCase();
      const matchesSearch =
        q === "" ||
        tableNo.toString().includes(q) ||
        tableLabel.includes(q);

      const allCompleted = tableOrders.every((order) => isReadyForPayment(order));

      if (filterType === "ready") {
        return matchesSearch && allCompleted;
      } else if (filterType === "pending") {
        return matchesSearch && !allCompleted;
      }

      return matchesSearch;
    });
  }, [groupedOrders, searchQuery, filterType, cafeTables]);

  const areAllOrdersCompleted = (tableOrders: Order[]) => {
    return tableOrders.every((order) => isReadyForPayment(order));
  };

  const calculateTableTotal = (tableOrders: Order[]) => {
    return tableOrders.reduce((total, order) => {
      return total + order.price * order.orderAmount;
    }, 0);
  };

  const readyTableEntries = useMemo(
    () =>
      filteredGroupedOrders.filter(([, tableOrders]) =>
        areAllOrdersCompleted(tableOrders),
      ),
    [filteredGroupedOrders],
  );

  const allReadyTablesSelected =
    readyTableEntries.length > 0 &&
    readyTableEntries.every(([tableNo]) =>
      selectedReadyTables.has(Number(tableNo)),
    );

  const readyTablesSelectionState = useMemo((): boolean | "indeterminate" => {
    if (selectedReadyTables.size === 0) return false;
    if (allReadyTablesSelected) return true;
    return "indeterminate";
  }, [selectedReadyTables.size, allReadyTablesSelected]);

  const selectedReadyTablesSummary = useMemo((): ReadyTableSummary[] => {
    return [...selectedReadyTables]
      .sort((a, b) => a - b)
      .flatMap((tableNo) => {
        const tableOrders = groupedOrders[tableNo];
        if (!tableOrders) return [];
        const completedOrders = tableOrders.filter((order) =>
          isReadyForPayment(order),
        );
        return [
          {
            tableNo,
            display: formatCafeTableDisplayFromRegistry(
              tableNo,
              cafeTables,
              tableOrders.find((o) => o.serviceCaption)?.serviceCaption,
            ),
            orderCount: completedOrders.length,
            total: calculateTableTotal(completedOrders),
            waiterName:
              String(tableOrders[0]?.waiterName ?? "").trim() || "Self-Service",
          },
        ];
      });
  }, [groupedOrders, selectedReadyTables, cafeTables, isReadyForPayment]);

  useEffect(() => {
    setSelectedReadyTables(new Set());
    setMultiTablePayOpen(false);
  }, [searchQuery, filterType]);

  useEffect(() => {
    if (selectedReadyTables.size === 0) {
      setMultiTablePayOpen(false);
    }
  }, [selectedReadyTables.size]);

  const toggleReadyTable = (tableNo: number, checked: boolean) => {
    setSelectedReadyTables((prev) => {
      const next = new Set(prev);
      if (checked) next.add(tableNo);
      else next.delete(tableNo);
      return next;
    });
  };

  const toggleAllReadyTables = (checked: boolean) => {
    if (!checked) {
      setSelectedReadyTables(new Set());
      return;
    }
    setSelectedReadyTables(
      new Set(readyTableEntries.map(([tableNo]) => Number(tableNo))),
    );
  };

  const selectedReadyTableOrders = useMemo(() => {
    const orders: Order[] = [];
    for (const tableNo of selectedReadyTables) {
      const tableOrders = groupedOrders[tableNo];
      if (!tableOrders) continue;
      orders.push(
        ...tableOrders.filter(
          (order) => isReadyForPayment(order),
        ),
      );
    }
    return orders;
  }, [groupedOrders, selectedReadyTables, isReadyForPayment]);

  const selectedReadyTablesTotal = useMemo(
    () => calculateTableTotal(selectedReadyTableOrders),
    [selectedReadyTableOrders],
  );

  const getTablePaymentMode = (tableNo: number): TablePaymentMode =>
    tablePaymentModes[tableNo] ?? "orders";

  const getTableAmountFormState = (tableNo: number) =>
    tableAmountForm[tableNo] ?? {
      primaryChannel: "cash" as const,
      amount: "",
    };

  const finalizePaidOrders = async (updatedOrders: Order[]) => {
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

    const tables = (await fetchTables()).filter((item) =>
      rowHotelMatchesTenantScope(item.HotelName, hotelName),
    );
    const tableNos = [...new Set(updatedOrders.map((o) => o.tableNo))];
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

  const settleOrdersWithChannels = async (
    channels: OrderPaymentChannel[],
  ): Promise<Order[]> => {
    const updatedOrders: Order[] = [];
    for (const channel of channels) {
      const {
        order,
        withBank,
        bankTransferAmount,
        bankTipCashDeduction,
      } = channel;
      const payWithBank = withBank === true;
      const result = await onHandlePayment(
        order.id,
        order,
        order.price * order.orderAmount,
        payWithBank,
        {
          silent: true,
          ...(payWithBank
            ? {
                ...(bankTransferAmount != null
                  ? { bankTransferAmount }
                  : {}),
                ...(bankTipCashDeduction != null
                  ? { bankTipCashDeduction }
                  : {}),
              }
            : {}),
        },
      );
      updatedOrders.push({
        ...order,
        ...result,
        payment: "Paid",
        withBank: payWithBank,
      });
    }

    await finalizePaidOrders(updatedOrders);
    return updatedOrders;
  };

  const settleCompletedOrders = async (
    completedOrders: Order[],
    bank: boolean,
  ): Promise<Order[]> => {
    const channels: OrderPaymentChannel[] = completedOrders.map((order) => ({
      order,
      withBank: bank,
    }));
    return settleOrdersWithChannels(channels);
  };

  const handleAmountPaymentForTable = async (
    tableNo: number,
    submitSnapshot?: {
      primaryChannel: PrimaryAmountChannel;
      amount: string;
    },
  ) => {
    const tableOrders = groupedOrders[tableNo];
    if (!tableOrders) return;

    if (!areAllOrdersCompleted(tableOrders)) {
      toast.error(
        analog
          ? "All unpaid lines on this table must be active before amount settlement"
          : "All table orders must be completed before amount settlement",
      );
      return;
    }

    const completedOrders = tableOrders.filter((order) =>
      isReadyForPayment(order),
    );
    const form = getTableAmountFormState(tableNo);
    const primaryChannel =
      submitSnapshot?.primaryChannel ??
      tableAmountPrimaryChannelRef.current[tableNo] ??
      form.primaryChannel;
    const amountInput = submitSnapshot?.amount ?? form.amount;
    const amount = Number(amountInput.replace(/,/g, "").trim());
    const tableTotal = calculateTableTotal(completedOrders);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }
    if (amount > tableTotal + 0.001) {
      toast.error("Amount cannot exceed table total");
      return;
    }

    setProcessingAmountTable(tableNo);
    try {
      if (completedOrders.length === 0) {
        toast.error("No completed orders to settle");
        return;
      }

      const plan = buildAmountTablePaymentPlan(
        completedOrders,
        amount,
        primaryChannel,
      );

      const cashBankChannels = [...plan.cashChannels, ...plan.bankChannels];
      if (cashBankChannels.length > 0) {
        await settleOrdersWithChannels(cashBankChannels);
      }

      setTableAmountForm((prev) => ({
        ...prev,
        [tableNo]: { primaryChannel, amount: "" },
      }));

      toast.success(
        `Table settled — cash ${plan.requestedCash.toFixed(2)} ETB, bank ${plan.requestedBank.toFixed(2)} ETB`,
      );

      await onRefresh();
    } catch (error) {
      console.error("Amount payment error:", error);
      toast.error("Failed to process amount payment");
    } finally {
      setProcessingAmountTable(null);
    }
  };

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
      const completedOrders = tableOrders.filter((order) =>
        isReadyForPayment(order),
      );
      await settleCompletedOrders(completedOrders, bank);
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

  const closeMultiTablePayDialog = () => {
    if (processingMultiTable) return;
    setMultiTablePayOpen(false);
    setAllCreditActive(false);
    resetCorporateCreditFields();
  };

  const handlePayAllForSelectedTables = async (bank: boolean) => {
    if (selectedReadyTableOrders.length === 0) return;

    setProcessingMultiTable(true);

    try {
      await settleCompletedOrders(selectedReadyTableOrders, bank);
      toast.success(
        `Paid ${selectedReadyTableOrders.length} order${selectedReadyTableOrders.length === 1 ? "" : "s"} across ${selectedReadyTables.size} table${selectedReadyTables.size === 1 ? "" : "s"} via ${bank ? "bank" : "cash"}`,
      );
      setSelectedReadyTables(new Set());
      setMultiTablePayOpen(false);
      await onRefresh();
    } catch (error) {
      console.error("Multi-table batch payment error:", error);
      toast.error("Failed to complete multi-table batch payment");
    } finally {
      setProcessingMultiTable(false);
      setAllCreditActive(false);
      resetCorporateCreditFields();
    }
  };

  const handleCreditAllForSelectedTables = async (totalAmount: number) => {
    if (selectedReadyTableOrders.length === 0) return;

    setProcessingMultiTable(true);

    try {
      await recordCorporateCreditAndPayOrders(
        selectedReadyTableOrders,
        totalAmount,
      );
      toast.success(
        `Corporate credit recorded for ${selectedReadyTableOrders.length} order${selectedReadyTableOrders.length === 1 ? "" : "s"} across ${selectedReadyTables.size} table${selectedReadyTables.size === 1 ? "" : "s"}`,
      );
      setSelectedReadyTables(new Set());
      setMultiTablePayOpen(false);
      await onRefresh();
    } catch (error) {
      console.error("Multi-table batch credit error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete multi-table batch credit",
      );
    } finally {
      setProcessingMultiTable(false);
      setAllCreditActive(false);
      resetCorporateCreditFields();
    }
  };

  const handleCreditAllForTable = async (tableNo: number, totalAmount: number) => {
    const tableOrders = groupedOrders[tableNo];
    if (!tableOrders) return;

    setProcessingAll(tableNo);
    setDialogOpen(false);

    try {
      const completedOrders = tableOrders.filter((order) =>
        isReadyForPayment(order),
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

      {readyTableEntries.length > 0 ? (
        <div
          className={cn(
            "overflow-hidden rounded-xl border shadow-sm transition-colors",
            selectedReadyTables.size > 0
              ? "border-green-300/80 bg-linear-to-r from-green-50/90 via-emerald-50/50 to-transparent dark:from-green-950/30 dark:via-emerald-950/20"
              : "border-border/60 bg-muted/20",
          )}
        >
          <div className="h-1 bg-linear-to-r from-green-600/80 via-green-500/40 to-transparent" />
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                  selectedReadyTables.size > 0
                    ? "bg-green-100 text-green-700 ring-green-200/80 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-900/60"
                    : "bg-muted text-muted-foreground ring-border/60",
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <Checkbox
                      checked={readyTablesSelectionState}
                      onCheckedChange={(checked) =>
                        toggleAllReadyTables(checked === true)
                      }
                      aria-label="Select all ready tables"
                    />
                    Batch pay ready tables
                  </label>
                  <Badge variant="outline" className="tabular-nums text-[11px]">
                    {readyTableEntries.length} ready
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedReadyTables.size > 0 ? (
                    <>
                      <span className="font-medium text-foreground tabular-nums">
                        {selectedReadyTables.size}
                      </span>{" "}
                      table{selectedReadyTables.size === 1 ? "" : "s"} ·{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {selectedReadyTableOrders.length}
                      </span>{" "}
                      order
                      {selectedReadyTableOrders.length === 1 ? "" : "s"}{" "}
                      selected
                    </>
                  ) : (
                    "Check completed tables below, then pay them together."
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {selectedReadyTables.size > 0 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 text-muted-foreground"
                    disabled={processingMultiTable}
                    onClick={() => setSelectedReadyTables(new Set())}
                  >
                    <X className="h-4 w-4" />
                    Clear selection
                  </Button>
                  <div className="rounded-lg bg-background/80 px-3 py-2 text-right ring-1 ring-border/50">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Batch total
                    </p>
                    <p className="text-lg font-bold tabular-nums text-green-800 dark:text-green-200">
                      {selectedReadyTablesTotal.toFixed(2)} ETB
                    </p>
                  </div>
                  <Button
                    className="gap-2 bg-linear-to-r from-green-600 to-emerald-600 shadow-md hover:from-green-700 hover:to-emerald-700"
                    disabled={processingMultiTable}
                    onClick={() => setMultiTablePayOpen(true)}
                  >
                    <Wallet className="h-4 w-4" />
                    Review & pay {selectedReadyTables.size} table
                    {selectedReadyTables.size === 1 ? "" : "s"}
                  </Button>
                </>
              ) : filterType !== "ready" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setFilterType("ready")}
                >
                  Show ready only
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={multiTablePayOpen && selectedReadyTables.size > 0}
        onOpenChange={(open) => {
          if (open) setMultiTablePayOpen(true);
          else closeMultiTablePayDialog();
        }}
      >
        <AlertDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <AlertDialogHeader className="space-y-3 border-b px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 ring-1 ring-green-200/80 dark:bg-green-950/50 dark:text-green-300">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <AlertDialogTitle className="text-left text-xl">
                  Pay selected tables
                </AlertDialogTitle>
                <AlertDialogDescription className="text-left text-sm">
                  {selectedReadyTables.size} table
                  {selectedReadyTables.size === 1 ? "" : "s"} ·{" "}
                  {selectedReadyTableOrders.length} completed order
                  {selectedReadyTableOrders.length === 1 ? "" : "s"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="relative flex-1 overflow-y-auto px-6 py-4">
            {processingMultiTable ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-[1px]">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-sm font-medium">Processing batch payment…</p>
                <p className="text-xs text-muted-foreground">
                  {selectedReadyTableOrders.length} order
                  {selectedReadyTableOrders.length === 1 ? "" : "s"} across{" "}
                  {selectedReadyTables.size} table
                  {selectedReadyTables.size === 1 ? "" : "s"}
                </p>
              </div>
            ) : null}

            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3">
              {selectedReadyTablesSummary.map((table) => (
                <div
                  key={table.tableNo}
                  className="flex items-start justify-between gap-3 rounded-md bg-background/70 px-3 py-2.5 text-sm ring-1 ring-border/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{table.display}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {table.waiterName}
                      </span>
                      <span>
                        {table.orderCount} order
                        {table.orderCount === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {table.total.toFixed(2)} ETB
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-green-200/80 bg-green-50/60 px-4 py-3 dark:border-green-900/50 dark:bg-green-950/20">
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Grand total
              </span>
              <span className="text-2xl font-bold tabular-nums text-green-800 dark:text-green-200">
                {selectedReadyTablesTotal.toFixed(2)} ETB
              </span>
            </div>

            <div className="mt-5 space-y-4 pb-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Payment method
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  size="lg"
                  className="flex h-auto cursor-pointer flex-col items-center gap-2 py-5"
                  onClick={() => handlePayAllForSelectedTables(false)}
                  disabled={processingMultiTable}
                  variant="outline"
                >
                  <Icon
                    icon="streamline-ultimate-color:cash-briefcase"
                    className="text-3xl"
                  />
                  <div className="text-center">
                    <p className="font-bold">Cash</p>
                    <p className="text-[11px] text-muted-foreground">
                      Till payment
                    </p>
                  </div>
                </Button>
                <Button
                  size="lg"
                  className="flex h-auto cursor-pointer flex-col items-center gap-2 py-5"
                  onClick={() => handlePayAllForSelectedTables(true)}
                  disabled={processingMultiTable}
                  variant="outline"
                >
                  <Icon
                    icon="streamline-kameleon-color:bank-duo"
                    className="text-3xl"
                  />
                  <div className="text-center">
                    <p className="font-bold">Bank</p>
                    <p className="text-[11px] text-muted-foreground">
                      Transfer
                    </p>
                  </div>
                </Button>
              </div>

              <Button
                size="lg"
                onClick={() => setAllCreditActive(!allCreditActive)}
                className="flex h-auto w-full cursor-pointer flex-col items-center gap-2 py-5"
                variant="outline"
                disabled={
                  processingMultiTable ||
                  authorizedCreditCompanies.length === 0
                }
              >
                <Icon icon="noto:credit-card" className="text-3xl" />
                <div className="text-center">
                  <p className="font-bold">Corporate credit</p>
                  <p className="text-[11px] text-muted-foreground">
                    Company + staff
                  </p>
                </div>
              </Button>

              {allCreditActive ? (
                <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <CorporateCreditPaymentFields
                    companies={authorizedCreditCompanies}
                    parties={creditParties}
                    companyId={creditCompanyId}
                    onCompanyIdChange={setCreditCompanyId}
                    staffName={creditStaffName}
                    onStaffNameChange={setCreditStaffName}
                    staffPhone={creditStaffPhone}
                    onStaffPhoneChange={setCreditStaffPhone}
                    amountETB={selectedReadyTablesTotal}
                    ordersForDealCheck={selectedReadyTableOrders}
                  />
                  <Button
                    disabled={
                      !isCorporateCreditFormReady(
                        creditCompanyId,
                        creditStaffName,
                        creditStaffPhone,
                      ) || processingMultiTable
                    }
                    onClick={() =>
                      handleCreditAllForSelectedTables(selectedReadyTablesTotal)
                    }
                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Wallet className="h-4 w-4" />
                    Pay all selected with corporate credit
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t px-6 py-4">
            <Button
              variant="outline"
              disabled={processingMultiTable}
              onClick={closeMultiTablePayDialog}
            >
              Cancel
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {searchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800 text-sm">
              Searching for: <strong>{searchQuery}</strong>
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
              (o) => !isReadyForPayment(o),
            );
            const completedOrders = tableOrders.filter((o) =>
              isReadyForPayment(o),
            );
            const tableDisplay = formatCafeTableDisplayFromRegistry(
              Number(tableNo),
              cafeTables,
              tableOrders.find((o) => o.serviceCaption)?.serviceCaption,
            );
            const tableNoNum = Number(tableNo);
            const tablePayMode = getTablePaymentMode(tableNoNum);
            const tableAmountFormState = getTableAmountFormState(tableNoNum);
            const completedTableTotal = calculateTableTotal(completedOrders);

            return (
              <Collapsible
                key={tableNo}
                defaultOpen={false}
                className="group/table"
              >
                <Card
                  className={cn(
                    "overflow-hidden border-l-4 transition-all hover:shadow-md",
                    allCompleted && selectedReadyTables.has(Number(tableNo))
                      ? "border-l-green-600 bg-green-50/30 ring-2 ring-green-200/70 shadow-md dark:bg-green-950/10 dark:ring-green-900/50"
                      : allCompleted
                        ? "border-l-green-500/70"
                        : "border-l-primary",
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full cursor-pointer rounded-none px-0 py-0 hover:bg-muted/40"
                    >
                      <CardHeader
                        className={cn(
                          "w-full pb-4",
                          allCompleted && selectedReadyTables.has(Number(tableNo))
                            ? "bg-green-50/50 dark:bg-green-950/20"
                            : "bg-muted/30",
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {allCompleted ? (
                              <label
                                className={cn(
                                  "flex shrink-0 items-center rounded-md p-1 transition-colors",
                                  selectedReadyTables.has(Number(tableNo)) &&
                                    "bg-green-100/80 dark:bg-green-900/40",
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selectedReadyTables.has(
                                    Number(tableNo),
                                  )}
                                  onCheckedChange={(checked) =>
                                    toggleReadyTable(
                                      Number(tableNo),
                                      checked === true,
                                    )
                                  }
                                  aria-label={`Select ${tableDisplay} for batch payment`}
                                />
                              </label>
                            ) : null}
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
                  <CafeTablePaymentModePanel
                    tableNo={tableNoNum}
                    completedOrders={completedOrders}
                    tableTotal={completedTableTotal}
                    allOrdersCompleted={allCompleted}
                    mode={tablePayMode}
                    onModeChange={(mode) =>
                      setTablePaymentModes((prev) => ({
                        ...prev,
                        [tableNoNum]: mode,
                      }))
                    }
                    primaryChannel={tableAmountFormState.primaryChannel}
                    onPrimaryChannelChange={(primaryChannel) => {
                      tableAmountPrimaryChannelRef.current[tableNoNum] =
                        primaryChannel;
                      setTableAmountForm((prev) => ({
                        ...prev,
                        [tableNoNum]: {
                          ...(prev[tableNoNum] ?? {
                            primaryChannel: "cash" as const,
                            amount: "",
                          }),
                          primaryChannel,
                        },
                      }));
                    }}
                    amountInput={tableAmountFormState.amount}
                    onAmountInputChange={(amount) =>
                      setTableAmountForm((prev) => ({
                        ...prev,
                        [tableNoNum]: {
                          ...(prev[tableNoNum] ?? {
                            primaryChannel: "cash" as const,
                            amount: "",
                          }),
                          amount,
                        },
                      }))
                    }
                    processing={processingAmountTable === tableNoNum}
                    onSubmitAmountPayment={() =>
                      void handleAmountPaymentForTable(tableNoNum, {
                        primaryChannel:
                          tableAmountPrimaryChannelRef.current[tableNoNum] ??
                          tableAmountFormState.primaryChannel,
                        amount: tableAmountFormState.amount,
                      })
                    }
                    orderUpdateContent={
                      <CafeCashierOrderUpdatePanel
                        orders={orders}
                        items={items}
                        hotelName={hotelName}
                        onRefresh={onRefresh}
                        restrictTableNo={tableNoNum}
                        embedded
                        analogAddOnly={analog}
                        allowCancel={analog ? cashierCanCancel : true}
                      />
                    }
                  />

                  {tablePayMode !== "update" ? (
                    <>
                  {allCompleted && tablePayMode === "orders" && (
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
                      {!analog && !allCompleted && (
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
                                      isReadyForPayment(order)
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={`${
                                      isReadyForPayment(order)
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
                          {tablePayMode === "orders" ? (
                          <div className="shrink-0 self-end sm:self-center">
                            <AlertDialog
                              open={dialogOpen && selectedOrderId === order.id}
                              onOpenChange={handleDialogClose}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  className="w-full sm:w-auto gap-2 min-w-30"
                                  disabled={
                                    !isReadyForPayment(order) ||
                                    processingPayment === order.id
                                  }
                                  onClick={() => openPaymentDialog(order.id)}
                                  variant={
                                    isReadyForPayment(order)
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {processingPayment === order.id ? (
                                    <span className="animate-spin">⟳</span>
                                  ) : !isReadyForPayment(order) ? (
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
                          ) : null}
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
                            <Badge variant="outline">
                              {formatCafeTableDisplayFromRegistry(
                                order.tableNo,
                                cafeTables,
                                order.serviceCaption,
                              )}
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

                                {tablePayMode === "orders" ? (
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
                                ) : null}
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </div>
                  </div>
                    </>
                  ) : null}
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
