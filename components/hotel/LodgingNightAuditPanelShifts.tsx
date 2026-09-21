"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  closeLodgingBusinessDayApi,
  fetchLodgingBusinessDay,
  fetchLodgingBusinessDays,
  openLodgingBusinessDayApi,
  type LodgingBusinessDay,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { CalendarCheck, Lock, RefreshCw } from "lucide-react";
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

/** Extracted night-audit panel with shift from/to datetime. */
export function LodgingNightAuditPanel() {
  const [businessDate, setBusinessDate] = useState(todayYmd);
  const [label, setLabel] = useState("");
  const [fromDate, setFromDate] = useState(todayYmd);
  const [fromTime, setFromTime] = useState("06:00");
  const [toDate, setToDate] = useState(todayYmd);
  const [toTime, setToTime] = useState("14:00");
  const [day, setDay] = useState<LodgingBusinessDay | null>(null);
  const [shifts, setShifts] = useState<LodgingBusinessDay[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [row, list] = await Promise.all([
        fetchLodgingBusinessDay(businessDate),
        fetchLodgingBusinessDays(40),
      ]);
      setDay(row);
      setShifts(list);
    } catch (e) {
      notifyApiFailure(e, "Could not load business day");
    }
  }, [businessDate]);

  useEffect(() => {
    void load();
  }, [load]);

  let summary: Record<string, unknown> | null = null;
  try {
    summary = day?.summaryJson ? JSON.parse(day.summaryJson) : null;
  } catch {
    summary = null;
  }

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <div className="h-1 bg-linear-to-r from-amber-500/60 via-orange-500/45 to-rose-500/40" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Night audit — business day / shifts
        </CardTitle>
        <CardDescription>
          Open or close reception shifts with from/to date and time. Overlaps are
          allowed (e.g. morning, evening, overnight).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <HotelFormSection
          title="Shift window"
          description="Label is optional. From/to can span midnight."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <HotelDayPicker
              label="Business date (label day)"
              id="night-audit-business-date"
              value={businessDate}
              onChange={setBusinessDate}
              placeholder="Pick date"
              compact
              buttonClassName="bg-background"
            />
            <div className="space-y-1.5">
              <Label htmlFor="shift-label">Shift label</Label>
              <Input
                id="shift-label"
                className="h-10"
                placeholder="e.g. Morning"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="hidden lg:block" />
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
            <div className="hidden lg:block" />
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
                onChange={(e) => setToTime(e.target.value || "14:00")}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-1.5"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <PendingButton
              type="button"
              variant="secondary"
              className="h-10 gap-1.5"
              pending={pending === "open"}
              onClick={async () => {
                setPending("open");
                try {
                  await openLodgingBusinessDayApi({
                    businessDate,
                    label: label.trim() || undefined,
                    fromAt: toIsoLocal(fromDate, fromTime),
                    toAt: toIsoLocal(toDate, toTime),
                  });
                  await load();
                } catch (e) {
                  notifyApiFailure(e, "Could not open shift");
                } finally {
                  setPending(null);
                }
              }}
            >
              Open shift
            </PendingButton>
            <PendingButton
              type="button"
              className="h-10 gap-1.5"
              pending={pending === "close"}
              onClick={async () => {
                setPending("close");
                try {
                  const row = await closeLodgingBusinessDayApi({
                    businessDate,
                    label: label.trim() || undefined,
                    fromAt: toIsoLocal(fromDate, fromTime),
                    toAt: toIsoLocal(toDate, toTime),
                    id: day?.status === "open" ? day.id : undefined,
                  });
                  setDay(row);
                  toast.success("Shift closed");
                  await load();
                } catch (e) {
                  notifyApiFailure(e, "Could not close shift");
                } finally {
                  setPending(null);
                }
              }}
            >
              <Lock className="h-4 w-4" />
              Close shift
            </PendingButton>
          </div>
        </HotelFormSection>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={day?.status === "closed" ? "default" : "secondary"}>
            Selected day: {day?.status || "none"}
          </Badge>
          {day?.label ? (
            <Badge variant="outline">{day.label}</Badge>
          ) : null}
          {day?.fromAt && day?.toAt ? (
            <span className="text-xs text-muted-foreground">
              {new Date(day.fromAt).toLocaleString()} →{" "}
              {new Date(day.toAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {summary ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {Object.entries(summary).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-border/70 px-3 py-2"
              >
                <p className="text-xs text-muted-foreground capitalize">
                  {k.replace(/([A-Z])/g, " $1")}
                </p>
                <p className="font-medium tabular-nums">{String(v)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {shifts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent shifts</p>
            <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
              {shifts.slice(0, 12).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span>
                    {s.businessDate}
                    {s.label ? ` · ${s.label}` : ""}
                    {s.fromAt && s.toAt
                      ? ` · ${new Date(s.fromAt).toLocaleString()} → ${new Date(s.toAt).toLocaleString()}`
                      : ""}
                  </span>
                  <Badge
                    variant={s.status === "closed" ? "default" : "secondary"}
                  >
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
