"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HrEmployeeCombobox } from "@/components/hr/HrEmployeeCombobox";
import {
  HrPanelShell,
  HrSectionCard,
  hrFieldClass,
  hrPrimaryBtnClass,
} from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { HrEmployee } from "@/lib/api/hr";
import {
  createHrAdvanceRequestApi,
  createHrBonusApi,
  createHrLoanApi,
  createHrOvertimeRequestApi,
  decideHrAdvanceRequestApi,
  decideHrBonusApi,
  decideHrLoanApi,
  decideHrOvertimeRequestApi,
  decideHrSalaryChangeApi,
  fetchHrAdvanceRequests,
  fetchHrBonuses,
  fetchHrLoans,
  fetchHrOvertimeRequests,
  fetchHrSalaryHistory,
  requestHrSalaryChangeApi,
  type HrAdvanceRequest,
  type HrBonus,
  type HrLoan,
  type HrOvertimeRequest,
  type HrSalaryHistory,
} from "@/lib/api/hrPhaseB";

function DecideButtons({
  show,
  onDecide,
}: {
  show: boolean;
  onDecide: (approve: boolean) => Promise<void>;
}) {
  if (!show) return null;
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={() => void onDecide(true)}>
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void onDecide(false)}
      >
        Reject
      </Button>
    </div>
  );
}

