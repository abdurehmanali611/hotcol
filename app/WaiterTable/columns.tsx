/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Edit, Trash } from "lucide-react";
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
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    header: "Gender",
    cell: ({ row }) => <div className="ml-3">{row.original.sex}</div>,
  },
  {
    accessorKey: "experience",
    header: "Experience",
    cell: ({ row }) => <div className="ml-5">{row.original.experience}</div>,
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
    cell: ({ row }) => <div className="ml-3">{row.original.phoneNumber}</div>,
  },
  {
    id: "tablesServedCount",
    header: "Tables Served",
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
    header: "Completed Orders",
    cell: ({ row }) => {
      const waiter = row.original;
      const completedOrders =
        Array.isArray(waiter.payment) ? waiter.payment.filter((p) => p === "Paid").length : 0;

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
      return (
        <div className="flex items-center">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="cursor-pointer">
                <Edit />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Waiter</DialogTitle>
                <DialogDescription>Update the Waiter Details</DialogDescription>
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
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete Waiter {row.original.name}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete waiter {row.original.name} ?
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
                    await deleteWaiter(row.original.id);
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
