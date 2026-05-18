import type { ColumnDef } from "@tanstack/react-table";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import { voucherSortKey } from "@/lib/voucherSort";

type VoucherRow = {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  registrationLines?: { voucherNumber?: number | null }[];
};

function rowVoucherSortKey(row: VoucherRow): number {
  const direct = voucherSortKey(row);
  if (direct > 0) return direct;
  const lines = row.registrationLines;
  if (!lines?.length) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const k = voucherSortKey(line);
    if (k > 0 && k < min) min = k;
  }
  return Number.isFinite(min) ? min : 0;
}

/** Voucher column for purchase requests, item registrations, stock movements. */
export function buildVoucherColumn<T extends VoucherRow>(): ColumnDef<T> {
  return {
    id: "voucher",
    header: "Voucher",
    accessorFn: (row) => rowVoucherSortKey(row),
    sortingFn: "basic",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatVoucherDisplay(
          row.original.voucherNumber,
          row.original.voucherDisplay,
        )}
      </span>
    ),
  };
}
