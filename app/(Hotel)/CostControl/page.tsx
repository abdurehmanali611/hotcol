/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
import {
  approvePurchaseRequestsCCBatchApi,
  approveStockOutRequestsBatchApi,
  deleteKitchenBarBeginningApi,
  fetchCostControllerProfiles,
  fetchItemRegistrations,
  fetchItemStatus,
  fetchFreshBazaarArchives,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  fetchKitchenBarBeginnings,
  fetchKitchenBarRollupSnapshots,
  syncKitchenBarRollupApi,
  rejectPurchaseRequestsCCBatchApi,
  rejectStockOutRequestsBatchApi,
  logoutAction,
  notifyApiFailure,
  invalidateGraphqlListCache,
  type ItemRegistration,
  type ItemStatus,
  type FreshBazaarRow,
  type KitchenBarBeginningRow,
  type KitchenBarMonthlySnapshotRow,
  type PurchaseRequestRow,
  type StockOutRequestRow,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { filterItemStatusForInventoryChannel } from "@/lib/lodgingStoreContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  responsiveAlertDialogClassName,
  responsiveFormDialogClassName,
} from "@/lib/responsiveDialog";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { useRejectionReasonDialog } from "@/hooks/useRejectionReasonDialog";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import {
  patchPurchaseRequestStatus,
  patchStockOutRequestStatus,
} from "@/lib/hotelRowPatches";
import { DataTable } from "@/app/StoreItems/data-table";
import {
  buildKitchenBarDailyColumns,
  buildKitchenBarRollupColumns,
} from "@/lib/dataTableColumns/kitchenBar";
import {
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  LayoutGrid,
  Loader2,
  LogOut,
  MinusCircle,
  Package,
  Receipt,
  Send,
  ShoppingCart,
  Table2,
} from "lucide-react";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import {
  displayKitchenBarStation,
  matchesDailyCountStationFilter,
  normalizeKitchenBarStationKey,
  resolveDailyCountSalesQty,
  summarizeApprovedStockOutForDay,
  type HotelDailyCountStationFilter,
} from "@/lib/hotelDailyStation";
import { toYmdLocal } from "@/lib/hotelDateYmd";
import {
  DailyCountStationFilterBar,
} from "@/components/hotel/DailyCountStationUi";
import { DailyCountBatchForm } from "@/components/hotel/DailyCountBatchForm";
import {
  CostControlPurchaseVoucherGroups,
  CostControlStockVoucherGroups,
} from "@/components/hotel/CostControlGroupedQueues";
import { CostControllerIdentitySelect } from "@/components/hotel/CostControllerIdentitySelect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HotelFormFieldStack,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import StoreItems from "@/app/StoreItems/page";
import Inactive from "@/app/Inactive/page";
import { HotelInventoryPaymentCategoryPanel } from "@/components/hotel/HotelInventoryPaymentCategoryPanel";
import { HotelItemReceiptsSection } from "@/components/hotel/HotelItemReceiptsSection";
import { HotelRegistrationApprovalsBlock } from "@/components/hotel/HotelWorkflowApprovalQueues";
import { HotelInventoryPaymentSidebarGroup } from "@/components/hotel/HotelInventoryPaymentSidebarGroup";
import { HotelRequestStatusSidebarGroup } from "@/components/hotel/HotelRequestStatusSidebarGroup";
import { PurchaseRequestStatusPanel } from "@/components/hotel/PurchaseRequestStatusPanel";
import { StockMovementStatusPanel } from "@/components/hotel/StockMovementStatusPanel";
import { ItemRegistrationStatusPanel } from "@/components/hotel/ItemRegistrationStatusPanel";
import { usePropertyRequestStatusData } from "@/components/hotel/usePropertyRequestStatusData";
import {
  isPaymentCategorySection,
  paymentModeFromSection,
} from "@/constants/hotelInventoryNav";
import { HotelCreditorUsageReportPanel } from "@/components/hotel/HotelCreditorUsageReportPanel";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import { filterInventoryListRegistrations } from "@/lib/hotelApproval";
import { filterCostControlSectionId } from "@/lib/subscriptionModules";
import { useTenantModules } from "@/hooks/useTenantModules";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import { normalizeRollupRangeYmd } from "@/lib/kitchenBarMonthlyRange";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizeItemNameForValueKey(name: string): string {
  return String(name || "").trim().toLowerCase();
}

