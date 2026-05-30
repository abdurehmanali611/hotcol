"use client";

import type { ReactNode } from "react";
import { PendingButton } from "@/components/ui/pending-button";
import { voucherGroupActionableRows } from "@/lib/voucherGrouping";
import type { VoucherGroup } from "@/lib/voucherGrouping";

type RowWithId = { id: number };

export function VoucherGroupApprovalActions<T extends RowWithId>({
  group,
  groupKey,
  needsAction,
  approveLabel,
  rejectLabel = "Reject",
  isPending,
  run,
  onApprove,
  onReject,
  requestRejectionReason,
  rejectTitle,
  rejectDescription,
  rejectMode = "reason",
  rejectConfirmMessage,
  leading,
  size = "sm",
}: {
  group: VoucherGroup<T>;
  groupKey: string;
  needsAction: (row: T) => boolean;
  approveLabel: string;
  rejectLabel?: string;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  onApprove: (rows: T[]) => Promise<void>;
  onReject: (rows: T[], reason: string) => Promise<void>;
  requestRejectionReason: (opts: {
    title: string;
    description: string;
  }) => Promise<string | null>;
  rejectTitle: string;
  rejectDescription: string;
  /** Store review uses confirm instead of a rejection-reason dialog. */
  rejectMode?: "reason" | "confirm";
  rejectConfirmMessage?: (lineCount: number) => string;
  leading?: ReactNode;
  size?: "sm" | "default";
}) {
  const actionable = voucherGroupActionableRows(group, needsAction);
  const disabled = actionable.length === 0;
  const approveKey = `v-a-${groupKey}`;
  const rejectKey = `v-r-${groupKey}`;

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end w-full">
      {leading ?? null}
      <div className="flex flex-wrap gap-2 ml-auto">
        <PendingButton
          size={size}
          className="shadow-sm"
          disabled={disabled}
          pending={isPending(approveKey)}
          onClick={() =>
            void run(approveKey, async () => {
              await onApprove(actionable);
            })
          }
        >
          {approveLabel}
          {actionable.length > 1 ? ` (${actionable.length})` : ""}
        </PendingButton>
        <PendingButton
          size={size}
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          disabled={disabled}
          pending={isPending(rejectKey)}
          onClick={() =>
            void run(rejectKey, async () => {
              if (rejectMode === "confirm") {
                const msg =
                  rejectConfirmMessage?.(actionable.length) ??
                  `Remove ${actionable.length} line(s) on this voucher?`;
                if (!confirm(msg)) return;
                await onReject(actionable, "");
                return;
              }
              const reason = await requestRejectionReason({
                title: rejectTitle,
                description: rejectDescription,
              });
              if (!reason) return;
              await onReject(actionable, reason);
            })
          }
        >
          {rejectLabel}
          {actionable.length > 1 ? ` (${actionable.length})` : ""}
        </PendingButton>
      </div>
    </div>
  );
}
