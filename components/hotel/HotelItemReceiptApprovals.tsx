"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
import {
  approveItemRegistrationsFinanceBatchApi,
  authorizeItemRegistrationsManagerBatchApi,
  checkItemRegistrationsCCBatchApi,
  fetchCostControllerProfiles,
  rejectItemRegistrationsRoleBatchApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { CostControllerIdentitySelect } from "@/components/hotel/CostControllerIdentitySelect";
import { RegistrationVoucherApprovalActions } from "@/components/hotel/RegistrationVoucherApprovalActions";
import { StoreItemRegistrationReceipt } from "./StoreItemRegistrationReceipt";
import { formatItemRegistrationStatus } from "@/lib/hotelDisplayLabels";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { SUPPRESS_BROWSER_PRINT_CHROME } from "@/lib/suppressBrowserPrintChrome";
import {
  groupVoucherBatchesForQueue,
  voucherGroupStatusSummary,
  voucherGroupsHaveMixedStatus,
} from "@/lib/voucherGrouping";
import {
  getActionableIds,
  useAllowedSelection,
  toggleIdsInSelection,
} from "@/lib/voucherBatchSelection";
import { RegistrationLineStatusBadge } from "@/components/hotel/voucherQueueLineStatus";
import {
  VoucherGroupBadge,
  VoucherGroupedRequestCard,
} from "@/components/hotel/VoucherGroupedRequestCard";
import { VoucherGroupSelectCheckbox } from "@/components/hotel/VoucherGroupSelectCheckbox";
import { VoucherBatchToolbar } from "@/components/hotel/VoucherBatchToolbar";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { useRejectionReasonDialog } from "@/hooks/useRejectionReasonDialog";
import { notifyApiFailure } from "@/lib/actions";
import { formatRegistrationMoneyDetail } from "@/lib/inventoryLineTotals";
import { toast } from "sonner";

type RoleMode = "CostControl" | "Finance" | "Manager";

export function HotelItemReceiptApprovals({
  items,
  role,
  propertyName,
  propertyTin,
  logoUrl,
  onRefresh,
}: {
  items: ItemRegistration[];
  role: RoleMode;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  onRefresh: () => void;
}) {
  const [ccProfiles, setCcProfiles] = useState<CostControllerProfileRow[]>([]);
  const [ccProfileId, setCcProfileId] = useState<string>("");
  const [preview, setPreview] = useState<ItemRegistration | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: SUPPRESS_BROWSER_PRINT_CHROME,
  });
  const { isPending, run } = useConcurrentActions();
  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  const stakeholderLabel =
    role === "CostControl"
      ? "cost control"
      : role === "Finance"
        ? "finance"
        : "manager";

  useEffect(() => {
    if (role !== "CostControl") return;
    void fetchCostControllerProfiles().then((rows) => {
      setCcProfiles(rows);
    });
  }, [role]);

  const needsAction = useMemo(() => {
    if (role === "CostControl") {
      return (i: ItemRegistration) => i.approvalStatus === "PENDING_CC";
    }
    if (role === "Finance") {
      return (i: ItemRegistration) => i.approvalStatus === "PENDING_FINANCE";
    }
    return (i: ItemRegistration) => i.approvalStatus === "PENDING_MANAGER";
  }, [role]);

  const pending = useMemo(
    () => items.filter(needsAction),
    [items, needsAction],
  );

  const groups = useMemo(
    () => groupVoucherBatchesForQueue(pending, needsAction),
    [pending, needsAction],
  );

  const allActionableIds = useMemo(
    () => getActionableIds(groups, needsAction),
    [groups, needsAction],
  );
  const [selectedIds, setSelectedIds] = useAllowedSelection(allActionableIds);

  const effectiveCcProfileId =
    ccProfileId || (ccProfiles[0] ? String(ccProfiles[0].id) : "");

  const approveLabel =
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
        : "";

  const batchApproveLabel =
    role === "CostControl"
      ? "Check selected"
      : role === "Finance"
        ? "Approve selected"
        : "Authorize selected";

  const approveSelected = async (ids: number[], profileId?: number) => {
    if (role === "CostControl") {
      const pid = profileId ?? Number(effectiveCcProfileId);
      if (!pid) {
        toast.error("Select cost controller identity for batch");
        return;
      }
      await checkItemRegistrationsCCBatchApi(ids, pid);
    } else if (role === "Finance") {
      await approveItemRegistrationsFinanceBatchApi(ids);
    } else {
      await authorizeItemRegistrationsManagerBatchApi(ids);
    }
  };

  const rejectSelected = async (ids: number[], reason: string) => {
    await rejectItemRegistrationsRoleBatchApi(ids, reason, role);
  };

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
        No registrations awaiting action.
      </p>
    );
  }

  return (
    <>
      {RejectionReasonDialog}
      <div className="space-y-4">
        <VoucherBatchToolbar
          allActionableIds={allActionableIds}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          selectAllLabel="Select all vouchers & items"
          approveLabel={batchApproveLabel}
          rejectLabel="Reject selected"
          isPending={isPending}
          pendingApproveKey={`reg-batch-a-${role}`}
          pendingRejectKey={`reg-batch-r-${role}`}
          leading={
            role === "CostControl" && ccProfiles.length > 0 ? (
              <CostControllerIdentitySelect
                profiles={ccProfiles}
                value={effectiveCcProfileId}
                onValueChange={setCcProfileId}
                label="Cost controller identity for batch"
                placeholder="Select your name"
              />
            ) : null
          }
          onApproveSelected={() =>
            run(`reg-batch-a-${role}`, async () => {
              try {
                const actionable = selectedIds.filter((id) => {
                  const row = items.find((i) => i.id === id);
                  return row && needsAction(row);
                });
                await approveSelected(actionable);
                setSelectedIds([]);
                void onRefresh();
              } catch (e) {
                notifyApiFailure(e, `${approveLabel} failed`);
              }
            })
          }
          onRejectSelected={() =>
            run(`reg-batch-r-${role}`, async () => {
              try {
                const reason = await requestRejectionReason({
                  title: "Reject item registrations",
                  description: `Provide a reason (${stakeholderLabel}). Applies to all selected lines.`,
                });
                if (!reason) return;
                const actionable = selectedIds.filter((id) => {
                  const row = items.find((i) => i.id === id);
                  return row && needsAction(row);
                });
                await rejectSelected(actionable, reason);
                setSelectedIds([]);
                void onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Rejection failed");
              }
            })
          }
        />

        <div className="space-y-3">
          {groups.map((group) => {
            const mixed = voucherGroupsHaveMixedStatus(
              group.rows.map((r) => ({ approvalStatus: r.approvalStatus })),
            );
            return (
              <VoucherGroupedRequestCard
                key={group.key}
                group={group}
                badge={<VoucherGroupBadge count={group.rows.length} />}
                statusSummary={
                  mixed
                    ? voucherGroupStatusSummary(
                        group.rows.map((r) => ({
                          approvalStatus: r.approvalStatus,
                        })),
                        formatItemRegistrationStatus,
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
                actions={
                  <div className="flex flex-col gap-3 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit"
                      onClick={() => {
                        setPreview(group.rows[0]);
                        requestAnimationFrame(() => handlePrint());
                      }}
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Print voucher
                    </Button>
                    <RegistrationVoucherApprovalActions
                      role={role}
                      group={group}
                      groupKey={group.key}
                      needsAction={needsAction}
                      profiles={ccProfiles}
                      defaultProfileId={effectiveCcProfileId}
                      approveLabel={`${approveLabel}${approveSuffix}`}
                      isPending={isPending}
                      run={run}
                      rejectTitle="Reject item registration"
                      rejectDescription={`Provide a reason (${stakeholderLabel}). Applies to pending lines on this voucher.`}
                      requestRejectionReason={requestRejectionReason}
                      onApproveBatch={async (rows, profileId) => {
                        await approveSelected(
                          rows.map((r) => r.id),
                          profileId,
                        );
                        void onRefresh();
                      }}
                      onRejectBatch={async (rows, reason) => {
                        await rejectSelected(
                          rows.map((r) => r.id),
                          reason,
                        );
                        void onRefresh();
                      }}
                    />
                  </div>
                }
                lineLeading={(r) => (
                  <Checkbox
                    checked={selectedIds.includes(r.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) =>
                        toggleIdsInSelection([r.id], prev, checked === true),
                      );
                    }}
                    aria-label={`Select registration ${r.name}`}
                  />
                )}
                renderLineStatus={(r) => (
                  <RegistrationLineStatusBadge
                    approvalStatus={r.approvalStatus ?? ""}
                  />
                )}
                renderLineExtra={(r) => (
                  <span className="tabular-nums">
                    {formatRegistrationMoneyDetail(r)}
                  </span>
                )}
              />
            );
          })}
        </div>

        <div className="sr-only" aria-hidden>
          <div ref={printRef}>
            {preview ? (
              <StoreItemRegistrationReceipt
                item={preview}
                propertyName={propertyName}
                propertyTin={propertyTin}
                logoUrl={logoUrl}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
