"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  Users,
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
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { logoutAction, notifyApiFailure } from "@/lib/actions";
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import { addDaysYmd, hrDepartmentCodesForBusiness } from "@/lib/hrConstraints";
import { HR_SECTION_COPY } from "@/components/hr/hrChrome";
import { HrOverviewPanel } from "@/components/hr/HrOverviewPanel";
import { HrEmployeesPanel } from "@/components/hr/HrEmployeesPanel";
import { HrLeavePanel } from "@/components/hr/HrLeavePanel";
import { HrAttendancePanel } from "@/components/hr/HrAttendancePanel";
import { HrDocumentsPanel } from "@/components/hr/HrDocumentsPanel";
import { HrPayrollPanel } from "@/components/hr/HrPayrollPanel";
import { HrIncidentsPanel } from "@/components/hr/HrIncidentsPanel";
import {
  fetchHrAttendance,
  fetchHrDashboardStats,
  fetchHrDocuments,
  fetchHrEmployees,
  fetchHrIncidents,
  fetchHrLeaveRequests,
  fetchHrPayrollPeriods,
  fetchHrPayslips,
  fetchHrShifts,
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

export type HrSection =
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
  { id: "attendance", label: "Attendance", icon: ClipboardList },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
];

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HrDashboard({
  embedded = false,
  section: sectionProp,
}: {
  embedded?: boolean;
  section?: HrSection;
}) {
  useTenantRouteGuard({
    requiredModule: "HR Module",
    roles: embedded ? undefined : ["HR", "Admin", "Manager"],
  });
  const searchParams = useSearchParams();
  const { displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";
  const headerLabel = displayName || "HR";

  const [internalSection, setInternalSection] = useState<HrSection>("dashboard");
  const section = sectionProp ?? internalSection;
  const setSection = (next: HrSection) => {
    if (!sectionProp) setInternalSection(next);
  };
  const showEmbeddedTabs = embedded && !sectionProp;
  const copy = HR_SECTION_COPY[section] ?? HR_SECTION_COPY.dashboard;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessType, setBusinessType] = useState("");
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
  const [timeFrom, setTimeFrom] = useState(() => addDaysYmd(todayYmd(), -14));
  const [timeTo, setTimeTo] = useState(() => addDaysYmd(todayYmd(), 14));
  const [actorRole, setActorRole] = useState("");

  useEffect(() => {
    try {
      setBusinessType(localStorage.getItem("business_type")?.trim() || "");
      setActorRole(localStorage.getItem("user_role")?.trim() || "");
    } catch {
      setBusinessType("");
      setActorRole("");
    }
  }, []);

  const departmentCodes = useMemo(
    () => hrDepartmentCodesForBusiness(businessType),
    [businessType],
  );

  const loadAll = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      try {
        const from = timeFrom <= timeTo ? timeFrom : timeTo;
        const to = timeFrom <= timeTo ? timeTo : timeFrom;
        const [st, emps, lv, att, sh, documents, pr, inc] = await Promise.all([
          fetchHrDashboardStats(),
          fetchHrEmployees(),
          fetchHrLeaveRequests(),
          fetchHrAttendance(from, to),
          fetchHrShifts(from, to),
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
        setSelectedPeriodId((current) => current ?? pr[0]?.id ?? null);
      } catch (e) {
        notifyApiFailure(e, "Could not load HR data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeFrom, timeTo],
  );

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

  const panel = loading ? (
    <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading HR workspace…
    </div>
  ) : (
    <>
      {section === "dashboard" && stats ? (
        <HrOverviewPanel
          stats={stats}
          employees={employees}
          leave={leave}
          shifts={shifts}
        />
      ) : null}
      {section === "employees" ? (
        <HrEmployeesPanel
          employees={employees}
          departmentCodes={departmentCodes}
          onRefresh={() => loadAll(true)}
        />
      ) : null}
      {section === "leave" ? (
        <HrLeavePanel
          leave={leave}
          employees={employees}
          actorRole={actorRole}
          onRefresh={() => loadAll(true)}
        />
      ) : null}
      {section === "attendance" ? (
        <HrAttendancePanel
          employees={employees}
          attendance={attendance}
          shifts={shifts}
          timeFrom={timeFrom}
          timeTo={timeTo}
          onTimeFromChange={setTimeFrom}
          onTimeToChange={setTimeTo}
          onRefresh={() => loadAll(true)}
        />
      ) : null}
      {section === "documents" ? (
        <HrDocumentsPanel
          employees={employees}
          documents={docs}
          onRefresh={() => loadAll(true)}
        />
      ) : null}
      {section === "payroll" ? (
        <HrPayrollPanel
          periods={periods}
          payslips={payslips}
          selectedPeriodId={selectedPeriodId}
          onSelectedPeriodChange={setSelectedPeriodId}
          onPayslipsChange={setPayslips}
          onRefresh={() => loadAll(true)}
        />
      ) : null}
      {section === "incidents" ? (
        <HrIncidentsPanel
          employees={employees}
          incidents={incidents}
          onRefresh={() => loadAll(true)}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        {showEmbeddedTabs ? (
          <div className="flex flex-wrap gap-2">
            {NAV.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={section === item.id ? "default" : "outline"}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </Button>
            ))}
            <RefreshIconButton
              busy={refreshing}
              disabled={loading}
              onClick={() => void loadAll(true)}
            />
          </div>
        ) : null}
        {panel}
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <SidebarProvider>
        <div className="flex min-h-svh w-full bg-muted/40">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
            <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
              <div className="flex h-full min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                    Terminal
                  </p>
                  <span className="block truncate font-semibold leading-tight">HR</span>
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
              <div className="mx-auto max-w-6xl space-y-8 pb-10">
                <div className="space-y-4 rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-rose-500/8 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                        {copy.title}
                      </h2>
                      <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
                        {copy.description}
                      </p>
                    </div>
                  </div>
                  <HotelWorkflowGlossary variant="manager" topic="hr" />
                </div>
                {panel}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
