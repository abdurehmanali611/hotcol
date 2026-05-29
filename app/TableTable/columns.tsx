/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Edit, Loader2, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { deleteTable, Table } from "@/lib/actions";
import { formatCafeTableDisplay } from "@/lib/cafeTableOrder";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import UpdateTableForm from "@/components/UpdateTableForm";
import React from "react";

export const columns = (refresh: () => void): ColumnDef<Table>[] => [
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
    accessorKey: "tableNo",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Table
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const caption = String(row.original.orderCaption ?? "").trim();
      const tableNo = row.original.tableNo;
      return (
        <div className="ml-3 font-medium">
          {formatCafeTableDisplay(tableNo, caption)}
        </div>
      );
    },
  },
  {
    accessorKey: "capacity",
    header: "Capacity",
    cell: ({ row }) => <div className="ml-3">{row.original.capacity}</div>,
  },
  {
    id: "tablesServedCount",
    header: "Tables Served",
    cell: ({ row }) => {
      const table = row.original
      const servedTables = Array.isArray(table.payment) ? table.payment.filter((p) => p.toLowerCase() === "paid").length : 0;
      return <div className="ml-5">{servedTables}</div>
    },
  },
  {
    id: "completedOrders",
    header: "Completed Orders",
    cell: ({ row }) => {
      const order = row.original;
      const completedOrders =
        Array.isArray(order.payment) ? order.payment.filter((p) => p.toLowerCase() === "paid").length : 0;
      return <div className="ml-5">{completedOrders}</div>;
    },
  },
  {
    id: "totalsales",
    header: "Sales",
    cell: ({ row }) => {
      const sales = row.original;
      const totalSales =
        Array.isArray(sales.price) ? sales.price.reduce((sum, price) => sum + (price ?? 0), 0) : 0;
      return sales ? (
        <div className="ml-5">{totalSales.toFixed(2)} ETB</div>
      ) : (
        <div className="ml-5">0</div>
      );
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
                <DialogTitle>Update Table</DialogTitle>
                <DialogDescription className="text-pretty">
                  Update capacity and caption for{" "}
                  {formatCafeTableDisplay(
                    row.original.tableNo,
                    row.original.orderCaption,
                  )}
                  .
                </DialogDescription>
              </DialogHeader>
              <UpdateTableForm
                Table={row.original}
                onSuccess={() => {
                  refresh();
                  setOpen(false);
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
                  Delete{" "}
                  {formatCafeTableDisplay(
                    row.original.tableNo,
                    row.original.orderCaption,
                  )}
                  ?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-pretty">
                  This removes the table from your floor layout. This cannot be
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
                        await deleteTable(row.original.id);
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
                    "Delete table"
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
