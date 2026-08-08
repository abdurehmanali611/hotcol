"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  FileWarning,
  Plus,
} from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { FilterChipGroup, ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import { HrIncidentTypeEditor } from "@/components/hr/HrIncidentTypeEditor";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
} from "@/components/hr/hrChrome";
import { hrCapabilities } from "@/lib/hrCapabilities";
import { hrIncidentFormSchema, parseHrConstraint } from "@/lib/hrConstraints";
import {
  activeHrIncidentTypes,
  findIncidentType,
  formatIncidentPayImpact,
  hrIncidentTypeChoices,
  incidentTypeLabel,
  incidentTypeSettingFromApi,
  isAdHocOtherSelection,
  type HrIncidentTypeSetting,
} from "@/lib/hrIncidentTypes";
import { formatETB } from "@/lib/subscriptionModules";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  createHrIncidentApi,
  deleteHrIncidentApi,
  fetchHrIncidentTypes,
  type HrEmployee,
  type HrIncident,
} from "@/lib/api/hr";

type KindFilter = "all" | string;

const triggerClass = "h-10 w-full min-w-0 justify-between bg-background";
const inputClass = "h-10 w-full min-w-0 bg-background";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyForm(kind = "", deduct = false, amount = 0) {
  return {
    employeeId: "",
    kind,
    title: "",
    detail: "",
    occurredYmd: todayYmd(),
    salaryDeduct: deduct,
    percentOfSalary: amount,
    percentText: amount ? String(amount) : "",
  };
}

