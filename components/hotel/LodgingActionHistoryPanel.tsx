"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-slate-500/50 via-border to-transparent" />
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
              <History className="h-5 w-5 shrink-0 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {description}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <PendingButton
              type="button"
              variant="outline"
              className="h-9 gap-1.5"
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
              className="h-9 gap-1.5"
              disabled={logs.length === 0}
              pending={exportingExcel}
              onClick={() => void exportExcel()}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </PendingButton>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-8">
        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-6 py-10 text-center text-sm text-muted-foreground">
            No actions logged yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/35 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">Action</th>
                    <th className="px-3 py-2.5 font-medium">Actor</th>
                    <th className="px-3 py-2.5 font-medium">Entity</th>
                    <th className="px-3 py-2.5 font-medium min-w-56">
                      What changed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {pageLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/15 align-top">
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className="font-normal capitalize"
                        >
                          {lodgingActionLabel(log.action)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-sm">
                          {log.actorName || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.actorRole || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {log.entityType || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground leading-relaxed max-w-md">
                        {formatLodgingActionDetails(log.detailJson)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground tabular-nums">
                Showing {from}–{to} of {logs.length}
                {pageCount > 1 ? ` · Page ${safePage + 1} of ${pageCount}` : ""}
              </p>
              {pageCount > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    disabled={safePage <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
