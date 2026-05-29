"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import type { Table } from "@/lib/actions";
import { cafeOrderTableColumn } from "@/lib/dataTableColumns/cafeOrderTable";

export type Order = {
  id: number;
  title: string;
  imageUrl: string;
  orderAmount: number;
  category: string;
  type: string;
  HotelName: string;
  price: number;
  tableNo: number;
  waiterName: string;
  status: string | null;
  payment: string;
  withBank?: boolean | null;
  credit?: boolean | null;
  credittorName?: string | null;
  creditAmount?: number | null;
  createdAt: Date;
};

export function buildCompletedOrderColumns(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
): ColumnDef<Order>[] {
  return [
  {
    id: "RollNo",
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: "imageUrl",
    header: "Item",
    cell: ({ row }) => (
      <div className="relative h-10 w-10 overflow-hidden rounded-md border shadow-sm bg-muted">
        <Image
          src={row.getValue("imageUrl")}
          alt={row.original.title}
          fill
          className="object-cover"
        />
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: "Item Name",
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.title}</span>
    ),
  },
  cafeOrderTableColumn<Order>(tables),
  {
    accessorKey: "waiterName",
    header: "Waiter",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.waiterName}</span>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.price.toLocaleString()} ETB</span>
    ),
  },
  {
    accessorKey: "orderAmount",
    header: "Qty",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.orderAmount}</span>
    ),
  },
  {
    id: "value",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-bold text-foreground">
        {(row.original.orderAmount * row.original.price).toLocaleString()} ETB
      </span>
    ),
  },
  {
    accessorKey: "withBank",
    header: "Method",
    cell: ({ row }) => {
      const order = row.original;
      if (order.credit) {
        return (
          <div className="flex flex-col gap-0.5">
            <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
              Credit
            </div>
            {order.credittorName && (
              <span className="text-[10px] text-muted-foreground truncate max-w-20">
                {order.credittorName}
              </span>
            )}
          </div>
        );
      }
      if (order.withBank === true) {
        return (
          <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
            Bank
          </div>
        );
      }

      // Then check if it's a cash payment (withBank=false)
      if (order.withBank === false) {
        return (
          <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
            Cash
          </div>
        );
      }
    },
  },
  ];
}
