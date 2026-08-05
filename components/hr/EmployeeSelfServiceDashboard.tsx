"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import {
  CalendarDays,
  Loader2,
  LogOut,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { logoutAction, notifyApiFailure } from "@/lib/actions";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import {
  hrLeaveRequestSchema,
  inclusiveLeaveDays,
  parseHrConstraint,
} from "@/lib/hrConstraints";
import { formatETB } from "@/lib/subscriptionModules";
import {
  createHrLeaveRequestApi,
  fetchHrEmployees,
  fetchHrLeaveBalances,
  fetchHrLeaveRequests,
  fetchHrLeaveTypes,
  fetchHrPayrollPeriods,
  fetchHrPayslips,
  type HrLeaveType,
  type HrEmployee,
  type HrLeaveBalance,
  type HrLeaveRequest,
  type HrPayslip,
} from "@/lib/api/hr";

type Section = "leave" | "payroll";

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "leave", label: "My leave", icon: CalendarDays },
  { id: "payroll", label: "My payslips", icon: Wallet },
];

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EmployeeSelfServiceDashboard() {
  useTenantRouteGuard({
    requiredModule: "HR Module",
    role: "Employee",
  });
  const searchParams = useSearchParams();
  const { displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";
  const headerLabel = displayName || "Employee";
  const userName =
    typeof window === "undefined"
      ? ""
      : localStorage.getItem("user_name")?.trim() || "";

  const [section, setSection] = useState<Section>("leave");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const [employee, setEmployee] = useState<HrEmployee | null>(null);
  const [leave, setLeave] = useState<HrLeaveRequest[]>([]);
  const [balances, setBalances] = useState<HrLeaveBalance[]>([]);
  const [payslips, setPayslips] = useState<HrPayslip[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([]);
  const [form, setForm] = useState({
    leaveType: "",
    fromYmd: todayYmd(),
    toYmd: todayYmd(),
    days: 1,
    reason: "",
  });

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [employees, requests, periodRows, types] = await Promise.all([
        fetchHrEmployees(),
        fetchHrLeaveRequests(),
        fetchHrPayrollPeriods(),
        fetchHrLeaveTypes(),
      ]);
      setLeaveTypes(types.filter((type) => type.active));
      setForm((f) => ({
        ...f,
        leaveType: f.leaveType || types.find((type) => type.active)?.code || "",
      }));
      const mine =
        employees.find(
          (row) =>
            row.credentialUserName.trim().toLowerCase() ===
            userName.trim().toLowerCase(),
        ) || null;
      setEmployee(mine);
      setLeave(
        mine ? requests.filter((row) => row.employeeId === mine.id) : [],
      );
      if (mine) {
        const [mineBalances, slipSets] = await Promise.all([
          fetchHrLeaveBalances(mine.id),
          Promise.all(
            periodRows.map(async (period) => {
              try {
                const rows = await fetchHrPayslips(period.id);
                return rows
                  .filter((row) => row.employeeId === mine.id)
                  .map((row) => ({ ...row, notes: period.periodKey }));
              } catch {
                return [] as HrPayslip[];
              }
            }),
          ),
        ]);
        setBalances(mineBalances);
        setPayslips(slipSets.flat());
      } else {
        setBalances([]);
        setPayslips([]);
      }
    } catch (e) {
      notifyApiFailure(e, "Could not load your HR workspace");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userName]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const submitLeave = async () => {
    if (!employee) {
      toast.error("Your login is not linked to an employee record yet.");
      return;
    }
    const parsed = parseHrConstraint(hrLeaveRequestSchema, {
      ...form,
      employeeId: employee.id,
    });
    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }
    const type = leaveTypes.find((row) => row.code === parsed.data.leaveType);
    if (type?.paid) {
      const available =
        balances.find((row) => row.leaveType === parsed.data.leaveType)
          ?.balanceDays ?? type.defaultDays;
      if (parsed.data.days > available) {
        toast.error(
          `Only ${available} ${type.label} day(s) remaining`,
        );
        return;
      }
    }
    setPending(true);
    try {
      await createHrLeaveRequestApi(parsed.data);
      toast.success("Leave request submitted");
      setForm((f) => ({ ...f, reason: "" }));
      await loadAll(true);
    } catch (e) {
      notifyApiFailure(e, "Could not submit leave");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <SidebarProvider>
        <div className="flex min-h-svh w-full bg-muted/40">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
            <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
              <div className="flex h-full min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                  <UserRound className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                    Terminal
                  </p>
                  <span className="block truncate font-semibold leading-tight">
                    Employee
                  </span>
                </div>
              </div>
            </SidebarHeader>
            <div className="shrink-0 px-3 pb-2 pt-3">
              <SidebarSeparator className="bg-sidebar-border/80" />
            </div>
            <SidebarContent className="flex-1 gap-0 px-0 pb-4 pt-2">
              <SidebarMenu className="gap-1 px-2">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={section === item.id}
                        onClick={() => setSection(item.id)}
                        tooltip={item.label}
                        size="lg"
                        className="h-10 cursor-pointer text-[13px]"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 pt-2">
              <SidebarSeparator className="mb-3" />
              <ChangeOwnPasswordButton />
              <Button
                variant="outline"
                className="mt-2 w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => logoutAction()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3 md:h-16 md:px-6">
              <SidebarTrigger />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm">
                  {headerLabel}
                </h1>
              </div>
              <RefreshIconButton
                busy={refreshing}
                disabled={loading}
                onClick={() => void loadAll(true)}
              />
              <ChangeOwnPasswordButton />
              <Link
                href="/TenantProfile"
                className="rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Open tenant profile"
              >
                <Avatar className="h-8 w-8 border shadow-sm">
                  <AvatarImage src={logoUrl || undefined} alt={headerLabel} />
                  <AvatarFallback>{headerLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
              <div className="mx-auto max-w-4xl space-y-8 pb-10">
                <div className="space-y-1.5 rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-rose-500/8 p-5 shadow-sm md:p-6">
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    {employee?.fullName || userName || "Employee"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Request leave and review your payslips. HR approves leave from the Leave types queue.
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading your workspace…
                  </div>
                ) : !employee ? (
                  <HrEmptyState
                    title="No employee record linked"
                    description="Ask HR to register you and issue this username on your employee file."
                  />
                ) : section === "leave" ? (
                  <HrPanelShell>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {leaveTypes.map((type) => {
                        const balance =
                          balances.find((row) => row.leaveType === type.code)
                            ?.balanceDays ?? (type.paid ? type.defaultDays : null);
                        return (
                          <div
                            key={type.code}
                            className="rounded-xl border border-border/70 bg-card px-3 py-3"
                          >
                            <p className="text-sm font-medium">{type.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type.paid
                                ? `${balance ?? 0} day${balance === 1 ? "" : "s"} remaining`
                                : "Does not use a balance"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <HrSectionCard
                      title="Request leave"
                      description="HR reviews this request. Paid types cannot exceed your remaining days."
                    >
                      {!leaveTypes.length ? (
                        <p className="text-sm text-muted-foreground">
                          HR has not configured leave types yet.
                        </p>
                      ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Select
                            value={form.leaveType}
                            onValueChange={(leaveType) =>
                              setForm((f) => ({ ...f, leaveType }))
                            }
                          >
                            <SelectTrigger className="h-10 w-full bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {leaveTypes.map((type) => (
                                <SelectItem key={type.code} value={type.code}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Days</Label>
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            className="h-10 bg-background"
                            value={form.days}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                days: Number(e.target.value) || 1,
                              }))
                            }
                          />
                        </div>
                        <HotelDayPicker
                          label="From"
                          value={form.fromYmd}
                          onChange={(fromYmd) => {
                            const days = inclusiveLeaveDays(fromYmd, form.toYmd) || 1;
                            setForm((f) => ({ ...f, fromYmd, days }));
                          }}
                        />
                        <HotelDayPicker
                          label="To"
                          value={form.toYmd}
                          onChange={(toYmd) => {
                            const days = inclusiveLeaveDays(form.fromYmd, toYmd) || 1;
                            setForm((f) => ({ ...f, toYmd, days }));
                          }}
                        />
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Reason</Label>
                          <Textarea
                            value={form.reason}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, reason: e.target.value }))
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <PendingButton
                            className="h-11 w-full"
                            pending={pending}
                            onClick={() => void submitLeave()}
                          >
                            Submit leave request
                          </PendingButton>
                        </div>
                      </div>
                      )}
                    </HrSectionCard>
                    <HrSectionCard title="My requests">
                      {leave.length ? (
                        <div className="space-y-2">
                          {leave.map((row) => (
                            <div
                              key={row.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {leaveTypes.find((type) => type.code === row.leaveType)?.label ||
                                    row.leaveType}{" "}
                                  · {row.fromYmd} → {row.toYmd}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.days} day{row.days === 1 ? "" : "s"}
                                  {row.reason ? ` · ${row.reason}` : ""}
                                </p>
                              </div>
                              <HrStatusBadge status={row.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <HrEmptyState
                          title="No leave requests yet"
                          description="Submit a request above. HR will approve or reject it."
                        />
                      )}
                    </HrSectionCard>
                  </HrPanelShell>
                ) : (
                  <HrPanelShell>
                    <HrSectionCard
                      title="My payslips"
                      description="Closed payroll periods for your employee record."
                    >
                      {payslips.length ? (
                        <div className="space-y-2">
                          {payslips.map((row) => (
                            <div
                              key={row.id}
                              className="rounded-lg border border-border/60 px-3 py-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium">
                                  Period {row.notes || `#${row.periodId}`}
                                </p>
                                <p className="text-sm font-semibold">
                                  {formatETB(row.netPayETB || 0)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Base {formatETB(row.basePayETB || 0)} · OT{" "}
                                {formatETB(row.overtimeETB || 0)} · Tips{" "}
                                {formatETB(row.tipsETB || 0)} · Deductions{" "}
                                {formatETB(row.deductionsETB || 0)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <HrEmptyState
                          title="No payslips yet"
                          description="Payslips appear here after HR closes a payroll period."
                        />
                      )}
                    </HrSectionCard>
                  </HrPanelShell>
                )}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