export function HrIncidentsPanel({
  employees,
  incidents,
  actorRole,
  onRefresh,
}: {
  employees: HrEmployee[];
  incidents: HrIncident[];
  actorRole: string;
  onRefresh: () => Promise<void>;
}) {
  const caps = hrCapabilities(actorRole);
  const [filter, setFilter] = useState<KindFilter>("all");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [managerTypes, setManagerTypes] = useState<HrIncidentTypeSetting[]>(
    [],
  );
  const typeChoices = useMemo(
    () => hrIncidentTypeChoices(managerTypes),
    [managerTypes],
  );
  const [form, setForm] = useState(() =>
    emptyForm(""),
  );

  const adHocOther = isAdHocOtherSelection(form.kind, managerTypes);
  const selectedType = findIncidentType(form.kind, managerTypes);
  const selectedEmployee = employees.find(
    (e) => String(e.id) === form.employeeId,
  );
  const payLabel = formatIncidentPayImpact(
    form.salaryDeduct,
    form.percentOfSalary,
  );
  const hasPayImpact = form.percentOfSalary > 0;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await fetchHrIncidentTypes();
        if (cancelled) return;
        const types = activeHrIncidentTypes(
          rows.map(incidentTypeSettingFromApi),
        );
        setManagerTypes(types);
        const choices = hrIncidentTypeChoices(types);
        setForm((f) => {
          const kindStillValid =
            f.kind && choices.some((t) => t.code === f.kind);
          if (kindStillValid) return f;
          const kind = choices[0]?.code || "";
          if (isAdHocOtherSelection(kind, types)) {
            return { ...f, kind };
          }
          const preset = findIncidentType(kind, types);
          const pct = preset?.percentOfSalary ?? 0;
          return {
            ...f,
            kind,
            salaryDeduct: preset?.deduct ?? false,
            percentOfSalary: pct,
            percentText: pct ? String(pct) : "",
          };
        });
      } catch (e) {
        notifyApiFailure(e, "Could not load incident types");
      }
    };
    void load();
    const onChange = () => void load();
    window.addEventListener("hotcol-hr-incident-types", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hotcol-hr-incident-types", onChange);
    };
  }, []);

  const onKindChange = (kind: string) => {
    if (isAdHocOtherSelection(kind, managerTypes)) {
      setForm((f) => ({
        ...f,
        kind,
        salaryDeduct: false,
        percentOfSalary: 0,
        percentText: "",
      }));
      return;
    }
    const preset = findIncidentType(kind, managerTypes);
    const pct = preset?.percentOfSalary ?? 0;
    setForm((f) => ({
      ...f,
      kind,
      salaryDeduct: preset?.deduct ?? false,
      percentOfSalary: pct,
      percentText: pct ? String(pct) : "",
    }));
  };

  const openCreate = () => {
    const first = typeChoices[0];
    const preset = first
      ? findIncidentType(first.code, managerTypes)
      : null;
    setForm(
      emptyForm(
        first?.code || "",
        preset?.deduct ?? false,
        preset?.percentOfSalary ?? 0,
      ),
    );
    setOpen(true);
  };

  const filtered = useMemo(
    () => incidents.filter((i) => (filter === "all" ? true : i.kind === filter)),
    [incidents, filter],
  );

  const columns = useMemo<ColumnDef<HrIncident>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) =>
          row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      {
        accessorKey: "kind",
        header: "Type",
        cell: ({ row }) => incidentTypeLabel(row.original.kind, managerTypes),
      },
      { accessorKey: "title", header: "Title" },
      {
        id: "pay",
        header: "Pay impact",
        cell: ({ row }) =>
          formatIncidentPayImpact(
            Boolean(row.original.salaryDeduct),
            Number(row.original.percentOfSalary) || 0,
          ),
      },
      { accessorKey: "occurredYmd", header: "Occurred" },
      {
        accessorKey: "detail",
        header: "Detail",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-muted-foreground">
            {row.original.detail || "?"}
          </span>
        ),
      },
      ...(caps.canRecordIncidents
        ? [
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
            } satisfies ColumnDef<HrIncident>,
          ]
        : []),
    ],
    [caps.canRecordIncidents, managerTypes, onRefresh],
  );

  const typeOptions = useMemo(() => {
    const codes = new Set(typeChoices.map((t) => t.code));
    for (const row of incidents) codes.add(row.kind);
    return [...codes].map((code) => ({
      id: code,
      label: incidentTypeLabel(code, managerTypes),
    }));
  }, [typeChoices, incidents, managerTypes]);

  return (
    <HrPanelShell>
      {caps.canConfigureIncidentTypes ? (
        <HrSectionCard
          title="Incident types"
          description="Add categories with a percent of salary (deduct or credit). Optionally link a type to attendance days."
          icon={
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          }
          accent="bg-linear-to-r from-amber-500 via-orange-400 to-rose-500/80"
        >
          <HrIncidentTypeEditor />
        </HrSectionCard>
      ) : null}

      <HrSectionCard
        title="Incident file"
        description={
          caps.canRecordIncidents
            ? "Notes on employee files. Use Record incident for configured types or one-off Other cases."
            : "Read-only report of incidents HR has recorded."
        }
        icon={
          <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        }
        accent={
          caps.canConfigureIncidentTypes
            ? undefined
            : "bg-linear-to-r from-amber-500 via-orange-400 to-rose-500/80"
        }
        actions={
          caps.canRecordIncidents ? (
            <Button
              onClick={openCreate}
              disabled={!employees.length}
            >
              <Plus className="mr-2 h-4 w-4" />
              Record incident
            </Button>
          ) : null
        }
      >
        <div className="space-y-4">
          <ListPanelFilterBar
            showClear={filter !== "all"}
            onClear={() => setFilter("all")}
          >
            <FilterChipGroup
              label="Type"
              value={filter}
              onChange={setFilter}
              options={[{ id: "all", label: "All" }, ...typeOptions]}
            />
          </ListPanelFilterBar>
          {filtered.length ? (
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Search incidents?"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No incidents in this view"
              description={
                caps.canRecordIncidents
                  ? "Use Record incident to add a note to an employee file."
                  : "When HR records incidents, they appear here."
              }
            />
          )}
        </div>
      </HrSectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={responsiveFormDialogClassName}>
          <DialogHeader>
            <DialogTitle>Record incident</DialogTitle>
            <DialogDescription>
              Attach a note to an employee. Pay impact follows the type, or you
              set it when using Other.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {(selectedEmployee || form.kind) && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5">
                {selectedEmployee ? (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-background font-medium"
                  >
                    {selectedEmployee.fullName}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Choose an employee
                  </span>
                )}
                {form.kind ? (
                  <Badge variant="outline" className="font-normal">
                    {incidentTypeLabel(form.kind, managerTypes)}
                  </Badge>
                ) : null}
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 text-xs font-medium tabular-nums",
                    hasPayImpact
                      ? form.salaryDeduct
                        ? "text-rose-700 dark:text-rose-400"
                        : "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {hasPayImpact ? (
                    form.salaryDeduct ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )
                  ) : null}
                  {payLabel}
                </span>
              </div>
            )}

            <HotelFormSection title="Basics">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="hr-incident-employee">Employee</Label>
                  <Select
                    value={form.employeeId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, employeeId: v }))
                    }
                  >
                    <SelectTrigger
                      id="hr-incident-employee"
                      className={triggerClass}
                    >
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.fullName}
                          {e.department ? ` ? ${e.department}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hr-incident-kind">Type</Label>
                  <Select value={form.kind} onValueChange={onKindChange}>
                    <SelectTrigger id="hr-incident-kind" className={triggerClass}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {typeChoices.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <HotelDayPicker
                  label="Occurred on"
                  value={form.occurredYmd}
                  onChange={(occurredYmd) =>
                    setForm((f) => ({ ...f, occurredYmd }))
                  }
                  disabledDays={(date) => date > new Date()}
                  buttonClassName={cn(inputClass, "justify-start font-normal")}
                  compact
                />
              </div>
            </HotelFormSection>

            <HotelFormSection title="Description">
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hr-incident-title">Title</Label>
                  <Input
                    id="hr-incident-title"
                    className={inputClass}
                    placeholder="Short summary"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hr-incident-detail">Detail</Label>
                  <Textarea
                    id="hr-incident-detail"
                    className="min-h-22 resize-y bg-background"
                    value={form.detail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, detail: e.target.value }))
                    }
                    placeholder={
                      adHocOther
                        ? "e.g. Lost uniform ? employee will reimburse"
                        : "Optional notes"
                    }
                  />
                </div>
              </div>
            </HotelFormSection>

            <HotelFormSection
              title="Pay impact"
              description={
                adHocOther
                  ? "Set deduct or increase for this one-off case."
                  : selectedType
                    ? "Taken from the manager?s incident type."
                    : "Select a type to see pay impact."
              }
            >
              {adHocOther ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {form.salaryDeduct
                          ? "Salary deduction"
                          : "Salary increase"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toggle Deduct on to take from pay
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Deduct
                      </span>
                      <Switch
                        checked={form.salaryDeduct}
                        onCheckedChange={(salaryDeduct) =>
                          setForm((f) => ({ ...f, salaryDeduct }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hr-incident-percent">% of salary</Label>
                    <Input
                      id="hr-incident-percent"
                      type="text"
                      inputMode="decimal"
                      className={cn(inputClass, "tabular-nums")}
                      value={form.percentText}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                        if (raw === "" || raw === ".") {
                          setForm((f) => ({
                            ...f,
                            percentText: raw,
                            percentOfSalary: 0,
                          }));
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n)) return;
                        if (n > 100) {
                          setForm((f) => ({
                            ...f,
                            percentText: "100",
                            percentOfSalary: 100,
                          }));
                          return;
                        }
                        setForm((f) => ({
                          ...f,
                          percentText: raw,
                          percentOfSalary: Math.max(0, n),
                        }));
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">0–100</p>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3",
                    hasPayImpact
                      ? form.salaryDeduct
                        ? "border-rose-500/25 bg-rose-500/5"
                        : "border-emerald-500/25 bg-emerald-500/5"
                      : "border-border/70 bg-muted/20",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background",
                      hasPayImpact
                        ? form.salaryDeduct
                          ? "border-rose-500/20 text-rose-700 dark:text-rose-400"
                          : "border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {hasPayImpact ? (
                      form.salaryDeduct ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )
                    ) : (
                      <FileWarning className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{payLabel}</p>
                    {hasPayImpact ? (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {selectedEmployee
                          ? `${form.percentOfSalary}% of ${formatETB(selectedEmployee.baseSalaryETB)} ~= ${formatETB((Number(selectedEmployee.baseSalaryETB) * form.percentOfSalary) / 100)}`
                          : `${form.percentOfSalary}% of the employee's salary`}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No salary change for this type
                      </p>
                    )}
                  </div>
                </div>
              )}
            </HotelFormSection>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
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
                  await createHrIncidentApi({
                    ...parsed.data,
                    salaryDeduct: form.salaryDeduct,
                    percentOfSalary: form.percentOfSalary,
                  });
                  toast.success("Incident recorded");
                  setOpen(false);
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrPanelShell>
  );
}
