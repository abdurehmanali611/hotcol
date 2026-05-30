"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  VoucherGroupBadge,
  VoucherGroupedRequestCard,
} from "@/components/hotel/VoucherGroupedRequestCard";
import { VoucherGroupSelectCheckbox } from "@/components/hotel/VoucherGroupSelectCheckbox";
import { VoucherGroupApprovalActions } from "@/components/hotel/VoucherGroupApprovalActions";
import {
  PurchaseLineStatusBadge,
  StockLineStatusBadge,
} from "@/components/hotel/voucherQueueLineStatus";
import type { PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
import {
  groupVoucherBatchesForQueue,
  voucherGroupStatusSummary,
  voucherGroupsHaveMixedStatus,
} from "@/lib/voucherGrouping";
import { toggleIdsInSelection } from "@/lib/voucherBatchSelection";
import {
  formatMovementType,
  formatPurchaseStatus,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";

const prNeedsCc = (r: PurchaseRequestRow) => r.status === "PENDING_CC";
const soNeedsCc = (r: StockOutRequestRow) =>
  r.status === "PENDING" || r.status === "PENDING_CC";

type RejectPrompt = (opts: {
  title: string;
  description: string;
}) => Promise<string | null>;

export function CostControlPurchaseVoucherGroups({
  purchases,
  selectedIds,
  setSelectedIds,
  isCcPending,
  runCcAction,
  requestRejectionReason,
  batchCcProfileId,
  onCheckVoucher,
  onRejectVoucher,
}: {
  purchases: PurchaseRequestRow[];
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isCcPending: (key: string) => boolean;
  runCcAction: (key: string, fn: () => Promise<void>) => void;
  requestRejectionReason: RejectPrompt;
  batchCcProfileId: string;
  onCheckVoucher: (rows: PurchaseRequestRow[], profileId: number) => Promise<void>;
  onRejectVoucher: (rows: PurchaseRequestRow[], reason: string) => Promise<void>;
}) {
  const groups = groupVoucherBatchesForQueue(purchases, prNeedsCc);

  return (
    <>
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
                needsAction={prNeedsCc}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
              />
            }
            lineLeading={(r) =>
              prNeedsCc(r) ? (
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
                Requested by <strong>{r.storeUserName}</strong> · Est.{" "}
                {r.estimatedUnitPrice} ETB/unit
                {r.notes?.trim() ? ` · ${r.notes.trim()}` : ""}
              </span>
            )}
            actions={
              <VoucherGroupApprovalActions
                group={group}
                groupKey={group.key}
                needsAction={prNeedsCc}
                approveLabel="Check → finance"
                isPending={isCcPending}
                run={runCcAction}
                rejectTitle="Reject purchase request"
                rejectDescription="Provide a reason for the store team. Applies to pending lines on this voucher."
                requestRejectionReason={requestRejectionReason}
                onApprove={async (rows) => {
                  const pid = Number(batchCcProfileId);
                  if (!pid) {
                    const { toast } = await import("sonner");
                    toast.error("Select cost controller identity for batch");
                    throw new Error("Select cost controller identity");
                  }
                  await onCheckVoucher(rows, pid);
                }}
                onReject={async (rows, reason) => {
                  await onRejectVoucher(rows, reason);
                }}
              />
            }
          />
        );
      })}
    </>
  );
}

export function CostControlStockVoucherGroups({
  stocks,
  selectedIds,
  setSelectedIds,
  isCcPending,
  runCcAction,
  requestRejectionReason,
  batchCcProfileId,
  onCheckVoucher,
  onRejectVoucher,
}: {
  stocks: StockOutRequestRow[];
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isCcPending: (key: string) => boolean;
  runCcAction: (key: string, fn: () => Promise<void>) => void;
  requestRejectionReason: RejectPrompt;
  batchCcProfileId: string;
  onCheckVoucher: (rows: StockOutRequestRow[], profileId: number) => Promise<void>;
  onRejectVoucher: (rows: StockOutRequestRow[], reason: string) => Promise<void>;
}) {
  const groups = groupVoucherBatchesForQueue(stocks, soNeedsCc);

  return (
    <>
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
                needsAction={soNeedsCc}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
              />
            }
            lineLeading={(r) =>
              soNeedsCc(r) ? (
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
            renderLineExtra={(r) => (
              <span>
                {formatMovementType(r.movementType)} · {r.stakeHolderOrReason}{" "}
                · Requested by <strong>{r.requestedByUserName}</strong>
              </span>
            )}
            actions={
              <VoucherGroupApprovalActions
                group={group}
                groupKey={group.key}
                needsAction={soNeedsCc}
                approveLabel="Check → finance"
                isPending={isCcPending}
                run={runCcAction}
                rejectTitle="Reject stock movement"
                rejectDescription="Provide a reason for the store team. Applies to pending lines on this voucher."
                requestRejectionReason={requestRejectionReason}
                onApprove={async (rows) => {
                  const pid = Number(batchCcProfileId);
                  if (!pid) {
                    const { toast } = await import("sonner");
                    toast.error("Select cost controller identity for batch");
                    throw new Error("Select cost controller identity");
                  }
                  await onCheckVoucher(rows, pid);
                }}
                onReject={async (rows, reason) => {
                  await onRejectVoucher(rows, reason);
                }}
              />
            }
          />
        );
      })}
    </>
  );
}
