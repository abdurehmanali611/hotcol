"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
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
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { DataTable } from "@/app/StoreItems/data-table";
import {
  closeLodgingBusinessDayApi,
  createLodgingReceptionistsApi,
  deleteLodgingReceptionistApi,
  fetchLodgingBusinessDays,
  fetchLodgingReceptionists,
  type LodgingBusinessDay,
  type LodgingReceptionist,
} from "@/lib/api/lodgingRooms";
import { LODGING_ROOM_STATUS_LABELS } from "@/constants/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  BedDouble,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Lock,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadLodgingNightAuditPdf,
  type LodgingNightAuditPdfSummary,
} from "@/lib/lodgingNightAuditPdf";

const CLOSED_DAYS_PAGE_SIZE = 10;

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayStartIso(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toISOString();
}

function dayEndIso(ymd: string) {
  return new Date(`${ymd}T23:59:59.999`).toISOString();
}

type NightAuditSummary = LodgingNightAuditPdfSummary;

type StayReportRow = {
  id: string;
  rooms: string;
  guest: string;
  voucher: string;
  at: string;
  by: string;
};

type RoomSnapshotRow = {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  status: string;
  statusLabel: string;
};

type ReceptionDraft = {
  key: string;
  firstName: string;
  lastName: string;
  password: string;
};

function emptyDraft(): ReceptionDraft {
  return {
    key: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    firstName: "",
    lastName: "",
    password: "",
  };
}

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

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
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

function receptionistLabel(r: LodgingReceptionist) {
  return `${r.firstName} ${r.lastName}`.trim();
}

