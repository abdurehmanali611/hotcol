"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  getVoucherActionableIds,
  selectionState,
  toggleIdsInSelection,
} from "@/lib/voucherBatchSelection";
import type { VoucherGroup } from "@/lib/voucherGrouping";

export function VoucherGroupSelectCheckbox<T extends { id: number }>({
  group,
  needsAction,
  selectedIds,
  onSelectedIdsChange,
  label,
}: {
  group: VoucherGroup<T>;
  needsAction: (row: T) => boolean;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  label?: string;
}) {
  const voucherIds = getVoucherActionableIds(group, needsAction);
  if (voucherIds.length === 0) return null;

  const checked = selectionState(voucherIds, selectedIds);

  return (
    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) =>
          onSelectedIdsChange(
            toggleIdsInSelection(voucherIds, selectedIds, value === true),
          )
        }
        aria-label={
          label ?? `Select all pending items on voucher ${group.voucherDisplay}`
        }
      />
      <span className="text-xs text-muted-foreground font-medium">
        {label ?? "Select voucher"}
      </span>
    </label>
  );
}
