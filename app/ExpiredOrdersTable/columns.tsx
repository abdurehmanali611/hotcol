"use client";

import { Avatar } from "@/components/ui/avatar";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

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

export const columns: ColumnDef<Order>[] = [
  {
    id: "RollNo",
    header: "No.",
    cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
  },
  {
    accessorKey: "imageUrl",
    header: "Item",
    cell: ({ row }) => (
      <Avatar className="h-10 w-10 overflow-hidden rounded-md border">
        <Image
          src={row.getValue("imageUrl")}
          alt={row.original.title}
          fill
          loading="eager"
          className="object-cover"
        />
      </Avatar>
    ),
  },
  {
    accessorKey: "title",
    header: "Item Name",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: "tableNo",
    header: "Table",
  },
  {
    accessorKey: "waiterName",
    header: "Waiter",
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => <span>{row.original.price.toLocaleString()} ETB</span>,
  },
  {
    accessorKey: "orderAmount",
    header: "Qty",
  },
  {
    id: "value",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-bold text-primary">
        {(row.original.orderAmount * row.original.price).toLocaleString()} ETB
      </div>
    ),
  },
  {
    id: "ExpiredDate",
    header: "Order Date",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <div className="text-muted-foreground">{date.toLocaleDateString()}</div>;
    },
  },
];