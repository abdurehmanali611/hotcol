"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  closeLodgingBusinessDayApi,
  fetchLodgingBusinessDays,
  type LodgingBusinessDay,
} from "@/lib/api/lodgingRooms";
import { LODGING_ROOM_STATUS_LABELS } from "@/constants/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { BedDouble, CalendarCheck, Lock, LogIn, LogOut, Users } from "lucide-react";
import { toast } from "sonner";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toIsoLocal(ymd: string, hm: string) {
  const d = new Date(`${ymd}T${hm || "00:00"}:00`);
  return d.toISOString();
}

type NightAuditSummary = {
  arrivals?: number;
  departures?: number;
  inHouse?: number;
  noShows?: number;
  outstandingBalanceETB?: number;
  fromAt?: string;
  toAt?: string;
  closedAt?: string;
  roomsByStatus?: Record<string, number>;
  rooms?: Array<{
    roomNumber: string;
    roomType?: string;
    floor?: string | number | null;
    status: string;
  }>;
  arrivalRooms?: Array<{
    voucherCode?: string;
    guest?: string;
    rooms?: string;
    at?: string;
  }>;
  departureRooms?: Array<{
    voucherCode?: string;
    guest?: string;
    rooms?: string;
    at?: string;
  }>;
  inHouseRooms?: Array<{
    voucherCode?: string;
    guest?: string;
    rooms?: string;
    arrivalAt?: string;
  }>;
};

