"use client";
import { ColumnDef } from "@tanstack/react-table";

export type cashout = {
  id: number;
  items: Array<string>;
  prices: Array<number>;
  measuredBy: Array<string>;
  requiredAmount: Array<number>;
  totalCalc: number;
  HotelName: string;
  createdAt: string;
};

export const columns: ColumnDef<cashout>[] = [
  {
    id: "RollNo",
    header: "RollNo",
    cell: ({ row }) => <div>{row.index + 1}</div>,
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => {
      return row.original.items.map((item, index) => (
        <div key={index} className="mx-1">{item}</div>
      ))
    },
    filterFn: (row, columnId, filterValue) => {
      const items = row.original.items;
      if (!items || !Array.isArray(items)) return false;
      if (!filterValue) return true;
      
      return items.some(item => 
        item.toLowerCase().includes(filterValue.toLowerCase())
      );
    },
  },
  {
    accessorKey: "prices",
    header: "Unit Price",
    cell: ({ row }) => {
      return row.original.prices.map((item, index) => (
        <div key={index} className="mx-1">{item}</div>
      ))
    },
  },
  {
    accessorKey: "requiredAmount",
    header: "Required Amount",
    cell: ({ row }) => {
      return row.original.requiredAmount.map((item, index) => (
        <div key={index} className="mx-1">{item} {row.original.measuredBy[index]}</div>
      ))
    },
  },
  {
    accessorKey: "totalCalc",
    header: "Total Calculation",
    cell: ({ row }) => {
       return <div className="mx-1">{row.original.totalCalc}</div>
    },
  },
];