/** Night audit: reception users + date-range close scoped to a receptionist. */
export function LodgingNightAuditPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [fromDate, setFromDate] = useState(todayYmd);
  const [toDate, setToDate] = useState(todayYmd);
  const [receptionistId, setReceptionistId] = useState("");
  const [closedDay, setClosedDay] = useState<LodgingBusinessDay | null>(null);
  const [history, setHistory] = useState<LodgingBusinessDay[]>([]);
  const [receptionists, setReceptionists] = useState<LodgingReceptionist[]>([]);
  const [drafts, setDrafts] = useState<ReceptionDraft[]>([emptyDraft()]);
  const [pending, setPending] = useState<string | null>(null);
  const [exportingPdfId, setExportingPdfId] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(0);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchLodgingBusinessDays(100));
      setHistoryPage(0);
    } catch (e) {
      notifyApiFailure(e, "Could not load closed business days");
    }
  }, []);

  const loadReceptionists = useCallback(async () => {
    try {
      setReceptionists(await fetchLodgingReceptionists(true));
    } catch (e) {
      notifyApiFailure(e, "Could not load receptionists");
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void loadReceptionists();
  }, [loadHistory, loadReceptionists, refreshKey]);

  const activeReceptionists = useMemo(
    () => receptionists.filter((r) => r.isActive !== false),
    [receptionists],
  );

  const summary = useMemo(
    () => parseSummary(closedDay?.summaryJson),
    [closedDay?.summaryJson],
  );

  const closedHistory = useMemo(
    () => history.filter((s) => s.status === "closed"),
    [history],
  );

  const historyPageCount = Math.max(
    1,
    Math.ceil(closedHistory.length / CLOSED_DAYS_PAGE_SIZE),
  );
  const safeHistoryPage = Math.min(historyPage, historyPageCount - 1);
  const pagedClosedHistory = useMemo(() => {
    const start = safeHistoryPage * CLOSED_DAYS_PAGE_SIZE;
    return closedHistory.slice(start, start + CLOSED_DAYS_PAGE_SIZE);
  }, [closedHistory, safeHistoryPage]);
  const historyFrom =
    closedHistory.length === 0
      ? 0
      : safeHistoryPage * CLOSED_DAYS_PAGE_SIZE + 1;
  const historyTo = Math.min(
    (safeHistoryPage + 1) * CLOSED_DAYS_PAGE_SIZE,
    closedHistory.length,
  );

  const arrivalRows: StayReportRow[] = useMemo(
    () =>
      (summary?.arrivalRooms || []).map((r, i) => ({
        id: `arr-${i}-${r.voucherCode || r.rooms}`,
        rooms: r.rooms || "—",
        guest: r.guest || "Guest",
        voucher: r.voucherCode || "—",
        at: formatWhen(r.at),
        by: r.by || "—",
      })),
    [summary?.arrivalRooms],
  );

  const departureRows: StayReportRow[] = useMemo(
    () =>
      (summary?.departureRooms || []).map((r, i) => ({
        id: `dep-${i}-${r.voucherCode || r.rooms}`,
        rooms: r.rooms || "—",
        guest: r.guest || "Guest",
        voucher: r.voucherCode || "—",
        at: formatWhen(r.at),
        by: r.by || "—",
      })),
    [summary?.departureRooms],
  );

  const inHouseRows: StayReportRow[] = useMemo(
    () =>
      (summary?.inHouseRooms || []).map((r, i) => ({
        id: `in-${i}-${r.voucherCode || r.rooms}`,
        rooms: r.rooms || "—",
        guest: r.guest || "Guest",
        voucher: r.voucherCode || "—",
        at: formatWhen(r.arrivalAt),
        by: r.by || "—",
      })),
    [summary?.inHouseRooms],
  );

  const roomRows: RoomSnapshotRow[] = useMemo(
    () =>
      (summary?.rooms || []).map((r) => ({
        id: `rm-${r.roomNumber}`,
        roomNumber: r.roomNumber,
        roomType: r.roomType || "—",
        floor: r.floor != null && String(r.floor) !== "" ? String(r.floor) : "—",
        status: r.status,
        statusLabel:
          LODGING_ROOM_STATUS_LABELS[
            r.status as keyof typeof LODGING_ROOM_STATUS_LABELS
          ] ?? r.status.replace(/_/g, " "),
      })),
    [summary?.rooms],
  );

  const stayColumns = useMemo<ColumnDef<StayReportRow>[]>(
    () => [
      { accessorKey: "rooms", header: "Room(s)" },
      { accessorKey: "guest", header: "Guest" },
      { accessorKey: "voucher", header: "Voucher" },
      { accessorKey: "at", header: "When" },
      { accessorKey: "by", header: "Receptionist" },
    ],
    [],
  );

  const roomColumns = useMemo<ColumnDef<RoomSnapshotRow>[]>(
    () => [
      {
        accessorKey: "roomNumber",
        header: "Room",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.roomNumber}
          </span>
        ),
      },
      { accessorKey: "roomType", header: "Type" },
      { accessorKey: "floor", header: "Floor" },
      {
        accessorKey: "statusLabel",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "font-normal",
              roomStatusClass(row.original.status),
            )}
          >
            {row.original.statusLabel}
          </Badge>
        ),
      },
    ],
    [],
  );

  const saveReceptionists = async () => {
    const valid = drafts.filter(
      (d) => d.firstName.trim() && d.lastName.trim() && d.password.trim(),
    );
    if (valid.length === 0) {
      toast.error("Add at least one line with name and password");
      return;
    }
    setPending("save-receptionists");
    try {
      await createLodgingReceptionistsApi(
        valid.map((d) => ({
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
          password: d.password,
        })),
      );
      setDrafts([emptyDraft()]);
      await loadReceptionists();
    } catch (e) {
      notifyApiFailure(e, "Could not save receptionists");
    } finally {
      setPending(null);
    }
  };

  const closeBusinessDay = async () => {
    if (!receptionistId) {
      toast.error("Select a receptionist");
      return;
    }
    const fromAt = dayStartIso(fromDate);
    const toAt = dayEndIso(toDate);
    if (new Date(toAt) < new Date(fromAt)) {
      toast.error("To date must be on or after From date");
      return;
    }
    setPending("close");
    try {
      const row = await closeLodgingBusinessDayApi({
        businessDate: fromDate,
        fromAt,
        toAt,
        receptionistId: Number(receptionistId),
      });
      setClosedDay(row);
      await loadHistory();
    } catch (e) {
      notifyApiFailure(e, "Could not close business day");
    } finally {
      setPending(null);
    }
  };

  const exportClosedDayPdf = async (day: LodgingBusinessDay) => {
    const snap = parseSummary(day.summaryJson);
    if (!snap) {
      toast.error("This closed day has no report data to export");
      return;
    }
    setExportingPdfId(day.id);
    try {
      await downloadLodgingNightAuditPdf({
        businessDate: day.businessDate,
        fromAt: day.fromAt || snap.fromAt,
        toAt: day.toAt || snap.toAt,
        receptionistName: day.receptionistName || snap.receptionistName,
        closedBy: day.closedBy,
        closedAt: day.closedAt || snap.closedAt,
        summary: snap,
      });
      toast.success("Night audit PDF downloaded");
    } catch (e) {
      notifyApiFailure(e, "Could not export night audit PDF");
    } finally {
      setExportingPdfId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <div className="h-1 bg-linear-to-r from-sky-500/55 via-primary/40 to-emerald-500/40" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <UserRound className="h-5 w-5 text-primary" />
            Reception users
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Create named receptionists under the shared Reception username.
            Each person uses their own password at login so night audit can
            attribute work correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <HotelFormSection
            title="Add receptionists"
            description="First name, last name, and password per line — save the batch once."
          >
            <div className="space-y-3">
              {drafts.map((draft, idx) => (
                <div
                  key={draft.key}
                  className="grid gap-3 rounded-xl border border-border/70 bg-muted/15 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      First name
                    </Label>
                    <Input
                      value={draft.firstName}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) =>
                            d.key === draft.key
                              ? { ...d, firstName: e.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder="Abebe"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Last name
                    </Label>
                    <Input
                      value={draft.lastName}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) =>
                            d.key === draft.key
                              ? { ...d, lastName: e.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder="Kebede"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Password
                    </Label>
                    <Input
                      type="password"
                      value={draft.password}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) =>
                            d.key === draft.key
                              ? { ...d, password: e.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder="••••••••"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-10 text-muted-foreground hover:text-destructive"
                      disabled={drafts.length <= 1}
                      onClick={() =>
                        setDrafts((prev) =>
                          prev.length <= 1
                            ? prev
                            : prev.filter((d) => d.key !== draft.key),
                        )
                      }
                      aria-label={`Remove line ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
              <PendingButton
                type="button"
                className="h-10 min-w-36 gap-2"
                pending={pending === "save-receptionists"}
                onClick={() => void saveReceptionists()}
              >
                Save
              </PendingButton>
            </div>
          </HotelFormSection>

          {receptionists.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium tracking-tight">Saved users</p>
              <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
                {receptionists.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                  >
                    <span className="font-medium">
                      {receptionistLabel(r)}
                      {!r.isActive ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (inactive)
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-destructive hover:text-destructive"
                      disabled={Boolean(pending)}
                      onClick={() => {
                        void (async () => {
                          setPending(`del-${r.id}`);
                          try {
                            await deleteLodgingReceptionistApi(r.id);
                            if (receptionistId === String(r.id)) {
                              setReceptionistId("");
                            }
                            await loadReceptionists();
                          } catch (e) {
                            notifyApiFailure(e, "Could not delete");
                          } finally {
                            setPending(null);
                          }
                        })();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <div className="h-1 bg-linear-to-r from-amber-500/60 via-orange-500/45 to-rose-500/40" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Night audit — close business day
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Choose a date range and receptionist. The report includes that
            person&apos;s arrivals, departures, and in-house stays for the
            selected days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <HotelFormSection
            title="Period & receptionist"
            description="Dates only — the window is the full calendar days from start through end."
          >
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
              <HotelDayPicker
                label="From date"
                value={fromDate}
                onChange={setFromDate}
                compact
                buttonClassName="h-11 bg-background"
              />
              <HotelDayPicker
                label="To date"
                value={toDate}
                onChange={setToDate}
                compact
                buttonClassName="h-11 bg-background"
              />
              <div className="min-w-0 space-y-1.5">
                <Label className="text-sm">Receptionist</Label>
                <Select
                  value={receptionistId || undefined}
                  onValueChange={setReceptionistId}
                >
                  <SelectTrigger className="h-11 w-full bg-background py-0 data-[size=default]:h-11">
                    <SelectValue placeholder="Select receptionist" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeReceptionists.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {receptionistLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <PendingButton
                type="button"
                className="h-11 min-w-48 gap-2 rounded-xl"
                pending={pending === "close"}
                disabled={!receptionistId || activeReceptionists.length === 0}
                onClick={() => void closeBusinessDay()}
              >
                <Lock className="h-4 w-4" />
                Close business day
              </PendingButton>
            </div>
          </HotelFormSection>
        </CardContent>
      </Card>

      {summary && closedDay ? (
        <Card className="overflow-hidden border-border/70 shadow-md">
          <div className="h-1 bg-linear-to-r from-emerald-500/55 via-sky-500/40 to-amber-500/35" />
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg tracking-tight">
                Receptionist room report
              </CardTitle>
              <CardDescription>
                {summary.fromAt && summary.toAt
                  ? `${new Date(summary.fromAt).toLocaleDateString()} → ${new Date(summary.toAt).toLocaleDateString()}`
                  : "Closed period snapshot"}
                {summary.receptionistName || closedDay.receptionistName
                  ? ` · ${summary.receptionistName || closedDay.receptionistName}`
                  : ""}
                {closedDay.closedBy
                  ? ` · closed by ${closedDay.closedBy}`
                  : ""}
              </CardDescription>
            </div>
            <PendingButton
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-1.5 rounded-xl"
              pending={exportingPdfId === closedDay.id}
              onClick={() => void exportClosedDayPdf(closedDay)}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </PendingButton>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  {Object.entries(summary.roomsByStatus).map(
                    ([status, count]) => (
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
                    ),
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium tracking-tight">
                Arrivals in period
              </p>
              <DataTable
                columns={stayColumns}
                data={arrivalRows}
                getRowId={(r) => r.id}
                searchPlaceholder="Search arrivals…"
                emptyMessage="No arrivals for this receptionist in the date range."
                pageSize={8}
                hideToolbar={arrivalRows.length === 0}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium tracking-tight">
                Departures in period
              </p>
              <DataTable
                columns={stayColumns}
                data={departureRows}
                getRowId={(r) => r.id}
                searchPlaceholder="Search departures…"
                emptyMessage="No departures for this receptionist in the date range."
                pageSize={8}
                hideToolbar={departureRows.length === 0}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium tracking-tight">In-house now</p>
              <DataTable
                columns={stayColumns}
                data={inHouseRows}
                getRowId={(r) => r.id}
                searchPlaceholder="Search in-house…"
                emptyMessage="No in-house stays for this receptionist."
                pageSize={8}
                hideToolbar={inHouseRows.length === 0}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium tracking-tight">
                All rooms snapshot
              </p>
              <DataTable
                columns={roomColumns}
                data={roomRows}
                getRowId={(r) => r.id}
                searchPlaceholder="Search rooms…"
                emptyMessage="No rooms in inventory."
                pageSize={10}
                hideToolbar={roomRows.length === 0}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {closedHistory.length > 0 ? (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Recent closed days
            </CardTitle>
            <CardDescription>
              Open a past close to review its report, or export the PDF directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
              {pagedClosedHistory.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 px-2 py-1.5 transition-colors",
                    closedDay?.id === s.id && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/40"
                    onClick={() => setClosedDay(s)}
                  >
                    <span className="font-medium">
                      {s.fromAt && s.toAt
                        ? `${new Date(s.fromAt).toLocaleDateString()} → ${new Date(s.toAt).toLocaleDateString()}`
                        : s.businessDate}
                    </span>
                    {s.receptionistName ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {s.receptionistName}
                      </span>
                    ) : null}
                  </button>
                  <Badge variant="secondary" className="capitalize shrink-0">
                    {s.status}
                  </Badge>
                  <PendingButton
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 gap-1.5 rounded-lg"
                    pending={exportingPdfId === s.id}
                    onClick={() => void exportClosedDayPdf(s)}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    PDF
                  </PendingButton>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground tabular-nums">
                Showing {historyFrom}–{historyTo} of {closedHistory.length}
                {historyPageCount > 1
                  ? ` · Page ${safeHistoryPage + 1} of ${historyPageCount}`
                  : ""}
              </p>
              {historyPageCount > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    disabled={safeHistoryPage <= 0}
                    onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    disabled={safeHistoryPage >= historyPageCount - 1}
                    onClick={() =>
                      setHistoryPage((p) =>
                        Math.min(historyPageCount - 1, p + 1),
                      )
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
