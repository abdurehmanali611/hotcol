"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  History,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  HrEmptyState,
  HrMetricCard,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import { HR_WAGE_LABELS, HR_WAGE_TYPES } from "@/lib/hrConstraints";
import {
  formatPayrollWeeksLabel,
  inclusiveDayCount,
  namedMonthFromPayRange,
  payrollWeeksInRange,
} from "@/lib/hrPayrollMonth";
import { downloadPayslipPdf, downloadPayslipPdfs } from "@/lib/hrPayslipPdf";
import { formatETB } from "@/lib/subscriptionModules";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  approveHrPayslipsPaymentApi,
  createHrPayrollPeriodApi,
  fetchHrPayrollLineRules,
  fetchHrPayslips,
  fetchHrWagePayWindows,
  markHrPayslipsPaidApi,
  replaceHrPayrollLineRulesApi,
  replaceHrWagePayWindowsApi,
  type HrEmployee,
  type HrPayrollPeriod,
  type HrPayslip,
  type HrWagePayWindow,
} from "@/lib/api/hr";

const fieldClass = "min-w-0";
const triggerClass = "h-10 w-full min-w-0 justify-between bg-background";
const inputClass = "h-10 w-full min-w-0 bg-background";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type LineDraft = {
  key: string;
  kind: "deduction" | "increase";
  label: string;
  percentOfSalary: number;
  percentText: string;
  whenMode: "always" | "day_range";
  fromDay: number;
  toDay: number;
};

function formatPercentText(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n);
}

function parsePercentInput(raw: string): { text: string; value: number } | null {
  if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return null;
  if (raw === "" || raw === ".") return { text: raw, value: 0 };
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 100) return { text: "100", value: 100 };
  if (n < 0) return { text: "0", value: 0 };
  return { text: raw, value: n };
}

type WindowDraft = {
  key: string;
  wageType: string;
  fromDay: number;
  toDay: number;
};

