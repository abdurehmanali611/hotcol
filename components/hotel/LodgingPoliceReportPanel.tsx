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
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  fetchLodgingPoliceGuestReport,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { downloadLodgingPoliceReportPdf } from "@/lib/lodgingPoliceReportPdf";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  BedDouble,
  FileDown,
  IdCard,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";

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

function guestLabel(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "—";
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || "—";
}

function roomsLabel(stay: LodgingStay) {
  return (
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function idValue(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "—";
  if (g.isEthiopian !== false) return g.nationalId?.trim() || "—";
  return g.passportNumber?.trim() || g.nationalId?.trim() || "—";
}

export function LodgingPoliceReportPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [fromDate, setFromDate] = useState(todayYmd);
  const [toDate, setToDate] = useState(todayYmd);
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<"load" | "pdf" | null>(null);

  const load = useCallback(async () => {
    if (!fromDate || !toDate) {
      toast.error("Pick from and to dates");
      return;
    }
    if (toDate < fromDate) {
      toast.error("To date must be on or after from date");
      return;
    }
    setPending("load");
    try {
      const { from, to } = dayRangeToIso(fromDate, toDate);
      const rows = await fetchLodgingPoliceGuestReport(from, to);
      setStays(rows);
      setLoaded(true);
    } catch (e) {
      notifyApiFailure(e, "Could not load police guest report");
    } finally {
      setPending(null);
    }
  }, [fromDate, toDate]);

  // Re-run when Manager header refresh bumps — only if already loaded once.
  useEffect(() => {
    if (refreshKey > 0 && loaded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const stats = useMemo(() => {
    const inHouse = stays.filter((s) => s.status === "checked_in").length;
    const checkedOut = stays.filter((s) => s.status === "checked_out").length;
    const rooms = new Set(
      stays.flatMap(
        (s) =>
          s.rooms?.map((r) => r.room?.roomNumber).filter(Boolean) as string[],
      ),
    ).size;
    return { total: stays.length, inHouse, checkedOut, rooms };
  }, [stays]);

  const exportPdf = async () => {
    if (!loaded) {
      toast.message("Generate the report first");
      return;
    }
    setPending("pdf");
    try {
      await downloadLodgingPoliceReportPdf({
        from: fromDate,
        to: toDate,
        stays,
      });
      toast.success("Police report PDF downloaded");
    } catch (e) {
      notifyApiFailure(e, "Could not export PDF");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-500/25 bg-linear-to-br from-slate-500/[0.1] via-background to-emerald-500/[0.06] shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-slate-500/10 blur-3xl"
        />
        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-900 dark:text-slate-300">
              <Shield className="size-3.5" />
              Manager only
            </div>
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-500/15 text-slate-800 ring-1 ring-slate-500/25 dark:text-slate-300">
                <IdCard className="size-5" />
              </span>
              Police guest report
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[15px]">
              Build a confidential guest identity report for police and hotel
              security — name, ID/passport, nationality, phone, room, and stay
              window. Export a branded PDF with Apex footer.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Guests", value: String(stats.total), icon: Users },
              { label: "In house", value: String(stats.inHouse), icon: BedDouble },
              {
                label: "Checked out",
                value: String(stats.checkedOut),
                icon: IdCard,
              },
              { label: "Rooms", value: String(stats.rooms), icon: Shield },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-linear-to-br from-slate-500/10 to-transparent p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className="size-4 text-muted-foreground/80" />
                </div>
                <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
                  {loaded ? stat.value : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-border/70 shadow-md">
        <div className="h-1 bg-linear-to-r from-slate-600 via-emerald-500/50 to-transparent" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base tracking-tight">Report period</CardTitle>
          <CardDescription>
            Includes currently in-house guests who arrived by the end date, plus
            checked-out stays that overlapped the window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HotelFormSection title="Dates" description="From and to calendar days.">
            <div className="grid gap-3 sm:grid-cols-2">
              <HotelDayPicker
                label="From"
                value={fromDate}
                onChange={setFromDate}
                compact
                buttonClassName="bg-background"
              />
              <HotelDayPicker
                label="To"
                value={toDate}
                onChange={setToDate}
                compact
                buttonClassName="bg-background"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <PendingButton
                type="button"
                variant="outline"
                className="h-11 min-w-36 gap-2 rounded-xl"
                pending={pending === "load"}
                onClick={() => void load()}
              >
                {pending === "load" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Users className="size-4" />
                )}
                Generate report
              </PendingButton>
              <PendingButton
                type="button"
                className="h-11 min-w-40 gap-2 rounded-xl"
                pending={pending === "pdf"}
                disabled={!loaded}
                onClick={() => void exportPdf()}
              >
                <FileDown className="size-4" />
                Export PDF
              </PendingButton>
            </div>
          </HotelFormSection>
        </CardContent>
      </Card>

      {loaded ? (
        <Card className="overflow-hidden border-border/70 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Preview · {stays.length} stay{stays.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              Review before exporting. Identity fields match what Reception
              captured at check-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stays.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No guests in this window.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium">Guest</th>
                      <th className="px-3 py-2.5 font-medium">ID</th>
                      <th className="px-3 py-2.5 font-medium">Phone</th>
                      <th className="px-3 py-2.5 font-medium">Room</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stays.map((stay) => (
                      <tr key={stay.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{guestLabel(stay)}</p>
                          <p className="text-xs text-muted-foreground">
                            {stay.guest?.country || "—"}
                            {stay.guest?.sex ? ` · ${stay.guest.sex}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                          {idValue(stay)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {stay.guest?.phone || "—"}
                        </td>
                        <td className="px-3 py-2.5">{roomsLabel(stay)}</td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize font-normal",
                              stay.status === "checked_in"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                : "border-border bg-muted/50",
                            )}
                          >
                            {String(stay.status || "").replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {stay.voucherCode}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
