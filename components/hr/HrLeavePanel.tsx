"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { CalendarDays, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FilterChipGroup, ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import { HrLeaveTypeEditor } from "@/components/hr/HrLeaveTypeEditor";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import {
  hrLeaveRequestSchema,
  inclusiveLeaveDays,
  type HrLeaveRequestFormValues,
} from "@/lib/hrConstraints";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";
import { notifyApiFailure } from "@/lib/actions";
import { PendingButton } from "@/components/ui/pending-button";
import {
  createHrLeaveRequestApi,
  decideHrLeaveRequestApi,
  fetchHrLeaveTypes,
  type HrEmployee,
  type HrLeaveRequest,
  type HrLeaveType,
} from "@/lib/api/hr";

type LeaveFilter = "all" | "pending" | "approved" | "rejected";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HrLeavePanel({
  leave,
  employees,
  actorRole,
  onRefresh,
}: {
  leave: HrLeaveRequest[];
  employees: HrEmployee[];
  actorRole: string;
  onRefresh: () => Promise<void>;
}) {
  const canConfigureTypes = actorRole === "Manager" || actorRole === "Admin";
  const canFileLeave =
    actorRole === "HR" || actorRole === "Admin" || actorRole === "Manager";
  const canApprove = actorRole === "Manager" || actorRole === "Admin";

  const [filter, setFilter] = useState<LeaveFilter>("all");
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const typeLabels = useMemo(
    () => Object.fromEntries(leaveTypes.map((t) => [t.code, t.label])),
    [leaveTypes],
  );

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== "terminated"),
    [employees],
  );

  const form = useForm<HrLeaveRequestFormValues>({
    resolver: zodResolver(hrLeaveRequestSchema) as Resolver<HrLeaveRequestFormValues>,
    defaultValues: {
      employeeId: 0,
      leaveType: "",
      fromYmd: todayYmd(),
      toYmd: todayYmd(),
      days: 1,
      reason: "",
    },
  });

  const loadTypes = async () => {
    try {
      const types = await fetchHrLeaveTypes();
      setLeaveTypes(types.filter((t) => t.active));
    } catch {
      setLeaveTypes([]);
    }
  };

  useEffect(() => {
    void loadTypes();
  }, []);

  const filtered = useMemo(
    () => leave.filter((row) => (filter === "all" ? true : row.status === filter)),
    [leave, filter],
  );

  const openCreate = () => {
    const firstEmp = activeEmployees[0];
    const firstType = leaveTypes[0];
    const today = todayYmd();
    form.reset({
      employeeId: firstEmp?.id ?? 0,
      leaveType: firstType?.code ?? "",
      fromYmd: today,
      toYmd: today,
      days: 1,
      reason: "",
    });
    setOpen(true);
  };

  const onSubmit = async (values: HrLeaveRequestFormValues) => {
    setPending(true);
    try {
      await createHrLeaveRequestApi({
        employeeId: values.employeeId,
        leaveType: values.leaveType,
        fromYmd: values.fromYmd,
        toYmd: values.toYmd,
        days: values.days,
        reason: values.reason || undefined,
      });
      toast.success("Leave request submitted for manager approval");
      setOpen(false);
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, "Could not submit leave request");
    } finally {
      setPending(false);
    }
  };

  const columns = useMemo<ColumnDef<HrLeaveRequest>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) =>
          row.original.employee?.fullName || `#${row.original.employeeId}`,
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
      ...(canApprove
        ? [
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
            } satisfies ColumnDef<HrLeaveRequest>,
          ]
        : []),
    ],
    [canApprove, onRefresh, typeLabels],
  );

  return (
    <HrPanelShell>
      {canConfigureTypes ? (
        <HrSectionCard
          title="Leave types"
          description="Manager-configured categories HR uses when filing leave. Default days become the starting balance for new employees."
          icon={
            <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          }
          accent="bg-linear-to-r from-violet-500 via-fuchsia-400 to-primary/70"
        >
          <HrLeaveTypeEditor />
        </HrSectionCard>
      ) : null}

      <HrSectionCard
        title="Leave queue"
        description={
          canApprove
            ? "Review requests filed by HR. Approving paid leave reduces the matching balance."
            : "File leave for employees here. The manager reviews and approves or rejects each request."
        }
        actions={
          canFileLeave ? (
            <Button onClick={openCreate} disabled={!activeEmployees.length}>
              <Plus className="mr-2 h-4 w-4" />
              File leave
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
              title="No leave requests yet"
              description={
                canFileLeave
                  ? "Use File leave to submit a request for an employee. It stays pending until the manager decides."
                  : "HR files leave requests for employees. They appear here for approval."
              }
            />
          )}
        </div>
      </HrSectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={responsiveFormDialogClassName}>
          <DialogHeader>
            <DialogTitle>File leave request</DialogTitle>
            <DialogDescription>
              Submit leave on behalf of an employee. The manager will approve or
              reject it.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <HotelFormSection title="Request details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 w-full bg-background">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            {activeEmployees.map((emp) => (
                              <SelectItem key={emp.id} value={String(emp.id)}>
                                {emp.fullName}
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
                    name="leaveType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leave type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 w-full bg-background">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper">
                            {leaveTypes.map((type) => (
                              <SelectItem key={type.code} value={type.code}>
                                {type.label}
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
                    name="fromYmd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <FormControl>
                          <HotelDayPicker
                            value={field.value}
                            onChange={(fromYmd) => {
                              const toYmd = form.getValues("toYmd");
                              field.onChange(fromYmd);
                              form.setValue(
                                "days",
                                inclusiveLeaveDays(fromYmd, toYmd) || 1,
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toYmd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <FormControl>
                          <HotelDayPicker
                            value={field.value}
                            onChange={(toYmd) => {
                              const fromYmd = form.getValues("fromYmd");
                              field.onChange(toYmd);
                              form.setValue(
                                "days",
                                inclusiveLeaveDays(fromYmd, toYmd) || 1,
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            className="h-10 bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </HotelFormSection>
              <PendingButton
                type="submit"
                pending={pending}
                className="h-11 w-full shadow-md"
                disabled={!leaveTypes.length}
              >
                Submit for approval
              </PendingButton>
              {!leaveTypes.length ? (
                <p className="text-center text-sm text-muted-foreground">
                  Ask the manager to configure leave types first.
                </p>
              ) : null}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </HrPanelShell>
  );
}
