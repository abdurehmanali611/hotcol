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
  fetchLodgingStaysByDate,
  type LodgingActionLog,
  type LodgingDashboardStats,
  type LodgingGuest,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import { notifyApiFailure } from "@/lib/actions";

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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Card className="overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="h-1 bg-linear-to-r from-primary/60 via-sky-500/45 to-emerald-500/40" />
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <FileText className="h-5 w-5 text-primary" />
            Room management reports
          </CardTitle>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            Room nights and laundry payments for checked-out stays. Food &amp;
            drink charged to rooms is summarized for visibility — primary café
            payment reporting stays under Manager → Cafe &amp; Restaurant. In-house
            guests do not appear in payment totals until checkout.
          </CardDescription>
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
            title="Stay payments by date"
            description="Shows only checked-out guests in this date range (by checkout / departure date). Active stays have no payment figures here until checkout is done. Food & drink is awareness only — Café owns the formal F&B report."
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
                className="h-10"
                disabled={stays.length === 0}
                onClick={() => void exportStaysExcel()}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
            </div>

            {stays.length === 0 ? (
              <p className="pt-1 text-sm text-muted-foreground">
                Choose checkout dates and generate. Only checked-out stays with
                payment data appear.
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Room nights
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatEtb(paymentTotals.roomETB)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Laundry
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatEtb(paymentTotals.laundryETB)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Food & drink (on stay)
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatEtb(paymentTotals.foodDrinkETB)}
                    </p>
                    <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                      Awareness only — café report is the source of truth
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Other
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatEtb(paymentTotals.otherETB)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Stay total
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatEtb(paymentTotals.totalETB)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stays.length} stay{stays.length === 1 ? "" : "s"} · {from}{" "}
                      → {to}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/35 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 font-medium">Voucher</th>
                        <th className="px-3 py-2.5 font-medium">Guest</th>
                        <th className="px-3 py-2.5 font-medium">Rooms</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Checked in</th>
                        <th className="px-3 py-2.5 font-medium">Checked out</th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Room $
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
                    <tbody className="divide-y divide-border/60">
                      {stays.map((s) => {
                        const b = stayPaymentBreakdown(s);
                        return (
                          <tr key={s.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2.5 font-mono text-xs">
                              {s.voucherCode}
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-medium">
                                {guestLabel(s.guest)}
                              </p>
                              {s.guest?.phone ? (
                                <p className="text-xs text-muted-foreground">
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
                                variant="outline"
                                className="font-normal capitalize"
                              >
                                {s.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">
                              {formatStayDateTime(s.arrivalAt)}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">
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
                            <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                              {b.totalETB > 0
                                ? Number(b.totalETB).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </HotelFormSection>

          <HotelFormSection
            title="Past guests"
            description="Guest registry with latest check-in and check-out dates — search by name, phone, email, national ID, or passport."
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
                  className="h-9"
                  disabled={guests.length === 0}
                  onClick={() => void exportGuestsExcel()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>

            <div className="mt-3">
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
