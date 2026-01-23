"use client"
import { Avatar } from "@/components/ui/avatar";
import { ColumnDef } from "@tanstack/react-table"
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
  createdAt: string;
}

export const columns:  ColumnDef<Order>[] = [
  {
    id: "RollNo",
    header: "RollNo",
    cell: ({row}) => <h2>{row.index + 1}</h2>
  },
  {
    accessorKey: "imageUrl",
    header: "Item Image",
    cell: ({row}) => {
      return (
        <Avatar>
          <Image 
          src={row.getValue("imageUrl")}
          alt={row.original.title}
          fill
          loading="eager"
          className="object-cover"
          />
        </Avatar>
      )
    }
  },
  {
    accessorKey: "title",
    header: "Item Name",
  },
  {
    accessorKey: "tableNo",
    header: "Table Number",
  },
  {
    accessorKey: "waiterName",
    header: "Waiter Name",
  },
  {
    accessorKey: "price",
    header: "Item Price",
  },
  {
    accessorKey: "orderAmount",
    header: "Order Amount",
  },
  {
    id: "value",
    header: "Total Value",
    cell: ({row}) => <div>{row.original.orderAmount * row.original.price}</div>
  },
  {
    accessorKey: "category",
    header: "Cancelled by",
    cell: ({row}) => <h2>{row.original.category.toLowerCase() === "beverage" ? "Barista": "Chef/Kitchen"}</h2>
  },
]