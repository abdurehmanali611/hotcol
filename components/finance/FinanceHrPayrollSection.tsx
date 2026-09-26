"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
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
  fetchHrPayrollPeriods,
  fetchHrPayslips,
  markHrPayslipsPaidApi,
  type HrPayrollPeriod,
  type HrPayslip,
} from "@/lib/api/hr";
import { formatETB } from "@/lib/subscriptionModules";

export function FinanceHrPayrollSection({ mode }: { mode: "payroll" | "payslips" }) {
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

  const unpaid = payslips.filter((p) => p.paymentStatus === "unpaid");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          {mode === "payroll" ? "HR payroll" : "HR payslips"}
        </CardTitle>
        <CardDescription>
          {mode === "payroll"
            ? "Review payroll periods. Mark payslips paid (F18); Manager gives final payment approval (F19)."
            : "Select unpaid payslips and mark them paid. Final approval stays with Manager."}
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
                  const canSelect = p.paymentStatus === "unpaid";
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
                        {p.paymentStatus}
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

            {unpaid.length ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(unpaid.map((p) => p.id))}
                >
                  Select unpaid ({unpaid.length})
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedIds.length || pending}
                  onClick={async () => {
                    setPending(true);
                    try {
                      await markHrPayslipsPaidApi(selectedIds);
                      toast.success("Payslips marked paid");
                      setSelectedIds([]);
                      const rows = await fetchHrPayslips(selectedPeriodId!);
                      setPayslips(rows);
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Mark paid failed");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Mark paid
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
