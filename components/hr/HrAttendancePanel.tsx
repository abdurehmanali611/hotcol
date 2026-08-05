"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import { hrShiftFormSchema, parseHrConstraint } from "@/lib/hrConstraints";
import { notifyApiFailure } from "@/lib/actions";
import {
  clockHrAttendanceApi,
  createHrShiftApi,
  deleteHrShiftApi,
  type HrAttendance,
  type HrEmployee,
  type HrShift,
} from "@/lib/api/hr";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HrAttendancePanel({
  employees,
  attendance,
  shifts,
  timeFrom,
  timeTo,
  onTimeFromChange,
  onTimeToChange,
  onRefresh,
}: {
  employees: HrEmployee[];
  attendance: HrAttendance[];
  shifts: HrShift[];
  timeFrom: string;
  timeTo: string;
  onTimeFromChange: (value: string) => void;
  onTimeToChange: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const activeEmployees = employees.filter(
    (e) => e.status === "active" || e.status === "on_leave",
  );
  const [pending, setPending] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    employeeId: "",
    workDate: todayYmd(),
    department: "",
    startTime: "08:00",
    endTime: "17:00",
  });

  const attendanceColumns = useMemo<ColumnDef<HrAttendance>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      { accessorKey: "workDate", header: "Date" },
      {
        id: "clock",
        header: "Clock",
        cell: ({ row }) => {
          const inn = row.original.clockInAt
            ? new Date(row.original.clockInAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";
          const out = row.original.clockOutAt
            ? new Date(row.original.clockOutAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";
          return `${inn} → ${out}`;
        },
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
        cell: ({ row }) => row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      { accessorKey: "workDate", header: "Date" },
      {
        id: "window",
        header: "Shift",
        cell: ({ row }) =>
          `${row.original.startTime}–${row.original.endTime}${
            row.original.endTime < row.original.startTime ? " · overnight" : ""
          }`,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <HrConfirmAction
              destructive
              title="Delete this shift?"
              description="Only the scheduled shift is removed. Clock records stay."
              confirmLabel="Delete"
              trigger={
                <Button size="sm" variant="ghost">
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
        ),
      },
    ],
    [onRefresh],
  );

  return (
    <HrPanelShell>
      <HrSectionCard
        title="Clock and schedule"
        description="Clock in/out applies to today. Overnight shifts may end earlier than they start."
        icon={<ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
        accent="bg-linear-to-r from-sky-500 via-cyan-400 to-primary/70"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Employee</Label>
            <Select
              value={shiftForm.employeeId}
              onValueChange={(v) => setShiftForm((f) => ({ ...f, employeeId: v }))}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Shift date</Label>
            <Input
              type="date"
              className="h-10 bg-background"
              value={shiftForm.workDate}
              onChange={(e) =>
                setShiftForm((f) => ({ ...f, workDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start</Label>
            <Input
              type="time"
              className="h-10 bg-background"
              value={shiftForm.startTime}
              onChange={(e) =>
                setShiftForm((f) => ({ ...f, startTime: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>End</Label>
            <Input
              type="time"
              className="h-10 bg-background"
              value={shiftForm.endTime}
              onChange={(e) =>
                setShiftForm((f) => ({ ...f, endTime: e.target.value }))
              }
            />
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!shiftForm.employeeId) {
                toast.error("Select an employee");
                return;
              }
              try {
                await clockHrAttendanceApi({
                  employeeId: Number(shiftForm.employeeId),
                  action: "in",
                });
                toast.success("Clocked in");
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Clock in failed");
              }
            }}
          >
            Clock in
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!shiftForm.employeeId) {
                toast.error("Select an employee");
                return;
              }
              try {
                await clockHrAttendanceApi({
                  employeeId: Number(shiftForm.employeeId),
                  action: "out",
                });
                toast.success("Clocked out");
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Clock out failed");
              }
            }}
          >
            Clock out
          </Button>
          <div className="sm:col-span-2 lg:col-span-2">
            <PendingButton
              pending={pending}
              onClick={async () => {
                const parsed = parseHrConstraint(hrShiftFormSchema, {
                  ...shiftForm,
                  employeeId: Number(shiftForm.employeeId || 0),
                });
                if (!parsed.ok) {
                  toast.error(parsed.message);
                  return;
                }
                setPending(true);
                try {
                  await createHrShiftApi(parsed.data);
                  toast.success("Shift scheduled");
                  await onRefresh();
                } catch (e) {
                  notifyApiFailure(e, "Could not add shift");
                } finally {
                  setPending(false);
                }
              }}
            >
              Add shift
            </PendingButton>
          </div>
        </div>
      </HrSectionCard>

      <ListPanelFilterBar title="Review window">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input
              type="date"
              className="h-10 bg-background"
              value={timeFrom}
              onChange={(e) => onTimeFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input
              type="date"
              min={timeFrom}
              className="h-10 bg-background"
              value={timeTo}
              onChange={(e) => onTimeToChange(e.target.value)}
            />
          </div>
        </div>
      </ListPanelFilterBar>

      <div className="grid gap-6 xl:grid-cols-2">
        <HrSectionCard title="Attendance" description="Clock records in the selected window.">
          {attendance.length ? (
            <DataTable
              columns={attendanceColumns}
              data={attendance}
              searchPlaceholder="Search attendance…"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No attendance in this window"
              description="Clock someone in or widen the date range."
            />
          )}
        </HrSectionCard>
        <HrSectionCard title="Shifts" description="Scheduled coverage, including overnight rows.">
          {shifts.length ? (
            <DataTable
              columns={shiftColumns}
              data={shifts}
              searchPlaceholder="Search shifts…"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No shifts in this window"
              description="Add a shift or widen the date range."
            />
          )}
        </HrSectionCard>
      </div>
    </HrPanelShell>
  );
}
