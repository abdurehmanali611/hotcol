"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function isAwaitingFinance(p: HrPayslip) {
  const st = String(p.paymentStatus || "");
  if (st === "awaiting_finance") return true;
  // Legacy: HR marked paid before Finance confirm existed
  if (st === "marked_paid" && !p.managerApprovedAt) return true;
  return false;
}

export function FinanceHrPayrollSection({
  mode,
}: {
  mode: "payroll" | "payslips";
}) {
  const [periods, setPeriods] = useState<HrPayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<HrPayslip[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchHrPayrollPeriods();
      setPeriods(rows);
      if (selectedPeriodId == null && rows[0]) {
        setSelectedPeriodId(rows[0].id);
      }
    } catch (e) {
      notifyApiFailure(e, "Could not load payroll periods");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedPeriodId == null) {
      setPayslips([]);
      return;
    }
    void fetchHrPayslips(selectedPeriodId)
      .then(setPayslips)
      .catch((e) => notifyApiFailure(e, "Could not load payslips"));
  }, [selectedPeriodId]);

  const awaiting = useMemo(
    () => payslips.filter(isAwaitingFinance),
    [payslips],
  );

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
      await load();
    } catch (e) {
      notifyApiFailure(
        e,
        approve ? "Could not approve payment" : "Could not reject payment",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          {mode === "payroll" ? "HR payroll" : "HR payslips"}
        </CardTitle>
        <CardDescription>
          {mode === "payroll"
            ? "Review payroll periods. After HR marks paid, approve or reject here to finalize payment."
            : "Approve or reject HR mark-paid requests. Only Finance confirmation shows as Marked paid to employees."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {periods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payroll periods yet.
                </p>
              ) : (
                periods.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={selectedPeriodId === p.id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedPeriodId(p.id);
                      setSelectedIds([]);
                    }}
                  >
                    {p.monthName || `${p.fromYmd} → ${p.toYmd}`}
                  </Button>
                ))
              )}
            </div>

            {payslips.length ? (
              <ul className="divide-y rounded-lg border">
                {payslips.map((p) => {
                  const canSelect = isAwaitingFinance(p);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm"
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
                        />
                      ) : (
                        <span className="w-4" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {p.employeeName}
                      </span>
                      <span className="text-muted-foreground">
                        {formatETB(p.netPayETB)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {hrStatusLabel(p.paymentStatus)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : selectedPeriodId ? (
              <p className="text-sm text-muted-foreground">
                No payslips in this period.
              </p>
            ) : null}

            {awaiting.length ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(awaiting.map((p) => p.id))}
                >
                  Select awaiting Finance ({awaiting.length})
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedIds.length || pending}
                  onClick={() => void decide(true)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve mark paid
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!selectedIds.length || pending}
                  onClick={() => void decide(false)}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            ) : payslips.length ? (
              <p className="text-sm text-muted-foreground">
                No payslips awaiting Finance confirmation in this period.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
