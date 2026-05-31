"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import {
  formatMovementType,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import {
  PurchaseLineStatusBadge,
  RegistrationLineStatusBadge,
  StockLineStatusBadge,
} from "@/components/hotel/voucherQueueLineStatus";
import { Pencil, Trash2 } from "lucide-react";

function formatWhen(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function searchAccessor(
  parts: (string | number | null | undefined)[],
): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildPurchaseReviewColumns({
  onEdit,
  onRequestDelete,
}: {
  onEdit: (row: PurchaseRequestRow) => void;
  onRequestDelete: (row: PurchaseRequestRow) => void;
}): ColumnDef<PurchaseRequestRow>[] {
  return [
    buildVoucherColumn<PurchaseRequestRow>(),
    {
      id: "itemName",
      header: "Item",
      accessorFn: (row) =>
        searchAccessor([
          row.itemName,
          row.supplierName,
          row.category,
          formatVoucherDisplay(row.voucherNumber, row.voucherDisplay),
        ]),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
          {formatQtyWithUnit(row.original.quantity, row.original.measuredBy)}
        </span>
      ),
    },
    {
      accessorKey: "estimatedUnitPrice",
      header: "Est. unit price",
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap">
          ETB {Number(row.original.estimatedUnitPrice || 0).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => (
        <span className="text-sm max-w-[140px] truncate block">
          {row.original.supplierName || "—"}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <PurchaseLineStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onRequestDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];
}

export function buildStockReviewColumns({
  onEdit,
  onRequestDelete,
}: {
  onEdit: (row: StockOutRequestRow) => void;
  onRequestDelete: (row: StockOutRequestRow) => void;
}): ColumnDef<StockOutRequestRow>[] {
  return [
    buildVoucherColumn<StockOutRequestRow>(),
    {
      id: "itemName",
      header: "Item",
      accessorFn: (row) =>
        searchAccessor([
          row.itemName,
          row.stakeHolderOrReason,
          formatMovementType(row.movementType),
          formatVoucherDisplay(row.voucherNumber, row.voucherDisplay),
        ]),
      cell: ({ row }) => (
        <span className="font-medium max-w-[180px] truncate block">
          {row.original.itemName?.trim() || "Unknown item"}
        </span>
      ),
    },
    {
      id: "movementType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatMovementType(row.original.movementType)}
        </span>
      ),
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
          {formatQtyWithUnit(row.original.amount, "")}
        </span>
      ),
    },
    {
      accessorKey: "stakeHolderOrReason",
      header: "Destination / reason",
      cell: ({ row }) => (
        <span className="text-sm max-w-[160px] truncate block text-muted-foreground">
          {row.original.stakeHolderOrReason?.trim() || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StockLineStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onRequestDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];
}

export function buildRegistrationReviewColumns({
  onEdit,
  onRequestDelete,
}: {
  onEdit: (row: ItemRegistration) => void;
  onRequestDelete: (row: ItemRegistration) => void;
}): ColumnDef<ItemRegistration>[] {
  return [
    buildVoucherColumn<ItemRegistration>(),
    {
      id: "name",
      header: "Item",
      accessorFn: (row) =>
        searchAccessor([
          row.name,
          row.supplierName,
          row.category,
          formatVoucherDisplay(row.voucherNumber, row.voucherDisplay),
        ]),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
          {formatQtyWithUnit(row.original.amount, row.original.measuredBy)}
        </span>
      ),
    },
    {
      accessorKey: "unitPrice",
      header: "Unit price",
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap">
          ETB {Number(row.original.unitPrice || 0).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => (
        <span className="text-sm max-w-[140px] truncate block">
          {row.original.supplierName || "—"}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category || "—"}
        </span>
      ),
    },
    {
      id: "registered",
      header: "Registered",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatWhen(row.original.registrationDate)}
        </span>
      ),
    },
    {
      id: "paidAmount",
      header: "Paid",
      cell: ({ row }) => (
        <span className="tabular-nums text-sm whitespace-nowrap">
          ETB {Number(row.original.paidAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <RegistrationLineStatusBadge
          approvalStatus={row.original.approvalStatus ?? ""}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onRequestDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];
}
