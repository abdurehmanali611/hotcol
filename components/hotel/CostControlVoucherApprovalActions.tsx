"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { CostControllerIdentitySelect } from "@/components/hotel/CostControllerIdentitySelect";
import { VoucherGroupApprovalActions } from "@/components/hotel/VoucherGroupApprovalActions";
import type { CostControllerProfileRow } from "@/lib/api/types";
import type { VoucherGroup } from "@/lib/voucherGrouping";

type RowWithId = { id: number };

type RejectPrompt = (opts: {
  title: string;
  description: string;
}) => Promise<string | null>;

export function CostControlVoucherApprovalActions<T extends RowWithId>({
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
  onCheckVoucher,
  onRejectVoucher,
}: {
  group: VoucherGroup<T>;
  groupKey: string;
  needsAction: (row: T) => boolean;
  profiles: CostControllerProfileRow[];
  defaultProfileId: string;
  approveLabel: string;
  rejectTitle: string;
  rejectDescription: string;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  requestRejectionReason: RejectPrompt;
  onCheckVoucher: (rows: T[], profileId: number) => Promise<void>;
  onRejectVoucher: (
    rows: T[],
    reason: string,
    profileId: number,
  ) => Promise<void>;
}) {
  const selectId = useId();
  const [profileId, setProfileId] = useState(defaultProfileId);

  useEffect(() => {
    if (defaultProfileId && !profileId) {
      setProfileId(defaultProfileId);
    }
  }, [defaultProfileId, profileId]);

  const requireProfileId = (): number => {
    const pid = Number(profileId);
    if (!pid) {
      toast.error("Select your cost controller identity for this voucher");
      throw new Error("Select cost controller identity");
    }
    return pid;
  };

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
      leading={
        <CostControllerIdentitySelect
          id={selectId}
          profiles={profiles}
          value={profileId}
          onValueChange={setProfileId}
          label="Cost controller for this voucher"
          placeholder="Select your name"
          compact
        />
      }
      onApprove={async (rows) => {
        await onCheckVoucher(rows, requireProfileId());
      }}
      onReject={async (rows, reason) => {
        await onRejectVoucher(rows, reason, requireProfileId());
      }}
    />
  );
}