function CostControlInner() {
  useTenantRouteGuard({ role: "CostControl" });
  const searchParams = useSearchParams();
  const { displayName, tenantScope } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const propertyRequestStatus = usePropertyRequestStatusData(tenantScope);
  const logoUrl = searchParams.get("logo") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstLoadRef = useRef(true);
  const [profiles, setProfiles] = useState<CostControllerProfileRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [beginnings, setBeginnings] = useState<KitchenBarBeginningRow[]>([]);
  const [monthlySnapshots, setMonthlySnapshots] = useState<
    KitchenBarMonthlySnapshotRow[]
  >([]);
  const [rollupFromYmd, setRollupFromYmd] = useState(() => {
    const to = new Date().toISOString().slice(0, 10);
    return `${to.slice(0, 7)}-01`;
  });
  const [rollupToYmd, setRollupToYmd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const rollupRangeLabel = useMemo(() => {
    try {
      const { fromYmd, toYmd } = normalizeRollupRangeYmd(
        rollupFromYmd,
        rollupToYmd,
      );
      return `${fromYmd} → ${toYmd}`;
    } catch {
      return `${rollupFromYmd} → ${rollupToYmd}`;
    }
  }, [rollupFromYmd, rollupToYmd]);
  const rollupRangeRef = useRef({
    from: rollupFromYmd,
    to: rollupToYmd,
  });
  useEffect(() => {
    rollupRangeRef.current = { from: rollupFromYmd, to: rollupToYmd };
  }, [rollupFromYmd, rollupToYmd]);
  /** Filters the daily count history table only — not the register form. */
  const [selectedDailyDate, setSelectedDailyDate] = useState(() =>
    toYmdLocal(new Date()),
  );
  /** Create form always posts for today; beginning = yesterday’s on hand. */
  const todayDailyCountYmd = toYmdLocal(new Date());
  const [dailyStationFilter, setDailyStationFilter] =
    useState<HotelDailyCountStationFilter>("ALL");
  const [rollupStationFilter, setRollupStationFilter] =
    useState<HotelDailyCountStationFilter>("ALL");
  const [editingBeginning, setEditingBeginning] =
    useState<KitchenBarBeginningRow | null>(null);
  const [deletingBeginning, setDeletingBeginning] =
    useState<KitchenBarBeginningRow | null>(null);
  const [inventoryRows, setInventoryRows] = useState<ItemRegistration[]>([]);
  const activeInventoryRows = useMemo(
    () => filterInventoryListRegistrations(inventoryRows),
    [inventoryRows],
  );
  const [statusRows, setStatusRows] = useState<ItemStatus[]>([]);
  const [freshBazaarArchives, setFreshBazaarArchives] = useState<FreshBazaarRow[]>([]);
  type CostSection =
    | "purchases"
    | "inventory"
    | "inactive"
    | "stock"
    | "purchase-request-status"
    | "stock-movement-status"
    | "item-registration-status"
    | "beginnings"
    | "payment-all"
    | "payment-credit"
    | "payment-paid"
    | "payment-with-vat"
    | "payment-without-vat"
    | "creditor-usage"
    | "registrations"
    | "item-receipts";
  const [activeSection, setActiveSection] = useState<CostSection>("purchases");
  const tenantModules = useTenantModules();
  const [rollupSyncPending, setRollupSyncPending] = useState(false);
  const { isPending: isCcPending, run: runCcAction } = useConcurrentActions();
  const loadCoordinator = useLoadCoordinator();
  const [beginningDeleteId, setBeginningDeleteId] = useState<number | null>(
    null,
  );
  const [selectedPrBatchIds, setSelectedPrBatchIds] = useState<number[]>([]);
  const [selectedSoBatchIds, setSelectedSoBatchIds] = useState<number[]>([]);
  const [batchCcProfileId, setBatchCcProfileId] = useState<string>("");
  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  const beginningDerivedById = useMemo(() => {
    const daySales = new Map<number, number | null>();
    const t = String(tenantScope ?? "").trim();
    const scoped = t
      ? beginnings.filter((b) => rowHotelMatchesTenantScope(b.HotelName, t))
      : beginnings;
    const groups = new Map<string, KitchenBarBeginningRow[]>();
    for (const b of scoped) {
      const k = `${normalizeKitchenBarStationKey(b.station)}\t${b.itemName.trim().toLowerCase()}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(b);
    }
    for (const [, list] of groups) {
      list.sort((a, b) =>
        String(a.calendarDate || "").localeCompare(String(b.calendarDate || "")),
      );
      for (let i = 0; i < list.length; i++) {
        const prev = i > 0 ? list[i - 1] : null;
        daySales.set(
          list[i].id,
          resolveDailyCountSalesQty(list[i], prev),
        );
      }
    }
    return { daySales };
  }, [beginnings, tenantScope]);

  const visibleBeginnings = useMemo(() => {
    const day = String(selectedDailyDate || "").slice(0, 10);
    return beginnings.filter((b) => {
      if (day && String(b.calendarDate || "").slice(0, 10) !== day) return false;
      return matchesDailyCountStationFilter(b.station, dailyStationFilter);
    });
  }, [beginnings, selectedDailyDate, dailyStationFilter]);

  const visibleMonthlySnapshots = useMemo(() => {
    return monthlySnapshots.filter((row) =>
      matchesDailyCountStationFilter(row.station, rollupStationFilter),
    );
  }, [monthlySnapshots, rollupStationFilter]);

  const unitPriceByItemName = useMemo(() => {
    const byName = new Map<string, number>();
    for (const row of activeInventoryRows) {
      const key = normalizeItemNameForValueKey(row.name);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, Number(row.unitPrice) || 0);
    }
    return byName;
  }, [activeInventoryRows]);

  /** Sum over visible daily rows: unit price × Sales; first row in a series has no Sales yet. */
  const selectedDayTotalCountedEtb = useMemo(() => {
    return visibleBeginnings.reduce((sum, row) => {
      const sales = beginningDerivedById.daySales.get(row.id);
      if (sales == null) return sum;
      const key = normalizeItemNameForValueKey(row.itemName);
      const price = unitPriceByItemName.get(key) || 0;
      return sum + (Number(sales) || 0) * price;
    }, 0);
  }, [visibleBeginnings, unitPriceByItemName, beginningDerivedById]);

  /** Sum over monthly snapshot rows: unit price × Σ Sales for that station/item in the range. */
  const monthlyTotalEtb = useMemo(() => {
    return visibleMonthlySnapshots.reduce((sum, row) => {
      const key = normalizeItemNameForValueKey(row.itemName);
      const price = unitPriceByItemName.get(key) || 0;
      const salesSum = Number(row.totalImpliedSales) || 0;
      return sum + salesSum * price;
    }, 0);
  }, [visibleMonthlySnapshots, unitPriceByItemName]);

  const monthlyRollupColumns = useMemo(
    () =>
      buildKitchenBarRollupColumns({
        formatSyncedAt: (s) => new Date(s.syncedAt).toLocaleString(),
      }),
    [],
  );

  type DataSlice =
    | "profiles"
    | "purchases"
    | "stocks"
    | "kb"
    | "regs"
    | "stats";

  const loadedSlicesRef = useRef(new Set<DataSlice>());
  const sectionSlices = useMemo<
    Partial<Record<CostSection, DataSlice[]>>
  >(
    () => ({
      purchases: ["profiles", "purchases"],
      stock: ["profiles", "stocks"],
      inventory: ["regs", "stats"],
      inactive: ["stats"],
      beginnings: ["kb", "stocks", "regs"],
      registrations: ["regs"],
      "item-receipts": ["regs", "purchases", "stocks"],
      "payment-all": ["regs"],
      "payment-credit": ["regs"],
      "payment-paid": ["regs"],
      "payment-with-vat": ["regs"],
      "payment-without-vat": ["regs"],
    }),
    [],
  );

  const applyInventoryScope = useCallback(
    (
      regs: ItemRegistration[],
      stats: ItemStatus[],
      freshArchives?: FreshBazaarRow[],
    ) => {
      const t = String(tenantScope ?? "").trim();
      const inv = t
        ? regs.filter((it) => rowHotelMatchesTenantScope(it.HotelName, t))
        : regs;
      const st = t
        ? stats.filter((it) => rowHotelMatchesTenantScope(it.HotelName, t))
        : stats;
      setInventoryRows(inv);
      setStatusRows(filterItemStatusForInventoryChannel(st, "lodging"));
      if (freshArchives !== undefined) {
        const fresh = t
          ? freshArchives.filter((it) =>
              rowHotelMatchesTenantScope(it.HotelName, t),
            )
          : freshArchives;
        setFreshBazaarArchives(fresh);
      }
    },
    [tenantScope],
  );

  const scopeStockRows = useCallback(
    (rows: StockOutRequestRow[]) => {
      const t = String(tenantScope ?? "").trim();
      return t
        ? rows.filter((r) => rowHotelMatchesTenantScope(r.HotelName, t))
        : rows;
    },
    [tenantScope],
  );

  const scopedPurchases = useMemo(() => {
    const t = String(tenantScope ?? "").trim();
    return t
      ? purchases.filter((r) => rowHotelMatchesTenantScope(r.HotelName, t))
      : purchases;
  }, [purchases, tenantScope]);

  const ensureSectionData = useCallback(
    async (
      section: CostSection,
      opts?: { showLoading?: boolean; force?: boolean },
    ) => {
      const slices = sectionSlices[section] ?? [];
      if (!slices.length) return;
      // Daily counts need fresh APPROVED stock-outs — always re-fetch stocks
      // so Store doesn't stay 0 after a movement was approved on another tab.
      const pending = opts?.force
        ? slices
        : slices.filter((s) => {
            if (section === "beginnings" && s === "stocks") return true;
            return !loadedSlicesRef.current.has(s);
          });
      if (!pending.length) return;

      const invPending = pending.some((s) => s === "regs" || s === "stats");
      const otherPending = pending.filter((s) => s !== "regs" && s !== "stats");

      await loadCoordinator.run(async (isStale) => {
        if (opts?.showLoading) setLoading(true);
        try {
          await Promise.all([
            ...otherPending.map(async (slice) => {
              switch (slice) {
                case "profiles": {
                  const p = await fetchCostControllerProfiles();
                  if (!isStale()) setProfiles(p);
                  break;
                }
                case "purchases": {
                  const pr = await fetchPurchaseRequests();
                  if (!isStale()) setPurchases(pr);
                  break;
                }
                case "stocks": {
                  const so = await fetchStockOutRequests();
                  if (!isStale()) setStocks(scopeStockRows(so));
                  break;
                }
                case "kb": {
                  const kb = await fetchKitchenBarBeginnings();
                  if (!isStale()) setBeginnings(kb);
                  break;
                }
                default:
                  break;
              }
              if (!isStale()) loadedSlicesRef.current.add(slice);
            }),
            invPending
              ? (async () => {
                  const [regs, stats, freshArchives] = await Promise.all([
                    fetchItemRegistrations(),
                    fetchItemStatus(),
                    fetchFreshBazaarArchives(),
                  ]);
                  if (!isStale()) {
                    applyInventoryScope(
                      regs as ItemRegistration[],
                      stats as ItemStatus[],
                      freshArchives as FreshBazaarRow[],
                    );
                    loadedSlicesRef.current.add("regs");
                    loadedSlicesRef.current.add("stats");
                  }
                })()
              : Promise.resolve(),
          ]);
        } catch (e: unknown) {
          if (!isStale()) {
            notifyApiFailure(e, "Load failed");
          }
        } finally {
          if (!isStale() && opts?.showLoading) setLoading(false);
        }
      });
    },
    [applyInventoryScope, loadCoordinator, scopeStockRows, sectionSlices],
  );

  const load = useCallback(
    async (isRefresh = false, fetchRollupSnapshots = false) => {
      loadedSlicesRef.current.clear();
      await loadCoordinator.run(async (isStale) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
          const snapP: Promise<KitchenBarMonthlySnapshotRow[] | null> =
            fetchRollupSnapshots
              ? (async () => {
                  try {
                    const { from, to } = rollupRangeRef.current;
                    const { fromYmd, toYmd } = normalizeRollupRangeYmd(from, to);
                    return await fetchKitchenBarRollupSnapshots(fromYmd, toYmd);
                  } catch {
                    return [];
                  }
                })()
              : Promise.resolve(null);
          const [p, pr, so, kb, regs, stats, freshArchives, snapsMaybe] = await Promise.all([
            fetchCostControllerProfiles(),
            fetchPurchaseRequests(),
            fetchStockOutRequests(),
            fetchKitchenBarBeginnings(),
            fetchItemRegistrations(),
            fetchItemStatus(),
            fetchFreshBazaarArchives(),
            snapP,
          ]);
          if (isStale()) return;
          setProfiles(p);
          setPurchases(pr);
          setStocks(scopeStockRows(so));
          setBeginnings(kb);
          if (snapsMaybe !== null) setMonthlySnapshots(snapsMaybe);
          applyInventoryScope(
            regs as ItemRegistration[],
            stats as ItemStatus[],
            freshArchives as FreshBazaarRow[],
          );
          loadedSlicesRef.current = new Set([
            "profiles",
            "purchases",
            "stocks",
            "kb",
            "regs",
            "stats",
          ]);
        } catch (e: any) {
          if (!isStale()) toast.error(e?.message || "Load failed");
        } finally {
          if (!isStale()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    },
    [applyInventoryScope, loadCoordinator, scopeStockRows],
  );

  const refreshPurchaseQueues = useCallback(
    async (opts?: { silent?: boolean }) => {
      await loadCoordinator.run(async (isStale) => {
        if (!opts?.silent) setRefreshing(true);
        try {
          invalidateGraphqlListCache("hotel:purchaseRequests");
          const pr = await fetchPurchaseRequests();
          if (isStale()) return;
          setPurchases(pr);
        } catch (e: unknown) {
          if (!isStale()) {
            notifyApiFailure(e, "Could not refresh purchase queue");
          }
        } finally {
          if (!isStale() && !opts?.silent) setRefreshing(false);
        }
      });
    },
    [loadCoordinator],
  );

  const refreshStockQueues = useCallback(
    async (opts?: { silent?: boolean }) => {
      await loadCoordinator.run(async (isStale) => {
        if (!opts?.silent) setRefreshing(true);
        try {
          invalidateGraphqlListCache([
            "hotel:stockOutRequests",
            "ItemRegistration:list",
          ]);
          const [so, regs] = await Promise.all([
            fetchStockOutRequests(),
            fetchItemRegistrations(),
          ]);
          if (isStale()) return;
          setStocks(scopeStockRows(so));
          applyInventoryScope(regs as ItemRegistration[], statusRows);
        } catch (e: unknown) {
          if (!isStale()) {
            notifyApiFailure(e, "Could not refresh stock queue");
          }
        } finally {
          if (!isStale() && !opts?.silent) setRefreshing(false);
        }
      });
    },
    [applyInventoryScope, loadCoordinator, scopeStockRows, statusRows],
  );

  const handleEditBeginning = useCallback((b: KitchenBarBeginningRow) => {
    const cd =
      b.calendarDate && b.calendarDate.length >= 10
        ? b.calendarDate.slice(0, 10)
        : `${b.monthPeriod}-01`;
    setSelectedDailyDate(cd);
    setEditingBeginning(b);
  }, []);

  const handleConfirmDeleteBeginning = useCallback(async () => {
    if (!deletingBeginning) return;
    setBeginningDeleteId(deletingBeginning.id);
    try {
      await deleteKitchenBarBeginningApi(deletingBeginning.id);
      if (editingBeginning?.id === deletingBeginning.id) {
        setEditingBeginning(null);
      }
      setDeletingBeginning(null);
      await load(true, false);
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not delete daily row");
    } finally {
      setBeginningDeleteId(null);
    }
  }, [deletingBeginning, editingBeginning, load]);

  const dailyKitchenColumns = useMemo(
    () =>
      buildKitchenBarDailyColumns({
        mode: "costControl",
        selectedDayYmd: selectedDailyDate,
        derived: beginningDerivedById,
        stockOutRowsForProperty: stocks,
        onEdit: handleEditBeginning,
        onDelete: setDeletingBeginning,
        deletePendingId: beginningDeleteId,
      }),
    [
      selectedDailyDate,
      beginningDerivedById,
      stocks,
      handleEditBeginning,
      beginningDeleteId,
    ],
  );

  const exportDailyCountExcel = useCallback(async () => {
    if (!visibleBeginnings.length) {
      toast.error("No daily count rows to export for this day / station filter");
      return;
    }
    const day = String(selectedDailyDate || "").slice(0, 10);
    const stationSuffix =
      dailyStationFilter !== "ALL"
        ? `_${displayKitchenBarStation(dailyStationFilter)}`
        : "";
    const rows = visibleBeginnings.map((b) => {
      const store = round2(
        summarizeApprovedStockOutForDay(
          stocks,
          normalizeKitchenBarStationKey(b.station),
          b.itemName,
          String(b.calendarDate || day).slice(0, 10),
        ),
      );
      const beginning = Number(b.amount || 0);
      const total = round2(beginning + store);
      const sales = beginningDerivedById.daySales.get(b.id);
      const salesQty = sales == null ? null : Number(sales);
      const management = Number(b.managementTakenDay ?? 0);
      const invitation = Number(b.invitationTakenDay ?? 0);
      const onHand = round2(
        total - (salesQty == null ? 0 : salesQty) - management - invitation,
      );
      const price =
        unitPriceByItemName.get(normalizeItemNameForValueKey(b.itemName)) || 0;
      const salesValue =
        salesQty == null ? null : round2((Number(salesQty) || 0) * price);
      return {
        date:
          String(b.calendarDate || "").slice(0, 10) ||
          (b.monthPeriod ? `${b.monthPeriod}-01` : day),
        station: displayKitchenBarStation(b.station),
        item: b.itemName,
        measured_by: b.measuredBy || "",
        beginning_bb: beginning,
        store,
        total,
        management,
        invitation,
        sales: salesQty == null ? "" : salesQty,
        on_hand: onHand,
        variance:
          String(b.countVariance || "NEUTRAL").trim().toUpperCase() ===
          "SHORTAGE"
            ? "Shortage"
            : String(b.countVariance || "NEUTRAL").trim().toUpperCase() ===
                "OVERAGE"
              ? "Overage"
              : "Neutral",
        variance_amount: Number(b.countVarianceAmount) || 0,
        unit_price_etb: price,
        sales_value_etb: salesValue == null ? "" : salesValue,
        notes: b.notes || "",
      };
    });
    const salesValueTotal = round2(
      rows.reduce(
        (s, r) =>
          s + (typeof r.sales_value_etb === "number" ? r.sales_value_etb : 0),
        0,
      ),
    );
    rows.push({
      date: "",
      station: "",
      item: "TOTAL",
      measured_by: "",
      beginning_bb: "" as unknown as number,
      store: "" as unknown as number,
      total: "" as unknown as number,
      management: "" as unknown as number,
      invitation: "" as unknown as number,
      sales: "",
      on_hand: "" as unknown as number,
      variance: "",
      variance_amount: "" as unknown as number,
      unit_price_etb: "" as unknown as number,
      sales_value_etb: salesValueTotal,
      notes: "",
    });
    await exportRowsExcel(
      `${displayName || tenantScope || "property"}_daily_count_${day}${stationSuffix}`,
      "Daily_count",
      rows,
    );
  }, [
    visibleBeginnings,
    selectedDailyDate,
    dailyStationFilter,
    beginningDerivedById,
    unitPriceByItemName,
    displayName,
    tenantScope,
    stocks,
  ]);

  const exportRollupExcel = useCallback(async () => {
    if (!visibleMonthlySnapshots.length) {
      toast.error("No from–to roll-up rows to export for this range / station");
      return;
    }
    const stationSuffix =
      rollupStationFilter !== "ALL"
        ? `_${displayKitchenBarStation(rollupStationFilter)}`
        : "";
    const rows = visibleMonthlySnapshots.map((row) => {
      const salesSum = Number(row.totalImpliedSales) || 0;
      const onHand = Number(row.lastDayClosingOnHand) || 0;
      const price =
        unitPriceByItemName.get(normalizeItemNameForValueKey(row.itemName)) ||
        0;
      return {
        from: row.periodFrom || rollupFromYmd,
        to: row.periodTo || rollupToYmd,
        station: displayKitchenBarStation(row.station),
        item: row.itemName,
        sum_sales: salesSum,
        sum_shortage: Number(row.totalShortage ?? 0),
        sum_overage: Number(row.totalOverage ?? 0),
        on_hand: onHand,
        remaining: round2(onHand - salesSum),
        unit_price_etb: price,
        sales_value_etb: round2(salesSum * price),
        synced_at: row.syncedAt
          ? new Date(row.syncedAt).toLocaleString()
          : "",
      };
    });
    const rollupSalesTotal = round2(
      rows.reduce((s, r) => s + (Number(r.sales_value_etb) || 0), 0),
    );
    rows.push({
      from: "",
      to: "",
      station: "",
      item: "TOTAL",
      sum_sales: "" as unknown as number,
      sum_shortage: "" as unknown as number,
      sum_overage: "" as unknown as number,
      on_hand: "" as unknown as number,
      remaining: "" as unknown as number,
      unit_price_etb: "" as unknown as number,
      sales_value_etb: rollupSalesTotal,
      synced_at: "",
    });
    await exportRowsExcel(
      `${displayName || tenantScope || "property"}_daily_count_rollup_${rollupFromYmd}_to_${rollupToYmd}${stationSuffix}`,
      "From_To_rollup",
      rows,
    );
  }, [
    visibleMonthlySnapshots,
    rollupStationFilter,
    unitPriceByItemName,
    rollupFromYmd,
    rollupToYmd,
    displayName,
    tenantScope,
  ]);

  useEffect(() => {
    isFirstLoadRef.current = false;
    void ensureSectionData("purchases", { showLoading: true });
  }, [ensureSectionData]);

  useEffect(() => {
    if (loading) return;
    void ensureSectionData(activeSection);
  }, [activeSection, ensureSectionData, loading]);

  const insetBusy = loading;

  const pendingPr = purchases.filter((x) => x.status === "PENDING_CC");
  const pendingSo = stocks.filter(
    (x) => x.status === "PENDING" || x.status === "PENDING_CC",
  );
  const selectedPendingPrIds = pendingPr
    .filter((p) => selectedPrBatchIds.includes(p.id))
    .map((p) => p.id);
  const allPendingPrSelected =
    pendingPr.length > 0 &&
    pendingPr.every((p) => selectedPrBatchIds.includes(p.id));
  const somePendingPrSelected =
    selectedPendingPrIds.length > 0 && !allPendingPrSelected;
  const selectedPendingSoIds = pendingSo
    .filter((p) => selectedSoBatchIds.includes(p.id))
    .map((p) => p.id);
  const allPendingSoSelected =
    pendingSo.length > 0 &&
    pendingSo.every((p) => selectedSoBatchIds.includes(p.id));
  const somePendingSoSelected =
    selectedPendingSoIds.length > 0 && !allPendingSoSelected;

  useEffect(() => {
    const allow = new Set(
      purchases.filter((x) => x.status === "PENDING_CC").map((r) => r.id),
    );
    setSelectedPrBatchIds((prev) => prev.filter((id) => allow.has(id)));
  }, [purchases]);

  useEffect(() => {
    const allow = new Set(
      stocks
        .filter((x) => x.status === "PENDING" || x.status === "PENDING_CC")
        .map((r) => r.id),
    );
    setSelectedSoBatchIds((prev) => prev.filter((id) => allow.has(id)));
  }, [stocks]);

  const costNavItems = useMemo(
    () =>
      [
        { section: "purchases" as const, label: "Purchase requests", icon: Send },
        {
          section: "inventory" as const,
          label: "Inventory",
          icon: ShoppingCart,
        },
        { section: "inactive" as const, label: "Inactive", icon: MinusCircle },
        {
          section: "stock" as const,
          label: "Stock / wastage / returns",
          icon: Package,
        },
        {
          section: "beginnings" as const,
          label: "Daily chef & bar counts",
          icon: LayoutGrid,
        },
        {
          section: "registrations" as const,
          label: "Registration checks",
          icon: ClipboardList,
        },
        {
          section: "item-receipts" as const,
          label: "Item receipts",
          icon: Receipt,
        },
        {
          section: "creditor-usage" as const,
          label: "Creditor staff usage report",
          icon: Table2,
        },
      ].filter((item) =>
        filterCostControlSectionId(item.section, tenantModules),
      ),
    [tenantModules],
  );

  useEffect(() => {
    if (!filterCostControlSectionId(activeSection, tenantModules)) {
      setActiveSection("purchases");
    }
  }, [activeSection, tenantModules]);

  const workspaceIntro: Record<
    CostSection,
    { title: string; description: string; Icon: typeof Send }
  > = {
    purchases: {
      title: "Purchase requests",
      description:
        "Review store requests and approve with your registered identity so finance and managers can audit who cleared each line.",
      Icon: Send,
    },
    inventory: {
      title: HOTEL_INVENTORY_COPY.inventoryItems,
      description:
        "Live quantities for this property — same list as the hotel store “Inventory” screen.",
      Icon: ShoppingCart,
    },
    inactive: {
      title: "Inactive items",
      description:
        "Depleted or written-off rows and history for this property, matching the store inactive audit view.",
      Icon: MinusCircle,
    },
    stock: {
      title: "Stock / wastage / returns",
      description:
        "Approve stock-out, wastage, and return movements before they hit on-hand balances.",
      Icon: Package,
    },
    beginnings: {
      title: "Daily chef & bar counts",
      description:
        "Beginning (BB), store receipts, Total, Sales, Management, and On Hand per day — then sync a monthly roll-up.",
      Icon: LayoutGrid,
    },
    "purchase-request-status": {
      title: "Purchase request status",
      description:
        "All purchase requests for this property with Cost Control and Finance approval status.",
      Icon: ClipboardList,
    },
    "stock-movement-status": {
      title: "Stock movement status",
      description:
        "Stock out, wastage, and return requests with approval status for this property.",
      Icon: Package,
    },
    "item-registration-status": {
      title: "Item registration status",
      description:
        "All item registrations for this property with workflow approval status.",
      Icon: ClipboardList,
    },
    "payment-all": {
      title: "All payment & tax lines",
      description: HOTEL_INVENTORY_COPY.paymentAndTax,
      Icon: Receipt,
    },
    "payment-credit": {
      title: "Credit receiving vouchers",
      description: HOTEL_INVENTORY_COPY.paymentAndTax,
      Icon: Receipt,
    },
    "payment-paid": {
      title: "Paid receiving items",
      description: HOTEL_INVENTORY_COPY.paymentAndTax,
      Icon: Receipt,
    },
    "payment-with-vat": {
      title: "Items purchased with VAT",
      description: HOTEL_INVENTORY_COPY.paymentAndTax,
      Icon: Receipt,
    },
    "payment-without-vat": {
      title: "Items purchased without VAT",
      description: HOTEL_INVENTORY_COPY.paymentAndTax,
      Icon: Receipt,
    },
    registrations: {
      title: "Item registration checks",
      description:
        "Check new store receipts, print them, and forward to finance for approval.",
      Icon: ClipboardList,
    },
    "item-receipts": {
      title: "Item receipts",
      description:
        "Print registration, purchase request, and stock movement receipts with clear titles and signatures.",
      Icon: Receipt,
    },
    "creditor-usage": {
      title: "Creditor staff usage report",
      description:
        "Live corporate-credit staff usage rows with Excel export for audit and finance handoff.",
      Icon: Table2,
    },
  };

  return (
    <>
      {RejectionReasonDialog}
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border shadow-sm"
        >
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <LayoutGrid className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Cost control
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {costNavItems.map(({ section, label, icon: Icon }) => (
                <SidebarMenuItem key={section}>
                  <SidebarMenuButton
                    isActive={activeSection === section}
                    onClick={() => setActiveSection(section)}
                    tooltip={label}
                    size="lg"
                    className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                  >
                    <Icon className="opacity-80" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <HotelRequestStatusSidebarGroup
                activeSection={activeSection}
                onSelect={(id) => setActiveSection(id as CostSection)}
              />
              <HotelInventoryPaymentSidebarGroup
                activeSection={activeSection}
                onSelect={(id) => setActiveSection(id as CostSection)}
              />
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => logoutAction()}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">
                {displayName || "Property"}
              </h1>
            </div>
            <InventoryNotificationCenter
              audience="hotel-cost-control"
              items={inventoryRows}
              purchaseRequests={purchases}
              stockMovements={stocks}
              hotelLodging
            />
            <RefreshIconButton
              busy={refreshing}
              disabled={loading}
              onClick={() => void load(true, false)}
            />
            <ChangeOwnPasswordButton />
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayName || "Property"} />
              <AvatarFallback>
                {(displayName || "P").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-muted/20 p-4">
            {insetBusy ? (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center bg-background/35 backdrop-blur-[2px] px-4"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/95 px-5 py-4 shadow-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {loading ? "Loading…" : "Updating…"}
                  </span>
                </div>
              </div>
            ) : null}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overflow-x-auto px-2 py-5 sm:px-3 md:px-5 lg:px-6 md:py-6 scroll-smooth transition-[filter,opacity] [scrollbar-gutter:stable]",
                insetBusy && "pointer-events-none blur-[1.5px] opacity-75",
              )}
            >
              <div className="mx-auto w-full min-w-0 max-w-none space-y-10 pb-10 xl:max-w-400 2xl:max-w-448">
        <HotelWorkflowGlossary variant="costControl" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/4 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardDescription>Purchase requests for you</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingPr.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Awaiting your sign-off before finance
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/20 bg-linear-to-br from-card to-amber-500/5 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-amber-500/80 to-orange-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5">
                  <Package className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardDescription>Stock movements for you</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingSo.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Wastage, returns, and transfers pending approval
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {(() => {
          const {
            title,
            description,
            Icon: IntroIcon,
          } = workspaceIntro[activeSection];
          return (
            <Card className="border-primary/15 bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/50 to-cyan-500/40" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-fit shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 p-2.5">
                    <IntroIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-xl tracking-tight sm:text-2xl">
                      {title}
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-pretty leading-relaxed">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })()}

        {activeSection === "purchases" && (
          <div className="space-y-4">
            {profiles.length === 0 && pendingPr.length > 0 && (
              <p className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                Your manager has not added any cost-controller names yet. Ask
                them to add identities under Manager → Cost control IDs.
              </p>
            )}
            {pendingPr.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/80">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Queue is clear
                </p>
                <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">
                  No purchase requests waiting for cost control right now.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.length > 0 && pendingPr.length > 0 ? (
                  <Card className="border-dashed border-primary/25 bg-primary/5 shadow-sm">
                    <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
                      <CostControllerIdentitySelect
                        profiles={profiles}
                        value={batchCcProfileId}
                        onValueChange={setBatchCcProfileId}
                        label="Cost controller identity for batch approve"
                        placeholder="Select your name for batch"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Checkbox
                            checked={
                              allPendingPrSelected
                                ? true
                                : somePendingPrSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) =>
                              setSelectedPrBatchIds(
                                checked === true ? pendingPr.map((x) => x.id) : [],
                              )
                            }
                            aria-label="Select all vouchers and purchase items"
                          />
                          <span>Select all vouchers &amp; items</span>
                        </label>
                        <PendingButton
                          className="shadow-sm"
                          pending={isCcPending("batch-pr-a")}
                          disabled={selectedPendingPrIds.length === 0}
                          onClick={() => {
                            const pid = Number(batchCcProfileId);
                            if (!pid) {
                              toast.error(
                                "Select your cost controller identity for batch",
                              );
                              return;
                            }
                            void runCcAction("batch-pr-a", async () => {
                              try {
                                const results =
                                  await approvePurchaseRequestsCCBatchApi(
                                    selectedPendingPrIds,
                                    pid,
                                  );
                                for (const res of results) {
                                  setPurchases((prev) =>
                                    patchPurchaseRequestStatus(
                                      prev,
                                      res.id,
                                      res.status,
                                    ),
                                  );
                                }
                                setSelectedPrBatchIds([]);
                                void refreshPurchaseQueues({ silent: true });
                              } catch (e: unknown) {
                                notifyApiFailure(
                                  e,
                                  "Could not batch-approve purchase requests",
                                );
                              }
                            });
                          }}
                        >
                          Check selected ({selectedPendingPrIds.length})
                        </PendingButton>
                        <PendingButton
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          pending={isCcPending("batch-pr-r")}
                          disabled={selectedPendingPrIds.length === 0}
                          onClick={() => {
                            void runCcAction("batch-pr-r", async () => {
                              try {
                                const reason = await requestRejectionReason({
                                  title: "Reject purchase requests",
                                  description:
                                    "Provide a reason for the store team. It applies to all selected lines.",
                                });
                                if (!reason) return;
                                const batchActor =
                                  profiles
                                    .find((p) => p.id === Number(batchCcProfileId))
                                    ?.displayName?.trim() ?? "";
                                const results =
                                  await rejectPurchaseRequestsCCBatchApi(
                                    selectedPendingPrIds,
                                    reason,
                                    batchActor,
                                  );
                                for (const res of results) {
                                  setPurchases((prev) =>
                                    patchPurchaseRequestStatus(
                                      prev,
                                      res.id,
                                      res.status,
                                      res,
                                    ),
                                  );
                                }
                                setSelectedPrBatchIds([]);
                                void refreshPurchaseQueues({ silent: true });
                              } catch (e: unknown) {
                                notifyApiFailure(
                                  e,
                                  "Could not batch-reject purchase requests",
                                );
                              }
                            });
                          }}
                        >
                          Reject selected ({selectedPendingPrIds.length})
                        </PendingButton>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
                <CostControlPurchaseVoucherGroups
                  purchases={pendingPr}
                  selectedIds={selectedPrBatchIds}
                  setSelectedIds={setSelectedPrBatchIds}
                  isCcPending={isCcPending}
                  runCcAction={runCcAction}
                  requestRejectionReason={requestRejectionReason}
                  profiles={profiles}
                  defaultProfileId={batchCcProfileId}
                  onCheckVoucher={async (rows, profileId) => {
                    const results = await approvePurchaseRequestsCCBatchApi(
                      rows.map((r) => r.id),
                      profileId,
                    );
                    for (const res of results) {
                      setPurchases((prev) =>
                        patchPurchaseRequestStatus(
                          prev,
                          res.id,
                          res.status,
                        ),
                      );
                    }
                    void refreshPurchaseQueues({ silent: true });
                  }}
                  onRejectVoucher={async (rows, reason, profileId) => {
                    const batchActor =
                      profiles
                        .find((p) => p.id === profileId)
                        ?.displayName?.trim() ?? "";
                    const results = await rejectPurchaseRequestsCCBatchApi(
                      rows.map((r) => r.id),
                      reason,
                      batchActor,
                    );
                    for (const res of results) {
                      setPurchases((prev) =>
                        patchPurchaseRequestStatus(
                          prev,
                          res.id,
                          res.status,
                          res,
                        ),
                      );
                    }
                    void refreshPurchaseQueues({ silent: true });
                  }}
                />
              </div>
            )}
          </div>
          )}
          {activeSection === "inventory" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Same live inventory as the store terminal: quantities, pricing context, and
              stock-out flows for <span className="text-foreground font-medium">{displayName || "your property"}</span>.
            </p>
            <Card className="border-primary/20 bg-linear-to-br from-card to-primary/4 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-0.5 bg-linear-to-r from-primary/80 via-cyan-500/50 to-teal-400/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/15">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Active inventory</CardTitle>
                    <CardDescription>
                      Filter by arrival date and review stock movements — inventory line edits are on the Manager terminal.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-3 sm:px-6">
                <StoreItems
                  items={activeInventoryRows}
                  hotelStockApprovals
                  tenantScope={tenantScope}
                  embedded
                  showPaymentSummary
                  aggregateInventory
                  onHotelStockRequestCreated={() => {
                    void refreshStockQueues({ silent: true });
                  }}
                />
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "inactive" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Depleted, written off, or otherwise inactive stock rows for this property — same audit view as Store → Inactive.
            </p>
            <Card className="border-slate-500/20 bg-linear-to-br from-card to-slate-500/5 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-0.5 bg-linear-to-r from-slate-500/70 to-rose-400/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                    <MinusCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Inactive items</CardTitle>
                    <CardDescription>
                      Historical movements and status changes for {displayName || "this property"}.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-3 sm:px-6">
                <Inactive
                  items={statusRows}
                  stockMovements={stocks}
                  admin={false}
                  hotelName={tenantScope}
                  logoUrl={logoUrl}
                  embedded
                />
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "stock" && (
          <div className="space-y-4">
            {pendingSo.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
                No stock movements waiting for approval.
              </p>
            ) : (
              <div className="space-y-4">
                {profiles.length > 0 && pendingSo.length > 0 ? (
                  <Card className="border-dashed border-amber-500/30 bg-amber-500/5 shadow-sm">
                    <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
                      <CostControllerIdentitySelect
                        profiles={profiles}
                        value={batchCcProfileId}
                        onValueChange={setBatchCcProfileId}
                        label="Cost controller identity for batch approve"
                        placeholder="Select your name for batch"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Checkbox
                            checked={
                              allPendingSoSelected
                                ? true
                                : somePendingSoSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) =>
                              setSelectedSoBatchIds(
                                checked === true ? pendingSo.map((x) => x.id) : [],
                              )
                            }
                            aria-label="Select all vouchers and stock items"
                          />
                          <span>Select all vouchers &amp; items</span>
                        </label>
                        <PendingButton
                          className="shadow-sm"
                          pending={isCcPending("batch-so-a")}
                          disabled={selectedPendingSoIds.length === 0}
                          onClick={() => {
                            const pid = Number(batchCcProfileId);
                            if (!pid) {
                              toast.error(
                                "Select your cost controller identity for batch",
                              );
                              return;
                            }
                            void runCcAction("batch-so-a", async () => {
                              try {
                                const results =
                                  await approveStockOutRequestsBatchApi(
                                    selectedPendingSoIds,
                                    pid,
                                  );
                                for (const res of results) {
                                  setStocks((prev) =>
                                    patchStockOutRequestStatus(
                                      prev,
                                      res.id,
                                      res.status,
                                    ),
                                  );
                                }
                                setSelectedSoBatchIds([]);
                                void refreshStockQueues({ silent: true });
                              } catch (e: unknown) {
                                notifyApiFailure(
                                  e,
                                  "Could not batch-approve stock movements",
                                );
                              }
                            });
                          }}
                        >
                          Check selected ({selectedPendingSoIds.length})
                        </PendingButton>
                        <PendingButton
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          pending={isCcPending("batch-so-r")}
                          disabled={selectedPendingSoIds.length === 0}
                          onClick={() => {
                            void runCcAction("batch-so-r", async () => {
                              try {
                                const reason = await requestRejectionReason({
                                  title: "Reject stock movements",
                                  description:
                                    "Provide a reason for the store team. It applies to all selected lines.",
                                });
                                if (!reason) return;
                                const batchActor =
                                  profiles
                                    .find((p) => p.id === Number(batchCcProfileId))
                                    ?.displayName?.trim() ?? "";
                                const results =
                                  await rejectStockOutRequestsBatchApi(
                                    selectedPendingSoIds,
                                    reason,
                                    batchActor,
                                  );
                                for (const res of results) {
                                  setStocks((prev) =>
                                    patchStockOutRequestStatus(
                                      prev,
                                      res.id,
                                      res.status,
                                      {
                                        ...res,
                                        ccActorName:
                                          res.ccActorName?.trim() ||
                                          batchActor ||
                                          undefined,
                                      },
                                    ),
                                  );
                                }
                                setSelectedSoBatchIds([]);
                                void refreshStockQueues({ silent: true });
                              } catch (e: unknown) {
                                notifyApiFailure(
                                  e,
                                  "Could not batch-reject stock movements",
                                );
                              }
                            });
                          }}
                        >
                          Reject selected ({selectedPendingSoIds.length})
                        </PendingButton>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
                <CostControlStockVoucherGroups
                  stocks={pendingSo}
                  inventoryItems={inventoryRows}
                  selectedIds={selectedSoBatchIds}
                  setSelectedIds={setSelectedSoBatchIds}
                  isCcPending={isCcPending}
                  runCcAction={runCcAction}
                  requestRejectionReason={requestRejectionReason}
                  profiles={profiles}
                  defaultProfileId={batchCcProfileId}
                  onCheckVoucher={async (rows, profileId) => {
                    const results = await approveStockOutRequestsBatchApi(
                      rows.map((r) => r.id),
                      profileId,
                    );
                    for (const res of results) {
                      setStocks((prev) =>
                        patchStockOutRequestStatus(
                          prev,
                          res.id,
                          res.status,
                        ),
                      );
                    }
                    void refreshStockQueues({ silent: true });
                  }}
                  onRejectVoucher={async (rows, reason, profileId) => {
                    const batchActor =
                      profiles
                        .find((p) => p.id === profileId)
                        ?.displayName?.trim() ?? "";
                    const results = await rejectStockOutRequestsBatchApi(
                      rows.map((r) => r.id),
                      reason,
                      batchActor,
                    );
                    for (const res of results) {
                      setStocks((prev) =>
                        patchStockOutRequestStatus(
                          prev,
                          res.id,
                          res.status,
                          {
                            ...res,
                            ccActorName:
                              res.ccActorName?.trim() || batchActor || undefined,
                          },
                        ),
                      );
                    }
                    void refreshStockQueues({ silent: true });
                  }}
                />
              </div>
            )}
          </div>
          )}

                    {activeSection === "purchase-request-status" && (
            <div className="space-y-6">
              {propertyRequestStatus.initialLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-9 w-9 animate-spin text-primary" />
                </div>
              ) : (
                <PurchaseRequestStatusPanel
                  rows={propertyRequestStatus.purchases}
                  showStoreUser
                  unitPriceRole="CostControl"
                  onRefresh={() => void load(true, false)}
                  propertyName={displayName || "Property"}
                  logoUrl={logoUrl}
                  description={`${propertyRequestStatus.purchases.length} purchase requests for this property.`}
                />
              )}
            </div>
          )}

          {activeSection === "stock-movement-status" && (
            <div className="space-y-6">
              {propertyRequestStatus.initialLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-9 w-9 animate-spin text-primary" />
                </div>
              ) : (
                <StockMovementStatusPanel
                  rows={propertyRequestStatus.stocks}
                  showRequestedBy
                  propertyName={displayName || "Property"}
                  logoUrl={logoUrl}
                  linkedInventory={inventoryRows}
                  itemStatusHistory={statusRows}
                  freshBazaarArchives={freshBazaarArchives}
                  description={`${propertyRequestStatus.stocks.length} movement requests for this property.`}
                />
              )}
            </div>
          )}

          {activeSection === "item-registration-status" && (
            <div className="space-y-6">
              {propertyRequestStatus.initialLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-9 w-9 animate-spin text-primary" />
                </div>
              ) : (
                <ItemRegistrationStatusPanel
                  rows={propertyRequestStatus.registrations}
                  purchaseRequests={propertyRequestStatus.purchases}
                  showRegisteredBy
                  propertyName={displayName || "Property"}
                  logoUrl={logoUrl}
                  description={`${propertyRequestStatus.registrations.length} item registrations for this property.`}
                />
              )}
            </div>
          )}

          {activeSection === "registrations" && (
            <HotelRegistrationApprovalsBlock
              role="CostControl"
              items={inventoryRows}
              propertyName={displayName || "Property"}
              logoUrl={logoUrl}
              onRefresh={() => void load(true, false)}
            />
          )}

          {activeSection === "item-receipts" && (
            <HotelItemReceiptsSection
              items={inventoryRows}
              purchaseRequests={scopedPurchases}
              stockMovements={stocks}
              itemStatusHistory={statusRows}
              freshBazaarArchives={freshBazaarArchives}
              propertyName={displayName || "Property"}
              logoUrl={logoUrl}
            />
          )}

          {isPaymentCategorySection(activeSection) && (
            <div className="space-y-6">
              <HotelInventoryPaymentCategoryPanel
                mode={paymentModeFromSection(activeSection)!}
                tenantLabel={displayName || "Property"}
                inventoryItems={activeInventoryRows}
                freshBazaarArchives={freshBazaarArchives}
                stockOutMovements={stocks}
              />
            </div>
          )}

          {activeSection === "creditor-usage" && (
            <div className="space-y-6">
              <HotelCreditorUsageReportPanel tenantLabel={displayName || "Property"} />
            </div>
          )}

          {activeSection === "beginnings" && (
          <div className="space-y-6">
            <Card className="border-primary/15 shadow-lg bg-card/90 backdrop-blur-sm overflow-hidden">
              <div className="h-1 bg-linear-to-r from-violet-500/50 via-primary/40 to-cyan-500/40" />
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>Date range roll-up from daily counts</CardTitle>
                  <CardDescription className="text-pretty max-w-2xl">
                    Totals use only daily rows with calendar dates between{" "}
                    <strong className="text-foreground">From</strong> and{" "}
                    <strong className="text-foreground">To</strong> (inclusive). Changing
                    dates does not reload the table—use{" "}
                    <strong className="text-foreground">Refresh roll-ups</strong> to load
                    stored data for the range, or{" "}
                    <strong className="text-foreground">Sync Monthly Data</strong> to
                    stamp it from the daily grid.
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
                  <HotelFormFieldStack className="min-w-50">
                    <HotelDayPicker
                      label="From"
                      id="rollup-from"
                      value={rollupFromYmd}
                      onChange={setRollupFromYmd}
                    />
                  </HotelFormFieldStack>
                  <HotelFormFieldStack className="min-w-50">
                    <HotelDayPicker
                      label="To"
                      id="rollup-to"
                      value={rollupToYmd}
                      onChange={setRollupToYmd}
                    />
                  </HotelFormFieldStack>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shadow-sm"
                    onClick={() => load(true, true)}
                    disabled={insetBusy}
                  >
                    {insetBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {loading ? "Loading…" : "Refreshing…"}
                      </>
                    ) : (
                      "Refresh roll-ups"
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="shadow-sm"
                    disabled={insetBusy || rollupSyncPending}
                    onClick={async () => {
                      setRollupSyncPending(true);
                      try {
                        normalizeRollupRangeYmd(rollupFromYmd, rollupToYmd);
                        await syncKitchenBarRollupApi(rollupFromYmd, rollupToYmd, {
                          quiet: true,
                        });
                        toast.success("Roll-up data synced for selected dates");
                        await load(true, true);
                      } catch (e: any) {
                        toast.error(
                          e?.message ||
                            "Choose valid from and to dates (YYYY-MM-DD)",
                        );
                      } finally {
                        setRollupSyncPending(false);
                      }
                    }}
                  >
                    {rollupSyncPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing…
                      </>
                    ) : (
                      "Sync Monthly Data"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="shadow-sm gap-2"
                    disabled={!visibleMonthlySnapshots.length}
                    onClick={() => void exportRollupExcel()}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
                <DailyCountStationFilterBar
                  value={rollupStationFilter}
                  onChange={setRollupStationFilter}
                />
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-5 sm:px-6">
                {visibleMonthlySnapshots.length > 0 ? (
                  <>
                    <div className="mb-4 rounded-xl border border-emerald-500/25 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent px-4 py-3.5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total Sales value — {rollupRangeLabel}
                        {rollupStationFilter !== "ALL"
                          ? ` · ${displayKitchenBarStation(rollupStationFilter)}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Σ (unit price × Σ Sales) per item row below
                      </p>
                      <p className="text-2xl font-semibold tabular-nums mt-1.5 tracking-tight">
                        {monthlyTotalEtb.toLocaleString()}{" "}
                        <span className="text-sm font-medium text-muted-foreground">
                          ETB
                        </span>
                      </p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Stored roll-ups — {rollupRangeLabel}
                    </p>
                    <DataTable
                      columns={monthlyRollupColumns}
                      data={visibleMonthlySnapshots}
                      getRowId={(row) => String(row.id)}
                      searchColumnId="itemName"
                      emptyMessage={`No stored roll-ups for ${rollupRangeLabel}. Adjust From / To or run Sync Monthly Data.`}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center text-pretty max-w-lg mx-auto">
                    No stored roll-ups for{" "}
                    <span className="font-medium text-foreground">{rollupRangeLabel}</span>
                    {rollupStationFilter !== "ALL"
                      ? ` (${displayKitchenBarStation(rollupStationFilter)})`
                      : ""}
                    . Adjust <strong className="text-foreground">From</strong> /{" "}
                    <strong className="text-foreground">To</strong>, station filter, or run{" "}
                    <strong className="text-foreground">Sync Monthly Data</strong>.
                  </p>
                )}
              </CardContent>
            </Card>

            <DailyCountBatchForm
              calendarDate={todayDailyCountYmd}
              stocks={stocks}
              storeItems={activeInventoryRows.map((row) => ({
                name: row.name,
                measuredBy: row.measuredBy || "Piece",
              }))}
              existingRows={beginnings}
              editingRow={null}
              onClearEdit={() => undefined}
              onSaved={() => load(true, false)}
            />

            <Dialog
              open={editingBeginning != null}
              onOpenChange={(open) => {
                if (!open) setEditingBeginning(null);
              }}
            >
              <DialogContent
                className={`${responsiveFormDialogClassName} md:max-w-3xl`}
              >
                <DialogHeader>
                  <DialogTitle>Edit daily count</DialogTitle>
                  <DialogDescription>
                    Update this station item for{" "}
                    {editingBeginning?.calendarDate?.slice(0, 10) ||
                      selectedDailyDate}
                    .
                  </DialogDescription>
                </DialogHeader>
                {editingBeginning ? (
                  <DailyCountBatchForm
                    variant="plain"
                    calendarDate={
                      editingBeginning.calendarDate?.slice(0, 10) ||
                      selectedDailyDate
                    }
                    stocks={stocks}
                    storeItems={activeInventoryRows.map((row) => ({
                      name: row.name,
                      measuredBy: row.measuredBy || "Piece",
                    }))}
                    existingRows={beginnings}
                    editingRow={editingBeginning}
                    onClearEdit={() => setEditingBeginning(null)}
                    onSaved={async () => {
                      setEditingBeginning(null);
                      await load(true, false);
                    }}
                  />
                ) : null}
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={deletingBeginning != null}
              onOpenChange={(open) => {
                if (!open && beginningDeleteId == null) {
                  setDeletingBeginning(null);
                }
              }}
            >
              <AlertDialogContent className={responsiveAlertDialogClassName}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete daily count?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes{" "}
                    <strong className="text-foreground">
                      {deletingBeginning?.itemName || "this item"}
                    </strong>{" "}
                    for{" "}
                    {deletingBeginning?.calendarDate?.slice(0, 10) || "this day"}
                    {deletingBeginning?.station
                      ? ` · ${displayKitchenBarStation(deletingBeginning.station)}`
                      : ""}
                    . This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={beginningDeleteId != null}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={beginningDeleteId != null}
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={(event) => {
                      event.preventDefault();
                      void handleConfirmDeleteBeginning();
                    }}
                  >
                    {beginningDeleteId != null ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="border-b border-border/60 bg-linear-to-br from-muted/40 via-muted/20 to-transparent px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Sales value (selected day)
                  {dailyStationFilter !== "ALL"
                    ? ` · ${displayKitchenBarStation(dailyStationFilter)}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Σ (unit price × Sales) per row for the selected day
                </p>
                <p className="text-xl font-semibold tabular-nums mt-1.5 tracking-tight">
                  {selectedDayTotalCountedEtb.toLocaleString()}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    ETB
                  </span>
                </p>
              </div>
              <div className="px-4 py-3 border-b border-border/60 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                  <div className="space-y-1.5">
                    <HotelDayPicker
                      label="View day"
                      id="kb-grid-day"
                      value={selectedDailyDate}
                      onChange={setSelectedDailyDate}
                      className="min-w-50"
                    />
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Filters this table only. Does not change the register form
                      above (always today / yesterday’s on hand).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 shadow-sm"
                    disabled={!visibleBeginnings.length}
                    onClick={() => void exportDailyCountExcel()}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
                <DailyCountStationFilterBar
                  value={dailyStationFilter}
                  onChange={setDailyStationFilter}
                />
              </div>
              <div className="p-4">
                <DataTable
                  columns={dailyKitchenColumns}
                  data={visibleBeginnings}
                  getRowId={(row) => String(row.id)}
                  searchColumnId="itemName"
                  emptyMessage={`No daily rows for ${selectedDailyDate}${
                    dailyStationFilter !== "ALL"
                      ? ` (${displayKitchenBarStation(dailyStationFilter)})`
                      : ""
                  }. Add a row above or pick another date / station.`}
                />
              </div>
            </div>
          </div>
          )}
            </div>
          </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </>
  );
}

export default function CostControlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs">Preparing cost control…</span>
        </div>
      }
    >
      <CostControlInner />
    </Suspense>
  );
}
