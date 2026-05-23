/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteItemStatus } from "@/lib/actions";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Trash, Package, Phone, User, Receipt } from "lucide-react";
import { toast } from "sonner";

export type itemStatus = {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  actionDate: Date;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  paidAmount: number;
  status: string;
  statusBy: string;
  HotelName: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
};

async function handleDelete(id: number) {
  try {
    await DeleteItemStatus(id);
    toast.success("Record permanently removed");
  } catch (error: any) {
    toast.error("Failed to delete record");
    throw error;
  }
}

export const columns = (
  admin: boolean,
  refresh: () => void,
): ColumnDef<itemStatus>[] => [
  buildVoucherColumn<itemStatus>(),
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
          <AvatarImage src={row.original.imageUrl} alt={row.original.name} />
          <AvatarFallback className="bg-primary/5 text-primary">
            <Package size={16} />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-none">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            {row.original.category}
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "inventory",
    header: "Inventory",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">
          {row.original.amount} <span className="text-muted-foreground text-xs">{row.original.measuredBy}</span>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Receipt size={10} /> {row.original.unitPrice} ETB/unit
        </div>
      </div>
    ),
  },
  {
    id: "total",
    header: "Total Value",
    cell: ({ row }) => (
      <div className="font-bold text-sm text-primary">
        {(row.original.amount * row.original.unitPrice).toLocaleString()} <span className="text-[10px]">ETB</span>
      </div>
    )
  },
  {
    id: "supplier",
    header: "Provider",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-medium text-xs text-foreground/80">
          <User size={12} className="text-muted-foreground" />
          {row.original.supplierName}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Phone size={10} />
          {row.original.supplierPhone}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Verification",
    cell: ({ row }) => {
      const status = row.original.status.toLowerCase();
      return (
        <div className="flex flex-col gap-1.5">
          <Badge 
            variant={status === "paid" || status === "active" ? "default" : "secondary"}
            className="w-fit px-2 py-0 text-[10px] uppercase font-bold tracking-tighter"
          >
            {row.original.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
             By {row.original.statusBy}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: "actionDate",
    header: "Timestamp",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground font-mono">
        {new Date(row.original.actionDate).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        })}
      </div>
    ),
  },
  {
    id: "action",
    cell: ({ row }) => {
      if (!admin) return null;
      const [deleting, setDeleting] = React.useState(false);
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-xl border-border/40">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Delete Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <span className="font-bold text-foreground">{row.original.name}</span> from the history. This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-lg" disabled={deleting}>
                Keep Entry
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 rounded-lg"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void (async () => {
                    setDeleting(true);
                    try {
                      await handleDelete(row.original.id);
                      await refresh();
                    } finally {
                      setDeleting(false);
                    }
                  })();
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete Record"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];