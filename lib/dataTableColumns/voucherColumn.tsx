import type { ColumnDef } from "@tanstack/react-table";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

type VoucherRow = {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
};

/** Voucher column for purchase requests, item registrations, stock movements. */
export function buildVoucherColumn<T extends VoucherRow>(): ColumnDef<T> {
  return {
    id: "voucher",
    header: "Voucher",
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
