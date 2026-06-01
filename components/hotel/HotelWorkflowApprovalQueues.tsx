"use client";

import { useMemo, useState } from "react";
import type { ItemRegistration, PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
import {
  formatPurchaseMoneyDetail,
  formatStockMoneyDetail,
  unitPriceByRegistrationIdFromInventory,
} from "@/lib/inventoryLineTotals";
import {
  approvePurchaseRequestFinanceApi,
  approvePurchaseRequestsFinanceBatchApi,
  authorizePurchaseRequestManagerApi,
  authorizeStockOutRequestManagerApi,
  approveStockOutRequestFinanceApi,
  checkStockOutRequestCCApi,
  rejectPurchaseRequestFinanceApi,
  rejectPurchaseRequestsFinanceBatchApi,
  rejectPurchaseRequestManagerApi,
  rejectStockOutRequestApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { HotelItemReceiptApprovals } from "@/components/hotel/HotelItemReceiptApprovals";
import { departmentLeaderDisplayLabel } from "@/lib/departments";
import {
  formatMovementType,
  formatPurchaseStatus,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import {
  groupVoucherBatchesForQueue,
  voucherGroupStatusSummary,
  voucherGroupsHaveMixedStatus,
} from "@/lib/voucherGrouping";
import {
  getActionableIds,
  toggleIdsInSelection,
  useAllowedSelection,
} from "@/lib/voucherBatchSelection";
import {
  PurchaseLineStatusBadge,
  StockLineStatusBadge,
} from "@/components/hotel/voucherQueueLineStatus";
import {
  VoucherGroupBadge,
  VoucherGroupedRequestCard,
} from "@/components/hotel/VoucherGroupedRequestCard";
import { VoucherGroupSelectCheckbox } from "@/components/hotel/VoucherGroupSelectCheckbox";
import { VoucherBatchToolbar } from "@/components/hotel/VoucherBatchToolbar";
import { VoucherGroupApprovalActions } from "@/components/hotel/VoucherGroupApprovalActions";
import { isStockPendingCC, isStockPendingFinance, isStockPendingManager } from "@/lib/hotelApproval";
import { Checkbox } from "@/components/ui/checkbox";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { notifyApiFailure } from "@/lib/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRejectionReasonDialog } from "@/hooks/useRejectionReasonDialog";
import { toast } from "sonner";

type TerminalRole = "CostControl" | "Finance" | "Manager";

export function HotelRegistrationApprovalsBlock({
  role,
  items,
  propertyName,
  propertyTin,
  logoUrl,
  onRefresh,
}: {
  role: TerminalRole;
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  onRefresh: () => void;
}) {
  return (
    <HotelItemReceiptApprovals
      role={role}
      items={items}
      propertyName={propertyName}
      propertyTin={propertyTin}
      logoUrl={logoUrl}
      onRefresh={onRefresh}
    />
  );
}

export function HotelPurchaseManagerQueue({
  purchases,
  onPatch,
  onRefresh,
}: {
  purchases: PurchaseRequestRow[];
  onPatch: (id: number, status: string) => void;
  onRefresh: () => void;
}) {
  const needsAction = (p: PurchaseRequestRow) => p.status === "PENDING_MANAGER";
  const groups = useMemo(
    () => groupVoucherBatchesForQueue(purchases, needsAction),
    [purchases],
  );
  const allActionableIds = useMemo(
    () => getActionableIds(groups, needsAction),
    [groups],
  );
  const [selectedIds, setSelectedIds] = useAllowedSelection(allActionableIds);

  const { isPending, run } = useConcurrentActions();
  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  const pending = purchases.filter(needsAction);

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
        No purchase requests awaiting manager authorization.
      </p>
    );
  }

  return (
    <>
      {RejectionReasonDialog}
      <div className="space-y-3">
        <VoucherBatchToolbar
          allActionableIds={allActionableIds}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          selectAllLabel="Select all vouchers & items"
          approveLabel="Authorize selected"
          rejectLabel="Reject selected"
          isPending={isPending}
          pendingApproveKey="mgr-pr-batch-a"
          pendingRejectKey="mgr-pr-batch-r"
          onApproveSelected={() =>
            run("mgr-pr-batch-a", async () => {
              try {
                for (const id of selectedIds) {
                  const res = await authorizePurchaseRequestManagerApi(id);
                  onPatch(id, res.status);
                }
                setSelectedIds([]);
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Authorization failed");
              }
            })
          }
          onRejectSelected={() =>
            run("mgr-pr-batch-r", async () => {
              try {
                const reason = await requestRejectionReason({
                  title: "Reject purchase request",
                  description:
                    "Provide a reason for the store team. Applies to all selected lines.",
                });
                if (!reason) return;
                for (const id of selectedIds) {
                  const res = await rejectPurchaseRequestManagerApi(id, reason);
                  onPatch(id, res.status);
                }
                setSelectedIds([]);
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Rejection failed");
              }
            })
          }
        />
        {groups.map((group) => {
          const mixed = voucherGroupsHaveMixedStatus(group.rows);
          return (
            <VoucherGroupedRequestCard
              key={group.key}
              group={group}
              badge={<VoucherGroupBadge count={group.rows.length} />}
              statusSummary={
                mixed
                  ? voucherGroupStatusSummary(group.rows, formatPurchaseStatus)
                  : undefined
              }
              headerLeading={
                <VoucherGroupSelectCheckbox
                  group={group}
                  needsAction={needsAction}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
                />
              }
              lineLeading={(r) =>
                needsAction(r) ? (
                  <Checkbox
                    checked={selectedIds.includes(r.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) =>
                        toggleIdsInSelection([r.id], prev, checked === true),
                      );
                    }}
                    aria-label={`Select purchase ${r.itemName}`}
                  />
                ) : null
              }
              renderLineStatus={(r) => (
                <PurchaseLineStatusBadge status={r.status} />
              )}
              renderLineExtra={(r) => (
                <span>
                  {formatPurchaseMoneyDetail(r)}
                  {r.notes?.trim() ? ` · ${r.notes.trim()}` : ""}
                </span>
              )}
              actions={
                <VoucherGroupApprovalActions
                  group={group}
                  groupKey={group.key}
                  needsAction={needsAction}
                  approveLabel="Authorize"
                  isPending={isPending}
                  run={run}
                  rejectTitle="Reject purchase request"
                  rejectDescription="Provide a reason for the store team. Applies to pending lines on this voucher."
                  requestRejectionReason={requestRejectionReason}
                  onApprove={async (rows) => {
                    for (const r of rows) {
                      const res = await authorizePurchaseRequestManagerApi(r.id);
                      onPatch(r.id, res.status);
                    }
                    await onRefresh();
                  }}
                  onReject={async (rows, reason) => {
                    for (const r of rows) {
                      const res = await rejectPurchaseRequestManagerApi(
                        r.id,
                        reason,
                      );
                      onPatch(r.id, res.status);
                    }
                    await onRefresh();
                  }}
                />
              }
            />
          );
        })}
      </div>
    </>
  );
}