export function HrCompensationPanel({
  employees,
  canRequest,
  canDecide,
}: {
  employees: HrEmployee[];
  canRequest: boolean;
  canDecide: boolean;
}) {
  const [salary, setSalary] = useState<HrSalaryHistory[]>([]);
  const [advances, setAdvances] = useState<HrAdvanceRequest[]>([]);
  const [loans, setLoans] = useState<HrLoan[]>([]);
  const [bonuses, setBonuses] = useState<HrBonus[]>([]);
  const [ot, setOt] = useState<HrOvertimeRequest[]>([]);
  const [pending, setPending] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "",
    newETB: "",
    reason: "",
  });
  const [advForm, setAdvForm] = useState({
    employeeId: "",
    amountETB: "",
    reason: "",
  });
  const [loanForm, setLoanForm] = useState({
    employeeId: "",
    principalETB: "",
    installmentETB: "",
    reason: "",
  });
  const [bonusForm, setBonusForm] = useState({
    employeeId: "",
    label: "",
    amountETB: "",
  });
  const [otForm, setOtForm] = useState({
    employeeId: "",
    workYmd: "",
    hours: "",
    amountETB: "",
    reason: "",
  });

  const empName = (id: number) =>
    employees.find((e) => e.id === id)?.fullName || `#${id}`;

  const load = useCallback(async () => {
    try {
      const [s, a, l, b, o] = await Promise.all([
        fetchHrSalaryHistory(),
        fetchHrAdvanceRequests(),
        fetchHrLoans(),
        fetchHrBonuses(),
        fetchHrOvertimeRequests(),
      ]);
      setSalary(s);
      setAdvances(a);
      setLoans(l);
      setBonuses(b);
      setOt(o);
    } catch (e) {
      notifyApiFailure(e, "Could not load compensation data");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <HrPanelShell>
      <div className="space-y-4">
        <HrSectionCard
          title="Salary changes"
          description="HR requests; Manager approves before base salary updates."
          icon={<Banknote className="h-5 w-5" />}
        >
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={salaryForm.employeeId ? [Number(salaryForm.employeeId)] : []}
                onChange={(ids) => setSalaryForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="New ETB"
                value={salaryForm.newETB}
                onChange={(e) =>
                  setSalaryForm((f) => ({ ...f, newETB: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Reason"
                value={salaryForm.reason}
                onChange={(e) =>
                  setSalaryForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
              <PendingButton
                pending={pending}
                className={hrPrimaryBtnClass}
                onClick={async () => {
                  setPending(true);
                  try {
                    await requestHrSalaryChangeApi({
                      employeeId: Number(salaryForm.employeeId),
                      newETB: Number(salaryForm.newETB) || 0,
                      reason: salaryForm.reason,
                    });
                    toast.success("Salary change submitted");
                    await load();
                  } catch (e) {
                    notifyApiFailure(e, "Request failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                Request
              </PendingButton>
            </div>
          ) : null}
          <div className="space-y-2">
            {salary.slice(0, 12).map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
              >
                <span>
                  {empName(row.employeeId)} · {row.previousETB} → {row.newETB} ·{" "}
                  {row.status}
                </span>
                <DecideButtons
                  show={canDecide && row.status === "pending"}
                  onDecide={async (approve) => {
                    await decideHrSalaryChangeApi(row.id, approve);
                    toast.success(approve ? "Applied" : "Rejected");
                    await load();
                  }}
                />
              </div>
            ))}
          </div>
        </HrSectionCard>

        <HrSectionCard title="Advances" description="Pending Manager decision.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={advForm.employeeId ? [Number(advForm.employeeId)] : []}
                onChange={(ids) => setAdvForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Amount"
                value={advForm.amountETB}
                onChange={(e) =>
                  setAdvForm((f) => ({ ...f, amountETB: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Reason"
                value={advForm.reason}
                onChange={(e) =>
                  setAdvForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await createHrAdvanceRequestApi({
                      employeeId: Number(advForm.employeeId),
                      amountETB: Number(advForm.amountETB) || 0,
                      reason: advForm.reason,
                    });
                    toast.success("Advance submitted");
                    await load();
                  } catch (e) {
                    notifyApiFailure(e, "Failed");
                  }
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {advances.slice(0, 10).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.amountETB} · {row.status}
              </span>
              <DecideButtons
                show={canDecide && row.status === "pending"}
                onDecide={async (approve) => {
                  await decideHrAdvanceRequestApi(row.id, approve);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Loans" description="Principal + installment.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-5">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={loanForm.employeeId ? [Number(loanForm.employeeId)] : []}
                onChange={(ids) => setLoanForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Principal"
                value={loanForm.principalETB}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, principalETB: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Installment"
                value={loanForm.installmentETB}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, installmentETB: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Reason"
                value={loanForm.reason}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await createHrLoanApi({
                      employeeId: Number(loanForm.employeeId),
                      principalETB: Number(loanForm.principalETB) || 0,
                      installmentETB: Number(loanForm.installmentETB) || 0,
                      reason: loanForm.reason,
                    });
                    toast.success("Loan submitted");
                    await load();
                  } catch (e) {
                    notifyApiFailure(e, "Failed");
                  }
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {loans.slice(0, 10).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.principalETB} · {row.status}
              </span>
              <DecideButtons
                show={canDecide && row.status === "pending"}
                onDecide={async (approve) => {
                  await decideHrLoanApi(row.id, approve);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Bonuses" description="One-off bonus requests.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={bonusForm.employeeId ? [Number(bonusForm.employeeId)] : []}
                onChange={(ids) => setBonusForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                placeholder="Label"
                value={bonusForm.label}
                onChange={(e) =>
                  setBonusForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Amount"
                value={bonusForm.amountETB}
                onChange={(e) =>
                  setBonusForm((f) => ({ ...f, amountETB: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await createHrBonusApi({
                      employeeId: Number(bonusForm.employeeId),
                      label: bonusForm.label.trim(),
                      amountETB: Number(bonusForm.amountETB) || 0,
                    });
                    toast.success("Bonus submitted");
                    await load();
                  } catch (e) {
                    notifyApiFailure(e, "Failed");
                  }
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {bonuses.slice(0, 10).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.label} · {row.amountETB} ·{" "}
                {row.status}
              </span>
              <DecideButtons
                show={canDecide && row.status === "pending"}
                onDecide={async (approve) => {
                  await decideHrBonusApi(row.id, approve);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Overtime" description="Hours + amount for approval.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-5">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={otForm.employeeId ? [Number(otForm.employeeId)] : []}
                onChange={(ids) => setOtForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <HotelDayPicker
                value={otForm.workYmd}
                onChange={(v) => setOtForm((f) => ({ ...f, workYmd: v }))}
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Hours"
                value={otForm.hours}
                onChange={(e) => setOtForm((f) => ({ ...f, hours: e.target.value }))}
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Amount"
                value={otForm.amountETB}
                onChange={(e) =>
                  setOtForm((f) => ({ ...f, amountETB: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await createHrOvertimeRequestApi({
                      employeeId: Number(otForm.employeeId),
                      workYmd: otForm.workYmd,
                      hours: Number(otForm.hours) || 0,
                      amountETB: Number(otForm.amountETB) || 0,
                      reason: otForm.reason,
                    });
                    toast.success("OT submitted");
                    await load();
                  } catch (e) {
                    notifyApiFailure(e, "Failed");
                  }
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {ot.slice(0, 10).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.workYmd} · {row.hours}h ·{" "}
                {row.status}
              </span>
              <DecideButtons
                show={canDecide && row.status === "pending"}
                onDecide={async (approve) => {
                  await decideHrOvertimeRequestApi(row.id, approve);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>
      </div>
    </HrPanelShell>
  );
}
