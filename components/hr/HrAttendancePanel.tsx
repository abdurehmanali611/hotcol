"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Clock3,
  LogIn,
  LogOut,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { Badge } from "@/components/ui/badge";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelMultiDayPicker } from "@/components/hotel/HotelMultiDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import { hrShiftFormSchema, parseHrConstraint } from "@/lib/hrConstraints";
import {
  activeHrDepartments,
  type HrDepartmentSetting,
} from "@/lib/hrDepartments";
import { parseYmdToDate, toYmdLocal } from "@/lib/hotelDateYmd";
import { notifyApiFailure } from "@/lib/actions";
import {
  clockHrAttendanceApi,
  createHrShiftApi,
  deleteHrShiftApi,
  fetchHrDepartments,
  type HrAttendance,
  type HrEmployee,
  type HrShift,
} from "@/lib/api/hr";
import { cn } from "@/lib/utils";

const fieldClass = "min-w-0";
const triggerClass = "h-10 w-full min-w-0 justify-between bg-background";
const inputClass = "h-10 w-full min-w-0 bg-background";

const WEEKDAY_OPTIONS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 0, label: "Sun" },
] as const;

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysYmd(ymd: string, days: number) {
  const d = parseYmdToDate(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + days);
  return toYmdLocal(d);
}

