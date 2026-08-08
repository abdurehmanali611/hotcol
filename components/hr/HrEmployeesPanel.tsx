"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { UserPlus, Users, Trash2 } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterChipGroup, ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import { HrEmptyState, HrPanelShell, HrSectionCard, HrStatusBadge } from "@/components/hr/hrChrome";
import {
  HR_WAGE_LABELS,
  HR_WAGE_TYPES,
  hrEmployeeFormSchema,
  type HrEmployeeFormValues,
} from "@/lib/hrConstraints";
import {
  activeHrDepartments,
  hrDepartmentLabel,
  type HrDepartmentSetting,
} from "@/lib/hrDepartments";
import { formatETB } from "@/lib/subscriptionModules";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";
import { notifyApiFailure } from "@/lib/actions";
import {
  createHrEmployeeApi,
  fetchHrDepartments,
  terminateHrEmployeeApi,
  updateHrEmployeeApi,
  type HrEmployee,
} from "@/lib/api/hr";
import { PendingButton } from "@/components/ui/pending-button";

const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  { ssr: false },
);

type StatusFilter = "all" | "active" | "on_leave" | "terminated";

const roleFieldClass = "min-w-0";
const roleTriggerClass = "h-10 w-full min-w-0 justify-between bg-background";
const roleInputClass = "h-10 w-full min-w-0 bg-background";

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

  const defaultDepartment = hrDepartments[0]?.code ?? "";

  const form = useForm<HrEmployeeFormValues>({
    resolver: zodResolver(hrEmployeeFormSchema) as Resolver<HrEmployeeFormValues>,
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      department: "",
      jobTitle: "",
      wageType: "monthly",
      baseSalaryETB: 0,
      bankName: "",
      accountNumber: "",
      hireDate: todayYmd(),
      notes: "",
    },
  });

  const filtered = useMemo(
    () =>
      employees.filter((e) =>
        statusFilter === "all" ? true : e.status === statusFilter,
      ),
    [employees, statusFilter],
  );

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
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.jobTitle || "No title"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) =>
          hrDepartmentLabel(row.original.department || "", hrDepartments),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone || "—",
      },
      {
        accessorKey: "baseSalaryETB",
        header: "Salary",
        cell: ({ row }) => formatETB(row.original.baseSalaryETB || 0),
      },
      {
        accessorKey: "bankName",
        header: "Bank",
        cell: ({ row }) => row.original.bankName || "—",
      },
      {
        accessorKey: "accountNumber",
        header: "Account",
        cell: ({ row }) => row.original.accountNumber || "—",
      },
      {
        accessorKey: "hireDate",
        header: "Hired",
        cell: ({ row }) => row.original.hireDate || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <HrStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>
              Edit
            </Button>
            {row.original.status !== "terminated" ? (
              <HrConfirmAction
                destructive
                title={`Terminate ${row.original.fullName}?`}
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
                    await terminateHrEmployeeApi(row.original.id, todayYmd());
                    toast.success("Employee terminated");
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Terminate failed");
                  }
                }}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [hrDepartments, onRefresh, openEdit],
  );

  return (
    <HrPanelShell>
      <HrSectionCard
        title="Employee directory"
        description="Search, filter, and maintain employment records. Salary and hire details feed system payroll when a period is closed."
        icon={<Users className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
        accent="bg-linear-to-r from-rose-500 via-orange-400 to-primary/80"
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add employee
          </Button>
        }
      >
        <div className="space-y-4">
          <ListPanelFilterBar
            title="Directory filters"
            showClear={statusFilter !== "all"}
            onClear={() => setStatusFilter("all")}
          >
            <FilterChipGroup
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "on_leave", label: "On leave" },
                { id: "terminated", label: "Terminated" },
              ]}
            />
          </ListPanelFilterBar>
          {filtered.length ? (
            <DataTable
              columns={columns}
              data={filtered}
              searchColumnId="fullName"
              searchPlaceholder="Search employees…"
              emptyMessage="No employees match these filters."
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No employees in this view"
              description="Add the first employee or clear filters to see the full directory."
            />
          )}
        </div>
      </HrSectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={responsiveFormDialogClassName}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>
              Employment master data for this property. Salary and hire date feed
              system payroll when a period is closed.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <HotelFormSection title="Identity" description="Legal name and optional contact.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input className="h-10 bg-background" {...field} />
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
                          <Input className="h-10 bg-background" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </HotelFormSection>
              <HotelFormSection title="Role & pay" description="Department, title, wage type, and hire date.">
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
                      return (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Department</FormLabel>
                        <Select
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          disabled={!hrDepartments.length && !orphan}
                        >
                          <FormControl>
                            <SelectTrigger className={roleTriggerClass}>
                              <SelectValue
                                placeholder={
                                  hrDepartments.length
                                    ? "Select department"
                                    : "Register departments first"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            {hrDepartments.map((d) => (
                              <SelectItem key={d.code} value={d.code}>
                                {d.label}
                              </SelectItem>
                            ))}
                            {orphan ? (
                              <SelectItem value={orphan}>
                                {hrDepartmentLabel(orphan, hrDepartments)}{" "}
                                (not in current list)
                              </SelectItem>
                            ) : null}
                          </SelectContent>
                        </Select>
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
                        <FormLabel>Job title</FormLabel>
                        <FormControl>
                          <Input className={roleInputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wageType"
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Wage type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={roleTriggerClass}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            {HR_WAGE_TYPES.map((w) => (
                              <SelectItem key={w} value={w}>
                                {HR_WAGE_LABELS[w]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    render={({ field }) => (
                      <FormItem className={roleFieldClass}>
                        <FormLabel>Bank name</FormLabel>
                        <FormControl>
                          <Input
                            className={roleInputClass}
                            placeholder="Commercial Bank…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
                      <FormItem className="w-fit justify-self-center sm:col-span-2">
                        <FormLabel>Hire date</FormLabel>
                        <FormControl>
                          <HotelDayPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </HotelFormSection>
              <PendingButton type="submit" pending={pending} className="h-11 w-full shadow-md">
                {editing ? "Save changes" : "Save employee"}
              </PendingButton>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </HrPanelShell>
  );
}
