"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  ClipboardCheck,
  GraduationCap,
  Package,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HrEmployeeCombobox } from "@/components/hr/HrEmployeeCombobox";
import { HrOptionCombobox } from "@/components/hr/HrOptionCombobox";
import {
  HrEmptyState,
  HrFormSection,
  HrPanelShell,
  HrSectionCard,
  hrFieldClass,
  hrPrimaryBtnClass,
} from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { hrDepartmentLabel } from "@/lib/hrDepartments";
import {
  fetchHrDepartments,
  type HrDepartment,
  type HrEmployee,
} from "@/lib/api/hr";
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

const CAREER_KIND_OPTIONS = [
  { value: "promotion", label: "Promotion" },
  { value: "transfer", label: "Transfer" },
];

const BENEFIT_KIND_OPTIONS = [
  { value: "meal", label: "Meal" },
  { value: "housing", label: "Housing" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "pending" || s === "awaiting_manager") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  }
  if (
    s === "approved" ||
    s === "applied" ||
    s === "finalized" ||
    s === "available" ||
    s === "completed"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
  }
  if (s === "issued") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200";
  }
  if (s === "rejected" || s === "returned") {
    return "border-border/70 bg-muted/40 text-muted-foreground";
  }
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        statusTone(status),
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Decide({
  show,
  onDecide,
}: {
  show: boolean;
  onDecide: (ok: boolean) => Promise<void>;
}) {
  if (!show) return null;
  return (
    <div className="flex flex-wrap gap-2">
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

function OpsRow({
  title,
  meta,
  status,
  actions,
}: {
  title: string;
  meta?: string;
  status?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-3 transition-colors hover:border-violet-500/20">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium tracking-tight">{title}</p>
          {status ? <StatusPill status={status} /> : null}
        </div>
        {meta ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

function OpsSplit({
  canRequest,
  formTitle,
  formDescription,
  form,
  listTitle,
  listDescription,
  list,
}: {
  canRequest: boolean;
  formTitle: string;
  formDescription: string;
  form: ReactNode;
  listTitle: string;
  listDescription: string;
  list: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-4",
        canRequest ? "lg:grid-cols-2" : "grid-cols-1",
      )}
    >
      {canRequest ? (
        <HrFormSection
          className="h-full"
          title={formTitle}
          description={formDescription}
        >
          {form}
        </HrFormSection>
      ) : null}
      <HrFormSection
        className="h-full"
        title={listTitle}
        description={listDescription}
      >
        {list}
      </HrFormSection>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
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
  const [pending, setPending] = useState(false);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [careerForm, setCareerForm] = useState({
    employeeId: "",
    kind: "promotion",
    toDept: "",
    toTitle: "",
    toOrgPosition: "employee" as "employee" | "leader",
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
    employeeIds: [] as number[],
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

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((d) => d.active !== false)
        .map((d) => ({
          value: d.code,
          label: d.label || hrDepartmentLabel(d.code, departments),
          hint: d.code,
        })),
    [departments],
  );

  const availableAssetOptions = useMemo(
    () =>
      assets
        .filter((a) => a.status === "available")
        .map((a) => ({
          value: String(a.id),
          label: a.label,
          hint: a.serialNo || undefined,
        })),
    [assets],
  );

  const load = useCallback(async () => {
    try {
      const [c, d, p, t, b, a, deps] = await Promise.all([
        fetchHrCareerActions(),
        fetchHrDisciplinaryActions(),
        fetchHrPerformanceReviews(),
        fetchHrTrainingAssignments(),
        fetchHrBenefitAssignments(),
        fetchHrAssets(),
        fetchHrDepartments().catch(() => [] as HrDepartment[]),
      ]);
      setCareer(c);
      setDiscipline(d);
      setPerf(p);
      setTraining(t);
      setBenefits(b);
      setAssets(a);
      setDepartments(deps);
    } catch (e) {
      notifyApiFailure(e, "Could not load people ops");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const listShell = (children: ReactNode) => (
    <div className="max-h-[min(28rem,60vh)] space-y-2 overflow-y-auto pr-1">
      {children}
    </div>
  );

  return (
    <HrPanelShell>
      <div className="space-y-6">
        <HrSectionCard
          title="Promotion / transfer"
          description={
            canDecide && !canRequest
              ? "Review pending career moves and approve to apply department or title changes."
              : "Submit promotion or transfer requests. Manager approval applies the change."
          }
          icon={<Briefcase className="h-5 w-5" />}
        >
          <OpsSplit
            canRequest={canRequest}
            formTitle="New request"
            formDescription="Choose the employee, move type, and target role."
            form={
              <div className="space-y-4">
                <Field label="Employee">
                  <HrEmployeeCombobox
                    employees={employees}
                    valueIds={
                      careerForm.employeeId
                        ? [Number(careerForm.employeeId)]
                        : []
                    }
                    onChange={(ids) =>
                      setCareerForm((f) => ({
                        ...f,
                        employeeId: ids[0] ? String(ids[0]) : "",
                      }))
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Kind">
                    <HrOptionCombobox
                      value={careerForm.kind}
                      onChange={(value) =>
                        setCareerForm((f) => ({ ...f, kind: value }))
                      }
                      options={CAREER_KIND_OPTIONS}
                      placeholder="Select kind"
                      searchPlaceholder="Search kind…"
                    />
                  </Field>
                  <Field label="To department">
                    <HrOptionCombobox
                      value={careerForm.toDept}
                      onChange={(value) =>
                        setCareerForm((f) => ({ ...f, toDept: value }))
                      }
                      options={departmentOptions}
                      placeholder="Select department"
                      searchPlaceholder="Search departments…"
                      emptyText="No departments registered."
                    />
                  </Field>
                  <Field label="To title" className="sm:col-span-2">
                    <Input
                      className={hrFieldClass}
                      placeholder="e.g. Senior receptionist"
                      value={careerForm.toTitle}
                      onChange={(e) =>
                        setCareerForm((f) => ({
                          ...f,
                          toTitle: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Position" className="sm:col-span-2">
                    <RadioGroup
                      value={careerForm.toOrgPosition}
                      onValueChange={(value) =>
                        setCareerForm((f) => ({
                          ...f,
                          toOrgPosition:
                            value === "leader" ? "leader" : "employee",
                        }))
                      }
                      className="grid grid-cols-2 gap-2"
                    >
                      {(
                        [
                          { id: "employee", label: "Employee" },
                          { id: "leader", label: "Leader" },
                        ] as const
                      ).map((opt) => (
                        <Label
                          key={opt.id}
                          htmlFor={`people-ops-pos-${opt.id}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-normal transition-colors",
                            careerForm.toOrgPosition === opt.id
                              ? "border-violet-500/35 bg-violet-500/[0.07]"
                              : "border-border/70 bg-background hover:bg-muted/40",
                          )}
                        >
                          <RadioGroupItem
                            value={opt.id}
                            id={`people-ops-pos-${opt.id}`}
                          />
                          {opt.label}
                        </Label>
                      ))}
                    </RadioGroup>
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <Input
                      className={hrFieldClass}
                      placeholder="Optional detail"
                      value={careerForm.detail}
                      onChange={(e) =>
                        setCareerForm((f) => ({
                          ...f,
                          detail: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <PendingButton
                  pending={pending}
                  className={cn(hrPrimaryBtnClass, "w-full")}
                  onClick={async () => {
                    if (!careerForm.employeeId) {
                      toast.error("Select an employee");
                      return;
                    }
                    setPending(true);
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
                        toOrgPosition: careerForm.toOrgPosition,
                        detail: careerForm.detail,
                      });
                      toast.success("Career request submitted");
                      setCareerForm({
                        employeeId: "",
                        kind: "promotion",
                        toDept: "",
                        toTitle: "",
                        toOrgPosition: "employee",
                        detail: "",
                      });
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Could not submit career request");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Submit request
                </PendingButton>
              </div>
            }
            listTitle={canDecide ? "Queue & history" : "Recent requests"}
            listDescription={
              canDecide
                ? "Approve pending moves to apply them to the employee record."
                : "Submitted career moves for this property."
            }
            list={
              career.length === 0 ? (
                <HrEmptyState
                  title="No career requests"
                  description={
                    canRequest
                      ? "Submit the first promotion or transfer on the left."
                      : "Nothing waiting for approval yet."
                  }
                />
              ) : (
                listShell(
                  career.slice(0, 20).map((row) => (
                    <OpsRow
                      key={row.id}
                      title={`${empName(row.employeeId)} · ${row.kind}`}
                      meta={[
                        row.toTitle || row.toDept
                          ? `→ ${[row.toTitle, row.toDept].filter(Boolean).join(" · ")}`
                          : null,
                        row.toOrgPosition
                          ? `Position: ${row.toOrgPosition}`
                          : null,
                        row.detail || null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      status={row.status}
                      actions={
                        <Decide
                          show={canDecide && row.status === "pending"}
                          onDecide={async (ok) => {
                            try {
                              await decideHrCareerActionApi(row.id, ok);
                              toast.success(ok ? "Approved" : "Rejected");
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Decision failed");
                            }
                          }}
                        />
                      }
                    />
                  )),
                )
              )
            }
          />
        </HrSectionCard>

        <HrSectionCard
          title="Discipline"
          description={
            canDecide && !canRequest
              ? "Approve or reject recorded disciplinary actions."
              : "Record disciplinary cases. They appear after Manager approval."
          }
          icon={<ShieldAlert className="h-5 w-5" />}
        >
          <OpsSplit
            canRequest={canRequest}
            formTitle="New case"
            formDescription="Capture the employee, title, and detail."
            form={
              <div className="space-y-4">
                <Field label="Employee">
                  <HrEmployeeCombobox
                    employees={employees}
                    valueIds={
                      discForm.employeeId ? [Number(discForm.employeeId)] : []
                    }
                    onChange={(ids) =>
                      setDiscForm((f) => ({
                        ...f,
                        employeeId: ids[0] ? String(ids[0]) : "",
                      }))
                    }
                  />
                </Field>
                <Field label="Title">
                  <Input
                    className={hrFieldClass}
                    placeholder="e.g. Verbal warning"
                    value={discForm.title}
                    onChange={(e) =>
                      setDiscForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Detail">
                  <Textarea
                    className={cn(hrFieldClass, "min-h-24")}
                    placeholder="What happened"
                    value={discForm.detail}
                    onChange={(e) =>
                      setDiscForm((f) => ({ ...f, detail: e.target.value }))
                    }
                  />
                </Field>
                <PendingButton
                  pending={pending}
                  className={cn(hrPrimaryBtnClass, "w-full")}
                  onClick={async () => {
                    if (!discForm.employeeId || !discForm.title.trim()) {
                      toast.error("Employee and title are required");
                      return;
                    }
                    setPending(true);
                    try {
                      await createHrDisciplinaryActionApi({
                        employeeId: Number(discForm.employeeId),
                        title: discForm.title,
                        detail: discForm.detail,
                      });
                      toast.success("Disciplinary case submitted");
                      setDiscForm({ employeeId: "", title: "", detail: "" });
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Could not submit case");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Submit case
                </PendingButton>
              </div>
            }
            listTitle={canDecide ? "Queue & history" : "Recent cases"}
            listDescription="Pending cases wait for Manager decision."
            list={
              discipline.length === 0 ? (
                <HrEmptyState
                  title="No discipline records"
                  description={
                    canRequest
                      ? "Submit a case from the form on the left."
                      : "No cases awaiting review."
                  }
                />
              ) : (
                listShell(
                  discipline.slice(0, 20).map((row) => (
                    <OpsRow
                      key={row.id}
                      title={`${empName(row.employeeId)} · ${row.title}`}
                      meta={row.detail || undefined}
                      status={row.status}
                      actions={
                        <Decide
                          show={canDecide && row.status === "pending"}
                          onDecide={async (ok) => {
                            try {
                              await decideHrDisciplinaryActionApi(row.id, ok);
                              toast.success(ok ? "Approved" : "Rejected");
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Decision failed");
                            }
                          }}
                        />
                      }
                    />
                  )),
                )
              )
            }
          />
        </HrSectionCard>

        <HrSectionCard
          title="Performance"
          description={
            canDecide && !canRequest
              ? "Finalize pending performance reviews."
              : "Draft reviews for an employee period. Manager finalizes."
          }
          icon={<ClipboardCheck className="h-5 w-5" />}
        >
          <OpsSplit
            canRequest={canRequest}
            formTitle="New review"
            formDescription="Period label, rating, and short summary."
            form={
              <div className="space-y-4">
                <Field label="Employee">
                  <HrEmployeeCombobox
                    employees={employees}
                    valueIds={
                      perfForm.employeeId ? [Number(perfForm.employeeId)] : []
                    }
                    onChange={(ids) =>
                      setPerfForm((f) => ({
                        ...f,
                        employeeId: ids[0] ? String(ids[0]) : "",
                      }))
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Period">
                    <Input
                      className={hrFieldClass}
                      placeholder="e.g. Q1 2026"
                      value={perfForm.periodLabel}
                      onChange={(e) =>
                        setPerfForm((f) => ({
                          ...f,
                          periodLabel: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Rating">
                    <Input
                      className={hrFieldClass}
                      placeholder="e.g. Meets expectations"
                      value={perfForm.rating}
                      onChange={(e) =>
                        setPerfForm((f) => ({
                          ...f,
                          rating: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Summary">
                  <Textarea
                    className={cn(hrFieldClass, "min-h-24")}
                    placeholder="Short review notes"
                    value={perfForm.summary}
                    onChange={(e) =>
                      setPerfForm((f) => ({ ...f, summary: e.target.value }))
                    }
                  />
                </Field>
                <PendingButton
                  pending={pending}
                  className={cn(hrPrimaryBtnClass, "w-full")}
                  onClick={async () => {
                    if (!perfForm.employeeId || !perfForm.periodLabel.trim()) {
                      toast.error("Employee and period are required");
                      return;
                    }
                    setPending(true);
                    try {
                      await createHrPerformanceReviewApi({
                        employeeId: Number(perfForm.employeeId),
                        periodLabel: perfForm.periodLabel,
                        rating: perfForm.rating,
                        summary: perfForm.summary,
                      });
                      toast.success("Review submitted");
                      setPerfForm({
                        employeeId: "",
                        periodLabel: "",
                        rating: "",
                        summary: "",
                      });
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Could not submit review");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Submit review
                </PendingButton>
              </div>
            }
            listTitle={canDecide ? "Queue & history" : "Recent reviews"}
            listDescription="Pending reviews need Manager finalize."
            list={
              perf.length === 0 ? (
                <HrEmptyState
                  title="No performance reviews"
                  description={
                    canRequest
                      ? "Create the first review on the left."
                      : "No reviews waiting to finalize."
                  }
                />
              ) : (
                listShell(
                  perf.slice(0, 20).map((row) => (
                    <OpsRow
                      key={row.id}
                      title={`${empName(row.employeeId)} · ${row.periodLabel}`}
                      meta={[row.rating, row.summary].filter(Boolean).join(" · ")}
                      status={row.status}
                      actions={
                        <Decide
                          show={canDecide && row.status === "pending"}
                          onDecide={async (ok) => {
                            try {
                              await finalizeHrPerformanceReviewApi(row.id, ok);
                              toast.success(ok ? "Finalized" : "Rejected");
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Decision failed");
                            }
                          }}
                        />
                      }
                    />
                  )),
                )
              )
            }
          />
        </HrSectionCard>

        <HrSectionCard
          title="Training"
          description={
            canDecide && !canRequest
              ? "Approve training assignments for staff."
              : "Assign training with an optional due date. Manager confirms."
          }
          icon={<GraduationCap className="h-5 w-5" />}
        >
          <OpsSplit
            canRequest={canRequest}
            formTitle="New assignment"
            formDescription="Employee, course title, and due date."
            form={
              <div className="space-y-4">
                <Field label="Employees">
                  <HrEmployeeCombobox
                    multiple
                    employees={employees}
                    valueIds={trainForm.employeeIds}
                    onChange={(ids) =>
                      setTrainForm((f) => ({
                        ...f,
                        employeeIds: ids,
                      }))
                    }
                  />
                </Field>
                <Field label="Title">
                  <Input
                    className={hrFieldClass}
                    placeholder="e.g. Fire safety"
                    value={trainForm.title}
                    onChange={(e) =>
                      setTrainForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Due date">
                  <HotelDayPicker
                    value={trainForm.dueYmd}
                    onChange={(v) =>
                      setTrainForm((f) => ({ ...f, dueYmd: v }))
                    }
                  />
                </Field>
                <PendingButton
                  pending={pending}
                  className={cn(hrPrimaryBtnClass, "w-full")}
                  onClick={async () => {
                    if (
                      trainForm.employeeIds.length === 0 ||
                      !trainForm.title.trim()
                    ) {
                      toast.error("Select employees and enter a title");
                      return;
                    }
                    setPending(true);
                    try {
                      await Promise.all(
                        trainForm.employeeIds.map((employeeId) =>
                          createHrTrainingAssignmentApi({
                            employeeId,
                            title: trainForm.title,
                            dueYmd: trainForm.dueYmd,
                          }),
                        ),
                      );
                      toast.success(
                        trainForm.employeeIds.length === 1
                          ? "Training assigned"
                          : `Training assigned to ${trainForm.employeeIds.length} employees`,
                      );
                      setTrainForm({
                        employeeIds: [],
                        title: "",
                        dueYmd: "",
                      });
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Could not assign training");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Assign training
                </PendingButton>
              </div>
            }
            listTitle={canDecide ? "Queue & history" : "Recent assignments"}
            listDescription="Pending assignments wait for Manager."
            list={
              training.length === 0 ? (
                <HrEmptyState
                  title="No training assignments"
                  description={
                    canRequest
                      ? "Assign the first course on the left."
                      : "No training waiting for approval."
                  }
                />
              ) : (
                listShell(
                  training.slice(0, 20).map((row) => (
                    <OpsRow
                      key={row.id}
                      title={`${empName(row.employeeId)} · ${row.title}`}
                      meta={row.dueYmd ? `Due ${row.dueYmd}` : undefined}
                      status={row.status}
                      actions={
                        <Decide
                          show={canDecide && row.status === "pending"}
                          onDecide={async (ok) => {
                            try {
                              await decideHrTrainingAssignmentApi(row.id, ok);
                              toast.success(ok ? "Approved" : "Rejected");
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Decision failed");
                            }
                          }}
                        />
                      }
                    />
                  )),
                )
              )
            }
          />
        </HrSectionCard>

        <HrSectionCard
          title="Benefits"
          description={
            canDecide && !canRequest
              ? "Approve meal, housing, transport, or other benefits."
              : "Request meal, housing, transport, or other benefit amounts."
          }
          icon={<Award className="h-5 w-5" />}
        >
          <OpsSplit
            canRequest={canRequest}
            formTitle="New benefit"
            formDescription="Kind, label, and monthly amount in ETB."
            form={
              <div className="space-y-4">
                <Field label="Employee">
                  <HrEmployeeCombobox
                    employees={employees}
                    valueIds={
                      benForm.employeeId ? [Number(benForm.employeeId)] : []
                    }
                    onChange={(ids) =>
                      setBenForm((f) => ({
                        ...f,
                        employeeId: ids[0] ? String(ids[0]) : "",
                      }))
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Kind">
                    <HrOptionCombobox
                      value={benForm.kind}
                      onChange={(value) =>
                        setBenForm((f) => ({ ...f, kind: value }))
                      }
                      options={BENEFIT_KIND_OPTIONS}
                      placeholder="Select kind"
                      searchPlaceholder="Search kind…"
                    />
                  </Field>
                  <Field label="Amount (ETB)">
                    <Input
                      className={hrFieldClass}
                      type="number"
                      placeholder="0"
                      value={benForm.amountETB}
                      onChange={(e) =>
                        setBenForm((f) => ({
                          ...f,
                          amountETB: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Label">
                  <Input
                    className={hrFieldClass}
                    placeholder="e.g. Staff canteen"
                    value={benForm.label}
                    onChange={(e) =>
                      setBenForm((f) => ({ ...f, label: e.target.value }))
                    }
                  />
                </Field>
                <PendingButton
                  pending={pending}
                  className={cn(hrPrimaryBtnClass, "w-full")}
                  onClick={async () => {
                    if (!benForm.employeeId) {
                      toast.error("Select an employee");
                      return;
                    }
                    setPending(true);
                    try {
                      await createHrBenefitAssignmentApi({
                        employeeId: Number(benForm.employeeId),
                        kind: benForm.kind,
                        label: benForm.label,
                        amountETB: Number(benForm.amountETB) || 0,
                      });
                      toast.success("Benefit submitted");
                      setBenForm({
                        employeeId: "",
                        kind: "meal",
                        label: "",
                        amountETB: "",
                      });
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Could not submit benefit");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Submit benefit
                </PendingButton>
              </div>
            }
            listTitle={canDecide ? "Queue & history" : "Recent benefits"}
            listDescription="Pending benefits wait for Manager approval."
            list={
              benefits.length === 0 ? (
                <HrEmptyState
                  title="No benefits"
                  description={
                    canRequest
                      ? "Request the first benefit on the left."
                      : "No benefit requests waiting."
                  }
                />
              ) : (
                listShell(
                  benefits.slice(0, 20).map((row) => (
                    <OpsRow
                      key={row.id}
                      title={`${empName(row.employeeId)} · ${row.kind}`}
                      meta={[
                        row.label || null,
                        row.amountETB != null
                          ? `${row.amountETB} ETB`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      status={row.status}
                      actions={
                        <Decide
                          show={canDecide && row.status === "pending"}
                          onDecide={async (ok) => {
                            try {
                              await decideHrBenefitAssignmentApi(row.id, ok);
                              toast.success(ok ? "Approved" : "Rejected");
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Decision failed");
                            }
                          }}
                        />
                      }
                    />
                  )),
                )
              )
            }
          />
        </HrSectionCard>

        <HrSectionCard
          title="Assets"
          description={
            canRequest
              ? "Register property assets, issue them to staff, and record returns."
              : "View issued and available assets for this property."
          }
          icon={<Package className="h-5 w-5" />}
        >
          <OpsSplit
            canRequest={canRequest}
            formTitle="Register & issue"
            formDescription="Add a new asset, then issue available ones to employees."
            form={
              <div className="space-y-5">
                <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/10 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Register asset
                  </p>
                  <Field label="Label">
                    <Input
                      className={hrFieldClass}
                      placeholder="e.g. Radio handset"
                      value={assetForm.label}
                      onChange={(e) =>
                        setAssetForm((f) => ({ ...f, label: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Serial">
                    <Input
                      className={hrFieldClass}
                      placeholder="Optional serial number"
                      value={assetForm.serialNo}
                      onChange={(e) =>
                        setAssetForm((f) => ({
                          ...f,
                          serialNo: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <PendingButton
                    pending={pending}
                    className={cn(hrPrimaryBtnClass, "w-full")}
                    onClick={async () => {
                      if (!assetForm.label.trim()) {
                        toast.error("Asset label is required");
                        return;
                      }
                      setPending(true);
                      try {
                        await createHrAssetApi(assetForm);
                        toast.success("Asset created");
                        setAssetForm({ label: "", serialNo: "" });
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Could not create asset");
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    Add asset
                  </PendingButton>
                </div>

                <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Issue to employee
                  </p>
                  <Field label="Available asset">
                    <HrOptionCombobox
                      value={issueForm.id}
                      onChange={(value) =>
                        setIssueForm((f) => ({ ...f, id: value }))
                      }
                      options={availableAssetOptions}
                      placeholder="Select asset"
                      searchPlaceholder="Search assets…"
                      emptyText="No available assets."
                    />
                  </Field>
                  <Field label="Employee">
                    <HrEmployeeCombobox
                      employees={employees}
                      valueIds={
                        issueForm.employeeId
                          ? [Number(issueForm.employeeId)]
                          : []
                      }
                      onChange={(ids) =>
                        setIssueForm((f) => ({
                          ...f,
                          employeeId: ids[0] ? String(ids[0]) : "",
                        }))
                      }
                    />
                  </Field>
                  <Field label="Issue date">
                    <HotelDayPicker
                      value={issueForm.issuedYmd}
                      onChange={(v) =>
                        setIssueForm((f) => ({ ...f, issuedYmd: v }))
                      }
                    />
                  </Field>
                  <PendingButton
                    pending={pending}
                    className={cn(hrPrimaryBtnClass, "w-full")}
                    onClick={async () => {
                      if (!issueForm.id || !issueForm.employeeId) {
                        toast.error("Select an asset and employee");
                        return;
                      }
                      setPending(true);
                      try {
                        await issueHrAssetApi({
                          id: Number(issueForm.id),
                          employeeId: Number(issueForm.employeeId),
                          issuedYmd: issueForm.issuedYmd,
                        });
                        toast.success("Asset issued");
                        setIssueForm({
                          id: "",
                          employeeId: "",
                          issuedYmd: "",
                        });
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Could not issue asset");
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    Issue asset
                  </PendingButton>
                </div>
              </div>
            }
            listTitle="Inventory"
            listDescription="Available, issued, and returned assets."
            list={
              assets.length === 0 ? (
                <HrEmptyState
                  title="No assets yet"
                  description={
                    canRequest
                      ? "Register the first asset on the left."
                      : "No assets recorded for this property."
                  }
                />
              ) : (
                listShell(
                  assets.slice(0, 30).map((row) => (
                    <OpsRow
                      key={row.id}
                      title={row.label}
                      meta={[
                        row.serialNo ? `SN ${row.serialNo}` : null,
                        row.employeeId ? empName(row.employeeId) : null,
                        row.issuedYmd ? `Issued ${row.issuedYmd}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      status={row.status}
                      actions={
                        canRequest && row.status === "issued" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const ymd = new Date()
                                  .toISOString()
                                  .slice(0, 10);
                                await returnHrAssetApi({
                                  id: row.id,
                                  returnedYmd: ymd,
                                });
                                toast.success("Asset returned");
                                await load();
                              } catch (e) {
                                notifyApiFailure(e, "Could not return asset");
                              }
                            }}
                          >
                            Return
                          </Button>
                        ) : null
                      }
                    />
                  )),
                )
              )
            }
          />
        </HrSectionCard>

        {canDecide && !canRequest ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            Manager view — approve or reject pending people-ops requests. HR
            submits new items.
          </p>
        ) : null}
      </div>
    </HrPanelShell>
  );
}