function parseSummary(raw: string | null | undefined): NightAuditSummary | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NightAuditSummary;
  } catch {
    return null;
  }
}

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function roomStatusClass(status: string) {
  switch (status) {
    case "vacant_clean":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "vacant_dirty":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300";
    case "occupied":
      return "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300";
    case "on_maintenance":
      return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300";
    case "inspected":
      return "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** Night audit: close a from→to business window and review room reports. */
export function LodgingNightAuditPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [fromDate, setFromDate] = useState(todayYmd);
  const [fromTime, setFromTime] = useState("06:00");
  const [toDate, setToDate] = useState(todayYmd);
  const [toTime, setToTime] = useState(nowHm);
  const [closedDay, setClosedDay] = useState<LodgingBusinessDay | null>(null);
  const [history, setHistory] = useState<LodgingBusinessDay[]>([]);
  const [pending, setPending] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchLodgingBusinessDays(40));
    } catch (e) {
      notifyApiFailure(e, "Could not load closed business days");
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, refreshKey]);

  const summary = useMemo(
    () => parseSummary(closedDay?.summaryJson),
    [closedDay?.summaryJson],
  );

  const closeBusinessDay = async () => {
    const fromAt = toIsoLocal(fromDate, fromTime);
    const toAt = toIsoLocal(toDate, toTime);
    if (new Date(toAt) <= new Date(fromAt)) {
      toast.error("To date/time must be after From");
      return;
    }
    setPending(true);
    try {
      const row = await closeLodgingBusinessDayApi({ fromAt, toAt });
      setClosedDay(row);
      await loadHistory();
    } catch (e) {
      notifyApiFailure(e, "Could not close business day");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <div className="h-1 bg-linear-to-r from-amber-500/60 via-orange-500/45 to-rose-500/40" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Night audit — close business day
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Set the period with from and to date/time, then close the business
            day. The snapshot shows arrivals, departures, in-house guests, and
            every room&apos;s status for that window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <HotelFormSection
            title="Period"
            description="From and to can span midnight. Closing builds the room report for this window."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <HotelDayPicker
                label="From date"
                value={fromDate}
                onChange={setFromDate}
                compact
                buttonClassName="bg-background"
              />
              <div className="space-y-1.5">
                <Label htmlFor="from-time">From time</Label>
                <Input
                  id="from-time"
                  type="time"
                  className="h-10"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value || nowHm())}
                />
              </div>
              <HotelDayPicker
                label="To date"
                value={toDate}
                onChange={setToDate}
                compact
                buttonClassName="bg-background"
              />
              <div className="space-y-1.5">
                <Label htmlFor="to-time">To time</Label>
                <Input
                  id="to-time"
                  type="time"
                  className="h-10"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value || nowHm())}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <PendingButton
                type="button"
                className="h-11 min-w-48 gap-2 rounded-xl"
                pending={pending}
                onClick={() => void closeBusinessDay()}
              >
                <Lock className="h-4 w-4" />
                Close business day
              </PendingButton>
            </div>
          </HotelFormSection>
        </CardContent>
      </Card>

      {summary ? (
        <Card className="overflow-hidden border-border/70 shadow-md">
          <div className="h-1 bg-linear-to-r from-emerald-500/55 via-sky-500/40 to-amber-500/35" />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg tracking-tight">
              Period room report
            </CardTitle>
            <CardDescription>
              {summary.fromAt && summary.toAt
                ? `${new Date(summary.fromAt).toLocaleString()} → ${new Date(summary.toAt).toLocaleString()}`
                : "Closed period snapshot"}
              {closedDay?.closedBy
                ? ` · closed by ${closedDay.closedBy}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  label: "Arrivals",
                  value: summary.arrivals ?? 0,
                  icon: LogIn,
                },
                {
                  label: "Departures",
                  value: summary.departures ?? 0,
                  icon: LogOut,
                },
                {
                  label: "In house",
                  value: summary.inHouse ?? 0,
                  icon: Users,
                },
                {
                  label: "No-shows",
                  value: summary.noShows ?? 0,
                  icon: CalendarCheck,
                },
                {
                  label: "Open folios",
                  value: formatMoney(Number(summary.outstandingBalanceETB || 0)),
                  icon: BedDouble,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </p>
                    <stat.icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {summary.roomsByStatus &&
            Object.keys(summary.roomsByStatus).length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium tracking-tight">
                  Rooms by status
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.roomsByStatus).map(([status, count]) => (
                    <Badge
                      key={status}
                      variant="outline"
                      className={cn("font-normal", roomStatusClass(status))}
                    >
                      {LODGING_ROOM_STATUS_LABELS[
                        status as keyof typeof LODGING_ROOM_STATUS_LABELS
                      ] ?? status.replace(/_/g, " ")}
                      : {count}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <ReportList
                title="Arrivals in period"
                empty="No arrivals in this window."
                rows={(summary.arrivalRooms || []).map((r) => ({
                  primary: r.rooms || "—",
                  secondary: `${r.guest || "Guest"}${r.voucherCode ? ` · ${r.voucherCode}` : ""}`,
                  meta: r.at ? new Date(r.at).toLocaleString() : "",
                }))}
              />
              <ReportList
                title="Departures in period"
                empty="No departures in this window."
                rows={(summary.departureRooms || []).map((r) => ({
                  primary: r.rooms || "—",
                  secondary: `${r.guest || "Guest"}${r.voucherCode ? ` · ${r.voucherCode}` : ""}`,
                  meta: r.at ? new Date(r.at).toLocaleString() : "",
                }))}
              />
              <ReportList
                title="In-house now"
                empty="No in-house stays."
                rows={(summary.inHouseRooms || []).map((r) => ({
                  primary: r.rooms || "—",
                  secondary: `${r.guest || "Guest"}${r.voucherCode ? ` · ${r.voucherCode}` : ""}`,
                  meta: r.arrivalAt
                    ? `In since ${new Date(r.arrivalAt).toLocaleString()}`
                    : "",
                }))}
              />
            </div>

            {summary.rooms && summary.rooms.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium tracking-tight">
                  All rooms snapshot
                </p>
                <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
                  {summary.rooms.map((r) => (
                    <li
                      key={r.roomNumber}
                      className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                    >
                      <span className="font-medium tabular-nums">
                        Room {r.roomNumber}
                        <span className="font-normal text-muted-foreground">
                          {r.roomType ? ` · ${r.roomType}` : ""}
                          {r.floor != null && String(r.floor) !== ""
                            ? ` · Fl ${r.floor}`
                            : ""}
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal",
                          roomStatusClass(r.status),
                        )}
                      >
                        {LODGING_ROOM_STATUS_LABELS[
                          r.status as keyof typeof LODGING_ROOM_STATUS_LABELS
                        ] ?? r.status.replace(/_/g, " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {history.length > 0 ? (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Recent closed days
            </CardTitle>
            <CardDescription>
              Select a past close to reopen its room report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
              {history
                .filter((s) => s.status === "closed")
                .slice(0, 12)
                .map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-wrap items-center justify-between gap-2 px-3.5 py-3 text-left text-sm transition-colors hover:bg-muted/40",
                        closedDay?.id === s.id && "bg-primary/5",
                      )}
                      onClick={() => setClosedDay(s)}
                    >
                      <span>
                        {s.fromAt && s.toAt
                          ? `${new Date(s.fromAt).toLocaleString()} → ${new Date(s.toAt).toLocaleString()}`
                          : s.businessDate}
                      </span>
                      <Badge variant="secondary" className="capitalize">
                        {s.status}
                      </Badge>
                    </button>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ReportList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ primary: string; secondary: string; meta: string }>;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/70 bg-card/50 p-3.5">
      <p className="text-sm font-medium tracking-tight">{title}</p>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <li
              key={`${row.primary}-${idx}`}
              className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2"
            >
              <p className="text-sm font-medium tabular-nums">{row.primary}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.secondary}
              </p>
              {row.meta ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {row.meta}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
