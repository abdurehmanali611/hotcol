"use client";

import { Badge } from "@/components/ui/badge";
import type { Table } from "@/lib/actions";
import {
  formatCafeTableDisplayFromRegistry,
  normalizeOrderTableNo,
} from "@/lib/cafeTableOrder";
import { cn } from "@/lib/utils";

type CafeTableLabelProps = {
  /** Order table number (GraphQL may return number or numeric string). */
  tableNo: number | string;
  tables: Pick<Table, "tableNo" | "orderCaption">[];
  serviceCaption?: string | null;
  className?: string;
};

/** Consistent table label: caption when registered, otherwise "Table N". */
export function CafeTableLabel({
  tableNo,
  tables,
  serviceCaption,
  className,
}: CafeTableLabelProps) {
  const label = formatCafeTableDisplayFromRegistry(
    normalizeOrderTableNo({ tableNo }),
    tables,
    serviceCaption,
  );
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-base px-3 py-1", className)}
    >
      {label}
    </Badge>
  );
}
