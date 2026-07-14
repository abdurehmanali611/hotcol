"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { FileText, Loader2, Printer } from "lucide-react";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  fetchLodgingActionLogs,
  fetchLodgingDashboardStats,
  fetchLodgingStaysByDate,
  type LodgingActionLog,
  type LodgingDashboardStats,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayRangeToIso(fromDay: string, toDay: string) {
  const from = new Date(`${fromDay}T00:00:00`);
  const to = new Date(`${toDay}T23:59:59.999`);
  return {
    from: Number.isNaN(from.getTime()) ? fromDay : from.toISOString(),
    to: Number.isNaN(to.getTime()) ? toDay : to.toISOString(),
  };
}

export function LodgingReportsPanel() {
  const [stats, setStats] = useState<LodgingDashboardStats | null>(null);
  const [logs, setLogs] = useState<LodgingActionLog[]>([]);
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [from, setFrom] = useState(todayYmd);
  const [to, setTo] = useState(todayYmd);
  const [loading, setLoading] = useState(true);
  const [loadingStays, setLoadingStays] = useState(false);

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [st, lg] = await Promise.all([
        fetchLodgingDashboardStats(),
        fetchLodgingActionLogs(80),
      ]);
      setStats(st);
      setLogs(lg);
    } catch (e) {
      notifyApiFailure(e, "Could not load room reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const loadStays = async () => {
    setLoadingStays(true);
    try {
      const range = dayRangeToIso(from, to);
      setStays(await fetchLodgingStaysByDate(range.from, range.to));
    } catch (e) {
      notifyApiFailure(e, "Could not load stays for range");
    } finally {
      setLoadingStays(false);
    }
  };

  const cards = [
    {
      label: "Vacant clean",
      value: stats?.vacantClean ?? 0,
      className: "border-emerald-500/25 from-emerald-500/8",
    },
    {
      label: "Vacant dirty",
      value: stats?.vacantDirty ?? 0,
      className: "border-amber-500/25 from-amber-500/8",
    },
    {
      label: "Occupied",
      value: stats?.occupied ?? 0,
      className: "border-sky-500/25 from-sky-500/8",
    },
    {
      label: "On maintenance",
      value: stats?.onMaintenance ?? 0,
      className: "border-rose-500/25 from-rose-500/8",
    },
    {
      label: "Open CM jobs",
      value: stats?.openCmAssignments ?? 0,
      className: "border-border/80 from-muted/30",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 print:max-w-none">
      <Card className="overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10 print:shadow-none">
        <div className="h-1 bg-linear-to-r from-primary/60 via-sky-500/45 to-emerald-500/40 print:hidden" />
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <FileText className="h-5 w-5 text-primary" />
            Room management reports
          </CardTitle>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            Live occupancy snapshot, stay activity by date range, and the lodging
            action trail — oriented like café operations reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pb-8">
          <HotelFormSection
            title="Occupancy snapshot"
            description="Current room status counts across the property."
          >
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading snapshot…
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {cards.map((c) => (
                  <div
                    key={c.label}
                    className={cn(
                      "rounded-xl border bg-linear-to-br to-card p-4 shadow-sm",
                      c.className,
                    )}
                  >
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </HotelFormSection>

          <HotelFormSection
            title="Stays by date"
            description="Pick a range, generate the stay list, then print if needed."
          >
            <div className="flex flex-wrap items-end gap-3">
              <HotelDayPicker label="From" value={from} onChange={setFrom} />
              <HotelDayPicker label="To" value={to} onChange={setTo} />
              <PendingButton
                type="button"
                className="h-10"
                pending={loadingStays}
                onClick={() => void loadStays()}
              >
                Generate
              </PendingButton>
              <Button
                type="button"
                variant="outline"
                className="h-10 print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>

            {stays.length === 0 ? (
              <p className="text-sm text-muted-foreground pt-1">
                Choose dates and generate to list stays in that window.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70 mt-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/35 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium">Voucher</th>
                      <th className="px-3 py-2.5 font-medium">Guest</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Arrival</th>
                      <th className="px-3 py-2.5 font-medium">Departure</th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Bill (ETB)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stays.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {s.voucherCode}
                        </td>
                        <td className="px-3 py-2.5">
                          {s.guest
                            ? `${s.guest.firstName} ${s.guest.lastName}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 capitalize">{s.status}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {new Date(s.arrivalAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {new Date(s.departureAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          {s.bill
                            ? Number(s.bill.totalETB).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HotelFormSection>

          <HotelFormSection
            title="Recent actions"
            description="Audit trail of room, stay, bill, and CM activity."
          >
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions logged yet.</p>
            ) : (
              <ul className="max-h-80 divide-y overflow-y-auto rounded-xl border border-border/70">
                {logs.map((log) => (
                  <li key={log.id} className="px-4 py-3 text-sm hover:bg-muted/15">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {log.actorRole || "—"} · {log.actorName || "—"} ·{" "}
                      {log.entityType || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </HotelFormSection>
        </CardContent>
      </Card>
    </div>
  );
}
