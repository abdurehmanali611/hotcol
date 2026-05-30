import { useCallback, useMemo, useState } from "react";
import type { VoucherGroup } from "@/lib/voucherGrouping";

export function getActionableIds<T extends { id: number }>(
  groups: VoucherGroup<T>[],
  needsAction: (row: T) => boolean,
): number[] {
  return groups.flatMap((g) =>
    g.rows.filter(needsAction).map((r) => r.id),
  );
}

export function getVoucherActionableIds<T extends { id: number }>(
  group: VoucherGroup<T>,
  needsAction: (row: T) => boolean,
): number[] {
  return group.rows.filter(needsAction).map((r) => r.id);
}

export function selectionState(
  targetIds: number[],
  selectedIds: number[],
): boolean | "indeterminate" {
  if (targetIds.length === 0) return false;
  const hit = targetIds.filter((id) => selectedIds.includes(id));
  if (hit.length === 0) return false;
  if (hit.length === targetIds.length) return true;
  return "indeterminate";
}

export function toggleIdsInSelection(
  targetIds: number[],
  selectedIds: number[],
  checked: boolean,
): number[] {
  if (checked) {
    return [...new Set([...selectedIds, ...targetIds])];
  }
  const remove = new Set(targetIds);
  return selectedIds.filter((id) => !remove.has(id));
}

export function pruneSelectionToAllowed(
  selectedIds: number[],
  allowedIds: Set<number>,
): number[] {
  return selectedIds.filter((id) => allowedIds.has(id));
}

/** Keeps checkbox selection valid without syncing via useEffect. */
export function useAllowedSelection(allowedIds: number[]) {
  const [raw, setRaw] = useState<number[]>([]);
  const allowed = useMemo(() => new Set(allowedIds), [allowedIds]);
  const selected = useMemo(
    () => pruneSelectionToAllowed(raw, allowed),
    [raw, allowed],
  );
  const setSelected = useCallback(
    (next: number[] | ((prev: number[]) => number[])) => {
      setRaw((prev) => {
        const resolved =
          typeof next === "function" ? next(pruneSelectionToAllowed(prev, allowed)) : next;
        return resolved;
      });
    },
    [allowed],
  );
  return [selected, setSelected] as const;
}
