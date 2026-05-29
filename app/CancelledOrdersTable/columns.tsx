"use client"

import { ColumnDef } from "@tanstack/react-table"
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
}

export function buildCancelledOrderColumns(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
): ColumnDef<Order>[] {
  return [
  {
    id: "RollNo",
    header: "#",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.index + 1}</span>
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
    )
  },
  {
    accessorKey: "title",
    header: "Item Name",
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.title}</span>
  },
  cafeOrderTableColumn<Order>(tables),
  {
    accessorKey: "waiterName",
    header: "Waiter",
    cell: ({ row }) => <span className="text-sm">{row.original.waiterName}</span>
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => <span className="text-sm">{row.original.price.toLocaleString()} ETB</span>
  },
  {
    accessorKey: "orderAmount",
    header: "Qty",
    cell: ({ row }) => <span className="font-semibold">{row.original.orderAmount}</span>
  },
  {
    id: "value",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-bold text-foreground">
        {(row.original.orderAmount * row.original.price).toLocaleString()} ETB
      </span>
    )
  },
  {
    accessorKey: "category",
    header: "Cancelled By",
    cell: ({ row }) => {
      const isBeverage = row.original.category.toLowerCase() === "beverage";
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          isBeverage ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
        }`}>
          {isBeverage ? "Barista" : "Chef/Kitchen"}
        </span>
      );
    }
  },
  ];
}