"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { FilterChipGroup, ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
} from "@/components/hr/hrChrome";
import {
  HR_INCIDENT_KINDS,
  HR_INCIDENT_LABELS,
  hrIncidentFormSchema,
  parseHrConstraint,
} from "@/lib/hrConstraints";
import { notifyApiFailure } from "@/lib/actions";
import {
  createHrIncidentApi,
  deleteHrIncidentApi,
  type HrEmployee,
  type HrIncident,
} from "@/lib/api/hr";

type KindFilter = "all" | (typeof HR_INCIDENT_KINDS)[number];

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HrIncidentsPanel({
  employees,
  incidents,
  onRefresh,
}: {
  employees: HrEmployee[];
  incidents: HrIncident[];
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<KindFilter>("all");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    kind: "warning",
    title: "",
    detail: "",
    occurredYmd: todayYmd(),
  });

  const filtered = useMemo(
    () => incidents.filter((i) => (filter === "all" ? true : i.kind === filter)),
    [incidents, filter],
  );

  const columns = useMemo<ColumnDef<HrIncident>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      {
        accessorKey: "kind",
        header: "Type",
        cell: ({ row }) =>
          HR_INCIDENT_LABELS[row.original.kind as keyof typeof HR_INCIDENT_LABELS] ||
          row.original.kind,
      },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "occurredYmd", header: "Occurred" },
      {
        accessorKey: "detail",
        header: "Detail",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-muted-foreground">
            {row.original.detail || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <HrConfirmAction
              destructive
              title="Delete this incident?"
              description="This removes the note from the employee file."
              confirmLabel="Delete"
              trigger={
                <Button size="sm" variant="ghost">
                  Delete
                </Button>
              }
              onConfirm={async () => {
                try {
                  await deleteHrIncidentApi(row.original.id);
                  toast.success("Incident deleted");
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
        title="Record incident"
        description="Warnings, complaints, and commendations stay attached to the employee."
        icon={<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        accent="bg-linear-to-r from-amber-500 via-orange-400 to-rose-500/80"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.kind}
              onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HR_INCIDENT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {HR_INCIDENT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Occurred on</Label>
            <Input
              type="date"
              max={todayYmd()}
              className="h-10 bg-background"
              value={form.occurredYmd}
              onChange={(e) => setForm((f) => ({ ...f, occurredYmd: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              className="h-10 bg-background"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Detail</Label>
            <Textarea
              value={form.detail}
              onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
            />
          </div>
          <PendingButton
            pending={pending}
            onClick={async () => {
              const parsed = parseHrConstraint(hrIncidentFormSchema, {
                ...form,
                employeeId: Number(form.employeeId || 0),
              });
              if (!parsed.ok) {
                toast.error(parsed.message);
                return;
              }
              if (parsed.data.occurredYmd > todayYmd()) {
                toast.error("Incident date cannot be in the future");
                return;
              }
              setPending(true);
              try {
                await createHrIncidentApi(parsed.data);
                toast.success("Incident recorded");
                setForm({
                  employeeId: "",
                  kind: "warning",
                  title: "",
                  detail: "",
                  occurredYmd: todayYmd(),
                });
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Could not record incident");
              } finally {
                setPending(false);
              }
            }}
          >
            Save incident
          </PendingButton>
        </div>
      </HrSectionCard>

      <HrSectionCard title="Incident file" description="Filter by type and review the employee record.">
        <div className="space-y-4">
          <ListPanelFilterBar showClear={filter !== "all"} onClear={() => setFilter("all")}>
            <FilterChipGroup
              label="Type"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "All" },
                ...HR_INCIDENT_KINDS.map((k) => ({
                  id: k,
                  label: HR_INCIDENT_LABELS[k],
                })),
              ]}
            />
          </ListPanelFilterBar>
          {filtered.length ? (
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Search incidents…"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No incidents in this view"
              description="Record a warning, complaint, or commendation to start the file."
            />
          )}
        </div>
      </HrSectionCard>
    </HrPanelShell>
  );
}
