"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Users,
  CalendarDays,
  Wallet,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { logoutAction, notifyApiFailure } from "@/lib/actions";
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
import { HOTEL_DEPARTMENT_CODES, DEPARTMENT_LABELS } from "@/lib/departments";
import {
  clockHrAttendanceApi,
  closeHrPayrollPeriodApi,
  createHrDocumentApi,
  createHrEmployeeApi,
  createHrIncidentApi,
  createHrLeaveRequestApi,
  createHrPayrollPeriodApi,
  createHrShiftApi,
  decideHrLeaveRequestApi,
  deleteHrDocumentApi,
  deleteHrIncidentApi,
  deleteHrShiftApi,
  fetchHrAttendance,
  fetchHrDashboardStats,
  fetchHrDocuments,
  fetchHrEmployees,
  fetchHrIncidents,
  fetchHrLeaveRequests,
  fetchHrPayrollPeriods,
  fetchHrPayslips,
  fetchHrShifts,
  terminateHrEmployeeApi,
  upsertHrLeaveBalanceApi,
  upsertHrPayslipApi,
  type HrAttendance,
  type HrDashboardStats,
  type HrDocument,
  type HrEmployee,
  type HrIncident,
  type HrLeaveRequest,
  type HrPayrollPeriod,
  type HrPayslip,
  type HrShift,
} from "@/lib/api/hr";

type HrSection =
  | "dashboard"
  | "employees"
  | "leave"
  | "attendance"
  | "documents"
  | "payroll"
  | "incidents";

const NAV: { id: HrSection; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "leave", label: "Leave", icon: CalendarDays },
  { id: "attendance", label: "Time & shifts", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
];

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey() {
  return todayYmd().slice(0, 7);
}

