"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  VoucherGroupBadge,
  VoucherGroupedRequestCard,
} from "@/components/hotel/VoucherGroupedRequestCard";
import { VoucherGroupSelectCheckbox } from "@/components/hotel/VoucherGroupSelectCheckbox";
import { CostControlVoucherApprovalActions } from "@/components/hotel/CostControlVoucherApprovalActions";
import type { CostControllerProfileRow } from "@/lib/api/types";
import {
  PurchaseLineStatusBadge,
  StockLineStatusBadge,
} from "@/components/hotel/voucherQueueLineStatus";
import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import { departmentLeaderDisplayLabel } from "@/lib/departments";
import {
  formatPurchaseMoneyDetail,
  formatStockMoneyDetail,
  unitPriceByRegistrationIdFromInventory,
} from "@/lib/inventoryLineTotals";
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
  profiles,
  defaultProfileId,
  onCheckVoucher,
  onRejectVoucher,
}: {
  purchases: PurchaseRequestRow[];
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isCcPending: (key: string) => boolean;
  runCcAction: (key: string, fn: () => Promise<void>) => void;
  requestRejectionReason: RejectPrompt;
  profiles: CostControllerProfileRow[];
  defaultProfileId: string;
  onCheckVoucher: (rows: PurchaseRequestRow[], profileId: number) => Promise<void>;
  onRejectVoucher: (
    rows: PurchaseRequestRow[],
    reason: string,
    profileId: number,
  ) => Promise<void>;
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
            lineLeading={(r) => (
              <Checkbox
                checked={selectedIds.includes(r.id)}
                onCheckedChange={(checked) => {
                  setSelectedIds((prev) =>
                    toggleIdsInSelection([r.id], prev, checked === true),
                  );
                }}
                aria-label={`Select purchase ${r.itemName}`}
              />
            )}
            renderLineStatus={(r) => (
              <PurchaseLineStatusBadge status={r.status} />
            )}
            renderLineExtra={(r) => (
              <span>
                Requested by{" "}
                <strong>
                  {departmentLeaderDisplayLabel(r) || r.storeUserName || "—"}
                </strong>{" "}
                · {formatPurchaseMoneyDetail(r)}
                {r.notes?.trim() ? ` · ${r.notes.trim()}` : ""}
              </span>
            )}
            actions={
              <CostControlVoucherApprovalActions
                group={group}
                groupKey={group.key}
                needsAction={prNeedsCc}
                profiles={profiles}
                defaultProfileId={defaultProfileId}
                approveLabel="Check → finance"
                isPending={isCcPending}
                run={runCcAction}
                rejectTitle="Reject purchase request"
                rejectDescription="Provide a reason for the store team. Applies to pending lines on this voucher."
                requestRejectionReason={requestRejectionReason}
                onCheckVoucher={onCheckVoucher}
                onRejectVoucher={onRejectVoucher}
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
  inventoryItems = [],
  selectedIds,
  setSelectedIds,
  isCcPending,
  runCcAction,
  requestRejectionReason,
  profiles,
  defaultProfileId,
  onCheckVoucher,
  onRejectVoucher,
}: {
  stocks: StockOutRequestRow[];
  inventoryItems?: ItemRegistration[];
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isCcPending: (key: string) => boolean;
  runCcAction: (key: string, fn: () => Promise<void>) => void;
  requestRejectionReason: RejectPrompt;
  profiles: CostControllerProfileRow[];
  defaultProfileId: string;
  onCheckVoucher: (rows: StockOutRequestRow[], profileId: number) => Promise<void>;
  onRejectVoucher: (
    rows: StockOutRequestRow[],
    reason: string,
    profileId: number,
  ) => Promise<void>;
}) {
  const unitPriceLookup = unitPriceByRegistrationIdFromInventory(inventoryItems);
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
            lineLeading={(r) => (
              <Checkbox
                checked={selectedIds.includes(r.id)}
                onCheckedChange={(checked) => {
                  setSelectedIds((prev) =>
                    toggleIdsInSelection([r.id], prev, checked === true),
                  );
                }}
                aria-label={`Select movement ${r.itemName || r.id}`}
              />
            )}
            renderLineStatus={(r) => (
              <StockLineStatusBadge status={r.status} />
            )}
            renderLineExtra={(r) => {
              const money = formatStockMoneyDetail(r, unitPriceLookup);
              return (
                <span>
                  {formatMovementType(r.movementType)} · {r.stakeHolderOrReason}{" "}
                  · Requested by{" "}
                  <strong>
                    {departmentLeaderDisplayLabel(r) || r.requestedByUserName || "—"}
                  </strong>
                  {money ? ` · ${money}` : ""}
                </span>
              );
            }}
            actions={
              <CostControlVoucherApprovalActions
                group={group}
                groupKey={group.key}
                needsAction={soNeedsCc}
                profiles={profiles}
                defaultProfileId={defaultProfileId}
                approveLabel="Check → finance"
                isPending={isCcPending}
                run={runCcAction}
                rejectTitle="Reject stock movement"
                rejectDescription="Provide a reason for the store team. Applies to pending lines on this voucher."
                requestRejectionReason={requestRejectionReason}
                onCheckVoucher={onCheckVoucher}
                onRejectVoucher={onRejectVoucher}
              />
            }
          />
        );
      })}
    </>
  );
}
