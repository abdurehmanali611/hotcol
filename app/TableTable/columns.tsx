/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Edit, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteTable, Table } from "@/lib/actions";
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
          Table Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
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
      const servedTables = table.payment.length ?? 0;
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
      return (
        <div className="flex items-center">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="cursor-pointer">
                <Edit />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-fit">
              <DialogHeader>
                <DialogTitle>Update Table</DialogTitle>
                <DialogDescription>
                  Enter Table Details to be updated
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
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete Table {row.original.tableNo}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete Table {row.original.tableNo} ?
                  This Action can&apos;t be undone
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center gap-5 justify-end">
                <AlertDialogCancel className="cursor-pointer">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer bg-red-500"
                  onClick={async () => {
                    await deleteTable(row.original.id);
                    await refresh();
                  }}
                >
                  Delete
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
