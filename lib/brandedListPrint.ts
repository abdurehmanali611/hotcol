import { parseYmdToDate } from "@/lib/hotelDateYmd";

export type AuditPrintFilterLine = { label: string; value: string };

export type AuditPrintSummaryRow = {
  label: string;
  value: string;
  emphasis?: boolean;
  grand?: boolean;
};

export function formatPrintEtb(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPrintEtbLabel(value: number): string {
  return `ETB ${formatPrintEtb(value)}`;
}

export function formatPrintFilterDate(ymd: string): string {
  const trimmed = String(ymd ?? "").trim();
  if (!trimmed) return "Any date";
  const d = parseYmdToDate(trimmed);
  if (!d) return trimmed;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatPrintWhen(
  iso: string | Date | null | undefined,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatPrintDateTime(
  iso: string | Date | null | undefined,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatPrintVoucherRange(fromRaw: string, toRaw: string): string {
  const from = String(fromRaw ?? "").trim();
  const to = String(toRaw ?? "").trim();
  if (!from && !to) return "Any voucher";
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  return `Up to ${to}`;
}

export function auditRecordsFilterLine(
  filteredCount: number,
  totalCount: number,
): AuditPrintFilterLine {
  return {
    label: "Records",
    value: `${filteredCount} of ${totalCount}`,
  };
}
