"use client";

import { CostControlVoucherApprovalActions } from "@/components/hotel/CostControlVoucherApprovalActions";
import { VoucherGroupApprovalActions } from "@/components/hotel/VoucherGroupApprovalActions";
import type { CostControllerProfileRow } from "@/lib/api/types";
import type { ItemRegistration } from "@/lib/actions";
import type { VoucherGroup } from "@/lib/voucherGrouping";

type RoleMode = "CostControl" | "Finance" | "Manager";

type RejectPrompt = (opts: {
  title: string;
  description: string;
}) => Promise<string | null>;

export function RegistrationVoucherApprovalActions({
  role,
  group,
  groupKey,
  needsAction,
  profiles,
  defaultProfileId,
  approveLabel,
  rejectTitle,
  rejectDescription,
  isPending,
  run,
  requestRejectionReason,
  onApproveBatch,
  onRejectBatch,
}: {
  role: RoleMode;
  group: VoucherGroup<ItemRegistration>;
  groupKey: string;
  needsAction: (row: ItemRegistration) => boolean;
  profiles: CostControllerProfileRow[];
  defaultProfileId: string;
  approveLabel: string;
  rejectTitle: string;
  rejectDescription: string;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  requestRejectionReason: RejectPrompt;
  onApproveBatch: (
    rows: ItemRegistration[],
    profileId?: number,
  ) => Promise<void>;
  onRejectBatch: (
    rows: ItemRegistration[],
    reason: string,
    profileId?: number,
  ) => Promise<void>;
}) {
  if (role === "CostControl") {
    return (
      <CostControlVoucherApprovalActions
        group={group}
        groupKey={groupKey}
        needsAction={needsAction}
        profiles={profiles}
        defaultProfileId={defaultProfileId}
        approveLabel={approveLabel}
        rejectTitle={rejectTitle}
        rejectDescription={rejectDescription}
        isPending={isPending}
        run={run}
        requestRejectionReason={requestRejectionReason}
        onCheckVoucher={(rows, profileId) => onApproveBatch(rows, profileId)}
        onRejectVoucher={(rows, reason, profileId) =>
          onRejectBatch(rows, reason, profileId)
        }
      />
    );
  }

  return (
    <VoucherGroupApprovalActions
      group={group}
      groupKey={groupKey}
      needsAction={needsAction}
      approveLabel={approveLabel}
      isPending={isPending}
      run={run}
      rejectTitle={rejectTitle}
      rejectDescription={rejectDescription}
      requestRejectionReason={requestRejectionReason}
      onApprove={(rows) => onApproveBatch(rows)}
      onReject={(rows, reason) => onRejectBatch(rows, reason)}
    />
  );
}
