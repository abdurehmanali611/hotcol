"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
import {
  approveItemRegistrationFinanceApi,
  authorizeItemRegistrationManagerApi,
  checkItemRegistrationCCApi,
  fetchCostControllerProfiles,
  rejectItemRegistrationCCApi,
  rejectItemRegistrationFinanceApi,
  rejectItemRegistrationManagerApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { StoreItemRegistrationReceipt } from "./StoreItemRegistrationReceipt";
import { formatItemRegistrationStatus } from "@/lib/hotelDisplayLabels";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
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
import { VoucherGroupApprovalActions } from "@/components/hotel/VoucherGroupApprovalActions";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { useRejectionReasonDialog } from "@/hooks/useRejectionReasonDialog";
import { notifyApiFailure } from "@/lib/actions";
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
  const handlePrint = useReactToPrint({ contentRef: printRef });
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
    () => groupVoucherBatchesForQueue(items, needsAction),
    [items, needsAction],
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

  const runOnSelected = async (
    ids: number[],
    fn: (row: ItemRegistration) => Promise<void>,
  ) => {
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const id of ids) {
      const row = byId.get(id);
      if (row && needsAction(row)) await fn(row);
    }
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
              <div className="flex-1 min-w-[220px] space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Cost controller identity for batch
                </Label>
                <Select
                  value={effectiveCcProfileId || undefined}
                  onValueChange={setCcProfileId}
                >
                  <SelectTrigger className="bg-background max-w-md">
                    <SelectValue placeholder="Select your name" />
                  </SelectTrigger>
                  <SelectContent>
                    {ccProfiles.map((p) => (
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
            run(`reg-batch-a-${role}`, async () => {
              try {
                if (role === "CostControl") {
                  const pid = Number(effectiveCcProfileId);
                  if (!pid) {
                    toast.error("Select cost controller identity for batch");
                    return;
                  }
                  await runOnSelected(selectedIds, (row) =>
                    checkItemRegistrationCCApi(row.id, pid),
                  );
                } else if (role === "Finance") {
                  await runOnSelected(selectedIds, (row) =>
                    approveItemRegistrationFinanceApi(row.id),
                  );
                } else {
                  await runOnSelected(selectedIds, (row) =>
                    authorizeItemRegistrationManagerApi(row.id),
                  );
                }
                setSelectedIds([]);
                onRefresh();
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
                await runOnSelected(selectedIds, async (row) => {
                  if (role === "CostControl") {
                    await rejectItemRegistrationCCApi(row.id, reason);
                  } else if (role === "Finance") {
                    await rejectItemRegistrationFinanceApi(row.id, reason);
                  } else {
                    await rejectItemRegistrationManagerApi(row.id, reason);
                  }
                });
                setSelectedIds([]);
                onRefresh();
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
                    <VoucherGroupApprovalActions
                      group={group}
                      groupKey={group.key}
                      needsAction={needsAction}
                      approveLabel={`${approveLabel}${approveSuffix}`}
                      isPending={isPending}
                      run={run}
                      rejectTitle="Reject item registration"
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
                            await checkItemRegistrationCCApi(r.id, pid);
                          }
                        } else if (role === "Finance") {
                          for (const r of rows) {
                            await approveItemRegistrationFinanceApi(r.id);
                          }
                        } else {
                          for (const r of rows) {
                            await authorizeItemRegistrationManagerApi(r.id);
                          }
                        }
                        onRefresh();
                      }}
                      onReject={async (rows, reason) => {
                        for (const r of rows) {
                          if (role === "CostControl") {
                            await rejectItemRegistrationCCApi(r.id, reason);
                          } else if (role === "Finance") {
                            await rejectItemRegistrationFinanceApi(r.id, reason);
                          } else {
                            await rejectItemRegistrationManagerApi(r.id, reason);
                          }
                        }
                        onRefresh();
                      }}
                    />
                  </div>
                }
                lineLeading={(r) =>
                  needsAction(r) ? (
                    <Checkbox
                      checked={selectedIds.includes(r.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          toggleIdsInSelection(
                            [r.id],
                            prev,
                            checked === true,
                          ),
                        );
                      }}
                      aria-label={`Select registration ${r.name}`}
                    />
                  ) : null
                }
                renderLineStatus={(r) => (
                  <RegistrationLineStatusBadge
                    approvalStatus={r.approvalStatus ?? ""}
                  />
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
