"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  History,
} from "lucide-react";
import type { LodgingActionLog } from "@/lib/api/lodgingRooms";
import {
  formatLodgingActionDetails,
  lodgingActionLabel,
} from "@/lib/lodgingActionHistoryFormat";
import { downloadLodgingActionHistoryPdf } from "@/lib/lodgingActionHistoryPdf";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import {
  LodgingSectionCard,
  lodgingGhostBtnClass,
  lodgingPrimaryBtnClass,
} from "@/components/hotel/lodgingChrome";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export { formatLodgingActionDetails } from "@/lib/lodgingActionHistoryFormat";

const PAGE_SIZE = 10;

function logsSignature(logs: LodgingActionLog[]) {
  if (logs.length === 0) return "0";
  return `${logs.length}:${logs[0]!.id}:${logs[logs.length - 1]!.id}`;
}

function toExportRows(logs: LodgingActionLog[]) {
  return logs.map((log) => ({
    When: new Date(log.createdAt).toLocaleString(),
    Action: lodgingActionLabel(log.action),
    Actor: log.actorName || "",
    Role: log.actorRole || "",
    Entity: log.entityType || "",
    "What changed": formatLodgingActionDetails(log.detailJson),
  }));
}

function actionBadgeClass(action: string) {
  const a = String(action || "").toLowerCase();
  if (a.includes("checkout") || a.includes("complete") || a.includes("approve")) {
    return "border-emerald-500/20 bg-emerald-500/8 text-emerald-800 dark:text-emerald-300";
  }
  if (a.includes("checkin") || a.includes("check_in") || a.includes("create")) {
    return "border-sky-500/20 bg-sky-500/8 text-sky-800 dark:text-sky-300";
  }
  if (a.includes("discount") || a.includes("pending") || a.includes("assign")) {
    return "border-amber-500/20 bg-amber-500/8 text-amber-900 dark:text-amber-300";
  }
  if (a.includes("void") || a.includes("delete") || a.includes("reject") || a.includes("cancel")) {
    return "border-rose-500/20 bg-rose-500/8 text-rose-800 dark:text-rose-300";
  }
  return "border-primary/15 bg-primary/6 text-teal-800 dark:text-teal-300";
}

export function LodgingActionHistoryPanel({
  logs,
  title = "Action history",
  description = "Structured lodging audit trail for this property.",
  pageSize = PAGE_SIZE,
}: {
  logs: LodgingActionLog[];
  title?: string;
  description?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const [logsSig, setLogsSig] = useState(() => logsSignature(logs));
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const nextSig = logsSignature(logs);
  if (nextSig !== logsSig) {
    setLogsSig(nextSig);
    setPage(0);
  }

  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(logs.length / size));
  const safePage = Math.min(page, pageCount - 1);

  const pageLogs = useMemo(() => {
    const start = safePage * size;
    return logs.slice(start, start + size);
  }, [logs, safePage, size]);

  const from = logs.length === 0 ? 0 : safePage * size + 1;
  const to = Math.min((safePage + 1) * size, logs.length);

  const exportPdf = async () => {
    if (logs.length === 0) {
      toast.error("No actions to export");
      return;
    }
    setExportingPdf(true);
    try {
      await downloadLodgingActionHistoryPdf({ logs, title });
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const exportExcel = async () => {
    if (logs.length === 0) {
      toast.error("No actions to export");
      return;
    }
    setExportingExcel(true);
    try {
      await exportRowsExcel(
        "lodging-recent-actions",
        "Recent actions",
        toExportRows(logs),
      );
      toast.success("Excel downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <LodgingSectionCard
      title={title}
      description={description}
      icon={<History className="h-5 w-5" />}
      accent="bg-linear-to-r from-primary/40 via-sky-500/25 to-transparent"
      actions={
        <div className="flex flex-wrap gap-2">
          <PendingButton
            type="button"
            variant="outline"
            className={cn("h-9 gap-1.5 border-primary/25", lodgingGhostBtnClass)}
            disabled={logs.length === 0}
            pending={exportingPdf}
            onClick={() => void exportPdf()}
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </PendingButton>
          <PendingButton
            type="button"
            variant="outline"
            className="h-9 gap-1.5 border-sky-500/20 text-sky-800/90 hover:bg-sky-500/6 dark:text-sky-300"
            disabled={logs.length === 0}
            pending={exportingExcel}
            onClick={() => void exportExcel()}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </PendingButton>
        </div>
      }
    >
      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-6 py-10 text-center text-sm text-muted-foreground">
          No actions logged yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto overflow-hidden rounded-xl border border-primary/12 bg-background shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 bg-primary/5 text-left text-[11px] uppercase tracking-wider text-teal-800/65 dark:text-teal-300/70">
                  <th className="px-3 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Actor</th>
                  <th className="px-3 py-2.5 font-medium">Entity</th>
                  <th className="min-w-56 px-3 py-2.5 font-medium">
                    What changed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {pageLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="align-top transition-colors hover:bg-primary/5"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium capitalize",
                          actionBadgeClass(log.action),
                        )}
                      >
                        {lodgingActionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-medium">
                        {log.actorName || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.actorRole || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {log.entityType || "—"}
                    </td>
                    <td className="max-w-md px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                      {formatLodgingActionDetails(log.detailJson)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs tabular-nums text-muted-foreground">
              Showing {from}–{to} of {logs.length}
              {pageCount > 1 ? ` · Page ${safePage + 1} of ${pageCount}` : ""}
              <span className="text-teal-800/70 dark:text-teal-300/70">
                {" "}
                · {size} / page
              </span>
            </p>
            {pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-8 gap-1 border-primary/25", lodgingGhostBtnClass)}
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={cn("h-8 gap-1", lodgingPrimaryBtnClass)}
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </LodgingSectionCard>
  );
}
