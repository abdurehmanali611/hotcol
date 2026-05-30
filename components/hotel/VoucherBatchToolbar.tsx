"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingButton } from "@/components/ui/pending-button";
import { selectionState } from "@/lib/voucherBatchSelection";

export function VoucherBatchToolbar({
  allActionableIds,
  selectedIds,
  onSelectedIdsChange,
  selectAllLabel = "Select all",
  approveLabel,
  rejectLabel,
  onApproveSelected,
  onRejectSelected,
  isPending,
  pendingApproveKey = "batch-a",
  pendingRejectKey = "batch-r",
  leading,
  disabled,
}: {
  allActionableIds: number[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  selectAllLabel?: string;
  approveLabel: string;
  rejectLabel: string;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  isPending: (key: string) => boolean;
  pendingApproveKey?: string;
  pendingRejectKey?: string;
  leading?: ReactNode;
  disabled?: boolean;
}) {
  const allSelected = selectionState(allActionableIds, selectedIds);

  return (
    <Card className="border-dashed border-primary/25 bg-primary/5 shadow-sm">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
        {leading ?? null}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox
              disabled={disabled || allActionableIds.length === 0}
              checked={allSelected}
              onCheckedChange={(checked) =>
                onSelectedIdsChange(
                  checked === true ? [...allActionableIds] : [],
                )
              }
              aria-label={selectAllLabel}
            />
            <span>{selectAllLabel}</span>
          </label>
          <PendingButton
            className="shadow-sm"
            disabled={disabled || selectedIds.length === 0}
            pending={isPending(pendingApproveKey)}
            onClick={() => void onApproveSelected()}
          >
            {approveLabel} ({selectedIds.length})
          </PendingButton>
          <PendingButton
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={disabled || selectedIds.length === 0}
            pending={isPending(pendingRejectKey)}
            onClick={() => void onRejectSelected()}
          >
            {rejectLabel} ({selectedIds.length})
          </PendingButton>
        </div>
      </CardContent>
    </Card>
  );
}
