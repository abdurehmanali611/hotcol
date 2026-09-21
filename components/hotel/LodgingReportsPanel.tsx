"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { LodgingActionHistoryPanel } from "@/components/hotel/LodgingActionHistoryPanel";
import { DataTable } from "@/app/StoreItems/data-table";
import { LodgingStatCardsGrid } from "@/components/hotel/LodgingStatCards";
import {
  fetchLodgingActionLogs,
  fetchLodgingDashboardStats,
  fetchLodgingGuests,
  fetchLodgingPerformanceReport,
  fetchLodgingStaysByDate,
  type LodgingActionLog,
  type LodgingDashboardStats,
  type LodgingGuest,
  type LodgingPerformanceReport,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import { downloadLodgingStayPaymentsPdf } from "@/lib/lodgingReportsPdf";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
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

function guestLabel(g: LodgingGuest | LodgingStay["guest"] | null | undefined) {
  if (!g) return "—";
  return `${g.firstName} ${g.lastName}`.trim() || "—";
}

function guestSearchHaystack(g: LodgingGuest): string {
  return [
    g.firstName,
    g.lastName,
    g.phone,
    g.phoneSecondary,
    g.email,
    g.nationalId,
    g.passportNumber,
    g.country,
    g.stateRegion,
    g.addressLine,
    g.lastCheckedInAt
      ? new Date(g.lastCheckedInAt).toLocaleString()
      : "",
    g.lastCheckedOutAt
      ? new Date(g.lastCheckedOutAt).toLocaleString()
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatStayDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

type StayPaymentBreakdown = {
  roomETB: number;
  laundryETB: number;
  foodDrinkETB: number;
  otherETB: number;
  totalETB: number;
};

function stayPaymentBreakdown(
  stay: LodgingStay,
): StayPaymentBreakdown {
  const lines = stay.bill?.lines ?? [];
  let roomETB = 0;
  let laundryETB = 0;
  let foodDrinkETB = 0;
  let otherETB = 0;
  for (const line of lines) {
    const amt = Number(line.amountETB) || 0;
    const kind = String(line.kind || "").toLowerCase();
    if (kind === "room") roomETB += amt;
    else if (kind === "laundry") laundryETB += amt;
    else if (kind === "food_drink") foodDrinkETB += amt;
    else otherETB += amt;
  }
  const fromLines = roomETB + laundryETB + foodDrinkETB + otherETB;
  const totalETB =
    fromLines > 0 ? fromLines : Number(stay.bill?.totalETB) || 0;
  return { roomETB, laundryETB, foodDrinkETB, otherETB, totalETB };
}

function formatEtb(n: number) {
  return `ETB ${Number(n || 0).toLocaleString()}`;
}

const guestMultiSearchFilter: FilterFn<LodgingGuest> = (
  row,
  _columnId,
  filterValue,
) => {
  const q = String(filterValue ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  return guestSearchHaystack(row.original).includes(q);
};

export function LodgingReportsPanel({
  showActivityTrail = true,
}: {
  /** Manager reports include recent actions; reception can omit if history is separate. */
  showActivityTrail?: boolean;
}) {
  const [stats, setStats] = useState<LodgingDashboardStats | null>(null);
  const [logs, setLogs] = useState<LodgingActionLog[]>([]);
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [from, setFrom] = useState(todayYmd);
  const [to, setTo] = useState(todayYmd);
  const [loading, setLoading] = useState(true);
  const [loadingStays, setLoadingStays] = useState(false);
  const [guests, setGuests] = useState<LodgingGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [perf, setPerf] = useState<LodgingPerformanceReport | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [st, lg] = await Promise.all([
        fetchLodgingDashboardStats(),
        showActivityTrail
          ? fetchLodgingActionLogs(80)
          : Promise.resolve([] as LodgingActionLog[]),
      ]);
      setStats(st);
      setLogs(lg);
    } catch (e) {
      notifyApiFailure(e, "Could not load room reports");
    } finally {
      setLoading(false);
    }
  }, [showActivityTrail]);

  const loadGuests = useCallback(async () => {
    setLoadingGuests(true);
    try {
      setGuests(await fetchLodgingGuests());
    } catch (e) {
      notifyApiFailure(e, "Could not load past guests");
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    void loadGuests();
  }, [loadGuests]);

  const guestColumns = useMemo<ColumnDef<LodgingGuest>[]>(
    () => [
      {
        id: "guest",
        accessorFn: (g) => guestLabel(g),
        header: "Guest",
        filterFn: guestMultiSearchFilter,
        cell: ({ row }) => (
          <span className="font-medium">{guestLabel(row.original)}</span>
        ),
      },
      {
        id: "phone",
        accessorFn: (g) => g.phone || "",
        header: "Phone",
        cell: ({ row }) => (
          <div className="text-xs tabular-nums">
            {row.original.phone || "—"}
            {row.original.phoneSecondary ? (
              <span className="block text-muted-foreground">
                {row.original.phoneSecondary}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.email || "—"}</span>
        ),
      },
      {
        id: "idDocs",
        accessorFn: (g) =>
          [g.nationalId, g.passportNumber].filter(Boolean).join(" "),
        header: "ID / Passport",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.nationalId || row.original.passportNumber || "—"}
          </span>
        ),
      },
      {
        id: "location",
        accessorFn: (g) =>
          [g.country, g.stateRegion].filter(Boolean).join(" · "),
        header: "Location",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {[row.original.country, row.original.stateRegion]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
        ),
      },
      {
        id: "checkedIn",
        accessorFn: (g) => g.lastCheckedInAt || "",
        header: "Checked in",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatStayDateTime(row.original.lastCheckedInAt)}
          </span>
        ),
      },
      {
        id: "checkedOut",
        accessorFn: (g) => g.lastCheckedOutAt || "",
        header: "Checked out",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatStayDateTime(row.original.lastCheckedOutAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const loadPerf = useCallback(async () => {
    setLoadingPerf(true);
    try {
      setPerf(await fetchLodgingPerformanceReport(from, to));
    } catch (e) {
      notifyApiFailure(e, "Could not load ADR / RevPAR");
      setPerf(null);
    } finally {
      setLoadingPerf(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadPerf();
  }, [loadPerf]);

  const loadStays = async () => {
    setLoadingStays(true);
    try {
      const range = dayRangeToIso(from, to);
      const rows = await fetchLodgingStaysByDate(range.from, range.to);
      // Never show in-house payment totals — only checked-out stays.
      setStays(rows.filter((s) => s.status === "checked_out"));
    } catch (e) {
      notifyApiFailure(e, "Could not load stays for range");
    } finally {
      setLoadingStays(false);
    }
  };

  const exportStaysExcel = async () => {
    if (stays.length === 0) return;
    const rows = stays.map((s) => {
      const b = stayPaymentBreakdown(s);
      return {
        Voucher: s.voucherCode,
        Guest: guestLabel(s.guest),
        Phone: s.guest?.phone || "",
        Status: s.status,
        "Checked in": new Date(s.arrivalAt).toLocaleString(),
        "Checked out": new Date(s.departureAt).toLocaleString(),
        Rooms:
          s.rooms
            ?.map((r) => r.room?.roomNumber)
            .filter(Boolean)
            .join(", ") || "",
        "Room nights ETB": b.roomETB,
        "Laundry ETB": b.laundryETB,
        "Food & drink ETB (on stay)": b.foodDrinkETB,
        "Other ETB": b.otherETB,
        "Bill total ETB": b.totalETB,
      };
    });
    const totals = rows.reduce(
      (acc, r) => {
        acc.room += Number(r["Room nights ETB"]) || 0;
        acc.laundry += Number(r["Laundry ETB"]) || 0;
        acc.food += Number(r["Food & drink ETB (on stay)"]) || 0;
        acc.other += Number(r["Other ETB"]) || 0;
        acc.total += Number(r["Bill total ETB"]) || 0;
        return acc;
      },
      { room: 0, laundry: 0, food: 0, other: 0, total: 0 },
    );
    rows.push({
      Voucher: "TOTAL",
      Guest: "",
      Phone: "",
      Status: "",
      "Checked in": "",
      "Checked out": "",
      Rooms: "",
      "Room nights ETB": totals.room,
      "Laundry ETB": totals.laundry,
      "Food & drink ETB (on stay)": totals.food,
      "Other ETB": totals.other,
      "Bill total ETB": totals.total,
    });
    await exportRowsExcel(`lodging-stays-${from}_to_${to}`, "Stays", rows);
  };

  const exportGuestsExcel = async () => {
    if (guests.length === 0) return;
    await exportRowsExcel(
      "past-guests",
      "Guests",
      guests.map((g) => ({
        Name: guestLabel(g),
        Phone: g.phone || "",
        "Phone 2": g.phoneSecondary || "",
        Email: g.email || "",
        "National ID": g.nationalId || "",
        Passport: g.passportNumber || "",
        Country: g.country || "",
        Region: g.stateRegion || "",
        "Checked in": formatStayDateTime(g.lastCheckedInAt),
        "Checked out": formatStayDateTime(g.lastCheckedOutAt),
      })),
    );
  };

  const paymentTotals = useMemo(() => {
    return stays.reduce(
      (acc, s) => {
        const b = stayPaymentBreakdown(s);
        acc.roomETB += b.roomETB;
        acc.laundryETB += b.laundryETB;
        acc.foodDrinkETB += b.foodDrinkETB;
        acc.otherETB += b.otherETB;
        acc.totalETB += b.totalETB;
        return acc;
      },
      {
        roomETB: 0,
        laundryETB: 0,
        foodDrinkETB: 0,
        otherETB: 0,
        totalETB: 0,
      },
    );
  }, [stays]);

  const exportStaysPdf = async () => {
    if (stays.length === 0) {
      toast.error("Generate stay payments first");
      return;
    }
    setExportingPdf(true);
    try {
      await downloadLodgingStayPaymentsPdf({
        from,
        to,
        stays,
        breakdown: stayPaymentBreakdown,
        totals: paymentTotals,
        perf,
      });
      toast.success("PDF downloaded");
    } catch (e) {
      notifyApiFailure(e, "Could not export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Card className="overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="h-1 bg-linear-to-r from-primary/60 via-sky-500/45 to-emerald-500/40" />
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
              <FileText className="h-5 w-5 text-primary" />
              Room management reports
            </CardTitle>
            <CardDescription className="max-w-3xl text-pretty leading-relaxed">
              Room nights and laundry for checked-out stays. Food &amp; drink on
              the folio is awareness only — café owns formal F&amp;B reporting.
              In-house guests appear in payment totals only after checkout.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <PendingButton
              type="button"
              variant="outline"
              className="h-9 gap-1.5"
              pending={exportingPdf}
              disabled={stays.length === 0}
              onClick={() => void exportStaysPdf()}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </PendingButton>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5"
              disabled={stays.length === 0}
              onClick={() => void exportStaysExcel()}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pb-8">
          <HotelFormSection
            title="Occupancy snapshot"
            description="Current room status counts across the property."
          >
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading snapshot…
              </div>
            ) : (
              <LodgingStatCardsGrid stats={stats} />
            )}
          </HotelFormSection>

          <HotelFormSection
            title="Report period"
            description="Shared date range for ADR / RevPAR and stay payment reports."
          >
            <div className="flex flex-wrap items-end gap-3">
              <HotelDayPicker label="From" value={from} onChange={setFrom} />
              <HotelDayPicker label="To" value={to} onChange={setTo} />
              <PendingButton
                type="button"
                variant="outline"
                className="h-10 gap-1.5"
                pending={loadingPerf}
                onClick={() => void loadPerf()}
              >
                <BarChart3 className="h-4 w-4" />
                Refresh KPIs
              </PendingButton>
              <PendingButton
                type="button"
                className="h-10"
                pending={loadingStays}
                onClick={() => void loadStays()}
              >
                Generate payments
              </PendingButton>
            </div>
          </HotelFormSection>

          <HotelFormSection
            title="ADR · RevPAR · occupancy"
            description="Period KPIs from room-night revenue vs inventory for the selected range."
          >
            {loadingPerf && !perf ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating…
              </div>
            ) : perf ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["Occupancy", `${perf.occupancyPercent}%`],
                      ["ADR", formatEtb(perf.adrETB)],
                      ["RevPAR", formatEtb(perf.revparETB)],
                      ["Room revenue", formatEtb(perf.roomRevenueETB)],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3.5"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {perf.roomNightsSold} room-nights sold ·{" "}
                  {perf.availableRoomNights} available · {perf.staysInHouse}{" "}
                  in-house · {perf.staysCheckedOut} checked out in range
                </p>
                <div
                  className={cn(
                    "grid gap-4",
                    perf.byRoomType.length > 0 && perf.bySource.length > 0
                      ? "lg:grid-cols-2"
                      : "",
                  )}
                >
                  {perf.byRoomType.length > 0 ? (
                    <ReportMiniTable
                      title="By room type"
                      headers={["Room type", "Nights", "Revenue", "ADR"]}
                      alignRight={[false, true, true, true]}
                      rows={perf.byRoomType.map((r) => [
                        r.roomType,
                        String(r.roomNightsSold),
                        formatEtb(r.roomRevenueETB),
                        formatEtb(r.adrETB),
                      ])}
                    />
                  ) : null}
                  {perf.bySource.length > 0 ? (
                    <ReportMiniTable
                      title="By source"
                      headers={["Source", "Stays", "Room revenue"]}
                      alignRight={[false, true, true]}
                      rows={perf.bySource.map((r) => [
                        r.source.replace(/_/g, " "),
                        String(r.stays),
                        formatEtb(r.roomRevenueETB),
                      ])}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No performance data for this range.
              </p>
            )}
          </HotelFormSection>

          <HotelFormSection
            title="Stay payments"
            description="Checked-out guests only (by checkout / departure date). Generate for the period above, then export PDF or Excel."
          >
            {stays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Choose dates and click Generate payments. Only checked-out stays
                with payment data appear.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {(
                    [
                      ["Room nights", paymentTotals.roomETB, false],
                      ["Laundry", paymentTotals.laundryETB, false],
                      ["Food & drink (on stay)", paymentTotals.foodDrinkETB, true],
                      ["Other", paymentTotals.otherETB, false],
                    ] as const
                  ).map(([label, value, awareness]) => (
                    <div
                      key={label}
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        awareness
                          ? "border-dashed border-amber-500/30 bg-amber-500/5"
                          : "border-border/70 bg-muted/20",
                      )}
                    >
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums">
                        {formatEtb(value)}
                      </p>
                      {awareness ? (
                        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                          Awareness only — café report is source of truth
                        </p>
                      ) : null}
                    </div>
                  ))}
                  <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Stay total
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatEtb(paymentTotals.totalETB)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {stays.length} stay{stays.length === 1 ? "" : "s"} · {from}{" "}
                      → {to}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/70 shadow-sm">
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="w-full min-w-[56rem] border-collapse text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border/70 bg-muted/90 text-left text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur supports-backdrop-filter:bg-muted/80">
                          <th className="px-3 py-2.5 font-medium">Voucher</th>
                          <th className="px-3 py-2.5 font-medium">Guest</th>
                          <th className="px-3 py-2.5 font-medium">Rooms</th>
                          <th className="px-3 py-2.5 font-medium">Status</th>
                          <th className="px-3 py-2.5 font-medium">Checked in</th>
                          <th className="px-3 py-2.5 font-medium">Checked out</th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Room
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Laundry
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            F&amp;B
                          </th>
                          <th className="px-3 py-2.5 font-medium text-right">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {stays.map((s, idx) => {
                          const b = stayPaymentBreakdown(s);
                          return (
                            <tr
                              key={s.id}
                              className={cn(
                                "transition-colors hover:bg-muted/30",
                                idx % 2 === 1 && "bg-muted/10",
                              )}
                            >
                              <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                                {s.voucherCode}
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-medium leading-tight">
                                  {guestLabel(s.guest)}
                                </p>
                                {s.guest?.phone ? (
                                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                                    {s.guest.phone}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 text-xs tabular-nums">
                                {s.rooms
                                  ?.map((r) => r.room?.roomNumber)
                                  .filter(Boolean)
                                  .join(", ") || "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                <Badge
                                  variant="secondary"
                                  className="font-normal capitalize"
                                >
                                  {String(s.status).replace(/_/g, " ")}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                                {formatStayDateTime(s.arrivalAt)}
                              </td>
                              <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                                {formatStayDateTime(s.departureAt)}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">
                                {b.roomETB > 0
                                  ? Number(b.roomETB).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">
                                {b.laundryETB > 0
                                  ? Number(b.laundryETB).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                                {b.foodDrinkETB > 0
                                  ? Number(b.foodDrinkETB).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                                {b.totalETB > 0
                                  ? Number(b.totalETB).toLocaleString()
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                          <td className="px-3 py-2.5" colSpan={6}>
                            Total ({stays.length} stay
                            {stays.length === 1 ? "" : "s"})
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {paymentTotals.roomETB.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {paymentTotals.laundryETB.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {paymentTotals.foodDrinkETB.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-primary">
                            {paymentTotals.totalETB.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PendingButton
                    type="button"
                    className="h-9 gap-1.5"
                    pending={exportingPdf}
                    onClick={() => void exportStaysPdf()}
                  >
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </PendingButton>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() => void exportStaysExcel()}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
            )}
          </HotelFormSection>

          <HotelFormSection
            title="Past guests"
            description="Guest registry with latest check-in and check-out — search by name, phone, email, national ID, or passport."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                {loadingGuests
                  ? "Loading guests…"
                  : `${guests.length} guest${guests.length === 1 ? "" : "s"} loaded`}
              </div>
              <div className="flex flex-wrap gap-2">
                <PendingButton
                  type="button"
                  variant="outline"
                  className="h-9"
                  pending={loadingGuests}
                  onClick={() => void loadGuests()}
                >
                  Refresh list
                </PendingButton>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-1.5"
                  disabled={guests.length === 0}
                  onClick={() => void exportGuestsExcel()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
              <DataTable
                columns={guestColumns}
                data={guests}
                getRowId={(row) => String(row.id)}
                searchColumnId="guest"
                searchPlaceholder="Search name, phone, email, ID, passport…"
                emptyMessage="No past guests yet for this property."
                pageSize={10}
              />
            </div>
          </HotelFormSection>
        </CardContent>
      </Card>

      {showActivityTrail ? (
        <LodgingActionHistoryPanel
          logs={logs}
          title="Recent actions"
          description="Audit trail of room, stay, bill, and CM activity — including what changed."
        />
      ) : null}
    </div>
  );
}

function ReportMiniTable({
  title,
  headers,
  rows,
  alignRight = [],
}: {
  title: string;
  headers: string[];
  rows: string[][];
  alignRight?: boolean[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <div className="border-b border-border/60 bg-muted/25 px-3 py-2">
        <p className="text-xs font-medium tracking-tight text-foreground">
          {title}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-3 py-2 font-medium",
                    alignRight[i] && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row, ri) => (
              <tr
                key={`${title}-${ri}`}
                className={cn(ri % 2 === 1 && "bg-muted/10")}
              >
                {row.map((cell, ci) => (
                  <td
                    key={`${title}-${ri}-${ci}`}
                    className={cn(
                      "px-3 py-2",
                      ci === 0 && title === "By source" && "capitalize",
                      ci > 0 && "tabular-nums",
                      alignRight[ci] && "text-right",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
