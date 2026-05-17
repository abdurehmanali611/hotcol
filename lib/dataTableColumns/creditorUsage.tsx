"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { HotelCreditConsumptionRow, HotelCreditPartyRow } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";

export function usageLines(linesJson: string): string[] {
  try {
    const rows = JSON.parse(linesJson);
    if (!Array.isArray(rows)) return [linesJson];
    return rows.map((line: { name?: string; qty?: number; unitPrice?: number }) => {
      const n = String(line?.name ?? "Item");
      const q = Number(line?.qty ?? 0);
      const p = Number(line?.unitPrice ?? 0);
      return `${n} x ${q} @ ETB ${p.toLocaleString()}`;
    });
  } catch {
    return [linesJson];
  }
}

export function buildCreditorUsageColumns(
  companyById: Map<number, string>,
  partyById: Map<number, HotelCreditPartyRow>,
  recordedByLabel = "Recorded by",
): ColumnDef<HotelCreditConsumptionRow>[] {
  return [
    {
      id: "when",
      header: "When",
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap tabular-nums">
          {new Date(row.original.occurredAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "company",
      header: "Company",
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {companyById.get(row.original.companyId) ?? `#${row.original.companyId}`}
        </span>
      ),
    },
    {
      accessorKey: "staff",
      header: "Staff / Guest",
      cell: ({ row }) => {
        const party = partyById.get(row.original.partyId);
        return (
          <div className="space-y-0.5">
            <div className="text-sm">{party?.displayName ?? `#${row.original.partyId}`}</div>
            <div className="text-xs text-muted-foreground">
              {party?.phoneNumber ?? "No phone"}
            </div>
          </div>
        );
      },
    },
    {
      id: "amount",
      header: () => <span className="block text-right w-full">ETB</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums font-medium">
          {row.original.totalAmount.toLocaleString()}
        </span>
      ),
    },
    {
      id: "lines",
      header: "Lines",
      cell: ({ row }) => (
        <div className="max-w-[360px] text-xs text-muted-foreground space-y-1">
          {usageLines(row.original.linesJson).map((line, i) => (
            <p key={`${row.original.id}-${i}`}>{line}</p>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "recordedBy",
      header: recordedByLabel,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.recordedBy}
        </Badge>
      ),
    },
  ];
}
