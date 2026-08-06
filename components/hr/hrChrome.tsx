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
      : status === "pending" || status === "on_leave" || status === "open"
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
      "Workforce snapshot for this property — headcount, leave pressure, scheduled shifts, and open payroll.",
  },
  employees: {
    title: "HR · Employees",
    description:
      "Maintain the employee master — role, pay, and hire details used when HR files leave and when payroll is closed.",
  },
  leave: {
    title: "HR · Leave",
    description:
      "Configure leave types and approve requests (Manager/Admin). HR files leave for employees. On café properties, Admin handles the full leave workflow.",
  },
  attendance: {
    title: "HR · Attendance",
    description:
      "HR records clock in/out and schedules shifts. Manager and HR both review attendance and shift reports. On café properties, Admin owns the full attendance desk. Device punches (e.g. ZKTeco) can replace manual clocking later.",
  },
  documents: {
    title: "HR · Documents",
    description:
      "Keep contract, ID, and certificate metadata on file. Upload the file elsewhere and store the link here.",
  },
  payroll: {
    title: "HR · Payroll",
    description:
      "HR opens and closes periods and adjusts payslips. Managers review a read-only payroll report. On café properties, Admin runs payroll.",
  },
  incidents: {
    title: "HR · Incidents",
    description:
      "Configure incident types (Manager/Admin). HR records warnings and pay impacts. On café properties, Admin handles both.",
  },
  departments: {
    title: "HR · Departments",
    description:
      "Manager/Admin registers departments. HR selects them when scheduling shifts.",
  },
};
