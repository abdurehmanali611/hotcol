"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { HrEmployee } from "@/lib/api/hr";
import {
  createHrAssetApi,
  createHrBenefitAssignmentApi,
  createHrCareerActionApi,
  createHrDisciplinaryActionApi,
  createHrPerformanceReviewApi,
  createHrTrainingAssignmentApi,
  decideHrBenefitAssignmentApi,
  decideHrCareerActionApi,
  decideHrDisciplinaryActionApi,
  decideHrTrainingAssignmentApi,
  fetchHrAssets,
  fetchHrBenefitAssignments,
  fetchHrCareerActions,
  fetchHrDisciplinaryActions,
  fetchHrPerformanceReviews,
  fetchHrTrainingAssignments,
  finalizeHrPerformanceReviewApi,
  issueHrAssetApi,
  returnHrAssetApi,
  type HrAsset,
  type HrBenefitAssignment,
  type HrCareerAction,
  type HrDisciplinaryAction,
  type HrPerformanceReview,
  type HrTrainingAssignment,
} from "@/lib/api/hrPhaseB";

function Decide({
  show,
  onDecide,
}: {
  show: boolean;
  onDecide: (ok: boolean) => Promise<void>;
}) {
  if (!show) return null;
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={() => void onDecide(true)}>
        Approve
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void onDecide(false)}>
        Reject
      </Button>
    </div>
  );
}