export function HotelPurchaseFinanceQueue({
  purchases,
  onRowPatched,
  onRefresh,
}: {
  purchases: PurchaseRequestRow[];
  onRowPatched: (
    res: Partial<PurchaseRequestRow> & { id: number; status: string },
  ) => void;
  onRefresh: () => void;
}) {
  const needsAction = (p: PurchaseRequestRow) => p.status === "PENDING_FINANCE";
  const groups = useMemo(
    () => groupVoucherBatchesForQueue(purchases, needsAction),
    [purchases],
  );
  const allActionableIds = useMemo(
    () => getActionableIds(groups, needsAction),
    [groups],
  );
  const [selectedIds, setSelectedIds] = useAllowedSelection(allActionableIds);

  const { isPending, run } = useConcurrentActions();
  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  const pending = purchases.filter(needsAction);

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
        No purchase requests awaiting finance approval.
      </p>
    );
  }

  const financeActorName = () =>
    typeof window !== "undefined"
      ? (localStorage.getItem("user_name")?.trim() ?? "")
      : "";

  return (
    <>
      {RejectionReasonDialog}
      <div className="space-y-3">
        <VoucherBatchToolbar
          allActionableIds={allActionableIds}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          selectAllLabel="Select all vouchers & items"
          approveLabel="Approve selected"
          rejectLabel="Reject selected"
          isPending={isPending}
          pendingApproveKey="fin-pr-batch-a"
          pendingRejectKey="fin-pr-batch-r"
          onApproveSelected={() =>
            run("fin-pr-batch-a", async () => {
              try {
                const results = await approvePurchaseRequestsFinanceBatchApi(
                  selectedIds,
                );
                for (const res of results) {
                  onRowPatched(res);
                }
                setSelectedIds([]);
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Could not batch-approve payments");
              }
            })
          }
          onRejectSelected={() =>
            run("fin-pr-batch-r", async () => {
              try {
                const reason = await requestRejectionReason({
                  title: "Reject purchase requests",
                  description:
                    "Provide a reason for the store team. Applies to all selected lines.",
                });
                if (!reason) return;
                const results = await rejectPurchaseRequestsFinanceBatchApi(
                  selectedIds,
                  reason,
                );
                const actor = financeActorName();
                for (const res of results) {
                  onRowPatched({
                    ...res,
                    financeActorName:
                      res.financeActorName?.trim() || actor || undefined,
                  });
                }
                setSelectedIds([]);
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Could not batch-reject payments");
              }
            })
          }
        />
        {groups.map((group) => {
          const mixed = voucherGroupsHaveMixedStatus(group.rows);
          return (
            <VoucherGroupedRequestCard
              key={group.key}
              group={group}
              badge={<VoucherGroupBadge count={group.rows.length} />}
              statusSummary={
                mixed
                  ? voucherGroupStatusSummary(group.rows, formatPurchaseStatus)
                  : undefined
              }
              headerLeading={
                <VoucherGroupSelectCheckbox
                  group={group}
                  needsAction={needsAction}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
                />
              }
              lineLeading={(r) =>
                needsAction(r) ? (
                  <Checkbox
                    checked={selectedIds.includes(r.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) =>
                        toggleIdsInSelection([r.id], prev, checked === true),
                      );
                    }}
                    aria-label={`Select purchase ${r.itemName}`}
                  />
                ) : null
              }
              renderLineStatus={(r) => (
                <PurchaseLineStatusBadge status={r.status} />
              )}
              renderLineExtra={(r) => (
                <span>
                  {departmentLeaderDisplayLabel(r) || r.storeUserName ? (
                    <>
                      Requested by{" "}
                      <strong>
                        {departmentLeaderDisplayLabel(r) || r.storeUserName}
                      </strong>{" "}
                      ·{" "}
                    </>
                  ) : null}
                  {formatPurchaseMoneyDetail(r)}
                  {r.ccActorName?.trim()
                    ? ` · CC: ${r.ccActorName.trim()}`
                    : ""}
                  {r.notes?.trim() ? ` · ${r.notes.trim()}` : ""}
                </span>
              )}
              actions={
                <VoucherGroupApprovalActions
                  group={group}
                  groupKey={group.key}
                  needsAction={needsAction}
                  approveLabel="Approve → manager"
                  isPending={isPending}
                  run={run}
                  rejectTitle="Reject purchase request"
                  rejectDescription="Provide a reason for the store team. Applies to pending lines on this voucher."
                  requestRejectionReason={requestRejectionReason}
                  onApprove={async (rows) => {
                    for (const r of rows) {
                      const res = await approvePurchaseRequestFinanceApi(r.id);
                      onRowPatched(res);
                    }
                    await onRefresh();
                  }}
                  onReject={async (rows, reason) => {
                    const actor = financeActorName();
                    for (const r of rows) {
                      const res = await rejectPurchaseRequestFinanceApi(
                        r.id,
                        reason,
                      );
                      onRowPatched({
                        ...res,
                        financeActorName:
                          res.financeActorName?.trim() || actor || undefined,
                      });
                    }
                    await onRefresh();
                  }}
                />
              }
            />
          );
        })}
      </div>
    </>
  );
}

