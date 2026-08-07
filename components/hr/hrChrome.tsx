"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { hrStatusLabel } from "@/lib/hrConstraints";

export function HrPanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>{children}</div>
  );
}

export function HrSectionCard({
  title,
  description,
  icon,
  accent,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  accent?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/95 shadow-md ring-1 ring-black/4 dark:ring-white/8">
      {accent ? <div className={cn("h-1", accent)} /> : null}
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight md:text-xl">
            {icon}
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="max-w-3xl text-pretty leading-relaxed">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function HrMetricCard({
  label,
  value,
  hint,
  accent = "from-primary/10 border-primary/20",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-md bg-linear-to-br to-card",
        accent,
      )}
    >
      <CardHeader className="space-y-3 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight md:text-3xl">
              {value}
            </p>
          </div>
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/80">
              {icon}
            </span>
          ) : null}
        </div>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}

export function HrStatusBadge({ status }: { status: string }) {
  const variant =
    status === "terminated" || status === "rejected" || status === "absent"
      ? "destructive"
      : status === "pending" ||
          status === "on_leave" ||
          status === "open" ||
          status === "half_day" ||
          status === "late"
        ? "secondary"
        : status === "closed" || status === "approved"
          ? "outline"
          : "default";
  return <Badge variant={variant}>{hrStatusLabel(status)}</Badge>;
}

export function HrEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-muted-foreground/40">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
        {description}
      </p>
    </div>
  );
}

export const HR_SECTION_COPY: Record<
  string,
  { title: string; description: string }
> = {
  dashboard: {
    title: "HR · Overview",
    description:
      "Workforce snapshot for this property — headcount, leave pressure, scheduled shifts, and open payroll. Status, pay, leave, attendance, and incidents feed each other when you generate payslips.",
  },
  employees: {
    title: "HR · Employees",
    description:
      "Maintain the employee master — role, pay, bank, and hire details. Salary feeds payslips; approved leave overrides Active to On leave.",
  },
  leave: {
    title: "HR · Leave",
    description:
      "Configure leave types and approve requests (Manager/Admin). HR files leave for employees. Unpaid leave days deduct from payslips; approved leave marks attendance as On leave.",
  },
  attendance: {
    title: "HR · Attendance",
    description:
      "HR records clock in/out and schedules shifts. Employees on approved leave show as On leave (not absent) and cannot clock. Absence days can drive payroll when an incident type is linked to attendance.",
  },
  documents: {
    title: "HR · Documents",
    description:
      "Keep contract, ID, and certificate metadata on file. Upload the file elsewhere and store the link here.",
  },
  payroll: {
    title: "HR · Payroll",
    description:
      "HR generates payslips for a From–To range (month named by most days). Managers configure wage windows and common pay lines, then approve payments. History is read-only.",
  },
  "payroll-generate": {
    title: "HR · Payroll · Generate",
    description:
      "Create payslips for a From–To range. Lines include gross, common rules, recorded incidents, unpaid leave (daily rate), and attendance-linked deductions (e.g. absence).",
  },
  "payroll-runs": {
    title: "HR · Payroll · Runs & pay",
    description:
      "Open a payroll run, download employee PDFs, mark payslips paid, and approve payments.",
  },
  "payroll-settings": {
    title: "HR · Payroll · Settings",
    description:
      "Configure common deductions/increases and wage-type pay windows used when HR generates payslips.",
  },
  "payroll-history": {
    title: "HR · Payroll · History",
    description:
      "Read-only archive of approved payslips across payroll runs.",
  },
  incidents: {
    title: "HR · Incidents",
    description:
      "Configure incident types (Manager/Admin), optionally linked to attendance absences/lates. Recorded pay impact and linked attendance days appear on generated payslips.",
  },
  departments: {
    title: "HR · Departments",
    description:
      "Manager/Admin registers departments. HR selects them when scheduling shifts.",
  },
};
