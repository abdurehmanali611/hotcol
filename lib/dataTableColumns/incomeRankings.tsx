"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TableRankRow, WaiterRankRow } from "@/lib/incomeAggregation";

export type RankedWaiterRow = WaiterRankRow;
export type RankedTableRow = TableRankRow;

export const waiterIncomeColumns: ColumnDef<WaiterRankRow>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.rank}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Waiter",
    cell: ({ row }) => row.original.name,
  },
  {
    id: "revenue",
    header: () => <span className="block text-right w-full">Revenue (ETB)</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.original.revenue.toFixed(2)}
      </span>
    ),
  },
  {
    id: "tables",
    header: () => (
      <span className="block text-right w-full">Distinct tables</span>
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.original.uniqueTables}
      </span>
    ),
  },
  {
    id: "completions",
    header: () => <span className="block text-right w-full">Paid entries</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.original.completions}
      </span>
    ),
  },
  {
    id: "score",
    header: () => <span className="block text-right w-full">Score</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums text-muted-foreground">
        {row.original.composite.toFixed(3)}
      </span>
    ),
  },
];

export const tableIncomeColumns: ColumnDef<TableRankRow>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.rank}</span>
    ),
  },
  {
    accessorKey: "tableLabel",
    header: "Table",
    cell: ({ row }) => row.original.tableLabel,
  },
  {
    id: "revenue",
    header: () => <span className="block text-right w-full">Revenue (ETB)</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.original.revenue.toFixed(2)}
      </span>
    ),
  },
  {
    id: "completions",
    header: () => <span className="block text-right w-full">Paid entries</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.original.completions}
      </span>
    ),
  },
  {
    id: "score",
    header: () => <span className="block text-right w-full">Score</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums text-muted-foreground">
        {row.original.composite.toFixed(3)}
      </span>
    ),
  },
];