/** Expand weekdays (0=Sun…6=Sat) within an inclusive YMD range. */
function ymdsForWeekdaysInRange(
  fromYmd: string,
  toYmd: string,
  weekdayIds: number[],
): string[] {
  const from = parseYmdToDate(fromYmd);
  const to = parseYmdToDate(toYmd);
  if (!from || !to || from > to || !weekdayIds.length) return [];
  const want = new Set(weekdayIds);
  const out: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    if (want.has(cursor.getDay())) out.push(toYmdLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function mergeYmds(a: string[], b: string[]) {
  return [...new Set([...a, ...b])].sort();
}

function formatClockTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HrAttendancePanel({
  employees,
  attendance,
  shifts,
  onRefresh,
  canManageTime = true,
}: {
  employees: HrEmployee[];
  attendance: HrAttendance[];
  shifts: HrShift[];
  onRefresh: () => Promise<void>;
  /** HR/Admin clock and schedule; Manager sees reports only. */
  canManageTime?: boolean;
}) {
  const clockEmployees = employees.filter((e) => e.status === "active");
  const rosterEmployees = employees.filter(
    (e) => e.status === "active" || e.status === "on_leave",
  );
  const [pending, setPending] = useState(false);
  const [clocking, setClocking] = useState<"in" | "out" | null>(null);
  const [clockEmployeeIds, setClockEmployeeIds] = useState<number[]>([]);
  const [clockSearch, setClockSearch] = useState("");
  const [shiftForm, setShiftForm] = useState({
    employeeId: "",
    workDates: [todayYmd()] as string[],
    department: "",
    startTime: "08:00",
    endTime: "17:00",
    weekdayIds: [] as number[],
    patternFrom: todayYmd(),
    patternTo: addDaysYmd(todayYmd(), 13),
  });
  const [hrDepartments, setHrDepartments] = useState<HrDepartmentSetting[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await fetchHrDepartments();
        if (cancelled) return;
        setHrDepartments(activeHrDepartments(rows));
      } catch (e) {
        notifyApiFailure(e, "Could not load departments");
      }
    };
    void load();
    const onChange = () => void load();
    window.addEventListener("hotcol-hr-departments", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hotcol-hr-departments", onChange);
    };
  }, []);

  const overnight =
    Boolean(shiftForm.startTime && shiftForm.endTime) &&
    shiftForm.endTime < shiftForm.startTime;

  const filteredClockEmployees = useMemo(() => {
    const q = clockSearch.trim().toLowerCase();
    if (!q) return clockEmployees;
    return clockEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q),
    );
  }, [clockEmployees, clockSearch]);

  const allFilteredSelected =
    filteredClockEmployees.length > 0 &&
    filteredClockEmployees.every((e) => clockEmployeeIds.includes(e.id));

  const selectedClockEmployees = useMemo(
    () => clockEmployees.filter((e) => clockEmployeeIds.includes(e.id)),
    [clockEmployees, clockEmployeeIds],
  );

  const toggleClockEmployee = (id: number, checked: boolean) => {
    setClockEmployeeIds((prev) =>
      checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((x) => x !== id),
    );
  };

  const toggleAllFiltered = (checked: boolean) => {
    const ids = filteredClockEmployees.map((e) => e.id);
    setClockEmployeeIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return [...next];
      }
      const drop = new Set(ids);
      return prev.filter((id) => !drop.has(id));
    });
  };

  const attendanceColumns = useMemo<ColumnDef<HrAttendance>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) =>
          row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      { accessorKey: "workDate", header: "Date" },
      {
        id: "clock",
        header: "Clock",
        cell: ({ row }) =>
          `${formatClockTime(row.original.clockInAt)} → ${formatClockTime(row.original.clockOutAt)}`,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <HrStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  const shiftColumns = useMemo<ColumnDef<HrShift>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) =>
          row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      { accessorKey: "workDate", header: "Date" },
      {
        id: "window",
        header: "Shift",
        cell: ({ row }) => (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-medium tabular-nums">
              {row.original.startTime}–{row.original.endTime}
            </span>
            {row.original.endTime < row.original.startTime ? (
              <Badge variant="secondary" className="font-normal">
                Overnight
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canManageTime ? (
            <div className="flex justify-end">
              <HrConfirmAction
                destructive
                title="Delete this shift?"
                description="Only the scheduled shift is removed. Clock records stay."
                confirmLabel="Delete"
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                }
                onConfirm={async () => {
                  try {
                    await deleteHrShiftApi(row.original.id);
                    toast.success("Shift deleted");
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Delete failed");
                  }
                }}
              />
            </div>
          ) : null,
      },
    ],
    [canManageTime, onRefresh],
  );

  async function handleClock(action: "in" | "out") {
    if (!clockEmployeeIds.length) {
      toast.error("Select at least one employee to clock");
      return;
    }
    setClocking(action);
    let ok = 0;
    let failed = 0;
    try {
      for (const employeeId of clockEmployeeIds) {
        try {
          await clockHrAttendanceApi({ employeeId, action });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      if (ok && !failed) {
        toast.success(
          action === "in"
            ? `Clocked in ${ok} employee${ok === 1 ? "" : "s"}`
            : `Clocked out ${ok} employee${ok === 1 ? "" : "s"}`,
        );
      } else if (ok && failed) {
        toast.warning(
          `${ok} succeeded, ${failed} failed. Check who still needs a punch.`,
        );
      } else {
        toast.error(action === "in" ? "Clock in failed" : "Clock out failed");
      }
      await onRefresh();
    } finally {
      setClocking(null);
    }
  }

  return (
    <HrPanelShell>
      {canManageTime ? (
        <HrSectionCard
          title="Clock and schedule"
          description="HR marks arrival and departure for today until attendance devices (e.g. ZKTeco) are connected. Scheduling plans coverage for a chosen date, including overnight shifts."
          icon={
            <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          }
          accent="bg-linear-to-r from-sky-500 via-cyan-400 to-primary/70"
        >
          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <HotelFormSection
              className="flex h-full flex-col"
              title="Record clock"
              description="Check one or more employees, then clock them in or out for today. Staff do not clock themselves here."
            >
              <div className={cn("flex flex-1 flex-col gap-3", fieldClass)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Employees</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="font-normal tabular-nums"
                    >
                      {clockEmployeeIds.length} selected
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={
                        !filteredClockEmployees.length || clocking !== null
                      }
                      onClick={() => toggleAllFiltered(!allFilteredSelected)}
                    >
                      {allFilteredSelected ? "Clear list" : "Select all"}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={clockSearch}
                    onChange={(e) => setClockSearch(e.target.value)}
                    placeholder="Search by name or department…"
                    className="h-10 bg-background pl-9"
                    disabled={clocking !== null}
                  />
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                  <ScrollArea className="h-full max-h-[min(280px,40vh)]">
                    <ul className="divide-y divide-border/60 p-1">
                      {filteredClockEmployees.length ? (
                        filteredClockEmployees.map((e) => {
                          const checked = clockEmployeeIds.includes(e.id);
                          const rowId = `hr-clock-emp-${e.id}`;
                          return (
                            <li key={e.id}>
                              <label
                                htmlFor={rowId}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                                  checked
                                    ? "bg-sky-500/8"
                                    : "hover:bg-muted/40",
                                  clocking !== null &&
                                    "pointer-events-none opacity-60",
                                )}
                              >
                                <Checkbox
                                  id={rowId}
                                  checked={checked}
                                  disabled={clocking !== null}
                                  onCheckedChange={(v) =>
                                    toggleClockEmployee(e.id, v === true)
                                  }
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">
                                    {e.fullName}
                                  </span>
                                  {e.department ? (
                                    <span className="block truncate text-xs text-muted-foreground">
                                      {e.department}
                                    </span>
                                  ) : null}
                                </span>
                                {checked ? (
                                  <Check className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                ) : null}
                              </label>
                            </li>
                          );
                        })
                      ) : (
                        <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {clockEmployees.length
                            ? "No employees match this search."
                            : "No active employees to clock (on-leave staff are excluded)."}
                        </li>
                      )}
                    </ul>
                  </ScrollArea>
                </div>

                {selectedClockEmployees.length ? (
                  <p className="text-sm text-muted-foreground">
                    Batch for{" "}
                    <span className="font-medium text-foreground">
                      {selectedClockEmployees.length === 1
                        ? selectedClockEmployees[0].fullName
                        : `${selectedClockEmployees.length} employees`}
                    </span>
                    {" · "}
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select employees above, then clock in or out.
                  </p>
                )}
              </div>

              <div className="mt-auto grid gap-3 pt-1 sm:grid-cols-2">
                <PendingButton
                  pending={clocking === "in"}
                  disabled={clocking === "out" || !clockEmployeeIds.length}
                  className="h-11 gap-2"
                  onClick={() => void handleClock("in")}
                >
                  <LogIn className="h-4 w-4" />
                  Clock in
                  {clockEmployeeIds.length > 1
                    ? ` (${clockEmployeeIds.length})`
                    : ""}
                </PendingButton>
                <PendingButton
                  pending={clocking === "out"}
                  disabled={clocking === "in" || !clockEmployeeIds.length}
                  variant="outline"
                  className="h-11 gap-2"
                  onClick={() => void handleClock("out")}
                >
                  <LogOut className="h-4 w-4" />
                  Clock out
                  {clockEmployeeIds.length > 1
                    ? ` (${clockEmployeeIds.length})`
                    : ""}
                </PendingButton>
              </div>
            </HotelFormSection>

            <HotelFormSection
              className="flex h-full flex-col"
              title="Schedule"
              description="Pick multiple calendar days and/or weekdays in a range. Department comes from the manager’s registry."
            >
              <div className="flex flex-1 flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={cn("space-y-1.5 sm:col-span-2", fieldClass)}>
                    <Label htmlFor="hr-shift-employee">Employee</Label>
                    <Select
                      value={shiftForm.employeeId}
                      onValueChange={(v) => {
                        const emp = rosterEmployees.find(
                          (e) => String(e.id) === v,
                        );
                        const deptCode =
                          hrDepartments.find(
                            (d) =>
                              d.label.toLowerCase() ===
                                (emp?.department || "").toLowerCase() ||
                              d.code === emp?.department,
                          )?.code || shiftForm.department;
                        setShiftForm((f) => ({
                          ...f,
                          employeeId: v,
                          department: deptCode || f.department,
                        }));
                      }}
                    >
                      <SelectTrigger
                        id="hr-shift-employee"
                        className={triggerClass}
                      >
                        <SelectValue placeholder="Who is scheduled?" />
                      </SelectTrigger>
                      <SelectContent>
                        {rosterEmployees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.fullName}
                            {e.status === "on_leave" ? " (on leave)" : ""}
                            {e.department ? ` · ${e.department}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={cn("space-y-1.5 sm:col-span-2", fieldClass)}>
                    <Label htmlFor="hr-shift-department">Department</Label>
                    <Select
                      value={shiftForm.department || undefined}
                      onValueChange={(v) =>
                        setShiftForm((f) => ({ ...f, department: v }))
                      }
                    >
                      <SelectTrigger
                        id="hr-shift-department"
                        className={triggerClass}
                      >
                        <SelectValue
                          placeholder={
                            hrDepartments.length
                              ? "Select department"
                              : "Register departments first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {hrDepartments.map((d) => (
                          <SelectItem key={d.code} value={d.code}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!hrDepartments.length ? (
                      <p className="text-xs text-muted-foreground">
                        Manager (hotel) or Admin (café) registers departments
                        under HR → Departments.
                      </p>
                    ) : null}
                  </div>

                  <div className={cn("space-y-1.5", fieldClass)}>
                    <Label htmlFor="hr-shift-start">Start</Label>
                    <Input
                      id="hr-shift-start"
                      type="time"
                      className={inputClass}
                      value={shiftForm.startTime}
                      onChange={(e) =>
                        setShiftForm((f) => ({
                          ...f,
                          startTime: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className={cn("space-y-1.5", fieldClass)}>
                    <Label htmlFor="hr-shift-end">End</Label>
                    <Input
                      id="hr-shift-end"
                      type="time"
                      className={inputClass}
                      value={shiftForm.endTime}
                      onChange={(e) =>
                        setShiftForm((f) => ({
                          ...f,
                          endTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-3">
                  <HotelMultiDayPicker
                    label="Shift dates"
                    values={shiftForm.workDates}
                    onChange={(workDates) =>
                      setShiftForm((f) => ({ ...f, workDates }))
                    }
                    placeholder="Pick one or more days"
                    buttonClassName={cn(inputClass, "justify-start font-normal")}
                  />
                  {shiftForm.workDates.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {shiftForm.workDates.map((ymd) => (
                        <Badge
                          key={ymd}
                          variant="secondary"
                          className="gap-1 font-normal tabular-nums"
                        >
                          {ymd}
                          <button
                            type="button"
                            className="rounded-sm opacity-70 hover:opacity-100"
                            aria-label={`Remove ${ymd}`}
                            onClick={() =>
                              setShiftForm((f) => ({
                                ...f,
                                workDates: f.workDates.filter((d) => d !== ymd),
                              }))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          setShiftForm((f) => ({ ...f, workDates: [] }))
                        }
                      >
                        Clear dates
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-3">
                  <div className="space-y-1.5">
                    <Label>Weekdays in range</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose weekdays and a from/to window, then apply to add
                      those days to the shift list.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const on = shiftForm.weekdayIds.includes(day.id);
                        return (
                          <Button
                            key={day.id}
                            type="button"
                            size="sm"
                            variant={on ? "default" : "outline"}
                            className="h-8 min-w-11 px-2"
                            onClick={() =>
                              setShiftForm((f) => ({
                                ...f,
                                weekdayIds: on
                                  ? f.weekdayIds.filter((id) => id !== day.id)
                                  : [...f.weekdayIds, day.id],
                              }))
                            }
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <HotelDayPicker
                      label="From"
                      value={shiftForm.patternFrom}
                      onChange={(patternFrom) =>
                        setShiftForm((f) => ({ ...f, patternFrom }))
                      }
                      compact
                      buttonClassName={cn(
                        inputClass,
                        "justify-start font-normal",
                      )}
                    />
                    <HotelDayPicker
                      label="To"
                      value={shiftForm.patternTo}
                      onChange={(patternTo) =>
                        setShiftForm((f) => ({ ...f, patternTo }))
                      }
                      disabledDays={(date) => {
                        const from = parseYmdToDate(shiftForm.patternFrom);
                        return from ? date < from : false;
                      }}
                      compact
                      buttonClassName={cn(
                        inputClass,
                        "justify-start font-normal",
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={!shiftForm.weekdayIds.length}
                    onClick={() => {
                      const added = ymdsForWeekdaysInRange(
                        shiftForm.patternFrom,
                        shiftForm.patternTo,
                        shiftForm.weekdayIds,
                      );
                      if (!added.length) {
                        toast.error("No matching weekdays in that range");
                        return;
                      }
                      setShiftForm((f) => ({
                        ...f,
                        workDates: mergeYmds(f.workDates, added),
                      }));
                      toast.success(
                        `Added ${added.length} day${added.length === 1 ? "" : "s"}`,
                      );
                    }}
                  >
                    Apply weekdays to dates
                  </Button>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="flex min-h-6 flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  <span className="tabular-nums">
                    {shiftForm.startTime || "—"} – {shiftForm.endTime || "—"}
                  </span>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {shiftForm.workDates.length} day
                    {shiftForm.workDates.length === 1 ? "" : "s"}
                  </Badge>
                  {overnight ? (
                    <Badge variant="secondary" className="font-normal">
                      Overnight
                    </Badge>
                  ) : null}
                </div>
                <PendingButton
                  pending={pending}
                  className="min-w-36"
                  onClick={async () => {
                    if (!shiftForm.workDates.length) {
                      toast.error("Select at least one shift date");
                      return;
                    }
                    if (!hrDepartments.length || !shiftForm.department) {
                      toast.error("Select a registered department");
                      return;
                    }
                    const sample = parseHrConstraint(hrShiftFormSchema, {
                      employeeId: Number(shiftForm.employeeId || 0),
                      workDate: shiftForm.workDates[0],
                      department: shiftForm.department,
                      startTime: shiftForm.startTime,
                      endTime: shiftForm.endTime,
                    });
                    if (!sample.ok) {
                      toast.error(sample.message);
                      return;
                    }
                    setPending(true);
                    let ok = 0;
                    let failed = 0;
                    try {
                      for (const workDate of shiftForm.workDates) {
                        try {
                          await createHrShiftApi({
                            employeeId: sample.data.employeeId,
                            workDate,
                            department: sample.data.department,
                            startTime: sample.data.startTime,
                            endTime: sample.data.endTime,
                          });
                          ok += 1;
                        } catch {
                          failed += 1;
                        }
                      }
                      if (ok && !failed) {
                        toast.success(
                          `Scheduled ${ok} shift${ok === 1 ? "" : "s"}`,
                        );
                      } else if (ok && failed) {
                        toast.warning(`${ok} created, ${failed} failed`);
                      } else {
                        toast.error("Could not add shifts");
                      }
                      await onRefresh();
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Add shift
                  {shiftForm.workDates.length > 1
                    ? `s (${shiftForm.workDates.length})`
                    : ""}
                </PendingButton>
              </div>
            </HotelFormSection>
          </div>
        </HrSectionCard>
      ) : (
        <HrSectionCard
          title="Attendance reports"
          description="Manager view of clock records and scheduled shifts. HR records punches and builds the roster."
          icon={
            <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          }
          accent="bg-linear-to-r from-sky-500 via-cyan-400 to-primary/70"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            Review all clock records and scheduled shifts below. Clock in/out and
            scheduling stay on the HR workspace until devices such as ZKTeco are
            connected.
          </p>
        </HrSectionCard>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <HrSectionCard
          title="Attendance"
          description="Times HR recorded (or devices will record later)."
          icon={<Clock3 className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
        >
          {attendance.length ? (
            <DataTable
              columns={attendanceColumns}
              data={attendance}
              searchPlaceholder="Search attendance…"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No attendance yet"
              description="Record a clock in for someone to see it here."
            />
          )}
        </HrSectionCard>
        <HrSectionCard
          title="Shifts"
          description="Scheduled coverage, including overnight rows."
          icon={
            <CalendarClock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          }
        >
          {shifts.length ? (
            <DataTable
              columns={shiftColumns}
              data={shifts}
              searchPlaceholder="Search shifts…"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No shifts yet"
              description="Add a shift schedule to build the roster."
            />
          )}
        </HrSectionCard>
      </div>
    </HrPanelShell>
  );
}
