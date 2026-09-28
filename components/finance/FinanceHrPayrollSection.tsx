"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Wallet,
  XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { HrOptionCombobox } from "@/components/hr/HrOptionCombobox";
import {
  HrEmptyState,
  HrMetricCard,
  HrSectionCard,
  HrStatusBadge,
  hrFieldClass,
  hrPrimaryBtnClass,
} from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import {
  decideHrPayslipsPaymentApi,
  fetchHrPayrollPeriods,
  fetchHrPayslips,
  type HrPayrollPeriod,
  type HrPayslip,
} from "@/lib/api/hr";
import { hrStatusLabel } from "@/lib/hrConstraints";
import { formatETB } from "@/lib/subscriptionModules";
import { cn } from "@/lib/utils";

function isAwaitingFinance(p: HrPayslip) {
  const st = String(p.paymentStatus || "");
  if (st === "awaiting_finance") return true;
  // Legacy: HR marked paid before Finance confirm existed
  if (st === "marked_paid" && !p.managerApprovedAt) return true;
  return false;
}

function periodLabel(p: HrPayrollPeriod) {
  const range = `${p.fromYmd} → ${p.toYmd}`;
  const name = p.monthName || p.periodKey;
  return name ? `${range} · ${name}` : range;
}

export function FinanceHrPayrollSection() {
  const [periods, setPeriods] = useState<HrPayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<HrPayslip[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlips, setLoadingSlips] = useState(false);
  const [pending, setPending] = useState(false);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchHrPayrollPeriods();
      setPeriods(rows);
      setSelectedPeriodId((prev) => {
        if (prev != null && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (e) {
      notifyApiFailure(e, "Could not load payroll periods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (selectedPeriodId == null) {
      setPayslips([]);
      return;
    }
    let cancelled = false;
    setLoadingSlips(true);
    void fetchHrPayslips(selectedPeriodId)
      .then((rows) => {
        if (!cancelled) setPayslips(rows);
      })
      .catch((e) => notifyApiFailure(e, "Could not load payslips"))
      .finally(() => {
        if (!cancelled) setLoadingSlips(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPeriodId]);

  const awaiting = useMemo(
    () => payslips.filter(isAwaitingFinance),
    [payslips],
  );
  const markedPaid = useMemo(
    () =>
      payslips.filter(
        (p) =>
          String(p.paymentStatus || "") === "marked_paid" &&
          Boolean(p.managerApprovedAt),
      ),
    [payslips],
  );
  const unpaid = useMemo(
    () =>
      payslips.filter((p) => String(p.paymentStatus || "") === "unpaid"),
    [payslips],
  );

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );

  const allAwaitingSelected =
    awaiting.length > 0 &&
    awaiting.every((p) => selectedIds.includes(p.id));

  const decide = async (approve: boolean) => {
    if (!selectedIds.length) {
      toast.error("Select payslips awaiting Finance");
      return;
    }
    setPending(true);
    try {
      await decideHrPayslipsPaymentApi(selectedIds, approve);
      toast.success(
        approve
          ? "Payment confirmed — marked paid"
          : "Mark-paid rejected — back to unpaid",
      );
      setSelectedIds([]);
      const rows = await fetchHrPayslips(selectedPeriodId!);
      setPayslips(rows);
      await loadPeriods();
    } catch (e) {
      notifyApiFailure(
        e,
        approve ? "Could not approve payment" : "Could not reject payment",
      );
    } finally {
      setPending(false);
    }
  };

  const triggerClass = cn(hrFieldClass, "justify-between");

  return (
    <div className="space-y-4">
      <HrSectionCard
        title="HR payroll"
        description="Confirm payslips after HR marks them paid. Only Finance approval finalizes Marked paid for employees."
        icon={
          <Banknote className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        }
        accent="bg-linear-to-r from-violet-500 via-indigo-400 to-indigo-400/80"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading payroll…
          </div>
        ) : periods.length === 0 ? (
          <HrEmptyState
            title="No payroll runs yet"
            description="When HR generates a payroll period, it will appear here for payment confirmation."
            icon={<Wallet className="h-7 w-7" />}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <HrMetricCard
                label="Awaiting Finance"
                value={String(awaiting.length)}
                hint="Need your confirm"
                accent="border-amber-500/25 bg-linear-to-br from-amber-500/10 via-card to-card"
                icon={<Banknote className="h-4 w-4 text-amber-700 dark:text-amber-400" />}
              />
              <HrMetricCard
                label="Marked paid"
                value={String(markedPaid.length)}
                hint="Confirmed this run"
                accent="border-emerald-500/20 bg-linear-to-br from-emerald-500/8 via-card to-card"
                icon={
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                }
              />
              <HrMetricCard
                label="Still unpaid"
                value={String(unpaid.length)}
                hint="HR has not marked yet"
                accent="border-violet-500/20 bg-linear-to-br from-violet-500/8 via-card to-card"
                icon={<Wallet className="h-4 w-4 text-violet-700 dark:text-violet-400" />}
              />
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-linear-to-br from-violet-500/8 via-muted/15 to-indigo-500/5 p-4 shadow-sm">
              <Label className="text-xs font-medium text-violet-900/60 dark:text-violet-200/70">
                Payroll run
              </Label>
              <HrOptionCombobox
                value={selectedPeriodId ? String(selectedPeriodId) : ""}
                onChange={(v) => {
                  setSelectedPeriodId(Number(v));
                  setSelectedIds([]);
                }}
                options={periods.map((p) => ({
                  value: String(p.id),
                  label: periodLabel(p),
                  hint: hrStatusLabel(p.status),
                }))}
                placeholder="Choose a payroll run"
                emptyText="No payroll runs."
                className={cn(triggerClass, "mt-1.5")}
              />
              {selectedPeriod ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Period status:{" "}
                  <span className="font-medium text-foreground">
                    {hrStatusLabel(selectedPeriod.status)}
                  </span>
                  {" · "}
                  {payslips.length} payslip
                  {payslips.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>

            {loadingSlips ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading payslips…
              </div>
            ) : payslips.length === 0 ? (
              <HrEmptyState
                title="No payslips in this run"
                description="Pick another payroll run, or wait for HR to generate payslips."
                icon={<Banknote className="h-7 w-7" />}
              />
            ) : (
              <>
                {awaiting.length ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-linear-to-br from-amber-500/10 via-card to-violet-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-amber-950 dark:text-amber-200">
                        Confirm HR mark-paid
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedIds.length
                          ? `${selectedIds.length} selected`
                          : "Select payslips awaiting Finance, then approve or reject."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PendingButton
                        size="sm"
                        className={hrPrimaryBtnClass}
                        disabled={!selectedIds.length}
                        pending={pending}
                        onClick={() => void decide(true)}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Approve mark paid
                      </PendingButton>
                      <PendingButton
                        size="sm"
                        variant="destructive"
                        disabled={!selectedIds.length}
                        pending={pending}
                        onClick={() => void decide(false)}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </PendingButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payslips awaiting Finance confirmation in this run.
                  </p>
                )}

                <div className="overflow-hidden rounded-xl border border-violet-500/20 bg-card shadow-sm ring-1 ring-violet-500/10">
                  <div className="flex items-center gap-3 border-b border-violet-500/15 bg-violet-500/4 px-3 py-2.5">
                    {awaiting.length ? (
                      <Checkbox
                        checked={
                          allAwaitingSelected
                            ? true
                            : selectedIds.some((id) =>
                                  awaiting.some((p) => p.id === id),
                                )
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => {
                          if (v) setSelectedIds(awaiting.map((p) => p.id));
                          else setSelectedIds([]);
                        }}
                        aria-label="Select all awaiting Finance"
                      />
                    ) : (
                      <span className="inline-block w-4" />
                    )}
                    <p className="text-xs font-medium text-muted-foreground">
                      Payslips
                      {awaiting.length
                        ? ` · ${awaiting.length} awaiting Finance`
                        : ""}
                    </p>
                  </div>
                  <ul className="divide-y divide-violet-500/10">
                    {payslips.map((p) => {
                      const canSelect = isAwaitingFinance(p);
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 text-sm transition-colors",
                            canSelect
                              ? "hover:bg-amber-500/6"
                              : "hover:bg-violet-500/4",
                          )}
                        >
                          {canSelect ? (
                            <Checkbox
                              checked={selectedIds.includes(p.id)}
                              onCheckedChange={(v) => {
                                setSelectedIds((prev) =>
                                  v
                                    ? [...new Set([...prev, p.id])]
                                    : prev.filter((x) => x !== p.id),
                                );
                              }}
                              aria-label={`Select ${p.employeeName}`}
                            />
                          ) : (
                            <span className="inline-block w-4" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {p.employeeName}
                            </p>
                            {p.jobTitle ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {p.jobTitle}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatETB(p.netPayETB)}
                          </span>
                          <HrStatusBadge status={p.paymentStatus} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </HrSectionCard>
    </div>
  );
}