export function HrPayrollPanel({
  view,
  periods,
  payslips,
  selectedPeriodId,
  onSelectedPeriodChange,
  onPayslipsChange,
  onRefresh,
  employees = [],
  canRunPayroll = true,
  canConfigurePayroll = false,
  canApprovePayrollPayment = false,
}: {
  view: "generate" | "runs" | "settings" | "history";
  periods: HrPayrollPeriod[];
  payslips: HrPayslip[];
  selectedPeriodId: number | null;
  onSelectedPeriodChange: (id: number | null) => void;
  onPayslipsChange: (rows: HrPayslip[]) => void;
  onRefresh: () => Promise<void>;
  employees?: HrEmployee[];
  canRunPayroll?: boolean;
  canConfigurePayroll?: boolean;
  canApprovePayrollPayment?: boolean;
}) {
  const [fromYmd, setFromYmd] = useState(todayYmd());
  const [toYmd, setToYmd] = useState(todayYmd());
  const [generateScope, setGenerateScope] = useState("batch");
  const [payWindows, setPayWindows] = useState<HrWagePayWindow[]>([]);
  const [pending, setPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [historyMode, setHistoryMode] = useState(false);
  const [historyRows, setHistoryRows] = useState<HrPayslip[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [windowDrafts, setWindowDrafts] = useState<WindowDraft[]>([]);
  const [configLoading, setConfigLoading] = useState(false);

  const selected = periods.find((p) => p.id === selectedPeriodId) ?? null;
  const namedPreview = useMemo(() => {
    try {
      if (toYmd < fromYmd) return null;
      return namedMonthFromPayRange(fromYmd, toYmd);
    } catch {
      return null;
    }
  }, [fromYmd, toYmd]);

  const rangeDays = useMemo(
    () => inclusiveDayCount(fromYmd, toYmd),
    [fromYmd, toYmd],
  );

  const activeEmployees = useMemo(
    () =>
      employees.filter(
        (e) => e.status === "active" || e.status === "on_leave",
      ),
    [employees],
  );

  const requiredMinDays = useMemo(() => {
    if (/^\d+$/.test(generateScope)) {
      const emp = activeEmployees.find((e) => String(e.id) === generateScope);
      const wt = emp?.wageType || "";
      const w = payWindows.find((row) => row.wageType === wt);
      return Number(w?.fromDay) || 0;
    }
    if (generateScope === "monthly" || generateScope === "weekly") {
      const w = payWindows.find((row) => row.wageType === generateScope);
      return Number(w?.fromDay) || 0;
    }
    return payWindows.reduce(
      (max, w) => Math.max(max, Number(w.fromDay) || 0),
      0,
    );
  }, [activeEmployees, generateScope, payWindows]);

  const unpaidIds = useMemo(
    () => payslips.filter((p) => p.paymentStatus === "unpaid").map((p) => p.id),
    [payslips],
  );
  const markedIds = useMemo(
    () =>
      payslips
        .filter((p) => p.paymentStatus === "marked_paid")
        .map((p) => p.id),
    [payslips],
  );
  const approvedCount = useMemo(
    () => payslips.filter((p) => p.paymentStatus === "approved").length,
    [payslips],
  );
  const totalNet = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.netPayETB || 0), 0),
    [payslips],
  );

  useEffect(() => {
    if (view !== "generate" && view !== "settings") return;
    let cancelled = false;
    void (async () => {
      try {
        const windows = await fetchHrWagePayWindows();
        if (cancelled) return;
        setPayWindows(windows.filter((w) => w.active !== false));
      } catch {
        /* settings load also surfaces errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (!canConfigurePayroll || view !== "settings") return;
    let cancelled = false;
    void (async () => {
      setConfigLoading(true);
      try {
        const [rules, windows] = await Promise.all([
          fetchHrPayrollLineRules(),
          fetchHrWagePayWindows(),
        ]);
        if (cancelled) return;
        setLineDrafts(
          rules.map((r, i) => {
            const pct = Number(r.percentOfSalary) || 0;
            return {
              key: `rule-${r.id}-${i}`,
              kind: r.kind === "increase" ? "increase" : "deduction",
              label: r.label,
              percentOfSalary: pct,
              percentText: formatPercentText(pct),
              whenMode: r.whenMode === "day_range" ? "day_range" : "always",
              fromDay: r.fromDay || 1,
              toDay: r.toDay || 31,
            };
          }),
        );
        setWindowDrafts(
          windows.map((w, i) => ({
            key: `win-${w.id}-${i}`,
            wageType: (HR_WAGE_TYPES as readonly string[]).includes(w.wageType)
              ? w.wageType
              : "monthly",
            fromDay: w.fromDay,
            toDay: w.toDay,
          })),
        );
      } catch (e) {
        notifyApiFailure(e, "Could not load payroll settings");
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canConfigurePayroll, view]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedPeriodId, payslips]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const rows = await fetchHrPayslips();
      setHistoryRows(rows);
      setHistoryMode(true);
    } catch (e) {
      notifyApiFailure(e, "Could not load payslip history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view !== "history") return;
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per visit
  }, [view]);

  const toggleId = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  };

  const columns = useMemo<ColumnDef<HrPayslip>[]>(
    () => [
      {
        id: "select",
        header: () => {
          if (historyMode) return null;
          if (canRunPayroll && unpaidIds.length) {
            return (
              <Checkbox
                checked={
                  unpaidIds.length > 0 &&
                  unpaidIds.every((id) => selectedIds.includes(id))
                }
                onCheckedChange={(v) => {
                  if (v) setSelectedIds(unpaidIds);
                  else setSelectedIds([]);
                }}
                aria-label="Select unpaid"
              />
            );
          }
          if (canApprovePayrollPayment && markedIds.length) {
            return (
              <Checkbox
                checked={
                  markedIds.length > 0 &&
                  markedIds.every((id) => selectedIds.includes(id))
                }
                onCheckedChange={(v) => {
                  if (v) setSelectedIds(markedIds);
                  else setSelectedIds([]);
                }}
                aria-label="Select awaiting approval"
              />
            );
          }
          return null;
        },
        cell: ({ row }) => {
          if (historyMode) return null;
          const canCheck =
            canRunPayroll && row.original.paymentStatus === "unpaid";
          const canApproveCheck =
            canApprovePayrollPayment &&
            row.original.paymentStatus === "marked_paid";
          if (!canCheck && !canApproveCheck) return null;
          return (
            <Checkbox
              checked={selectedIds.includes(row.original.id)}
              onCheckedChange={(v) => toggleId(row.original.id, Boolean(v))}
              aria-label={`Select ${row.original.employeeName}`}
            />
          );
        },
      },
      {
        accessorKey: "payslipNumber",
        header: "Payslip #",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {row.original.payslipNumber || "—"}
          </span>
        ),
      },
      {
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.original.employeeName ||
                row.original.employee?.fullName ||
                `#${row.original.employeeId}`}
            </p>
            {row.original.jobTitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.jobTitle}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "taxPeriod",
        header: "Month",
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="border-emerald-500/20 bg-emerald-500/10 font-normal text-emerald-800 dark:text-emerald-300"
          >
            {row.original.taxPeriod || "—"}
          </Badge>
        ),
      },
      {
        id: "wage",
        header: "Wage",
        cell: ({ row }) => {
          const slip = row.original;
          const wt = String(slip.wageType || "").trim();
          const label =
            HR_WAGE_LABELS[wt as keyof typeof HR_WAGE_LABELS] || wt || "—";
          if (wt !== "weekly") {
            return <span className="text-sm">{label}</span>;
          }
          const from = slip.period?.fromYmd || selected?.fromYmd || "";
          const to = slip.period?.toYmd || selected?.toYmd || "";
          let weeks = 0;
          const noteMatch = String(slip.notes || "").match(
            /payrollWeeks=([\d.]+)/,
          );
          if (noteMatch) weeks = Number(noteMatch[1]) || 0;
          else if (from && to) weeks = payrollWeeksInRange(from, to);
          return (
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {weeks > 0
                  ? formatPayrollWeeksLabel(weeks)
                  : "Payroll / week"}
              </p>
            </div>
          );
        },
      },
      {
        id: "net",
        header: () => <span className="block w-full text-right">Net pay</span>,
        cell: ({ row }) => (
          <span className="block text-right font-semibold tabular-nums">
            {formatETB(row.original.netPayETB)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Payment",
        cell: ({ row }) => (
          <HrStatusBadge status={row.original.paymentStatus} />
        ),
      },
      {
        id: "pdf",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10"
            onClick={async () => {
              try {
                await downloadPayslipPdf(row.original);
              } catch (e) {
                notifyApiFailure(e, "Could not generate PDF");
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        ),
      },
    ],
    [
      canApprovePayrollPayment,
      canRunPayroll,
      historyMode,
      markedIds,
      selected,
      selectedIds,
      unpaidIds,
    ],
  );

  const historyColumns = useMemo<ColumnDef<HrPayslip>[]>(
    () =>
      columns.map((col) =>
        col.id === "select"
          ? { ...col, cell: () => null, header: () => null }
          : col,
      ) as ColumnDef<HrPayslip>[],
    [columns],
  );

  const saveConfig = async () => {
    setPending(true);
    try {
      await Promise.all([
        replaceHrPayrollLineRulesApi(
          lineDrafts
            .filter((r) => r.label.trim())
            .map((r) => ({
              kind: r.kind,
              label: r.label.trim(),
              percentOfSalary: r.percentOfSalary,
              amountETB: 0,
              whenMode: r.whenMode,
              fromDay: r.whenMode === "day_range" ? r.fromDay : null,
              toDay: r.whenMode === "day_range" ? r.toDay : null,
              active: true,
            })),
        ),
        replaceHrWagePayWindowsApi(
          windowDrafts
            .filter((w) => w.wageType)
            .map((w) => ({
              wageType: w.wageType,
              fromDay: w.fromDay,
              toDay: w.toDay,
              active: true,
            })),
        ),
      ]);
      toast.success("Payroll settings saved");
    } catch (e) {
      notifyApiFailure(e, "Could not save payroll settings");
    } finally {
      setPending(false);
    }
  };

  return (
    <HrPanelShell>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HrMetricCard
          label="Payroll runs"
          value={periods.length}
          hint="Generated pay periods"
          accent="from-emerald-500/15 border-emerald-500/25"
          icon={<Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        />
        <HrMetricCard
          label="Payslips in run"
          value={payslips.length}
          hint={selected ? `${selected.fromYmd} → ${selected.toYmd}` : "Select a run"}
          accent="from-teal-500/15 border-teal-500/25"
          icon={<FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
        />
        <HrMetricCard
          label="Net in run"
          value={formatETB(totalNet)}
          hint={`${approvedCount} approved`}
          accent="from-cyan-500/15 border-cyan-500/25"
          icon={<Banknote className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />}
        />
        <HrMetricCard
          label="Named month"
          value={selected?.monthName || namedPreview?.monthName || "—"}
          hint="Most days in From–To"
          accent="from-primary/10 border-primary/20"
          icon={<Sparkles className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="space-y-4">
        {view === "generate" && canRunPayroll ? (
          <div className="space-y-4">
            <HrSectionCard
              title="Generate payslips"
              description="Payslips include gross pay, common rules, incident pay impact, unpaid leave (daily rate), and attendance-linked deductions for the From–To range. The incident occurred date must fall inside From–To. Re-generating the same open From–To replaces the run so new incidents are included."
              icon={
                <CalendarRange className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              }
              accent="bg-linear-to-r from-emerald-500 via-teal-400 to-primary/70"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-4 rounded-xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={fieldClass}>
                      <HotelDayPicker
                        label="From"
                        value={fromYmd}
                        onChange={setFromYmd}
                        compact
                      />
                    </div>
                    <div className={fieldClass}>
                      <HotelDayPicker
                        label="To"
                        value={toYmd}
                        onChange={setToYmd}
                        compact
                      />
                    </div>
                  </div>

                  <div className={cn(fieldClass, "space-y-1.5")}>
                    <Label className="text-xs text-muted-foreground">
                      Scope
                    </Label>
                    <Select
                      value={generateScope}
                      onValueChange={setGenerateScope}
                    >
                      <SelectTrigger className={triggerClass}>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batch">
                          Batch — monthly + weekly
                        </SelectItem>
                        <SelectItem value="monthly">
                          Monthly wage type
                        </SelectItem>
                        <SelectItem value="weekly">
                          Weekly wage type
                        </SelectItem>
                        {activeEmployees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.fullName} (
                            {HR_WAGE_LABELS[
                              e.wageType as keyof typeof HR_WAGE_LABELS
                            ] || e.wageType}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Batch pays both wage types. Monthly / Weekly pays only
                      that type. From–To must span at least the wage window
                      “from day” (
                      {requiredMinDays > 0
                        ? `${requiredMinDays} day${requiredMinDays === 1 ? "" : "s"} min`
                        : "configure windows in Settings"}
                      ; current range {rangeDays || 0} day
                      {rangeDays === 1 ? "" : "s"}
                      ).
                    </p>
                  </div>

                  <PendingButton
                    pending={pending}
                    className="w-full gap-2 sm:w-auto"
                    onClick={async () => {
                      if (toYmd < fromYmd) {
                        toast.error("To date must not be before From date");
                        return;
                      }
                      if (requiredMinDays > 0 && rangeDays < requiredMinDays) {
                        toast.error(
                          `From–To must cover at least ${requiredMinDays} days for this scope`,
                        );
                        return;
                      }
                      setPending(true);
                      try {
                        const isEmployee = /^\d+$/.test(generateScope);
                        const period = await createHrPayrollPeriodApi({
                          fromYmd,
                          toYmd,
                          employeeIds: isEmployee
                            ? [Number(generateScope)]
                            : undefined,
                          wageScope: isEmployee
                            ? undefined
                            : (generateScope as
                                | "batch"
                                | "monthly"
                                | "weekly"),
                        });
                        toast.success(
                          `Generated payslips for ${period.monthName}`,
                        );
                        await onRefresh();
                        onSelectedPeriodChange(period.id);
                        const rows = await fetchHrPayslips(period.id);
                        onPayslipsChange(rows);
                      } catch (e) {
                        notifyApiFailure(e, "Could not generate payroll");
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {/^\d+$/.test(generateScope)
                      ? "Generate single payslip"
                      : generateScope === "monthly"
                        ? "Generate monthly payslips"
                        : generateScope === "weekly"
                          ? "Generate weekly payslips"
                          : "Generate batch payslips"}
                  </PendingButton>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-card to-teal-500/5 p-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400">
                      Payslip month preview
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {namedPreview?.monthName || "—"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {namedPreview
                        ? `${namedPreview.periodKey} · ${namedPreview.dayCount} day${namedPreview.dayCount === 1 ? "" : "s"} in this month`
                        : "Choose a valid From–To range"}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
                      <CalendarRange className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="tabular-nums">
                        {fromYmd} → {toYmd}
                        {rangeDays > 0 ? ` · ${rangeDays}d` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-teal-600" />
                      <span>
                        {/^\d+$/.test(generateScope)
                          ? "One employee PDF"
                          : generateScope === "weekly"
                            ? "Weekly employees (weeks on payslip)"
                            : generateScope === "monthly"
                              ? "Monthly employees"
                              : "Monthly + weekly employees"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </HrSectionCard>
          </div>
        ) : null}

        {view === "runs" ? (
          <div className="space-y-4">
          <HrSectionCard
            title="Runs & payment"
            description="Select a run, download PDFs, mark paid (HR), then Manager approves."
            icon={
              <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            }
            accent="bg-linear-to-r from-teal-500 via-cyan-400 to-emerald-400/80"
          >
            <div className="mb-4 rounded-xl border border-border/70 bg-muted/20 p-4">
              <Label className="text-xs text-muted-foreground">
                Payroll run
              </Label>
              <Select
                value={selectedPeriodId ? String(selectedPeriodId) : ""}
                onValueChange={(v) => {
                  setHistoryMode(false);
                  onSelectedPeriodChange(Number(v));
                }}
              >
                <SelectTrigger className={cn(triggerClass, "mt-1.5")}>
                  <SelectValue placeholder="Choose a payroll run" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="font-medium">
                        {p.monthName || p.periodKey}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {p.fromYmd} → {p.toYmd} · {p.status}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selected ? (
              <HrEmptyState
                title="No run selected"
                description="Generate a payroll run first, or pick one above."
                icon={<Wallet className="h-7 w-7" />}
              />
            ) : payslips.length ? (
              <>
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-teal-500/15 bg-muted/30 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {payslips.length} payslip
                      {payslips.length === 1 ? "" : "s"}
                    </Badge>
                    {selectedIds.length ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-800 dark:text-emerald-300">
                        {selectedIds.length} selected
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canRunPayroll ? (
                      <PendingButton
                        pending={pending}
                        size="sm"
                        className="gap-1.5"
                        disabled={
                          !selectedIds.some((id) => unpaidIds.includes(id))
                        }
                        onClick={async () => {
                          const ids = selectedIds.filter((id) =>
                            unpaidIds.includes(id),
                          );
                          if (!ids.length) {
                            toast.error("Select unpaid payslips");
                            return;
                          }
                          setPending(true);
                          try {
                            await markHrPayslipsPaidApi(ids);
                            toast.success(
                              "Marked paid — waiting for Manager",
                            );
                            const rows = await fetchHrPayslips(selected.id);
                            onPayslipsChange(rows);
                            await onRefresh();
                          } catch (e) {
                            notifyApiFailure(e, "Could not mark paid");
                          } finally {
                            setPending(false);
                          }
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark paid (HR)
                      </PendingButton>
                    ) : null}
                    {canApprovePayrollPayment ? (
                      <PendingButton
                        pending={pending}
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={
                          !selectedIds.some((id) => markedIds.includes(id))
                        }
                        onClick={async () => {
                          const ids = selectedIds.filter((id) =>
                            markedIds.includes(id),
                          );
                          if (!ids.length) {
                            toast.error("Select payslips awaiting approval");
                            return;
                          }
                          setPending(true);
                          try {
                            await approveHrPayslipsPaymentApi(ids);
                            toast.success("Payment approved");
                            const rows = await fetchHrPayslips(selected.id);
                            onPayslipsChange(rows);
                            await onRefresh();
                          } catch (e) {
                            notifyApiFailure(e, "Could not approve payment");
                          } finally {
                            setPending(false);
                          }
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve (Manager)
                      </PendingButton>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                      onClick={async () => {
                        try {
                          const targets = selectedIds.length
                            ? payslips.filter((p) =>
                                selectedIds.includes(p.id),
                              )
                            : payslips;
                          await downloadPayslipPdfs(targets);
                          toast.success(
                            `Downloaded ${targets.length} PDF${targets.length === 1 ? "" : "s"}`,
                          );
                        } catch (e) {
                          notifyApiFailure(e, "Could not download PDFs");
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                      {selectedIds.length ? ` (${selectedIds.length})` : "s"}
                    </Button>
                  </div>
                </div>
                <DataTable
                  columns={columns}
                  data={payslips}
                  searchColumnId="employeeName"
                  searchPlaceholder="Search payslips…"
                  pageSize={10}
                />
              </>
            ) : (
              <HrEmptyState
                title="No payslips in this run"
                description="Generate payroll for this range to create employee PDFs."
                icon={<FileText className="h-7 w-7" />}
              />
            )}
          </HrSectionCard>
        </div>
        ) : null}

        {view === "settings" && canConfigurePayroll ? (
          <div className="space-y-4">
            <HrSectionCard
              title="Wage-type pay windows"
              description="From day = minimum From–To calendar length (days) for that wage type. Batch generate uses the largest from-day across windows. To day is kept for reference."
              icon={
                <Settings2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              }
              accent="bg-linear-to-r from-sky-500 via-cyan-400 to-teal-400/80"
              actions={
                <PendingButton
                  pending={pending}
                  size="sm"
                  variant="outline"
                  onClick={saveConfig}
                >
                  Save all settings
                </PendingButton>
              }
            >
              {configLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
                </div>
              ) : !windowDrafts.length ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-sky-500/25 bg-muted/20 px-4 py-10 text-center">
                  <CalendarRange className="h-8 w-8 text-sky-600/80" />
                  <p className="max-w-sm text-sm text-muted-foreground">
                    No wage windows yet. Add when each wage type may be paid
                    (day of month → day of month).
                  </p>
                  <Button
                    type="button"
                    onClick={() =>
                      setWindowDrafts([
                        {
                          key: `win-new-${Date.now()}`,
                          wageType: "weekly",
                          fromDay: 5,
                          toDay: 8,
                        },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add first window
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-1 hidden px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_100px_100px_40px] lg:gap-2">
                    <span>Wage type</span>
                    <span className="text-center">Min days</span>
                    <span className="text-center">To day</span>
                    <span className="sr-only">Remove</span>
                  </div>
                  <ScrollArea className="h-[min(36vh,360px)]">
                    <div className="space-y-3 pr-3">
                      {windowDrafts.map((row, index) => (
                        <article
                          key={row.key}
                          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                        >
                          <div className="flex items-center gap-2 border-b border-border/50 bg-sky-500/5 px-4 py-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-800 dark:text-sky-300">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium">
                              {HR_WAGE_LABELS[
                                row.wageType as keyof typeof HR_WAGE_LABELS
                              ] || row.wageType}
                            </span>
                            <Badge variant="secondary" className="ml-auto font-normal tabular-nums">
                              Day {row.fromDay} → {row.toDay}
                            </Badge>
                          </div>
                          <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_100px_100px_40px] sm:items-end">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground sm:sr-only">
                                Wage type
                              </Label>
                              <Select
                                value={row.wageType}
                                onValueChange={(wageType) =>
                                  setWindowDrafts((prev) =>
                                    prev.map((r, i) =>
                                      i === index ? { ...r, wageType } : r,
                                    ),
                                  )
                                }
                              >
                                <SelectTrigger className={triggerClass}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {HR_WAGE_TYPES.map((w) => (
                                    <SelectItem key={w} value={w}>
                                      {HR_WAGE_LABELS[w]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground sm:sr-only">
                                Min days (from)
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                className={cn(inputClass, "text-center")}
                                value={row.fromDay}
                                onChange={(e) =>
                                  setWindowDrafts((prev) =>
                                    prev.map((r, i) =>
                                      i === index
                                        ? {
                                            ...r,
                                            fromDay: Math.min(
                                              31,
                                              Math.max(
                                                1,
                                                Number(e.target.value) || 1,
                                              ),
                                            ),
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground sm:sr-only">
                                To day
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                className={cn(inputClass, "text-center")}
                                value={row.toDay}
                                onChange={(e) =>
                                  setWindowDrafts((prev) =>
                                    prev.map((r, i) =>
                                      i === index
                                        ? {
                                            ...r,
                                            toDay: Math.min(
                                              31,
                                              Math.max(
                                                1,
                                                Number(e.target.value) || 1,
                                              ),
                                            ),
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setWindowDrafts((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              aria-label={`Remove window ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 sm:w-auto"
                    onClick={() =>
                      setWindowDrafts((prev) => [
                        ...prev,
                        {
                          key: `win-new-${Date.now()}`,
                          wageType: "weekly",
                          fromDay: 5,
                          toDay: 8,
                        },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add wage window
                  </Button>
                </div>
              )}
            </HrSectionCard>

            <HrSectionCard
              title="Common deductions & increases"
              description="Each line is a percent of the employee’s base salary (decimals allowed). Increases join Gross under Earnings; deductions list on the left."
              icon={
                <Banknote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              }
              accent="bg-linear-to-r from-amber-500 via-orange-400 to-rose-400/70"
            >
              {!lineDrafts.length ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-amber-500/25 bg-muted/20 px-4 py-10 text-center">
                  <Banknote className="h-8 w-8 text-amber-600/80" />
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Start empty. Add pension, transport, or bonuses as a % of
                    salary and when they apply.
                  </p>
                  <Button
                    type="button"
                    onClick={() =>
                      setLineDrafts([
                        {
                          key: `line-new-${Date.now()}`,
                          kind: "deduction",
                          label: "",
                          percentOfSalary: 0,
                          percentText: "",
                          whenMode: "always",
                          fromDay: 1,
                          toDay: 31,
                        },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add first line
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ScrollArea className="h-[min(42vh,420px)]">
                    <div className="space-y-3 pr-3">
                      {lineDrafts.map((row, index) => (
                        <article
                          key={row.key}
                          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  row.kind === "increase"
                                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                    : "bg-rose-500/15 text-rose-800 dark:text-rose-300",
                                )}
                              >
                                {index + 1}
                              </span>
                              {row.kind === "increase" ? (
                                <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-600" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 shrink-0 text-rose-600" />
                              )}
                              <span className="truncate text-sm font-medium">
                                {row.label.trim() ||
                                  (row.kind === "increase"
                                    ? "New increase"
                                    : "New deduction")}
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className="shrink-0 font-semibold tabular-nums"
                            >
                              {row.percentOfSalary || 0}% of salary
                            </Badge>
                          </div>
                          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[120px_minmax(0,1.2fr)_110px_120px_70px_70px_40px] lg:items-end">
                            <Select
                              value={row.kind}
                              onValueChange={(
                                kind: "deduction" | "increase",
                              ) =>
                                setLineDrafts((prev) =>
                                  prev.map((r, i) =>
                                    i === index ? { ...r, kind } : r,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className={triggerClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="deduction">
                                  Deduction
                                </SelectItem>
                                <SelectItem value="increase">
                                  Increase
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              className={inputClass}
                              value={row.label}
                              placeholder="Label"
                              onChange={(e) =>
                                setLineDrafts((prev) =>
                                  prev.map((r, i) =>
                                    i === index
                                      ? { ...r, label: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                            />
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground lg:sr-only">
                                % of salary
                              </Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                className={cn(
                                  inputClass,
                                  "text-center tabular-nums",
                                )}
                                value={row.percentText}
                                placeholder="0"
                                onChange={(e) => {
                                  const parsed = parsePercentInput(
                                    e.target.value,
                                  );
                                  if (!parsed) return;
                                  setLineDrafts((prev) =>
                                    prev.map((r, i) =>
                                      i === index
                                        ? {
                                            ...r,
                                            percentText: parsed.text,
                                            percentOfSalary: parsed.value,
                                          }
                                        : r,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <Select
                              value={row.whenMode}
                              onValueChange={(
                                whenMode: "always" | "day_range",
                              ) =>
                                setLineDrafts((prev) =>
                                  prev.map((r, i) =>
                                    i === index ? { ...r, whenMode } : r,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className={triggerClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="always">Always</SelectItem>
                                <SelectItem value="day_range">
                                  Day range
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              disabled={row.whenMode !== "day_range"}
                              className={cn(inputClass, "text-center")}
                              value={row.fromDay}
                              onChange={(e) =>
                                setLineDrafts((prev) =>
                                  prev.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          fromDay: Math.min(
                                            31,
                                            Math.max(
                                              1,
                                              Number(e.target.value) || 1,
                                            ),
                                          ),
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              disabled={row.whenMode !== "day_range"}
                              className={cn(inputClass, "text-center")}
                              value={row.toDay}
                              onChange={(e) =>
                                setLineDrafts((prev) =>
                                  prev.map((r, i) =>
                                    i === index
                                      ? {
                                          ...r,
                                          toDay: Math.min(
                                            31,
                                            Math.max(
                                              1,
                                              Number(e.target.value) || 1,
                                            ),
                                          ),
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setLineDrafts((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              aria-label={`Remove line ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                      onClick={() =>
                        setLineDrafts((prev) => [
                          ...prev,
                          {
                            key: `line-new-${Date.now()}`,
                            kind: "deduction",
                            label: "",
                            percentOfSalary: 0,
                            percentText: "",
                            whenMode: "always",
                            fromDay: 1,
                            toDay: 31,
                          },
                        ])
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add line
                    </Button>
                    <PendingButton pending={pending} onClick={saveConfig}>
                      Save settings
                    </PendingButton>
                  </div>
                </div>
              )}
            </HrSectionCard>
          </div>
        ) : null}

        {view === "history" ? (
          <div className="space-y-4">
          <HrSectionCard
            title="Payslip history"
            description="Read-only archive. Payment status cannot be changed here."
            icon={
              <History className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            }
            accent="bg-linear-to-r from-violet-500 via-fuchsia-400 to-rose-400/70"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={historyLoading}
                onClick={loadHistory}
              >
                {historyLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <History className="h-3.5 w-3.5" />
                )}
                {historyRows.length ? "Refresh" : "Load history"}
              </Button>
            }
          >
            {historyRows.length ? (
              <DataTable
                columns={historyColumns}
                data={historyRows}
                searchColumnId="employeeName"
                searchPlaceholder="Search history…"
                pageSize={10}
              />
            ) : (
              <HrEmptyState
                title="No history loaded"
                description="Load history to review past payslips without changing payment status."
                icon={<History className="h-7 w-7" />}
              />
            )}
          </HrSectionCard>
        </div>
        ) : null}
      </div>
    </HrPanelShell>
  );
}
