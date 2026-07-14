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
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import type { LodgingActionLog } from "@/lib/api/lodgingRooms";

const PAGE_SIZE = 10;

function actionLabel(action: string) {
  return action.replace(/_/g, " ");
}

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    return value
      .map((v) => formatDetailValue(v))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const nested = formatDetailValue(v);
        return nested ? `${k}: ${nested}` : "";
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

/** Prefer human-readable snippets from lodging action detailJson. */
export function formatLodgingActionDetails(detailJson: string): string {
  const raw = String(detailJson ?? "").trim();
  if (!raw) return "—";

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || parsed === "") return "—";
    if (typeof parsed !== "object") return String(parsed);

    const obj = parsed as Record<string, unknown>;
    const preferredKeys = [
      "voucherCode",
      "roomNumber",
      "roomNumbers",
      "roomIds",
      "status",
      "fromStatus",
      "toStatus",
      "workKind",
      "assigneeName",
      "assigneeNames",
      "nights",
      "amountETB",
      "totalETB",
      "lineIds",
      "toStayId",
      "guestId",
      "notes",
      "message",
      "reason",
    ];

    const parts: string[] = [];
    for (const key of preferredKeys) {
      if (!(key in obj)) continue;
      const formatted = formatDetailValue(obj[key]);
      if (!formatted) continue;
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .trim()
        .toLowerCase();
      parts.push(`${label}: ${formatted}`);
    }

    if (parts.length === 0) {
      const fallback = formatDetailValue(obj);
      return fallback || "—";
    }
    return parts.join(" · ");
  } catch {
    return raw;
  }
}

function logsSignature(logs: LodgingActionLog[]) {
  if (logs.length === 0) return "0";
  return `${logs.length}:${logs[0]!.id}:${logs[logs.length - 1]!.id}`;
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

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-slate-500/50 via-border to-transparent" />
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <History className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
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
                          {actionLabel(log.action)}
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
