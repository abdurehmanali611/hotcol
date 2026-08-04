"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchItemRegistrations,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  DeleteItemRegistration,
  type ItemRegistration,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import { RegistrationReviewEditDialog } from "@/components/hotel/RegistrationReviewEditDialog";
import { PurchaseReviewEditDialog } from "@/components/hotel/PurchaseReviewEditDialog";
import { StockReviewEditDialog } from "@/components/hotel/StockReviewEditDialog";
import {
  StoreReviewDeleteAlert,
  type StoreReviewDeleteTarget,
} from "@/components/hotel/StoreReviewDeleteAlert";
import { fetchMe } from "@/lib/api/auth";
import { fetchDepartmentLeaders } from "@/lib/api/departmentLeaders";
import {
  deletePurchaseRequestStoreDraftApi,
  deleteStockOutRequestStoreDraftApi,
  submitItemRegistrationsToCostControlApi,
  submitPurchaseRequestsToCostControlApi,
  submitStockOutRequestsToCostControlApi,
} from "@/lib/api/storeRequestDraft";
import { sortRowsByFifo } from "@/lib/requestOrdering";
import {
  isPurchasePendingStore,
  isRegistrationPendingStore,
  isStockPendingStore,
} from "@/lib/storeDraftStatus";
import { matchesStoreOwner } from "@/lib/storeDraftOwner";
import {
  resolveCanonicalTenantKey,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { leadersByDepartment } from "@/lib/departments";
import { invalidateGraphqlListCache } from "@/lib/api/client";
import { useAllowedSelection } from "@/lib/voucherBatchSelection";
import { RequestTypeCollapsibleSection } from "@/components/hotel/RequestTypeCollapsibleSection";
import { VoucherBatchToolbar } from "@/components/hotel/VoucherBatchToolbar";
import { StoreReviewDraftTable } from "@/components/hotel/StoreReviewDraftTable";
import {
  buildPurchaseReviewColumns,
  buildRegistrationReviewColumns,
  buildStockReviewColumns,
} from "@/components/hotel/storeReviewTableColumns";
import { useRequestReceiptPreview } from "@/components/hotel/useRequestReceiptPreview";
import {
  groupDraftRegistrationReceipts,
  type ReceiptBundle,
} from "@/lib/receiptGrouping";
import { unitPriceByRegistrationIdFromInventory } from "@/lib/inventoryLineTotals";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { notifyApiFailure } from "@/lib/actions";
import { ClipboardCheck, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RegRow = ItemRegistration & { id: number };

function mergeById<T extends { id: number }>(
  server: T[],
  injected: T[] | undefined,
): T[] {
  if (!injected?.length) return server;
  const byId = new Map<number, T>();
  for (const row of server) byId.set(row.id, row);
  for (const row of injected) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return sortRowsByFifo([...byId.values()]);
}

export function StoreRequestReviewPanel({
  refreshSignal = 0,
  onDraftCountChange,
  onSubmitted,
  tenantScope = "",
  injectedPurchaseRows,
  injectedStockRows,
  propertyName = "Property",
  propertyTin,
  logoUrl,
}: {
  refreshSignal?: number;
  onDraftCountChange?: (count: number) => void;
  onSubmitted?: () => void;
  tenantScope?: string;
  injectedPurchaseRows?: PurchaseRequestRow[];
  injectedStockRows?: StockOutRequestRow[];
  propertyName?: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [registrations, setRegistrations] = useState<RegRow[]>([]);
  const [storeLeaderName, setStoreLeaderName] = useState("");
  const [purchaserLeaderName, setPurchaserLeaderName] = useState("");

  const [editPr, setEditPr] = useState<PurchaseRequestRow | null>(null);
  const [editSo, setEditSo] = useState<StockOutRequestRow | null>(null);
  const [editReg, setEditReg] = useState<RegRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<StoreReviewDeleteTarget | null>(null);

  const { isPending, run } = useConcurrentActions();
  const { openPreview, ReceiptPreviewDialog } = useRequestReceiptPreview({
    propertyName,
    propertyTin,
    logoUrl,
  });

  const tenantKey = useMemo(
    () => resolveCanonicalTenantKey(tenantScope),
    [tenantScope],
  );

  const load = useCallback(async (options?: { bustCache?: boolean }) => {
    try {
      if (options?.bustCache) {
        invalidateGraphqlListCache([
          "hotel:purchaseRequests",
          "hotel:stockOutRequests",
          "ItemRegistration:list",
        ]);
      }
      const storedName =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      const [me, pr, so, reg, leaders] = await Promise.all([
        fetchMe(),
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
        fetchItemRegistrations(),
        fetchDepartmentLeaders().catch(() => []),
      ]);
      const sessionName = me?.UserName?.trim() || storedName;
      if (sessionName && typeof window !== "undefined") {
        localStorage.setItem("user_name", sessionName);
      }
      setUserName(sessionName);
      setPurchases(pr);
      setStocks(so);
      setRegistrations(reg as RegRow[]);
      const byDept = leadersByDepartment(
        leaders.filter((row) =>
          rowHotelMatchesTenantScope(row.HotelName, tenantKey),
        ),
      );
      setStoreLeaderName(String(byDept.get("STORE")?.leaderName ?? "").trim());
      setPurchaserLeaderName(
        String(byDept.get("PURCHASER")?.leaderName ?? "").trim(),
      );
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not load drafts for review");
    }
  }, [tenantKey]);

  const inTenant = useCallback(
    <T extends { HotelName?: string | null }>(rows: T[]) =>
      rows.filter((r) => rowHotelMatchesTenantScope(r.HotelName, tenantKey)),
    [tenantKey],
  );

  const removeSubmittedFromState = useCallback(
    (prIds: number[], soIds: number[], regIds: number[]) => {
      if (prIds.length) {
        const drop = new Set(prIds);
        setPurchases((prev) => prev.filter((p) => !drop.has(p.id)));
      }
      if (soIds.length) {
        const drop = new Set(soIds);
        setStocks((prev) => prev.filter((s) => !drop.has(s.id)));
      }
      if (regIds.length) {
        const drop = new Set(regIds);
        setRegistrations((prev) => prev.filter((r) => !drop.has(r.id)));
      }
      onSubmitted?.();
    },
    [onSubmitted],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await load({ bustCache: refreshSignal > 0 });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, refreshSignal]);

  const prNeeds = (r: PurchaseRequestRow) => isPurchasePendingStore(r.status);
  const soNeeds = (r: StockOutRequestRow) => isStockPendingStore(r.status);
  const regNeeds = (r: RegRow) => isRegistrationPendingStore(r.approvalStatus);

  const mergedPurchases = useMemo(
    () => inTenant(mergeById(purchases, injectedPurchaseRows)),
    [purchases, injectedPurchaseRows, inTenant],
  );
  const mergedStocks = useMemo(
    () => inTenant(mergeById(stocks, injectedStockRows)),
    [stocks, injectedStockRows, inTenant],
  );
  const tenantRegistrations = useMemo(
    () => inTenant(registrations),
    [registrations, inTenant],
  );

  const isMine = useCallback(
    (ownerField?: string | null) =>
      Boolean(userName) && matchesStoreOwner(ownerField, userName),
    [userName],
  );

  const myPr = useMemo(
    () => mergedPurchases.filter((p) => prNeeds(p) && isMine(p.storeUserName)),
    [mergedPurchases, isMine],
  );
  const mySo = useMemo(
    () =>
      mergedStocks.filter(
        (s) => soNeeds(s) && isMine(s.requestedByUserName),
      ),
    [mergedStocks, isMine],
  );
  const myReg = useMemo(
    () =>
      tenantRegistrations.filter((r) => {
        if (!regNeeds(r)) return false;
        const by = String(r.statusBy ?? "").trim();
        if (!by) return true;
        return isMine(by);
      }),
    [tenantRegistrations, isMine],
  );

  const allPrIds = useMemo(
    () => myPr.filter(prNeeds).map((r) => r.id),
    [myPr],
  );
  const allSoIds = useMemo(
    () => mySo.filter(soNeeds).map((r) => r.id),
    [mySo],
  );
  const allRegIds = useMemo(
    () => myReg.filter(regNeeds).map((r) => r.id),
    [myReg],
  );

  const [selectedPr, setSelectedPr] = useAllowedSelection(allPrIds);
  const [selectedSo, setSelectedSo] = useAllowedSelection(allSoIds);
  const [selectedReg, setSelectedReg] = useAllowedSelection(allRegIds);

  const totalDrafts = myPr.length + mySo.length + myReg.length;
  useEffect(() => {
    onDraftCountChange?.(totalDrafts);
  }, [totalDrafts, onDraftCountChange]);

  const sendPurchasesToCc = useCallback(
    async (ids: number[]) => {
      if (!ids.length) {
        toast.error("Select at least one purchase line");
        return;
      }
      await submitPurchaseRequestsToCostControlApi(ids);
      removeSubmittedFromState(ids, [], []);
      setSelectedPr((prev) => prev.filter((id) => !ids.includes(id)));
    },
    [removeSubmittedFromState, setSelectedPr],
  );

  const sendStocksToCc = useCallback(
    async (ids: number[]) => {
      if (!ids.length) {
        toast.error("Select at least one movement line");
        return;
      }
      await submitStockOutRequestsToCostControlApi(ids);
      removeSubmittedFromState([], ids, []);
      setSelectedSo((prev) => prev.filter((id) => !ids.includes(id)));
    },
    [removeSubmittedFromState, setSelectedSo],
  );

  const sendRegistrationsToCc = useCallback(
    async (ids: number[]) => {
      if (!ids.length) {
        toast.error("Select at least one registration line");
        return;
      }
      await submitItemRegistrationsToCostControlApi(ids);
      removeSubmittedFromState([], [], ids);
      setSelectedReg((prev) => prev.filter((id) => !ids.includes(id)));
    },
    [removeSubmittedFromState, setSelectedReg],
  );

  const openDeletePurchase = useCallback((row: PurchaseRequestRow) => {
    setDeleteTarget({ requestType: "purchase", mode: "single", row });
  }, []);

  const openDeleteStock = useCallback((row: StockOutRequestRow) => {
    setDeleteTarget({ requestType: "stock", mode: "single", row });
  }, []);

  const openDeleteReg = useCallback((row: RegRow) => {
    setDeleteTarget({ requestType: "registration", mode: "single", row });
  }, []);

  const confirmDeleteReview = useCallback(async () => {
    if (!deleteTarget) return;
    const pendingKey = `review-${deleteTarget.requestType}-delete`;
    const ids =
      deleteTarget.mode === "single"
        ? [deleteTarget.row.id]
        : deleteTarget.ids;

    await run(pendingKey, async () => {
      try {
        if (deleteTarget.requestType === "purchase") {
          for (const id of ids) {
            await deletePurchaseRequestStoreDraftApi(id);
          }
          setPurchases((prev) => prev.filter((p) => !ids.includes(p.id)));
          setSelectedPr((prev) => prev.filter((id) => !ids.includes(id)));
        } else if (deleteTarget.requestType === "stock") {
          for (const id of ids) {
            await deleteStockOutRequestStoreDraftApi(id);
          }
          setStocks((prev) => prev.filter((s) => !ids.includes(s.id)));
          setSelectedSo((prev) => prev.filter((id) => !ids.includes(id)));
        } else {
          for (const id of ids) {
            await DeleteItemRegistration(id);
          }
          setRegistrations((prev) => prev.filter((r) => !ids.includes(r.id)));
          setSelectedReg((prev) => prev.filter((id) => !ids.includes(id)));
        }
        setDeleteTarget(null);
        if (deleteTarget.mode === "batch") {
          if (deleteTarget.requestType === "purchase") setSelectedPr([]);
          if (deleteTarget.requestType === "stock") setSelectedSo([]);
          if (deleteTarget.requestType === "registration") setSelectedReg([]);
        }
        toast.success(
          ids.length === 1
            ? "Line removed from review"
            : `${ids.length} lines removed from review`,
        );
      } catch (e) {
        notifyApiFailure(e, "Could not delete");
      }
    });
  }, [deleteTarget, run, setSelectedPr, setSelectedSo, setSelectedReg]);

  const purchaseReviewColumns = useMemo(
    () =>
      buildPurchaseReviewColumns({
        onEdit: setEditPr,
        onRequestDelete: openDeletePurchase,
      }),
    [openDeletePurchase],
  );

  const stockUnitPriceLookup = useMemo(
    () => unitPriceByRegistrationIdFromInventory(tenantRegistrations),
    [tenantRegistrations],
  );

  const stockReviewColumns = useMemo(
    () =>
      buildStockReviewColumns({
        onEdit: setEditSo,
        onRequestDelete: openDeleteStock,
        unitPriceByRegistrationId: stockUnitPriceLookup,
      }),
    [openDeleteStock, stockUnitPriceLookup],
  );

  const registrationReviewColumns = useMemo(
    () =>
      buildRegistrationReviewColumns({
        onEdit: setEditReg,
        onRequestDelete: openDeleteReg,
      }),
    [openDeleteReg],
  );

  const selectedRegistrationReceipts = useMemo(() => {
    if (!selectedReg.length) return [] as ReceiptBundle[];
    const selected = myReg.filter((r) => selectedReg.includes(r.id));
    return groupDraftRegistrationReceipts(selected, {
      storeSignerName: storeLeaderName || null,
      purchaserSignerName: purchaserLeaderName || null,
    });
  }, [myReg, selectedReg, storeLeaderName, purchaserLeaderName]);

  const printSelectedRegistrationReceipts = useCallback(() => {
    if (!selectedRegistrationReceipts.length) {
      toast.error("Select at least one registration line to print");
      return;
    }
    openPreview(selectedRegistrationReceipts[0], true);
    if (selectedRegistrationReceipts.length > 1) {
      toast.message(
        `${selectedRegistrationReceipts.length} vouchers selected — print one at a time`,
      );
    }
  }, [openPreview, selectedRegistrationReceipts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading items to reviewâ€¦</p>
      </div>
    );
  }

  if (totalDrafts === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center space-y-2 max-w-3xl mx-auto">
        <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <p className="font-medium">Nothing waiting for your review</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          When you submit purchase requests, stock movements, or item registrations,
          they appear here first. Check the details, edit or delete mistakes, then
          send to cost control.
        </p>
        {!userName ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md mx-auto">
            Your session could not be verified. Sign out and sign in again, then
            resubmit your requests.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-[min(100%,80rem)] mx-auto py-2">
      <div className="rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-500/8 via-card to-card px-5 py-5 text-sm text-pretty shadow-sm ring-1 ring-amber-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25">
            <ClipboardCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-foreground">Review before sending</p>
            <p className="text-muted-foreground leading-relaxed">
              Review purchase requests, stock movements, and item registrations
              in the tables below. Search and paginate to find lines, edit or
              delete mistakes, then send selected rows to cost control.
            </p>
          </div>
        </div>
      </div>

      {myPr.length > 0 ? (
        <RequestTypeCollapsibleSection
          title="Purchase requests"
          count={myPr.length}
          accentClassName="bg-sky-500"
          accentBarClassName="from-sky-500/60 via-cyan-500/25 to-transparent"
        >
          <VoucherBatchToolbar
            allActionableIds={allPrIds}
            selectedIds={selectedPr}
            onSelectedIdsChange={setSelectedPr}
            selectAllLabel="Select all vouchers & items"
            approveLabel="Send to cost control"
            rejectLabel="Delete selected"
            isPending={isPending}
            pendingApproveKey="review-pr-send"
            pendingRejectKey="review-pr-del"
            onApproveSelected={() =>
              run("review-pr-send", async () => {
                try {
                  await sendPurchasesToCc(selectedPr);
                  setSelectedPr([]);
                } catch (e) {
                  notifyApiFailure(e, "Could not send to cost control");
                }
              })
            }
            onRejectSelected={async () => {
              if (!selectedPr.length) return;
              setDeleteTarget({
                requestType: "purchase",
                mode: "batch",
                ids: [...selectedPr],
                sampleRows: myPr.filter((r) => selectedPr.includes(r.id)),
              });
            }}
          />
          <StoreReviewDraftTable
            rows={myPr}
            columns={purchaseReviewColumns}
            selectedIds={selectedPr}
            onSelectedIdsChange={setSelectedPr}
            searchColumnId="itemName"
            searchPlaceholder="Search voucher, item, supplierâ€¦"
            emptyMessage="No purchase lines match your search."
          />
        </RequestTypeCollapsibleSection>
      ) : null}

      {mySo.length > 0 ? (
        <RequestTypeCollapsibleSection
          title="Stock movements"
          count={mySo.length}
          accentClassName="bg-amber-500"
          accentBarClassName="from-amber-500/60 via-orange-500/25 to-transparent"
        >
          <VoucherBatchToolbar
            allActionableIds={allSoIds}
            selectedIds={selectedSo}
            onSelectedIdsChange={setSelectedSo}
            selectAllLabel="Select all vouchers & items"
            approveLabel="Send to cost control"
            rejectLabel="Delete selected"
            isPending={isPending}
            pendingApproveKey="review-so-send"
            pendingRejectKey="review-so-del"
            onApproveSelected={() =>
              run("review-so-send", async () => {
                try {
                  await sendStocksToCc(selectedSo);
                  setSelectedSo([]);
                } catch (e) {
                  notifyApiFailure(e, "Could not send to cost control");
                }
              })
            }
            onRejectSelected={async () => {
              if (!selectedSo.length) return;
              setDeleteTarget({
                requestType: "stock",
                mode: "batch",
                ids: [...selectedSo],
                sampleRows: mySo.filter((r) => selectedSo.includes(r.id)),
              });
            }}
          />
          <StoreReviewDraftTable
            rows={mySo}
            columns={stockReviewColumns}
            selectedIds={selectedSo}
            onSelectedIdsChange={setSelectedSo}
            searchColumnId="itemName"
            searchPlaceholder="Search voucher, item, destinationâ€¦"
            emptyMessage="No stock movement lines match your search."
          />
        </RequestTypeCollapsibleSection>
      ) : null}

      {myReg.length > 0 ? (
        <RequestTypeCollapsibleSection
          title="Item registrations"
          count={myReg.length}
          accentClassName="bg-emerald-500"
          accentBarClassName="from-emerald-500/60 via-green-500/25 to-transparent"
        >
          <VoucherBatchToolbar
            allActionableIds={allRegIds}
            selectedIds={selectedReg}
            onSelectedIdsChange={setSelectedReg}
            selectAllLabel="Select all vouchers & items"
            approveLabel="Send to cost control"
            rejectLabel="Delete selected"
            isPending={isPending}
            pendingApproveKey="review-reg-send"
            pendingRejectKey="review-reg-del"
            leading={
              <Button
                type="button"
                variant="outline"
                className="gap-2 shadow-sm"
                disabled={selectedReg.length === 0}
                onClick={printSelectedRegistrationReceipts}
              >
                <Printer className="h-4 w-4" />
                Print receipt
                {selectedReg.length > 0 ? ` (${selectedReg.length})` : ""}
              </Button>
            }
            onApproveSelected={() =>
              run("review-reg-send", async () => {
                try {
                  await sendRegistrationsToCc(selectedReg);
                  setSelectedReg([]);
                } catch (e) {
                  notifyApiFailure(e, "Could not send to cost control");
                }
              })
            }
            onRejectSelected={async () => {
              if (!selectedReg.length) return;
              setDeleteTarget({
                requestType: "registration",
                mode: "batch",
                ids: [...selectedReg],
                sampleRows: myReg.filter((r) => selectedReg.includes(r.id)),
              });
            }}
          />
          <StoreReviewDraftTable
            rows={myReg}
            columns={registrationReviewColumns}
            selectedIds={selectedReg}
            onSelectedIdsChange={setSelectedReg}
            searchColumnId="name"
            searchPlaceholder="Search voucher, item, supplier…"
            emptyMessage="No registration lines match your search."
          />
        </RequestTypeCollapsibleSection>
      ) : null}

      <PurchaseReviewEditDialog
        row={editPr}
        open={!!editPr}
        onOpenChange={(o) => !o && setEditPr(null)}
        onSaved={async () => {
          setEditPr(null);
          await load();
        }}
        isPending={isPending}
        run={run}
      />
      <StockReviewEditDialog
        row={editSo}
        inventoryItems={tenantRegistrations}
        open={!!editSo}
        onOpenChange={(o) => !o && setEditSo(null)}
        onSaved={async () => {
          setEditSo(null);
          await load();
        }}
        isPending={isPending}
        run={run}
      />
      <RegistrationReviewEditDialog
        row={editReg}
        open={!!editReg}
        onOpenChange={(o) => !o && setEditReg(null)}
        onSaved={async () => {
          setEditReg(null);
          await load();
        }}
        isPending={isPending}
        run={run}
      />
      <StoreReviewDeleteAlert
        target={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDeleteReview}
        isPending={isPending}
      />
      {ReceiptPreviewDialog}
    </div>
  );
}
