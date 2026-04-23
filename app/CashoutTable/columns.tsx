"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Cashout = {
  id: number;
  items: string[];
  prices: number[];
  measuredBy: string[];
  requiredAmount: number[];
  totalCalc: number;
  HotelName: string;
  createdAt: Date;
};

export const columns: ColumnDef<Cashout>[] = [
  {
    id: "RollNo",
    header: "No.",
    cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.items.map((item, i) => (
          <div key={i} className="text-sm text-muted-foreground">{item}</div>
        ))}
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      const items = row.original.items;
      if (!items || !Array.isArray(items)) return false;
      const search = filterValue.toLowerCase();
      return items.some(item => item.toLowerCase().includes(search));
    },
  },
  {
    accessorKey: "prices",
    header: "Unit Price",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.prices.map((price, i) => (
          <div key={i} className="text-sm">{price.toLocaleString()} ETB</div>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "requiredAmount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.requiredAmount.map((amt, i) => (
          <div key={i} className="text-sm font-medium">
            {amt} <span className="text-xs text-muted-foreground uppercase">{row.original.measuredBy[i]}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "totalCalc",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-bold text-primary">
        {row.original.totalCalc.toLocaleString()} ETB
      </div>
    ),
  },
];