"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { UserPlus, Users, Trash2, Pencil, Building2, Wallet, Check, ChevronsUpDown } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import { HrOptionCombobox } from "@/components/hr/HrOptionCombobox";
import {
  HrDialogHeader,
  HrEmptyState,
  HrFormSection,
  HrPanelShell,
  HrStatusBadge,
  HrSurfaceHero,
  HrTableFrame,
  hrFieldClass,
  hrPrimaryBtnClass,
  hrStatusFilterLabelClass,
  hrStatusFilterTriggerClass,
} from "@/components/hr/hrChrome";
import {
  HR_WAGE_LABELS,
  HR_WAGE_TYPES,
  hrEmployeeFormSchema,
  type HrEmployeeFormValues,
} from "@/lib/hrConstraints";
import {
  hrDepartmentLabel,
} from "@/lib/hrDepartments";
import { ETHIOPIAN_BANKS } from "@/lib/hrEthiopianBanks";
import { formatETB } from "@/lib/subscriptionModules";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  createHrEmployeeApi,
  fetchHrDepartments,
  fetchHrTeamsApi,
  terminateHrEmployeeApi,
  deleteHrEmployeeApi,
  updateHrEmployeeApi,
  enableHrEmployeePortalApi,
  requestHrOtpResetApi,
  type HrDepartment,
  type HrEmployee,
  type HrTeam,
} from "@/lib/api/hr";
import {
  isPendingManagerApprovalError,
  pendingManagerApprovalMessage,
} from "@/lib/hrPendingApproval";
import { PendingButton } from "@/components/ui/pending-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KeyRound } from "lucide-react";
const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  { ssr: false },
);

type StatusFilter = "all" | "active" | "on_leave" | "terminated";

type ComboboxOption = { value: string; label: string; hint?: string };

