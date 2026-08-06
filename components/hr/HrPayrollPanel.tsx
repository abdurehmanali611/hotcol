"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Users, Wallet } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PendingButton } from "@/components/ui/pending-button";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrMetricCard,
  HrPanelShell,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/hrChrome";
import {
  firstYmdOfMonth,
  hrPayrollPeriodSchema,
  hrPayslipAdjustSchema,
  lastYmdOfMonth,
  monthKeyFromYmd,
  parseHrConstraint,
} from "@/lib/hrConstraints";
import { formatETB } from "@/lib/subscriptionModules";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";
import { notifyApiFailure } from "@/lib/actions";
import {
  closeHrPayrollPeriodApi,
  createHrPayrollPeriodApi,
  fetchHrPayslips,
  upsertHrPayslipApi,
  type HrPayrollPeriod,
  type HrPayslip,
} from "@/lib/api/hr";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HrPayrollPanel({
  periods,
  payslips,
  selectedPeriodId,
  onSelectedPeriodChange,
  onPayslipsChange,
  onRefresh,
  canRunPayroll = true,
}: {
  periods: HrPayrollPeriod[];
  payslips: HrPayslip[];
  selectedPeriodId: number | null;
  onSelectedPeriodChange: (id: number | null) => void;
  onPayslipsChange: (rows: HrPayslip[]) => void;
  onRefresh: () => Promise<void>;
  /** HR/Admin run payroll; Manager gets a read-only report. */
  canRunPayroll?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [edit, setEdit] = useState<HrPayslip | null>(null);
  const [draft, setDraft] = useState({
    tipsETB: 0,
    overtimeETB: 0,
    deductionsETB: 0,
  });
  const selected = periods.find((p) => p.id === selectedPeriodId) ?? null;
  const totalNet = payslips.reduce((sum, p) => sum + (p.netPayETB || 0), 0);
  const totalBase = payslips.reduce((sum, p) => sum + (p.basePayETB || 0), 0);
  const totalDeductions = payslips.reduce(
    (sum, p) => sum + (p.deductionsETB || 0),
    0,
  );
  const totalTips = payslips.reduce((sum, p) => sum + (p.tipsETB || 0), 0);
  const totalOvertime = payslips.reduce(
    (sum, p) => sum + (p.overtimeETB || 0),
    0,
  );

  const columns = useMemo<ColumnDef<HrPayslip>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) =>
          row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      {
        accessorKey: "basePayETB",
        header: "Base",
        cell: ({ row }) => formatETB(row.original.basePayETB),
      },
      {
        accessorKey: "overtimeETB",
        header: "Overtime",
        cell: ({ row }) => formatETB(row.original.overtimeETB),
      },
      {
        accessorKey: "tipsETB",
        header: "Tips",
        cell: ({ row }) => formatETB(row.original.tipsETB),
      },
      {
        accessorKey: "deductionsETB",
        header: "Deductions",
        cell: ({ row }) => formatETB(row.original.deductionsETB),
      },
      {
        accessorKey: "netPayETB",
        header: "Net",
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatETB(row.original.netPayETB)}
          </span>
        ),
      },
      ...(canRunPayroll
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEdit(row.original);
                      setDraft({
                        tipsETB: row.original.tipsETB,
                        overtimeETB: row.original.overtimeETB,
                        deductionsETB: row.original.deductionsETB,
                      });
                    }}
                  >
                    Adjust
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<HrPayslip>,
          ]
        : []),
    ],
    [canRunPayroll],
  );

  return (
    <HrPanelShell>
      <HrSectionCard
        title={canRunPayroll ? "Payroll periods" : "Payroll report"}
        description={
          canRunPayroll
            ? "A period covers the calendar month. Closing generates payslips from current salaries."
            : "Review periods and payslip totals prepared by HR. Open, close, and adjustments stay on the HR desk."
        }
        icon={
          <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        }
        accent="bg-linear-to-r from-emerald-500 via-teal-400 to-primary/70"
        actions={selected ? <HrStatusBadge status={selected.status} /> : null}
      >
        <div className="flex flex-wrap gap-3">
          {canRunPayroll ? (
            <PendingButton
              pending={pending}
              onClick={async () => {
                const key = monthKeyFromYmd(todayYmd());
                const parsed = parseHrConstraint(hrPayrollPeriodSchema, {
                  periodKey: key,
                  fromYmd: firstYmdOfMonth(key),
                  toYmd: lastYmdOfMonth(key),
                });
                if (!parsed.ok) {
                  toast.error(parsed.message);
                  return;
                }
                setPending(true);
                try {
                  await createHrPayrollPeriodApi(parsed.data);
                  toast.success("This month’s period is ready");
                  await onRefresh();
                } catch (e) {
                  notifyApiFailure(e, "Could not create period");
                } finally {
                  setPending(false);
                }
              }}
            >
              Create this month
            </PendingButton>
          ) : null}
          <Select
            value={selectedPeriodId ? String(selectedPeriodId) : ""}
            onValueChange={(v) => onSelectedPeriodChange(Number(v))}
          >
            <SelectTrigger className="h-10 w-56 bg-background">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.periodKey} · {p.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canRunPayroll && selected && selected.status !== "closed" ? (
            <HrConfirmAction
              title={`Close ${selected.periodKey}?`}
              description="Payslips will be generated from current employee salaries. The period itself cannot be reopened."
              confirmLabel="Close & generate"
              trigger={
                <Button variant="secondary">Close & generate payslips</Button>
              }
              onConfirm={async () => {
                try {
                  await closeHrPayrollPeriodApi(selected.id);
                  toast.success("Period closed");
                  await onRefresh();
                } catch (e) {
                  notifyApiFailure(e, "Close failed");
                }
              }}
            />
          ) : null}
        </div>
      </HrSectionCard>

      {selected || payslips.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HrMetricCard
            label="Payslips"
            value={payslips.length}
            hint={selected ? selected.periodKey : undefined}
            icon={<Users className="h-4 w-4" />}
          />
          <HrMetricCard
            label="Base pay"
            value={formatETB(totalBase)}
            accent="from-sky-500/10 border-sky-500/20"
          />
          <HrMetricCard
            label="Deductions"
            value={formatETB(totalDeductions)}
            hint={
              totalTips || totalOvertime
                ? `Tips ${formatETB(totalTips)} · OT ${formatETB(totalOvertime)}`
                : undefined
            }
            accent="from-amber-500/10 border-amber-500/20"
          />
          <HrMetricCard
            label="Net payroll"
            value={formatETB(totalNet)}
            accent="from-emerald-500/10 border-emerald-500/20"
            icon={<Wallet className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <HrSectionCard
        title="Payslips"
        description={
          payslips.length
            ? `Net payroll in view: ${formatETB(totalNet)}`
            : canRunPayroll
              ? "Close a period to generate payslips, then adjust tips and deductions."
              : "When HR closes a period, payslips appear here for review."
        }
      >
        {payslips.length ? (
          <DataTable
            columns={columns}
            data={payslips}
            searchPlaceholder="Search payslips…"
            pageSize={10}
            footerSummary={(rows) => (
              <span className="font-medium">
                Net{" "}
                {formatETB(
                  rows.reduce((sum, row) => sum + (row.netPayETB || 0), 0),
                )}
              </span>
            )}
          />
        ) : (
          <HrEmptyState
            title="No payslips yet"
            description={
              canRunPayroll
                ? "Create this month’s period and close it after salaries are current."
                : "Ask HR to close a payroll period to generate the report."
            }
          />
        )}
      </HrSectionCard>

      {canRunPayroll ? (
        <Dialog open={Boolean(edit)} onOpenChange={(open) => !open && setEdit(null)}>
          <DialogContent className={responsiveFormDialogClassName}>
            <DialogHeader>
              <DialogTitle>Adjust payslip</DialogTitle>
              <DialogDescription>
                Tips, overtime, and deductions for{" "}
                {edit?.employee?.fullName || "this employee"}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tips (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-10 bg-background"
                  value={draft.tipsETB}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      tipsETB: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Overtime (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-10 bg-background"
                  value={draft.overtimeETB}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      overtimeETB: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deductions (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-10 bg-background"
                  value={draft.deductionsETB}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      deductionsETB: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <PendingButton
                pending={pending}
                onClick={async () => {
                  if (!edit) return;
                  const parsed = parseHrConstraint(hrPayslipAdjustSchema, draft);
                  if (!parsed.ok) {
                    toast.error(parsed.message);
                    return;
                  }
                  setPending(true);
                  try {
                    await upsertHrPayslipApi({
                      periodId: edit.periodId,
                      employeeId: edit.employeeId,
                      basePayETB: edit.basePayETB,
                      overtimeETB:
                        parsed.data.overtimeETB ?? edit.overtimeETB,
                      tipsETB: parsed.data.tipsETB,
                      deductionsETB:
                        parsed.data.deductionsETB ?? edit.deductionsETB,
                    });
                    onPayslipsChange(await fetchHrPayslips(edit.periodId));
                    toast.success("Payslip updated");
                    setEdit(null);
                  } catch (e) {
                    notifyApiFailure(e, "Could not update payslip");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Save adjustment
              </PendingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </HrPanelShell>
  );
}