export function HotelStockWorkflowQueue({
  role,
  stocks,
  inventoryItems = [],
  profiles,
  onPatch,
  onRefresh,
}: {
  role: TerminalRole;
  stocks: StockOutRequestRow[];
  inventoryItems?: ItemRegistration[];
  profiles: CostControllerProfileRow[];
  onPatch: (id: number, status: string, row?: StockOutRequestRow) => void;
  onRefresh: () => void;
}) {
  const { isPending, run } = useConcurrentActions();
  const [ccProfileId, setCcProfileId] = useState<string>("");

  const needsAction = useMemo(() => {
    if (role === "CostControl") {
      return (s: StockOutRequestRow) => isStockPendingCC(s.status);
    }
    if (role === "Finance") {
      return (s: StockOutRequestRow) => isStockPendingFinance(s.status);
    }
    return (s: StockOutRequestRow) => isStockPendingManager(s.status);
  }, [role]);

  const pending = useMemo(
    () => stocks.filter(needsAction),
    [stocks, needsAction],
  );

  const groups = useMemo(
    () => groupVoucherBatchesForQueue(stocks, needsAction),
    [stocks, needsAction],
  );

  const allActionableIds = useMemo(
    () => getActionableIds(groups, needsAction),
    [groups, needsAction],
  );
  const [selectedIds, setSelectedIds] = useAllowedSelection(allActionableIds);

  const effectiveCcProfileId =
    ccProfileId || (profiles[0] ? String(profiles[0].id) : "");

  const actionLabel =
    role === "CostControl"
      ? "Check"
      : role === "Finance"
        ? "Approve"
        : "Authorize";

  const approveSuffix =
    role === "CostControl"
      ? " → finance"
      : role === "Finance"
        ? " → manager"
        : " & apply";

  const stakeholderLabel =
    role === "CostControl"
      ? "cost control"
      : role === "Finance"
        ? "finance"
        : "manager";

  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  const stockUnitPriceLookup =
    unitPriceByRegistrationIdFromInventory(inventoryItems);

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
        No stock movements in this queue.
      </p>
    );
  }

  return (
    <>
      {RejectionReasonDialog}
      <div className="space-y-3">
        <VoucherBatchToolbar
          allActionableIds={allActionableIds}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          selectAllLabel="Select all vouchers & items"
          approveLabel={actionLabel}
          rejectLabel="Reject selected"
          isPending={isPending}
          pendingApproveKey={`so-batch-a-${role}`}
          pendingRejectKey={`so-batch-r-${role}`}
          leading={
            role === "CostControl" ? (
              <div className="flex-1 min-w-[220px] space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Cost controller identity for batch
                </Label>
                <Select
                  value={effectiveCcProfileId || undefined}
                  onValueChange={setCcProfileId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select name" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null
          }
          onApproveSelected={() =>
            run(`so-batch-a-${role}`, async () => {
              try {
                if (role === "CostControl") {
                  const pid = Number(effectiveCcProfileId);
                  if (!pid) {
                    toast.error("Select cost controller identity for batch");
                    return;
                  }
                  for (const id of selectedIds) {
                    const res = await checkStockOutRequestCCApi(id, pid);
                    onPatch(id, res.status, res as StockOutRequestRow);
                  }
                } else if (role === "Finance") {
                  for (const id of selectedIds) {
                    const res = await approveStockOutRequestFinanceApi(id);
                    onPatch(id, res.status);
                  }
                } else {
                  for (const id of selectedIds) {
                    const res = await authorizeStockOutRequestManagerApi(id);
                    onPatch(id, res.status);
                  }
                }
                setSelectedIds([]);
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, `${actionLabel} failed`);
              }
            })
          }
          onRejectSelected={() =>
            run(`so-batch-r-${role}`, async () => {
              try {
                const reason = await requestRejectionReason({
                  title: "Reject stock movement",
                  description: `Provide a reason (${stakeholderLabel}). Applies to all selected lines.`,
                });
                if (!reason) return;
                for (const id of selectedIds) {
                  const res = await rejectStockOutRequestApi(id, reason);
                  onPatch(id, res.status, res);
                }
                setSelectedIds([]);
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Rejection failed");
              }
            })
          }
        />
        {groups.map((group) => {
          const mixed = voucherGroupsHaveMixedStatus(group.rows);
          return (
            <VoucherGroupedRequestCard
              key={group.key}
              group={group}
              badge={<VoucherGroupBadge count={group.rows.length} />}
              statusSummary={
                mixed
                  ? voucherGroupStatusSummary(
                      group.rows,
                      formatStockOutRequestStatus,
                    )
                  : undefined
              }
              headerLeading={
                <VoucherGroupSelectCheckbox
                  group={group}
                  needsAction={needsAction}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
                />
              }
              lineLeading={(r) =>
                needsAction(r) ? (
                  <Checkbox
                    checked={selectedIds.includes(r.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) =>
                        toggleIdsInSelection([r.id], prev, checked === true),
                      );
                    }}
                    aria-label={`Select movement ${r.itemName || r.id}`}
                  />
                ) : null
              }
              renderLineStatus={(r) => (
                <StockLineStatusBadge status={r.status} />
              )}
              renderLineExtra={(r) => {
                const money = formatStockMoneyDetail(r, stockUnitPriceLookup);
                const requested =
                  departmentLeaderDisplayLabel(r) || r.requestedByUserName;
                return (
                  <span>
                    {formatMovementType(r.movementType)} · {r.stakeHolderOrReason}
                    {requested ? (
                      <>
                        {" "}
                        · Requested by <strong>{requested}</strong>
                      </>
                    ) : null}
                    {money ? ` · ${money}` : ""}
                  </span>
                );
              }}
              actions={
                <VoucherGroupApprovalActions
                  group={group}
                  groupKey={group.key}
                  needsAction={needsAction}
                  approveLabel={`${actionLabel}${approveSuffix}`}
                  isPending={isPending}
                  run={run}
                  rejectTitle="Reject stock movement"
                  rejectDescription={`Provide a reason (${stakeholderLabel}). Applies to pending lines on this voucher.`}
                  requestRejectionReason={requestRejectionReason}
                  onApprove={async (rows) => {
                    if (role === "CostControl") {
                      const pid = Number(effectiveCcProfileId);
                      if (!pid) {
                        toast.error("Select cost controller identity");
                        throw new Error("Select cost controller identity");
                      }
                      for (const r of rows) {
                        const res = await checkStockOutRequestCCApi(r.id, pid);
                        onPatch(r.id, res.status, res as StockOutRequestRow);
                      }
                    } else if (role === "Finance") {
                      for (const r of rows) {
                        const res = await approveStockOutRequestFinanceApi(r.id);
                        onPatch(r.id, res.status);
                      }
                    } else {
                      for (const r of rows) {
                        const res = await authorizeStockOutRequestManagerApi(
                          r.id,
                        );
                        onPatch(r.id, res.status);
                      }
                    }
                    await onRefresh();
                  }}
                  onReject={async (rows, reason) => {
                    for (const r of rows) {
                      const res = await rejectStockOutRequestApi(r.id, reason);
                      onPatch(r.id, res.status, res);
                    }
                    await onRefresh();
                  }}
                />
              }
            />
          );
        })}
      </div>
    </>
  );
}
