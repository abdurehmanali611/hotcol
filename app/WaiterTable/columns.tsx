/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Edit, Loader2, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  responsiveAlertDialogClassName,
  responsiveFormDialogClassName,
} from "@/lib/responsiveDialog";
import { deleteWaiter, Waiter } from "@/lib/actions";
import UpdateWaiterForm from "@/components/UpdateWaiterForm";
import React from "react";

export const columns = (refresh: () => void): ColumnDef<Waiter>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select-All"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="ml-5">{row.original.name}</div>,
  },
  {
    accessorKey: "age",
    header: "Age",
    cell: ({ row }) => <div className="ml-3">{row.original.age}</div>,
  },
  {
    accessorKey: "sex",
    header: "Sex",
    cell: ({ row }) => {
      const raw = String(row.original.sex ?? "").trim().toUpperCase();
      const short = raw.startsWith("F") ? "F" : raw.startsWith("M") ? "M" : raw;
      return <div className="ml-3">{short || "-"}</div>;
    },
  },
  {
    accessorKey: "experience",
    header: "Experience",
    cell: ({ row }) => <div className="ml-5">{row.original.experience}</div>,
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
    cell: ({ row }) => (
      <div className="ml-1">
        <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-medium">
          {row.original.phoneNumber}
        </Badge>
      </div>
    ),
  },
  {
    id: "tablesServedCount",
    header: "Served",
    cell: ({ row }) => {
      const waiter = row.original;
      const uniqueTables = new Set(
        Array.isArray(waiter.tablesServed) ? waiter.tablesServed : []
      ).size;
      return <div className="ml-5">{uniqueTables}</div>;
    },
  },
  {
    id: "completedOrders",
    header: "Paid",
    cell: ({ row }) => {
      const waiter = row.original;
      const completedOrders = Array.isArray(waiter.payment)
        ? waiter.payment.filter(
            (p) => String(p ?? "").toLowerCase() === "paid",
          ).length
        : 0;

      return <div className="ml-5">{completedOrders}</div>;
    },
  },
  {
    id: "totalSales",
    header: "Sales",
    cell: ({ row }) => {
      const sales = row.original;
      const totalSales =
        Array.isArray(sales.price) ? sales.price.reduce((sum, price) => sum + (price || 0), 0) : 0;
      return <div className="ml-5">{totalSales.toFixed(2)} ETB</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const [open, setOpen] = React.useState(false);
      const [deleting, setDeleting] = React.useState(false);
      return (
        <div className="flex items-center">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="cursor-pointer">
                <Edit />
              </Button>
            </DialogTrigger>
            <DialogContent className={responsiveFormDialogClassName}>
              <DialogHeader>
                <DialogTitle>Update Waiter</DialogTitle>
                <DialogDescription className="text-pretty">
                  Update staff details for {row.original.name}.
                </DialogDescription>
              </DialogHeader>
              <UpdateWaiterForm
                waiter={row.original}
                onSuccess={() => {
                  setOpen(false)
                  refresh();
                }}
              />
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="cursor-pointer">
                <Trash className="text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={responsiveAlertDialogClassName}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-pretty">
                  Delete {row.original.name}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-pretty">
                  This removes the waiter from your staff list. This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="w-full cursor-pointer sm:w-auto"
                  disabled={deleting}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="w-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    void (async () => {
                      setDeleting(true);
                      try {
                        await deleteWaiter(row.original.id);
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
                    "Delete waiter"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