export function HrPeopleOpsPanel({
  employees,
  canRequest,
  canDecide,
}: {
  employees: HrEmployee[];
  canRequest: boolean;
  canDecide: boolean;
}) {
  const [career, setCareer] = useState<HrCareerAction[]>([]);
  const [discipline, setDiscipline] = useState<HrDisciplinaryAction[]>([]);
  const [perf, setPerf] = useState<HrPerformanceReview[]>([]);
  const [training, setTraining] = useState<HrTrainingAssignment[]>([]);
  const [benefits, setBenefits] = useState<HrBenefitAssignment[]>([]);
  const [assets, setAssets] = useState<HrAsset[]>([]);
  const [careerForm, setCareerForm] = useState({
    employeeId: "",
    kind: "promotion",
    toDept: "",
    toTitle: "",
    detail: "",
  });
  const [discForm, setDiscForm] = useState({
    employeeId: "",
    title: "",
    detail: "",
  });
  const [perfForm, setPerfForm] = useState({
    employeeId: "",
    periodLabel: "",
    rating: "",
    summary: "",
  });
  const [trainForm, setTrainForm] = useState({
    employeeId: "",
    title: "",
    dueYmd: "",
  });
  const [benForm, setBenForm] = useState({
    employeeId: "",
    kind: "meal",
    label: "",
    amountETB: "",
  });
  const [assetForm, setAssetForm] = useState({ label: "", serialNo: "" });
  const [issueForm, setIssueForm] = useState({
    id: "",
    employeeId: "",
    issuedYmd: "",
  });

  const empName = (id: number | null) =>
    id == null ? "—" : employees.find((e) => e.id === id)?.fullName || `#${id}`;

  const load = useCallback(async () => {
    try {
      const [c, d, p, t, b, a] = await Promise.all([
        fetchHrCareerActions(),
        fetchHrDisciplinaryActions(),
        fetchHrPerformanceReviews(),
        fetchHrTrainingAssignments(),
        fetchHrBenefitAssignments(),
        fetchHrAssets(),
      ]);
      setCareer(c);
      setDiscipline(d);
      setPerf(p);
      setTraining(t);
      setBenefits(b);
      setAssets(a);
    } catch (e) {
      notifyApiFailure(e, "Could not load people ops");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <HrPanelShell>
      <div className="space-y-4">
        <HrSectionCard
          title="Promotion / transfer"
          description="Manager approval applies department/title changes."
          icon={<Briefcase className="h-5 w-5" />}
        >
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-5">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={careerForm.employeeId ? [Number(careerForm.employeeId)] : []}
                onChange={(ids) => setCareerForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <select
                className={`${hrFieldClass} rounded-md border px-3 py-2`}
                value={careerForm.kind}
                onChange={(e) =>
                  setCareerForm((f) => ({ ...f, kind: e.target.value }))
                }
              >
                <option value="promotion">Promotion</option>
                <option value="transfer">Transfer</option>
              </select>
              <Input
                className={hrFieldClass}
                placeholder="To department"
                value={careerForm.toDept}
                onChange={(e) =>
                  setCareerForm((f) => ({ ...f, toDept: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="To title"
                value={careerForm.toTitle}
                onChange={(e) =>
                  setCareerForm((f) => ({ ...f, toTitle: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  try {
                    const emp = employees.find(
                      (e) => e.id === Number(careerForm.employeeId),
                    );
                    await createHrCareerActionApi({
                      employeeId: Number(careerForm.employeeId),
                      kind: careerForm.kind,
                      fromDept: emp?.department,
                      fromTitle: emp?.jobTitle,
                      toDept: careerForm.toDept,
                      toTitle: careerForm.toTitle,
                      detail: careerForm.detail,
                    });
                    toast.success("Submitted");
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
          {career.slice(0, 8).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.kind} → {row.toTitle || row.toDept}{" "}
                · {row.status}
              </span>
              <Decide
                show={canDecide && row.status === "pending"}
                onDecide={async (ok) => {
                  await decideHrCareerActionApi(row.id, ok);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Discipline" description="Recorded after Manager approve.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={discForm.employeeId ? [Number(discForm.employeeId)] : []}
                onChange={(ids) => setDiscForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                placeholder="Title"
                value={discForm.title}
                onChange={(e) =>
                  setDiscForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Detail"
                value={discForm.detail}
                onChange={(e) =>
                  setDiscForm((f) => ({ ...f, detail: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  await createHrDisciplinaryActionApi({
                    employeeId: Number(discForm.employeeId),
                    title: discForm.title,
                    detail: discForm.detail,
                  });
                  toast.success("Submitted");
                  await load();
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {discipline.slice(0, 8).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.title} · {row.status}
              </span>
              <Decide
                show={canDecide && row.status === "pending"}
                onDecide={async (ok) => {
                  await decideHrDisciplinaryActionApi(row.id, ok);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Performance" description="Reviews finalized by Manager.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-5">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={perfForm.employeeId ? [Number(perfForm.employeeId)] : []}
                onChange={(ids) => setPerfForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                placeholder="Period"
                value={perfForm.periodLabel}
                onChange={(e) =>
                  setPerfForm((f) => ({ ...f, periodLabel: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Rating"
                value={perfForm.rating}
                onChange={(e) =>
                  setPerfForm((f) => ({ ...f, rating: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Summary"
                value={perfForm.summary}
                onChange={(e) =>
                  setPerfForm((f) => ({ ...f, summary: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  await createHrPerformanceReviewApi({
                    employeeId: Number(perfForm.employeeId),
                    periodLabel: perfForm.periodLabel,
                    rating: perfForm.rating,
                    summary: perfForm.summary,
                  });
                  toast.success("Submitted");
                  await load();
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {perf.slice(0, 8).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.periodLabel} · {row.rating} ·{" "}
                {row.status}
              </span>
              <Decide
                show={canDecide && row.status === "pending"}
                onDecide={async (ok) => {
                  await finalizeHrPerformanceReviewApi(row.id, ok);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Training" description="Assignments pending Manager.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={trainForm.employeeId ? [Number(trainForm.employeeId)] : []}
                onChange={(ids) => setTrainForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <Input
                className={hrFieldClass}
                placeholder="Title"
                value={trainForm.title}
                onChange={(e) =>
                  setTrainForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <HotelDayPicker
                value={trainForm.dueYmd}
                onChange={(v) => setTrainForm((f) => ({ ...f, dueYmd: v }))}
              />
              <Button
                type="button"
                onClick={async () => {
                  await createHrTrainingAssignmentApi({
                    employeeId: Number(trainForm.employeeId),
                    title: trainForm.title,
                    dueYmd: trainForm.dueYmd,
                  });
                  toast.success("Submitted");
                  await load();
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {training.slice(0, 8).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.title} · {row.status}
              </span>
              <Decide
                show={canDecide && row.status === "pending"}
                onDecide={async (ok) => {
                  await decideHrTrainingAssignmentApi(row.id, ok);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Benefits" description="Meal / housing / transport / other.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-5">
              <HrEmployeeCombobox
                employees={employees}
                valueIds={benForm.employeeId ? [Number(benForm.employeeId)] : []}
                onChange={(ids) => setBenForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <select
                className={`${hrFieldClass} rounded-md border px-3 py-2`}
                value={benForm.kind}
                onChange={(e) =>
                  setBenForm((f) => ({ ...f, kind: e.target.value }))
                }
              >
                <option value="meal">Meal</option>
                <option value="housing">Housing</option>
                <option value="transport">Transport</option>
                <option value="other">Other</option>
              </select>
              <Input
                className={hrFieldClass}
                placeholder="Label"
                value={benForm.label}
                onChange={(e) =>
                  setBenForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                type="number"
                placeholder="Amount"
                value={benForm.amountETB}
                onChange={(e) =>
                  setBenForm((f) => ({ ...f, amountETB: e.target.value }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  await createHrBenefitAssignmentApi({
                    employeeId: Number(benForm.employeeId),
                    kind: benForm.kind,
                    label: benForm.label,
                    amountETB: Number(benForm.amountETB) || 0,
                  });
                  toast.success("Submitted");
                  await load();
                }}
              >
                Submit
              </Button>
            </div>
          ) : null}
          {benefits.slice(0, 8).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {empName(row.employeeId)} · {row.kind}/{row.label} · {row.status}
              </span>
              <Decide
                show={canDecide && row.status === "pending"}
                onDecide={async (ok) => {
                  await decideHrBenefitAssignmentApi(row.id, ok);
                  await load();
                }}
              />
            </div>
          ))}
        </HrSectionCard>

        <HrSectionCard title="Assets" description="Register, issue, and return assets.">
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              <Input
                className={hrFieldClass}
                placeholder="Asset label"
                value={assetForm.label}
                onChange={(e) =>
                  setAssetForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <Input
                className={hrFieldClass}
                placeholder="Serial"
                value={assetForm.serialNo}
                onChange={(e) =>
                  setAssetForm((f) => ({ ...f, serialNo: e.target.value }))
                }
              />
              <PendingButton
                pending={false}
                className={hrPrimaryBtnClass}
                onClick={async () => {
                  await createHrAssetApi(assetForm);
                  toast.success("Asset created");
                  setAssetForm({ label: "", serialNo: "" });
                  await load();
                }}
              >
                Add asset
              </PendingButton>
            </div>
          ) : null}
          {canRequest ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <select
                className={`${hrFieldClass} rounded-md border px-3 py-2`}
                value={issueForm.id}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, id: e.target.value }))
                }
              >
                <option value="">Available asset</option>
                {assets
                  .filter((a) => a.status === "available")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
              </select>
              <HrEmployeeCombobox
                employees={employees}
                valueIds={issueForm.employeeId ? [Number(issueForm.employeeId)] : []}
                onChange={(ids) => setIssueForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
              <HotelDayPicker
                value={issueForm.issuedYmd}
                onChange={(v) =>
                  setIssueForm((f) => ({ ...f, issuedYmd: v }))
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  await issueHrAssetApi({
                    id: Number(issueForm.id),
                    employeeId: Number(issueForm.employeeId),
                    issuedYmd: issueForm.issuedYmd,
                  });
                  toast.success("Issued");
                  await load();
                }}
              >
                Issue
              </Button>
            </div>
          ) : null}
          {assets.slice(0, 12).map((row) => (
            <div
              key={row.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {row.label} · {row.status} · {empName(row.employeeId)}
              </span>
              {canRequest && row.status === "issued" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ymd = new Date().toISOString().slice(0, 10);
                    await returnHrAssetApi({ id: row.id, returnedYmd: ymd });
                    toast.success("Returned");
                    await load();
                  }}
                >
                  Return
                </Button>
              ) : null}
            </div>
          ))}
        </HrSectionCard>
      </div>
    </HrPanelShell>
  );
}