export function HrDashboard({ embedded = false }: { embedded?: boolean }) {
  useTenantRouteGuard({
    requiredModule: "HR Module",
    roles: embedded ? undefined : ["HR", "Admin", "Manager"],
  });
  const searchParams = useSearchParams();
  const { displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";

  const [section, setSection] = useState<HrSection>("dashboard");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const [stats, setStats] = useState<HrDashboardStats | null>(null);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [leave, setLeave] = useState<HrLeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<HrAttendance[]>([]);
  const [shifts, setShifts] = useState<HrShift[]>([]);
  const [docs, setDocs] = useState<HrDocument[]>([]);
  const [periods, setPeriods] = useState<HrPayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<HrPayslip[]>([]);
  const [incidents, setIncidents] = useState<HrIncident[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  const [empForm, setEmpForm] = useState({
    fullName: "",
    phone: "",
    department: "KITCHEN",
    jobTitle: "",
    wageType: "monthly",
    baseSalaryETB: 0,
    hireDate: todayYmd(),
  });
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    leaveType: "annual",
    fromYmd: todayYmd(),
    toYmd: todayYmd(),
    days: 1,
    reason: "",
  });
  const [shiftForm, setShiftForm] = useState({
    employeeId: "",
    workDate: todayYmd(),
    department: "",
    startTime: "08:00",
    endTime: "17:00",
  });
  const [docForm, setDocForm] = useState({
    employeeId: "",
    title: "",
    docType: "contract",
    fileUrl: "",
  });
  const [incidentForm, setIncidentForm] = useState({
    employeeId: "",
    kind: "warning",
    title: "",
    detail: "",
    occurredYmd: todayYmd(),
  });
  const [balanceForm, setBalanceForm] = useState({
    employeeId: "",
    leaveType: "annual",
    balanceDays: 0,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const day = todayYmd();
      const weekStart = day;
      const [
        st,
        emps,
        lv,
        att,
        sh,
        documents,
        pr,
        inc,
      ] = await Promise.all([
        fetchHrDashboardStats(),
        fetchHrEmployees(),
        fetchHrLeaveRequests(),
        fetchHrAttendance(weekStart, day),
        fetchHrShifts(weekStart, day),
        fetchHrDocuments(),
        fetchHrPayrollPeriods(),
        fetchHrIncidents(),
      ]);
      setStats(st);
      setEmployees(emps);
      setLeave(lv);
      setAttendance(att);
      setShifts(sh);
      setDocs(documents);
      setPeriods(pr);
      setIncidents(inc);
      if (pr.length && selectedPeriodId == null) {
        setSelectedPeriodId(pr[0].id);
      }
    } catch (e) {
      notifyApiFailure(e, "Could not load HR data");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (selectedPeriodId == null) {
      setPayslips([]);
      return;
    }
    void fetchHrPayslips(selectedPeriodId)
      .then(setPayslips)
      .catch((e) => notifyApiFailure(e, "Could not load payslips"));
  }, [selectedPeriodId]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "active" || e.status === "on_leave"),
    [employees],
  );

  const body = (
    <div className="space-y-6 p-4 md:p-6">
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading HR…
        </div>
      ) : null}

      {!loading && section === "dashboard" && stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Headcount", stats.headcount],
            ["On leave today", stats.onLeaveToday],
            ["Pending leave", stats.pendingLeave],
            ["Shifts today", stats.openShiftsToday],
            ["Open payroll", stats.openPayrollPeriods],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && section === "employees" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add employee</CardTitle>
              <CardDescription>
                Phase 2 employee master — link to credentials later via username.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={empForm.fullName}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={empForm.phone}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={empForm.department}
                  onValueChange={(v) =>
                    setEmpForm((f) => ({ ...f, department: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOTEL_DEPARTMENT_CODES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {DEPARTMENT_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job title</Label>
                <Input
                  value={empForm.jobTitle}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, jobTitle: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Wage type</Label>
                <Select
                  value={empForm.wageType}
                  onValueChange={(v) =>
                    setEmpForm((f) => ({ ...f, wageType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="tip_eligible">Tip eligible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Base salary (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  value={empForm.baseSalaryETB}
                  onChange={(e) =>
                    setEmpForm((f) => ({
                      ...f,
                      baseSalaryETB: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <PendingButton
                  pending={pending}
                  onClick={async () => {
                    if (!empForm.fullName.trim()) {
                      toast.error("Enter a name");
                      return;
                    }
                    setPending(true);
                    try {
                      await createHrEmployeeApi(empForm);
                      toast.success("Employee added");
                      setEmpForm({
                        fullName: "",
                        phone: "",
                        department: "KITCHEN",
                        jobTitle: "",
                        wageType: "monthly",
                        baseSalaryETB: 0,
                        hireDate: todayYmd(),
                      });
                      await loadAll();
                    } catch (e) {
                      notifyApiFailure(e, "Could not add employee");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Save employee
                </PendingButton>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Directory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {employees.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{e.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {DEPARTMENT_LABELS[e.department as keyof typeof DEPARTMENT_LABELS] ||
                        e.department}{" "}
                      · {e.jobTitle || "—"} · {e.status} ·{" "}
                      {e.baseSalaryETB.toLocaleString()} ETB
                    </p>
                  </div>
                  {e.status !== "terminated" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await terminateHrEmployeeApi(e.id, todayYmd());
                          toast.success("Terminated");
                          await loadAll();
                        } catch (err) {
                          notifyApiFailure(err, "Terminate failed");
                        }
                      }}
                    >
                      Terminate
                    </Button>
                  ) : null}
                </div>
              ))}
              {!employees.length ? (
                <p className="text-sm text-muted-foreground">No employees yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && section === "leave" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Set leave balance</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <Select
                value={balanceForm.employeeId}
                onValueChange={(v) =>
                  setBalanceForm((f) => ({ ...f, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={balanceForm.leaveType}
                onValueChange={(v) =>
                  setBalanceForm((f) => ({ ...f, leaveType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={balanceForm.balanceDays}
                onChange={(e) =>
                  setBalanceForm((f) => ({
                    ...f,
                    balanceDays: Number(e.target.value) || 0,
                  }))
                }
              />
              <PendingButton
                pending={pending}
                onClick={async () => {
                  if (!balanceForm.employeeId) return;
                  setPending(true);
                  try {
                    await upsertHrLeaveBalanceApi({
                      employeeId: Number(balanceForm.employeeId),
                      leaveType: balanceForm.leaveType,
                      balanceDays: balanceForm.balanceDays,
                    });
                    toast.success("Balance saved");
                  } catch (e) {
                    notifyApiFailure(e, "Balance failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Save balance
              </PendingButton>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request leave</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                value={leaveForm.employeeId}
                onValueChange={(v) =>
                  setLeaveForm((f) => ({ ...f, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={leaveForm.leaveType}
                onValueChange={(v) =>
                  setLeaveForm((f) => ({ ...f, leaveType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={leaveForm.fromYmd}
                onChange={(e) =>
                  setLeaveForm((f) => ({ ...f, fromYmd: e.target.value }))
                }
              />
              <Input
                type="date"
                value={leaveForm.toYmd}
                onChange={(e) =>
                  setLeaveForm((f) => ({ ...f, toYmd: e.target.value }))
                }
              />
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={leaveForm.days}
                onChange={(e) =>
                  setLeaveForm((f) => ({
                    ...f,
                    days: Number(e.target.value) || 1,
                  }))
                }
              />
              <Textarea
                placeholder="Reason"
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
              <PendingButton
                pending={pending}
                onClick={async () => {
                  if (!leaveForm.employeeId) return;
                  setPending(true);
                  try {
                    await createHrLeaveRequestApi({
                      employeeId: Number(leaveForm.employeeId),
                      leaveType: leaveForm.leaveType,
                      fromYmd: leaveForm.fromYmd,
                      toYmd: leaveForm.toYmd,
                      days: leaveForm.days,
                      reason: leaveForm.reason,
                    });
                    toast.success("Leave requested");
                    await loadAll();
                  } catch (e) {
                    notifyApiFailure(e, "Leave request failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Submit request
              </PendingButton>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leave.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {r.employee?.fullName || `#${r.employeeId}`} · {r.leaveType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.fromYmd} → {r.toYmd} ({r.days}d) · {r.status}
                    </p>
                  </div>
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await decideHrLeaveRequestApi(r.id, true);
                            toast.success("Approved");
                            await loadAll();
                          } catch (e) {
                            notifyApiFailure(e, "Approve failed");
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await decideHrLeaveRequestApi(r.id, false);
                            toast.success("Rejected");
                            await loadAll();
                          } catch (e) {
                            notifyApiFailure(e, "Reject failed");
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && section === "attendance" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clock / shift</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={shiftForm.employeeId}
                onValueChange={(v) =>
                  setShiftForm((f) => ({ ...f, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={shiftForm.workDate}
                onChange={(e) =>
                  setShiftForm((f) => ({ ...f, workDate: e.target.value }))
                }
              />
              <Input
                value={shiftForm.startTime}
                onChange={(e) =>
                  setShiftForm((f) => ({ ...f, startTime: e.target.value }))
                }
                placeholder="08:00"
              />
              <Input
                value={shiftForm.endTime}
                onChange={(e) =>
                  setShiftForm((f) => ({ ...f, endTime: e.target.value }))
                }
                placeholder="17:00"
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!shiftForm.employeeId) return;
                  try {
                    await clockHrAttendanceApi({
                      employeeId: Number(shiftForm.employeeId),
                      action: "in",
                    });
                    toast.success("Clocked in");
                    await loadAll();
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
                  if (!shiftForm.employeeId) return;
                  try {
                    await clockHrAttendanceApi({
                      employeeId: Number(shiftForm.employeeId),
                      action: "out",
                    });
                    toast.success("Clocked out");
                    await loadAll();
                  } catch (e) {
                    notifyApiFailure(e, "Clock out failed");
                  }
                }}
              >
                Clock out
              </Button>
              <PendingButton
                pending={pending}
                onClick={async () => {
                  if (!shiftForm.employeeId) return;
                  setPending(true);
                  try {
                    await createHrShiftApi({
                      employeeId: Number(shiftForm.employeeId),
                      workDate: shiftForm.workDate,
                      department: shiftForm.department,
                      startTime: shiftForm.startTime,
                      endTime: shiftForm.endTime,
                    });
                    toast.success("Shift added");
                    await loadAll();
                  } catch (e) {
                    notifyApiFailure(e, "Shift failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Add shift
              </PendingButton>
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {attendance.map((a) => (
                  <div key={a.id} className="rounded border px-3 py-2">
                    {a.employee?.fullName} · {a.workDate} · {a.status}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shifts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span>
                      {s.employee?.fullName} · {s.workDate} · {s.startTime}–
                      {s.endTime}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deleteHrShiftApi(s.id);
                          await loadAll();
                        } catch (e) {
                          notifyApiFailure(e, "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {!loading && section === "documents" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add document metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Select
                value={docForm.employeeId}
                onValueChange={(v) =>
                  setDocForm((f) => ({ ...f, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Title"
                value={docForm.title}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <Select
                value={docForm.docType}
                onValueChange={(v) =>
                  setDocForm((f) => ({ ...f, docType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="id">ID</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="File URL"
                value={docForm.fileUrl}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, fileUrl: e.target.value }))
                }
              />
              <PendingButton
                pending={pending}
                onClick={async () => {
                  if (!docForm.employeeId || !docForm.title.trim()) return;
                  setPending(true);
                  try {
                    await createHrDocumentApi({
                      employeeId: Number(docForm.employeeId),
                      title: docForm.title,
                      docType: docForm.docType,
                      fileUrl: docForm.fileUrl,
                    });
                    toast.success("Document saved");
                    await loadAll();
                  } catch (e) {
                    notifyApiFailure(e, "Document failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Save document
              </PendingButton>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-2">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <span>
                    {d.employee?.fullName} · {d.title} ({d.docType})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await deleteHrDocumentApi(d.id);
                        await loadAll();
                      } catch (e) {
                        notifyApiFailure(e, "Delete failed");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && section === "payroll" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll period</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <PendingButton
                pending={pending}
                onClick={async () => {
                  const key = monthKey();
                  setPending(true);
                  try {
                    await createHrPayrollPeriodApi({
                      periodKey: key,
                      fromYmd: `${key}-01`,
                      toYmd: todayYmd(),
                    });
                    toast.success("Period created");
                    await loadAll();
                  } catch (e) {
                    notifyApiFailure(e, "Period failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Create this month
              </PendingButton>
              <Select
                value={selectedPeriodId ? String(selectedPeriodId) : ""}
                onValueChange={(v) => setSelectedPeriodId(Number(v))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.periodKey} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriodId ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await closeHrPayrollPeriodApi(selectedPeriodId);
                      toast.success("Period closed — payslips generated");
                      await loadAll();
                    } catch (e) {
                      notifyApiFailure(e, "Close failed");
                    }
                  }}
                >
                  Close & generate payslips
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payslips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {payslips.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
                >
                  <span>
                    {p.employee?.fullName} · base {p.basePayETB} · tips {p.tipsETB}{" "}
                    · ded {p.deductionsETB} · net{" "}
                    <strong>{p.netPayETB}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const tips = Number(
                        prompt("Tips ETB", String(p.tipsETB)) ?? p.tipsETB,
                      );
                      try {
                        await upsertHrPayslipApi({
                          periodId: p.periodId,
                          employeeId: p.employeeId,
                          basePayETB: p.basePayETB,
                          overtimeETB: p.overtimeETB,
                          tipsETB: tips,
                          deductionsETB: p.deductionsETB,
                        });
                        const rows = await fetchHrPayslips(p.periodId);
                        setPayslips(rows);
                      } catch (e) {
                        notifyApiFailure(e, "Update failed");
                      }
                    }}
                  >
                    Edit tips
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && section === "incidents" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record incident</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Select
                value={incidentForm.employeeId}
                onValueChange={(v) =>
                  setIncidentForm((f) => ({ ...f, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={incidentForm.kind}
                onValueChange={(v) =>
                  setIncidentForm((f) => ({ ...f, kind: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="commendation">Commendation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Title"
                value={incidentForm.title}
                onChange={(e) =>
                  setIncidentForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <Textarea
                placeholder="Detail"
                value={incidentForm.detail}
                onChange={(e) =>
                  setIncidentForm((f) => ({ ...f, detail: e.target.value }))
                }
              />
              <PendingButton
                pending={pending}
                onClick={async () => {
                  if (!incidentForm.employeeId || !incidentForm.title.trim())
                    return;
                  setPending(true);
                  try {
                    await createHrIncidentApi({
                      employeeId: Number(incidentForm.employeeId),
                      kind: incidentForm.kind,
                      title: incidentForm.title,
                      detail: incidentForm.detail,
                      occurredYmd: incidentForm.occurredYmd,
                    });
                    toast.success("Incident recorded");
                    await loadAll();
                  } catch (e) {
                    notifyApiFailure(e, "Incident failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Save
              </PendingButton>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              {incidents.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span>
                    {i.employee?.fullName} · {i.kind} · {i.title}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await deleteHrIncidentApi(i.id);
                        await loadAll();
                      } catch (e) {
                        notifyApiFailure(e, "Delete failed");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {NAV.map((n) => (
            <Button
              key={n.id}
              size="sm"
              variant={section === n.id ? "default" : "outline"}
              onClick={() => setSection(n.id)}
            >
              {n.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void loadAll()}>
            Refresh
          </Button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <SidebarProvider>
        <div className="flex min-h-svh w-full">
          <Sidebar collapsible="icon">
            <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 py-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={logoUrl || undefined} alt="" />
                  <AvatarFallback>HR</AvatarFallback>
                </Avatar>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">HR Module</p>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={section === item.id}
                        onClick={() => setSection(item.id)}
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <SidebarSeparator />
              <ChangeOwnPasswordButton />
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => logoutAction()}
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Log out
                </span>
              </Button>
            </SidebarFooter>
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold">
                {NAV.find((n) => n.id === section)?.label || "HR"}
              </h1>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => void loadAll()}
              >
                Refresh
              </Button>
            </header>
            {body}
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
