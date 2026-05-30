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
import UpdateStock from "@/components/UpdateStock";
import { fetchMe } from "@/lib/api/auth";
import {
  deletePurchaseRequestStoreDraftApi,
  deleteStockOutRequestStoreDraftApi,
  submitItemRegistrationsToCostControlApi,
  submitPurchaseRequestsToCostControlApi,
  submitStockOutRequestsToCostControlApi,
  updatePurchaseRequestStoreDraftApi,
  updateStockOutRequestStoreDraftApi,
} from "@/lib/api/storeRequestDraft";
import {
  formatMovementType,
  formatPurchaseStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import {
  groupRowsBySharedVoucher,
  voucherGroupsHaveMixedStatus,
  voucherGroupStatusSummary,
} from "@/lib/voucherGrouping";
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
import { invalidateGraphqlListCache } from "@/lib/api/client";
import {
  getActionableIds,
  toggleIdsInSelection,
  useAllowedSelection,
} from "@/lib/voucherBatchSelection";
import {
  VoucherGroupBadge,
  VoucherGroupedRequestCard,
} from "@/components/hotel/VoucherGroupedRequestCard";
import { RequestTypeCollapsibleSection } from "@/components/hotel/RequestTypeCollapsibleSection";
import { VoucherGroupSelectCheckbox } from "@/components/hotel/VoucherGroupSelectCheckbox";
import { VoucherBatchToolbar } from "@/components/hotel/VoucherBatchToolbar";
import { VoucherGroupApprovalActions } from "@/components/hotel/VoucherGroupApprovalActions";
import {
  PurchaseLineStatusBadge,
  RegistrationLineStatusBadge,
  StockLineStatusBadge,
} from "@/components/hotel/voucherQueueLineStatus";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { notifyApiFailure } from "@/lib/actions";
import { ClipboardCheck, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { inventoryUnitSelectValues } from "@/lib/inventoryUnits";
import {
  formatStockMovementDestination,
  parseStockMovementDestination,
  type StockMovementKind,
} from "@/lib/stockMovementDraftForm";
import { HOTEL_STORE_STOCK_OUT_STAKEHOLDERS } from "@/lib/hotelDailyStation";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

const PURCHASE_CATEGORIES = [
  "Food",
  "Beverage",
  "House Keeping",
  "Others",
] as const;

const DEFAULT_INVENTORY_UNIT = "Litre";

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
}: {
  refreshSignal?: number;
  onDraftCountChange?: (count: number) => void;
  onSubmitted?: () => void;
  tenantScope?: string;
  injectedPurchaseRows?: PurchaseRequestRow[];
  injectedStockRows?: StockOutRequestRow[];
}) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [registrations, setRegistrations] = useState<RegRow[]>([]);

  const [editPr, setEditPr] = useState<PurchaseRequestRow | null>(null);
  const [editSo, setEditSo] = useState<StockOutRequestRow | null>(null);
  const [editReg, setEditReg] = useState<RegRow | null>(null);

  const { isPending, run } = useConcurrentActions();

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
      const [me, pr, so, reg] = await Promise.all([
        fetchMe(),
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
        fetchItemRegistrations(),
      ]);
      const sessionName = me?.UserName?.trim() || storedName;
      if (sessionName && typeof window !== "undefined") {
        localStorage.setItem("user_name", sessionName);
      }
      setUserName(sessionName);
      setPurchases(pr);
      setStocks(so);
      setRegistrations(reg as RegRow[]);
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not load drafts for review");
    }
  }, []);

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

  const prGroups = useMemo(() => groupRowsBySharedVoucher(myPr), [myPr]);
  const soGroups = useMemo(() => groupRowsBySharedVoucher(mySo), [mySo]);
  const regGroups = useMemo(() => groupRowsBySharedVoucher(myReg), [myReg]);

  const allPrIds = useMemo(() => getActionableIds(prGroups, prNeeds), [prGroups]);
  const allSoIds = useMemo(() => getActionableIds(soGroups, soNeeds), [soGroups]);
  const allRegIds = useMemo(
    () => getActionableIds(regGroups, regNeeds),
    [regGroups],
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

  const handleDeletePr = (id: number) => {
    if (!confirm("Remove this purchase line from your review queue?")) return;
    void run(`del-pr-${id}`, async () => {
      try {
        await deletePurchaseRequestStoreDraftApi(id);
        setPurchases((prev) => prev.filter((p) => p.id !== id));
        setSelectedPr((prev) => prev.filter((x) => x !== id));
      } catch (e) {
        notifyApiFailure(e, "Could not delete");
      }
    });
  };

  const handleDeleteSo = (id: number) => {
    if (!confirm("Remove this movement line from your review queue?")) return;
    void run(`del-so-${id}`, async () => {
      try {
        await deleteStockOutRequestStoreDraftApi(id);
        setStocks((prev) => prev.filter((s) => s.id !== id));
        setSelectedSo((prev) => prev.filter((x) => x !== id));
      } catch (e) {
        notifyApiFailure(e, "Could not delete");
      }
    });
  };

  const handleDeleteReg = (id: number) => {
    if (!confirm("Remove this registration line from your review queue?")) return;
    void run(`del-reg-${id}`, async () => {
      try {
        await DeleteItemRegistration(id);
        setRegistrations((prev) => prev.filter((r) => r.id !== id));
        setSelectedReg((prev) => prev.filter((x) => x !== id));
      } catch (e) {
        notifyApiFailure(e, "Could not delete");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading items to review…</p>
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
    <div className="space-y-10 max-w-5xl mx-auto py-2">
      <div className="rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-500/8 via-card to-card px-5 py-5 text-sm text-pretty shadow-sm ring-1 ring-amber-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25">
            <ClipboardCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-foreground">Review before sending</p>
            <p className="text-muted-foreground leading-relaxed">
              Expand a request type (purchase, stock, or registration) to review
              vouchers and lines. Edit or delete mistakes, then send to cost
              control when everything is correct.
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
            onRejectSelected={() =>
              run("review-pr-del", async () => {
                if (
                  !confirm(
                    `Delete ${selectedPr.length} selected purchase line(s)?`,
                  )
                ) {
                  return;
                }
                try {
                  for (const id of selectedPr) {
                    await deletePurchaseRequestStoreDraftApi(id);
                  }
                  await load();
                  setSelectedPr([]);
                } catch (e) {
                  notifyApiFailure(e, "Could not delete");
                }
              })
            }
          />
          <div className="space-y-3">
            {prGroups.map((group) => (
              <VoucherGroupedRequestCard
                key={group.key}
                group={group}
                accentClassName="from-sky-500/60 via-cyan-500/25 to-transparent"
                badge={<VoucherGroupBadge count={group.rows.length} />}
                statusSummary={
                  voucherGroupsHaveMixedStatus(group.rows)
                    ? voucherGroupStatusSummary(
                        group.rows,
                        formatPurchaseStatus,
                      )
                    : undefined
                }
                headerLeading={
                  <VoucherGroupSelectCheckbox
                    group={group}
                    needsAction={prNeeds}
                    selectedIds={selectedPr}
                    onSelectedIdsChange={setSelectedPr}
                  />
                }
                lineLeading={(r) => (
                  <Checkbox
                    checked={selectedPr.includes(r.id)}
                    onCheckedChange={(c) =>
                      setSelectedPr((prev) =>
                        toggleIdsInSelection([r.id], prev, c === true),
                      )
                    }
                  />
                )}
                renderLineStatus={(r) => (
                  <PurchaseLineStatusBadge status={r.status} />
                )}
                renderLineExtra={(r) => (
                  <div className="flex flex-wrap gap-2 justify-end w-full pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditPr(r)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => handleDeletePr(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
                actions={
                  <VoucherGroupApprovalActions
                    group={group}
                    groupKey={group.key}
                    needsAction={prNeeds}
                    approveLabel="Send to cost control"
                    rejectLabel="Delete"
                    rejectMode="confirm"
                    rejectConfirmMessage={(n) =>
                      `Delete ${n} pending line(s) on this voucher?`
                    }
                    isPending={isPending}
                    run={run}
                    rejectTitle="Delete purchase lines"
                    rejectDescription=""
                    requestRejectionReason={async () => null}
                    onApprove={async (rows) => {
                      await sendPurchasesToCc(rows.map((r) => r.id));
                    }}
                    onReject={async (rows) => {
                      for (const r of rows) {
                        await deletePurchaseRequestStoreDraftApi(r.id);
                      }
                      await load();
                    }}
                  />
                }
              />
            ))}
          </div>
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
            onRejectSelected={() =>
              run("review-so-del", async () => {
                if (
                  !confirm(
                    `Delete ${selectedSo.length} selected movement line(s)?`,
                  )
                ) {
                  return;
                }
                try {
                  for (const id of selectedSo) {
                    await deleteStockOutRequestStoreDraftApi(id);
                  }
                  await load();
                  setSelectedSo([]);
                } catch (e) {
                  notifyApiFailure(e, "Could not delete");
                }
              })
            }
          />
          <div className="space-y-3">
            {soGroups.map((group) => (
              <VoucherGroupedRequestCard
                key={group.key}
                group={group}
                accentClassName="from-amber-500/60 via-orange-500/25 to-transparent"
                badge={<VoucherGroupBadge count={group.rows.length} />}
                headerLeading={
                  <VoucherGroupSelectCheckbox
                    group={group}
                    needsAction={soNeeds}
                    selectedIds={selectedSo}
                    onSelectedIdsChange={setSelectedSo}
                  />
                }
                lineLeading={(r) => (
                  <Checkbox
                    checked={selectedSo.includes(r.id)}
                    onCheckedChange={(c) =>
                      setSelectedSo((prev) =>
                        toggleIdsInSelection([r.id], prev, c === true),
                      )
                    }
                  />
                )}
                renderLineStatus={(r) => (
                  <StockLineStatusBadge status={r.status} />
                )}
                renderLineExtra={(r) => (
                  <span>
                    {formatMovementType(r.movementType)} ·{" "}
                    {formatQtyWithUnit(r.amount, "")} · {r.stakeHolderOrReason}
                  </span>
                )}
                renderLineActions={(r) => (
                  <div className="flex flex-wrap gap-2 justify-end w-full pt-1 border-t border-border/40 mt-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditSo(r)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => handleDeleteSo(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
                actions={
                  <VoucherGroupApprovalActions
                    group={group}
                    groupKey={group.key}
                    needsAction={soNeeds}
                    approveLabel="Send to cost control"
                    rejectLabel="Delete"
                    rejectMode="confirm"
                    rejectConfirmMessage={(n) =>
                      `Delete ${n} pending line(s) on this voucher?`
                    }
                    isPending={isPending}
                    run={run}
                    rejectTitle="Delete stock lines"
                    rejectDescription=""
                    requestRejectionReason={async () => null}
                    onApprove={async (rows) => {
                      await sendStocksToCc(rows.map((r) => r.id));
                    }}
                    onReject={async (rows) => {
                      for (const r of rows) {
                        await deleteStockOutRequestStoreDraftApi(r.id);
                      }
                      await load();
                    }}
                  />
                }
              />
            ))}
          </div>
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
            onRejectSelected={() =>
              run("review-reg-del", async () => {
                if (
                  !confirm(
                    `Delete ${selectedReg.length} selected registration line(s)?`,
                  )
                ) {
                  return;
                }
                try {
                  for (const id of selectedReg) {
                    await DeleteItemRegistration(id);
                  }
                  await load();
                  setSelectedReg([]);
                } catch (e) {
                  notifyApiFailure(e, "Could not delete");
                }
              })
            }
          />
          <div className="space-y-3">
            {regGroups.map((group) => (
              <VoucherGroupedRequestCard
                key={group.key}
                group={group}
                accentClassName="from-emerald-500/60 via-green-500/25 to-transparent"
                badge={<VoucherGroupBadge count={group.rows.length} />}
                headerLeading={
                  <VoucherGroupSelectCheckbox
                    group={group}
                    needsAction={regNeeds}
                    selectedIds={selectedReg}
                    onSelectedIdsChange={setSelectedReg}
                  />
                }
                lineLeading={(r) => (
                  <Checkbox
                    checked={selectedReg.includes(r.id)}
                    onCheckedChange={(c) =>
                      setSelectedReg((prev) =>
                        toggleIdsInSelection([r.id], prev, c === true),
                      )
                    }
                  />
                )}
                renderLineStatus={(r) => (
                  <RegistrationLineStatusBadge
                    approvalStatus={r.approvalStatus ?? ""}
                  />
                )}
                renderLineExtra={(r) => (
                  <span>
                    {formatQtyWithUnit(r.amount, r.measuredBy)} · {r.unitPrice}{" "}
                    ETB/unit · {r.supplierName}
                  </span>
                )}
                renderLineActions={(r) => (
                  <div className="flex flex-wrap gap-2 justify-end w-full pt-1 border-t border-border/40 mt-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditReg(r)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => handleDeleteReg(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
                actions={
                  <VoucherGroupApprovalActions
                    group={group}
                    groupKey={group.key}
                    needsAction={regNeeds}
                    approveLabel="Send to cost control"
                    rejectLabel="Delete"
                    rejectMode="confirm"
                    rejectConfirmMessage={(n) =>
                      `Delete ${n} pending line(s) on this voucher?`
                    }
                    isPending={isPending}
                    run={run}
                    rejectTitle="Delete registration lines"
                    rejectDescription=""
                    requestRejectionReason={async () => null}
                    onApprove={async (rows) => {
                      await sendRegistrationsToCc(rows.map((r) => r.id));
                    }}
                    onReject={async (rows) => {
                      for (const r of rows) {
                        await DeleteItemRegistration(r.id);
                      }
                      await load();
                    }}
                  />
                }
              />
            ))}
          </div>
        </RequestTypeCollapsibleSection>
      ) : null}

      <PurchaseEditDialog
        key={editPr?.id ?? "pr-closed"}
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
      <StockEditDialog
        key={editSo?.id ?? "so-closed"}
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
      <UpdateStock
        isOpen={!!editReg}
        onOpenChange={(o) => {
          if (!o) setEditReg(null);
        }}
        item={editReg}
        hotelInventory
        onUpdateSuccess={() => {
          setEditReg(null);
          void load();
        }}
      />
    </div>
  );
}

function PurchaseEditDialog({
  row,
  open,
  onOpenChange,
  onSaved,
  isPending,
  run,
}: {
  row: PurchaseRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isPending: (k: string) => boolean;
  run: (k: string, fn: () => Promise<void>) => void;
}) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PurchaseEditDialogForm
          key={row.id}
          row={row}
          onSaved={onSaved}
          isPending={isPending}
          run={run}
        />
      ) : null}
    </Dialog>
  );
}

function PurchaseEditDialogForm({
  row,
  onSaved,
  isPending,
  run,
}: {
  row: PurchaseRequestRow;
  onSaved: () => void;
  isPending: (k: string) => boolean;
  run: (k: string, fn: () => Promise<void>) => void;
}) {
  const [itemName, setItemName] = useState(row.itemName);
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [measuredBy, setMeasuredBy] = useState(
    row.measuredBy?.trim() || DEFAULT_INVENTORY_UNIT,
  );
  const [notes, setNotes] = useState(row.notes || "");
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState(
    String(row.estimatedUnitPrice ?? 0),
  );
  const [supplierName, setSupplierName] = useState(row.supplierName || "");
  const [supplierPhone, setSupplierPhone] = useState(row.supplierPhone || "");
  const [category, setCategory] = useState<string>(row.category || "Others");

  const unitOptions = useMemo(
    () => inventoryUnitSelectValues(measuredBy),
    [measuredBy],
  );

  return (
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit purchase line</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>Item</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={measuredBy} onValueChange={setMeasuredBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Est. unit price (ETB)</Label>
            <Input
              type="number"
              min={0}
              value={estimatedUnitPrice}
              onChange={(e) => setEstimatedUnitPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Supplier phone</Label>
              <Input
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <PendingButton
            pending={isPending(`save-pr-${row.id}`)}
            onClick={() =>
              void run(`save-pr-${row.id}`, async () => {
                try {
                  await updatePurchaseRequestStoreDraftApi(row.id, {
                    itemName: itemName.trim(),
                    quantity: Number(quantity),
                    measuredBy,
                    notes,
                    estimatedUnitPrice: Number(estimatedUnitPrice) || 0,
                    supplierName,
                    supplierPhone,
                    category,
                  });
                  toast.success("Purchase line updated");
                  onSaved();
                } catch (e) {
                  notifyApiFailure(e, "Could not save");
                }
              })
            }
          >
            Save changes
          </PendingButton>
        </DialogFooter>
      </DialogContent>
  );
}

function StockEditDialog({
  row,
  inventoryItems,
  open,
  onOpenChange,
  onSaved,
  isPending,
  run,
}: {
  row: StockOutRequestRow | null;
  inventoryItems: RegRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isPending: (k: string) => boolean;
  run: (k: string, fn: () => Promise<void>) => void;
}) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <StockEditDialogForm
          key={row.id}
          row={row}
          inventoryItems={inventoryItems}
          onSaved={onSaved}
          isPending={isPending}
          run={run}
        />
      ) : null}
    </Dialog>
  );
}

function StockEditDialogForm({
  row,
  inventoryItems,
  onSaved,
  isPending,
  run,
}: {
  row: StockOutRequestRow;
  inventoryItems: RegRow[];
  onSaved: () => void;
  isPending: (k: string) => boolean;
  run: (k: string, fn: () => Promise<void>) => void;
}) {
  const kind = (row.movementType || "STOCK_OUT") as StockMovementKind;
  const parsed = parseStockMovementDestination(
    kind,
    row.stakeHolderOrReason || "",
  );
  const [movementType, setMovementType] = useState<StockMovementKind>(kind);
  const [amount, setAmount] = useState(String(row.amount));
  const [stakeholder, setStakeholder] = useState<string>(
    parsed.stakeholder ||
      HOTEL_STORE_STOCK_OUT_STAKEHOLDERS[0] ||
      "Kitchen",
  );
  const [customStation, setCustomStation] = useState(parsed.customStation);
  const [reason, setReason] = useState(parsed.reason);

  const linkedItem = useMemo(
    () => inventoryItems.find((i) => i.id === row.itemRegistrationId),
    [inventoryItems, row],
  );

  const measuredBy =
    linkedItem?.measuredBy?.trim() || DEFAULT_INVENTORY_UNIT;
  const onHand = linkedItem ? Number(linkedItem.amount) || 0 : null;

  return (
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit stock movement</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm space-y-1">
            <p className="font-medium">{row.itemName || "Item"}</p>
            {onHand != null ? (
              <p className="text-xs text-muted-foreground">
                On hand: {formatQtyWithUnit(onHand, measuredBy)}
              </p>
            ) : null}
            {row.voucherNumber || row.voucherDisplay ? (
              <p className="text-xs text-muted-foreground">
                Voucher {formatVoucherDisplay(row.voucherNumber, row.voucherDisplay)}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Movement type</Label>
            <Select
              value={movementType}
              onValueChange={(v) => setMovementType(v as StockMovementKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STOCK_OUT">Stock out</SelectItem>
                <SelectItem value="WASTAGE">Wastage</SelectItem>
                <SelectItem value="RETURN_SUPPLIER">Return to supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quantity ({measuredBy})</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {movementType === "STOCK_OUT" ? (
            <div className="space-y-2">
              <Label>Station or destination</Label>
              <Select value={stakeholder} onValueChange={setStakeholder}>
                <SelectTrigger>
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent>
                  {HOTEL_STORE_STOCK_OUT_STAKEHOLDERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-10 text-sm"
                placeholder="Optional: custom destination"
                value={customStation}
                onChange={(e) => setCustomStation(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Reason (required)</Label>
              <Input
                placeholder="e.g. spoilage, wrong delivery…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <PendingButton
            pending={isPending(`save-so-${row.id}`)}
            onClick={() =>
              void run(`save-so-${row.id}`, async () => {
                const stakeHolderOrReason = formatStockMovementDestination(
                  movementType,
                  stakeholder,
                  customStation,
                  reason,
                );
                if (movementType === "STOCK_OUT" && !stakeHolderOrReason) {
                  toast.error("Select or enter a station / destination");
                  return;
                }
                if (movementType !== "STOCK_OUT" && !stakeHolderOrReason) {
                  toast.error("Enter a reason for this movement");
                  return;
                }
                try {
                  await updateStockOutRequestStoreDraftApi(row.id, {
                    movementType,
                    amount: Number(amount),
                    stakeHolderOrReason,
                  });
                  toast.success("Movement updated");
                  onSaved();
                } catch (e) {
                  notifyApiFailure(e, "Could not save");
                }
              })
            }
          >
            Save changes
          </PendingButton>
        </DialogFooter>
      </DialogContent>
  );
}
