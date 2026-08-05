"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { FilterChipGroup, ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import { HrLeaveTypeEditor } from "@/components/hr/HrLeaveTypeEditor";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import {
  decideHrLeaveRequestApi,
  fetchHrLeaveTypes,
  type HrLeaveRequest,
} from "@/lib/api/hr";

type LeaveFilter = "all" | "pending" | "approved" | "rejected";

export function HrLeavePanel({
  leave,
  onRefresh,
}: {
  leave: HrLeaveRequest[];
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<LeaveFilter>("all");
  const [typeLabels, setTypeLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchHrLeaveTypes()
      .then((types) =>
        setTypeLabels(Object.fromEntries(types.map((t) => [t.code, t.label]))),
      )
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () => leave.filter((row) => (filter === "all" ? true : row.status === filter)),
    [leave, filter],
  );

  const columns = useMemo<ColumnDef<HrLeaveRequest>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      {
        accessorKey: "leaveType",
        header: "Type",
        cell: ({ row }) =>
          typeLabels[row.original.leaveType] || row.original.leaveType,
      },
      {
        id: "range",
        header: "Dates",
        cell: ({ row }) =>
          `${row.original.fromYmd} → ${row.original.toYmd} (${row.original.days}d)`,
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => row.original.reason || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <HrStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex justify-end gap-2">
              <HrConfirmAction
                title="Approve this leave?"
                description={`${row.original.employee?.fullName || "Employee"} · ${row.original.fromYmd} to ${row.original.toYmd}. Paid leave reduces the matching balance.`}
                confirmLabel="Approve"
                trigger={<Button size="sm">Approve</Button>}
                onConfirm={async () => {
                  try {
                    await decideHrLeaveRequestApi(row.original.id, true);
                    toast.success("Leave approved");
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Approve failed");
                  }
                }}
              />
              <HrConfirmAction
                destructive
                title="Reject this leave?"
                description="The request stays on file as rejected and does not change balances."
                confirmLabel="Reject"
                trigger={
                  <Button size="sm" variant="outline">
                    Reject
                  </Button>
                }
                onConfirm={async () => {
                  try {
                    await decideHrLeaveRequestApi(row.original.id, false);
                    toast.success("Leave rejected");
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Reject failed");
                  }
                }}
              />
            </div>
          ) : null,
      },
    ],
    [onRefresh, typeLabels],
  );

  return (
    <HrPanelShell>
      <HrSectionCard
        title="Leave types"
        description="These types appear when employees request leave from their own login. Default days become the starting balance for new employees."
        icon={<CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
        accent="bg-linear-to-r from-violet-500 via-fuchsia-400 to-primary/70"
      >
        <HrLeaveTypeEditor />
      </HrSectionCard>

      <HrSectionCard
        title="Leave queue"
        description="Employees submit requests from their own login. Approve or reject them here."
      >
        <div className="space-y-4">
          <ListPanelFilterBar
            showClear={filter !== "all"}
            onClear={() => setFilter("all")}
          >
            <FilterChipGroup
              label="Status"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
              ]}
            />
          </ListPanelFilterBar>
          {filtered.length ? (
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Search leave…"
              emptyMessage="No leave in this filter."
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No employee leave requests yet"
              description="Staff request leave after signing in with the username and password created on their employee record."
            />
          )}
        </div>
      </HrSectionCard>
    </HrPanelShell>
  );
}
