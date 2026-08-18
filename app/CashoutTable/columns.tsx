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
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1.5">
        {row.original.items.map((item, i) => (
          <div key={i} className="text-sm font-medium leading-tight">
            {item}
          </div>
        ))}
      </div>
    ),
    filterFn: (row, _columnId, filterValue) => {
      const items = row.original.items;
      if (!items || !Array.isArray(items)) return false;
      const search = String(filterValue).toLowerCase();
      return items.some((item) => item.toLowerCase().includes(search));
    },
  },
  {
    accessorKey: "prices",
    header: "Unit Price",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1.5">
        {row.original.prices.map((price, i) => (
          <div key={i} className="text-sm tabular-nums">
            {Number(price).toLocaleString()} ETB
          </div>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "requiredAmount",
    header: "Qty",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1.5">
        {row.original.requiredAmount.map((amt, i) => (
          <div key={i} className="text-sm font-medium tabular-nums">
            {amt}{" "}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {row.original.measuredBy[i]}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "totalCalc",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-bold tabular-nums text-foreground">
        {row.original.totalCalc.toLocaleString()} ETB
      </div>
    ),
  },
  {
    id: "cashoutDate",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className="text-sm text-muted-foreground">
          {Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString()}
        </div>
      );
    },
  },
];