/** Searchable combobox — same interaction pattern as hotel store / HR approval config. */
function OptionCombobox({
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyText = "No matches.",
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.hint || ""} ${o.value}`.toLowerCase();
      return hay.includes(query);
    });
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            hrFieldClass,
            "justify-between font-normal",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 truncate text-left",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((o) => {
                  const on = o.value === value;
                  return (
                    <CommandItem
                      key={o.value}
                      value={`${o.value}-${o.label}`}
                      onSelect={() => {
                        onChange(o.value);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          on ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {o.label}
                        {o.hint ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {o.hint}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const roleFieldClass = "min-w-0";
const roleInputClass = hrFieldClass;

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HrEmployeesPanel({
  employees,
  onRefresh,
}: {
  employees: HrEmployee[];
  onRefresh: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HrEmployee | null>(null);
  const [pending, setPending] = useState(false);
  const [issuedOtp, setIssuedOtp] = useState<{ name: string; otp: string } | null>(
    null,
  );
  const [hrDepartments, setHrDepartments] = useState<HrDepartment[]>([]);
  const [teams, setTeams] = useState<HrTeam[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await fetchHrDepartments();
        if (cancelled) return;
        setHrDepartments(rows.filter((d) => d.active));
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

  const defaultDepartment = hrDepartments[0]?.code ?? "";

  const form = useForm<HrEmployeeFormValues>({
    resolver: zodResolver(hrEmployeeFormSchema) as Resolver<HrEmployeeFormValues>,
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      department: "",
      jobTitle: "",
      orgPosition: "employee",
      teamId: null,
      wageType: "monthly",
      baseSalaryETB: 0,
      bankName: "",
      accountNumber: "",
      hireDate: todayYmd(),
      notes: "",
    },
  });

  const departmentCode = form.watch("department");
  const selectedDeptId = useMemo(() => {
    const code = String(departmentCode || "").trim();
    return hrDepartments.find((d) => d.code === code)?.id ?? null;
  }, [departmentCode, hrDepartments]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (selectedDeptId == null) {
        setTeams([]);
        return;
      }
      try {
        const rows = await fetchHrTeamsApi(selectedDeptId);
        if (cancelled) return;
        setTeams(rows.filter((t) => t.active));
      } catch (e) {
        notifyApiFailure(e, "Could not load teams");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedDeptId]);

  const filtered = useMemo(
    () =>
      employees.filter((e) =>
        statusFilter === "all" ? true : e.status === statusFilter,
      ),
    [employees, statusFilter],
  );

  const directoryStats = useMemo(() => {
    const active = employees.filter((e) => e.status === "active").length;
    const onLeave = employees.filter((e) => e.status === "on_leave").length;
    const terminated = employees.filter((e) => e.status === "terminated").length;
    return [
      {
        label: "Active",
        value: active,
        tone: "from-emerald-500/[0.07] to-transparent",
      },
      {
        label: "On leave",
        value: onLeave,
        tone: "from-amber-500/[0.07] to-transparent",
      },
      {
        label: "Terminated",
        value: terminated,
        tone: "from-rose-500/[0.07] to-transparent",
      },
    ];
  }, [employees]);

  const openCreate = () => {
    if (!hrDepartments.length) {
      toast.error("Register departments in HR → Departments first");
      return;
    }
    setEditing(null);
    form.reset({
      fullName: "",
      phone: "",
      email: "",
      department: defaultDepartment,
      jobTitle: "",
      orgPosition: "employee",
      teamId: null,
      wageType: "monthly",
      baseSalaryETB: 0,
      bankName: "",
      accountNumber: "",
      hireDate: todayYmd(),
      notes: "",
    });
    setOpen(true);
  };

  const openEdit = useCallback(
    (row: HrEmployee) => {
      setEditing(row);
      const dept =
        row.department &&
        (hrDepartments.some((d) => d.code === row.department) ||
          Boolean(row.department))
          ? row.department
          : defaultDepartment;
      form.reset({
        fullName: row.fullName,
        phone: row.phone || "",
        email: row.email || "",
        department: dept || defaultDepartment,
        jobTitle: row.jobTitle || "",
        orgPosition:
          row.orgPosition === "leader" ? "leader" : "employee",
        teamId: row.teamId ?? null,
        wageType: (HR_WAGE_TYPES as readonly string[]).includes(row.wageType)
          ? (row.wageType as HrEmployeeFormValues["wageType"])
          : "monthly",
        baseSalaryETB: row.baseSalaryETB || 0,
        bankName: row.bankName || "",
        accountNumber: row.accountNumber || "",
        hireDate: row.hireDate || todayYmd(),
        notes: row.notes || "",
      });
      setOpen(true);
    },
    [defaultDepartment, form, hrDepartments],
  );

  const onSubmit = async (values: HrEmployeeFormValues) => {
    setPending(true);
    try {
      const payload = {
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        department: values.department,
        jobTitle: values.jobTitle,
        orgPosition: values.orgPosition,
        teamId: values.teamId || null,
        wageType: values.wageType,
        baseSalaryETB: values.baseSalaryETB,
        bankName: values.bankName || "",
        accountNumber: values.accountNumber || "",
        hireDate: values.hireDate,
        notes: values.notes,
      };

      if (editing) {
        await updateHrEmployeeApi(editing.id, payload);
        toast.success("Employee updated");
      } else {
        await createHrEmployeeApi(payload);
        toast.success("Employee added");
      }
      setOpen(false);
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, editing ? "Could not update employee" : "Could not add employee");
    } finally {
      setPending(false);
    }
  };

  const columns = useMemo<ColumnDef<HrEmployee>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Employee",
        cell: ({ row }) => {
          const emp = row.original;
          const initials = emp.fullName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join("");
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-xs font-semibold tracking-wide text-foreground/80 ring-1 ring-border/60">
                {initials || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold tracking-tight">
                  {emp.fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {emp.jobTitle || "No title"}
                  {emp.wageType
                    ? ` · ${HR_WAGE_LABELS[emp.wageType as keyof typeof HR_WAGE_LABELS] || emp.wageType}`
                    : ""}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="gap-1.5 border-border/70 bg-muted/40 font-normal text-foreground/80"
          >
            <Building2 className="h-3 w-3 opacity-70" />
            {hrDepartmentLabel(row.original.department || "", hrDepartments) ||
              "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.phone || "—"}
          </span>
        ),
      },
      {
        accessorKey: "baseSalaryETB",
        header: "Salary",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            {formatETB(row.original.baseSalaryETB || 0)}
          </span>
        ),
      },
      {
        accessorKey: "bankName",
        header: "Bank",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {row.original.bankName || "—"}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {row.original.accountNumber || "No account"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "hireDate",
        header: "Hired",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.hireDate || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <HrStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const emp = row.original;
          const preview = String(emp.portalOtpPreview || "").trim();
          const portalIssued = Boolean(emp.portalOtpIssuedAt);
          const awaitingFirstLogin = portalIssued && !emp.portalFirstLoginAt;
          return (
          <div className="inline-flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-lg"
              onClick={() => openEdit(emp)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            {emp.status !== "terminated" ? (
              <>
                {!portalIssued ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg"
                    onClick={async () => {
                      try {
                        const updated = await enableHrEmployeePortalApi(emp.id);
                        const otp = String(updated.portalOtpPreview || "").trim();
                        if (otp) {
                          setIssuedOtp({ name: updated.fullName, otp });
                        } else {
                          toast.message(
                            "Portal OTP issued. Preview is only visible to HR Manager until first login.",
                          );
                        }
                        await onRefresh();
                      } catch (e) {
                        notifyApiFailure(e, "Could not enable portal");
                      }
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Portal OTP
                  </Button>
                ) : null}
                {awaitingFirstLogin && preview ? (
                  <button
                    type="button"
                    title="Copy portal OTP (visible until first login)"
                    className="inline-flex h-8 max-w-44 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 font-mono text-xs tracking-wider text-amber-950 hover:bg-amber-500/15 dark:text-amber-100"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(preview);
                        toast.success("Portal OTP copied");
                      } catch {
                        toast.message(preview);
                      }
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{preview}</span>
                  </button>
                ) : null}
                {awaitingFirstLogin && !preview ? (
                  <span className="text-xs text-muted-foreground">
                    Awaiting first login
                  </span>
                ) : null}
                {portalIssued ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await requestHrOtpResetApi(emp.id);
                        toast.success("OTP reset sent to Manager for approval");
                        await onRefresh();
                      } catch (e) {
                        notifyApiFailure(e, "OTP reset request failed");
                      }
                    }}
                  >
                    Request reset
                  </Button>
                ) : null}
                <HrConfirmAction
                  destructive
                  title={`Terminate ${emp.fullName}?`}
                  description="Marks this employee terminated from today. History stays on file."
                  confirmLabel="Terminate"
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Terminate
                    </Button>
                  }
                  onConfirm={async () => {
                    try {
                      await terminateHrEmployeeApi(emp.id, todayYmd());
                      toast.success("Employee terminated");
                      await onRefresh();
                    } catch (e) {
                      if (isPendingManagerApprovalError(e)) {
                        toast.success(pendingManagerApprovalMessage(e));
                        await onRefresh();
                        return;
                      }
                      notifyApiFailure(e, "Terminate failed");
                    }
                  }}
                />
              </>
            ) : null}
            {emp.status === "terminated" ? (
              <HrConfirmAction
                destructive
                title={`Delete ${emp.fullName}?`}
                description="Permanently removes this terminated employee and related HR records (leave, attendance, documents, payslips). This cannot be undone."
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
                    await deleteHrEmployeeApi(emp.id);
                    toast.success("Employee deleted");
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Delete failed");
                  }
                }}
              />
            ) : null}
          </div>
          );
        },
      },
    ],
    [hrDepartments, onRefresh, openEdit],
  );

  return (
    <HrPanelShell>
      <HrSurfaceHero
        eyebrow="HR directory"
        title="Employees"
        description="Search, filter, and maintain employment records. Salary and hire details feed system payroll when a period is closed."
        icon={<Users className="size-5" />}
        actions={
          <Button
            onClick={openCreate}
            className={cn("h-11 rounded-xl", hrPrimaryBtnClass)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add employee
          </Button>
        }
        stats={directoryStats}
      />

      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="w-full max-w-[14rem] space-y-1.5">
            <Label
              className={cn(
                "text-xs font-medium",
                hrStatusFilterLabelClass(statusFilter),
              )}
            >
              Status
            </Label>
            <HrOptionCombobox
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "on_leave", label: "On leave" },
                { value: "terminated", label: "Terminated" },
              ]}
              placeholder="Filter status…"
              emptyText="No statuses."
              className={hrStatusFilterTriggerClass(statusFilter)}
            />
          </div>
        </div>
        {filtered.length ? (
          <HrTableFrame>
            <DataTable
              embedded
              columns={columns}
              data={filtered}
              searchColumnId="fullName"
              searchPlaceholder="Search employees…"
              emptyMessage="No employees match these filters."
              pageSize={8}
            />
          </HrTableFrame>
        ) : (
          <HrEmptyState
            title="No employees in this view"
            description="Add the first employee or clear filters to see the full directory."
            icon={<Users className="h-6 w-6" />}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={responsiveFormDialogClassName}>
          <HrDialogHeader
            title={editing ? "Edit employee" : "Add employee"}
            description="Employment master data for this property. Salary and hire date feed system payroll when a period is closed."
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <HrFormSection title="Identity" description="Legal name and optional contact.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input className={hrFieldClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="ET"
                            countryCallingCodeEditable
                            international
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value || "")}
                            className="w-full min-w-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input className={hrFieldClass} type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </HrFormSection>
              <HrFormSection title="Role & pay" description="Department, title, wage type, and hire date.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => {
                      const orphan =
                        field.value &&
                        !hrDepartments.some((d) => d.code === field.value)
                          ? field.value
                          : "";
                      const options: ComboboxOption[] = [
                        ...hrDepartments.map((d) => ({
                          value: d.code,
                          label: d.label,
                        })),
                        ...(orphan
                          ? [
                              {
                                value: orphan,
                                label: `${hrDepartmentLabel(orphan, hrDepartments)} (not in current list)`,
                              },
                            ]
                          : []),
                      ];
                      return (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <OptionCombobox
                            value={field.value || ""}
                            onChange={(v) => {
                              field.onChange(v);
                              form.setValue("teamId", null);
                            }}
                            options={options}
                            disabled={!hrDepartments.length && !orphan}
                            placeholder={
                              hrDepartments.length
                                ? "Search department…"
                                : "Register departments first"
                            }
                            emptyText="No departments found."
                          />
                        </FormControl>
                        {!hrDepartments.length ? (
                          <p className="text-[11px] text-muted-foreground">
                            Add departments under HR → Departments, then pick
                            one here.
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Specific role</FormLabel>
                        <FormControl>
                          <Input
                            className={roleInputClass}
                            placeholder="Skill / professional name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orgPosition"
                    render={({ field }) => (
                      <FormItem className={cn(roleFieldClass, "sm:col-span-2")}>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-2 gap-2 sm:max-w-md"
                          >
                            {(
                              [
                                { id: "employee", label: "Employee" },
                                { id: "leader", label: "Leader" },
                              ] as const
                            ).map((opt) => (
                              <Label
                                key={opt.id}
                                htmlFor={`hr-org-pos-${opt.id}`}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-normal transition-colors",
                                  field.value === opt.id
                                    ? "border-violet-500/35 bg-violet-500/[0.07]"
                                    : "border-border/70 bg-background hover:bg-muted/40",
                                )}
                              >
                                <RadioGroupItem
                                  value={opt.id}
                                  id={`hr-org-pos-${opt.id}`}
                                />
                                {opt.label}
                              </Label>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => {
                      const options: ComboboxOption[] = [
                        { value: "none", label: "No team" },
                        ...teams.map((t) => ({
                          value: String(t.id),
                          label: t.label,
                          hint: t.code,
                        })),
                      ];
                      const current =
                        field.value != null && field.value > 0
                          ? String(field.value)
                          : "none";
                      return (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Team (optional)</FormLabel>
                        <FormControl>
                          <OptionCombobox
                            value={current}
                            onChange={(v) =>
                              field.onChange(v === "none" ? null : Number(v))
                            }
                            options={options}
                            disabled={!selectedDeptId}
                            placeholder={
                              selectedDeptId
                                ? teams.length
                                  ? "Search team…"
                                  : "No teams in department"
                                : "Pick department first"
                            }
                            emptyText="No teams found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="wageType"
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Wage type</FormLabel>
                        <FormControl>
                          <OptionCombobox
                            value={field.value}
                            onChange={field.onChange}
                            options={HR_WAGE_TYPES.map((w) => ({
                              value: w,
                              label: HR_WAGE_LABELS[w],
                            }))}
                            placeholder="Search wage type…"
                            emptyText="No wage types."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="baseSalaryETB"
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Gross Salary</FormLabel>
                        <FormControl>
                          <Input
                            className={roleInputClass}
                            type="number"
                            min={0}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => {
                      const options: ComboboxOption[] = [
                        ...ETHIOPIAN_BANKS.map((name) => ({
                          value: name,
                          label: name,
                        })),
                      ];
                      // Keep orphan / custom saved bank selectable when editing
                      if (
                        field.value &&
                        !ETHIOPIAN_BANKS.includes(
                          field.value as (typeof ETHIOPIAN_BANKS)[number],
                        )
                      ) {
                        options.unshift({
                          value: field.value,
                          label: field.value,
                          hint: "saved",
                        });
                      }
                      return (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Bank name</FormLabel>
                        <FormControl>
                          <OptionCombobox
                            value={field.value || ""}
                            onChange={field.onChange}
                            options={options}
                            placeholder="Search Ethiopian bank…"
                            emptyText="No banks found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Account number</FormLabel>
                        <FormControl>
                          <Input
                            className={roleInputClass}
                            placeholder="Employee account number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Hire date</FormLabel>
                        <FormControl>
                          <HotelDayPicker
                            value={field.value}
                            onChange={field.onChange}
                            buttonClassName={cn(
                              roleInputClass,
                              "justify-start font-normal",
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </HrFormSection>
              <PendingButton
                type="submit"
                pending={pending}
                className={cn("h-11 w-full", hrPrimaryBtnClass)}
              >
                {editing ? "Save changes" : "Save employee"}
              </PendingButton>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(issuedOtp)}
        onOpenChange={(next) => {
          if (!next) setIssuedOtp(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Portal OTP for {issuedOtp?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Share this code with the employee for hotcol-emp login. It stays visible
              to HR Manager only until their first login, then they must change it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="rounded-lg border bg-muted/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em]">
            {issuedOtp?.otp}
          </p>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(issuedOtp?.otp || "");
                  toast.success("OTP copied");
                } catch {
                  /* ignore */
                }
                setIssuedOtp(null);
              }}
            >
              Copy and close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HrPanelShell>
  );
}
