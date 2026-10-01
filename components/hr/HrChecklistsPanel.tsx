"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CheckSquare, ListChecks, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingButton } from "@/components/ui/pending-button";
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
import type { HrEmployee } from "@/lib/api/hr";
import {
  approveHrChecklistRunApi,
  completeHrChecklistRunApi,
  fetchHrChecklistRuns,
  fetchHrChecklistTemplates,
  saveHrChecklistTemplateApi,
  startHrChecklistRunApi,
  toggleHrChecklistRunItemApi,
  type HrChecklistRun,
  type HrChecklistTemplate,
} from "@/lib/api/hrPhaseB";

const KIND_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "exit", label: "Exit" },
];

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "pending" || s === "awaiting_manager" || s === "open") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  }
  if (s === "completed" || s === "approved" || s === "done") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
  }
  if (s === "rejected") {
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

function TemplatesList({ templates }: { templates: HrChecklistTemplate[] }) {
  if (templates.length === 0) {
    return (
      <HrEmptyState
        title="No templates yet"
        description="Manager can create onboarding and exit templates here."
      />
    );
  }
  return (
    <div className="max-h-[min(32rem,70vh)] space-y-2 overflow-y-auto pr-1">
      {templates.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-border/70 bg-background/80 px-3 py-3 transition-colors hover:border-violet-500/25 hover:bg-violet-500/3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium tracking-tight">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.items.length} item{t.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <StatusPill status={t.kind} />
          </div>
          {t.items.length > 0 ? (
            <ul className="mt-2 space-y-1 border-t border-border/50 pt-2">
              {t.items.slice(0, 4).map((it, i) => (
                <li
                  key={`${t.id}-${i}`}
                  className="truncate text-xs text-muted-foreground"
                >
                  • {it.label}
                  {it.required ? " (required)" : ""}
                </li>
              ))}
              {t.items.length > 4 ? (
                <li className="text-xs text-muted-foreground">
                  +{t.items.length - 4} more
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function HrChecklistsPanel({
  employees,
  canManageTemplates,
  canApproveExit,
}: {
  employees: HrEmployee[];
  canManageTemplates: boolean;
  canApproveExit: boolean;
}) {
  const [templates, setTemplates] = useState<HrChecklistTemplate[]>([]);
  const [runs, setRuns] = useState<HrChecklistRun[]>([]);
  const [pending, setPending] = useState(false);
  const [tplForm, setTplForm] = useState({
    kind: "onboarding",
    name: "",
    itemLabel: "",
    items: [] as Array<{ label: string; required: boolean; defaultOwner: string }>,
  });
  const [startForm, setStartForm] = useState({
    employeeIds: [] as number[],
    kind: "onboarding",
  });

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        fetchHrChecklistTemplates(),
        fetchHrChecklistRuns(),
      ]);
      setTemplates(t);
      setRuns(r);
    } catch (e) {
      notifyApiFailure(e, "Could not load checklists");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const empName = (id: number) =>
    employees.find((e) => e.id === id)?.fullName || `#${id}`;

  const addItem = () => {
    const label = tplForm.itemLabel.trim();
    if (!label) return;
    setTplForm((f) => ({
      ...f,
      itemLabel: "",
      items: [...f.items, { label, required: true, defaultOwner: "HR" }],
    }));
  };

  return (
    <HrPanelShell>
      <div className="space-y-6">
        <HrSectionCard
          title="Checklist templates"
          description={
            canManageTemplates
              ? "Onboarding and exit templates. Exit completion requires Manager approval."
              : "Templates configured by Manager. HR starts runs from these kinds below."
          }
          icon={<ListChecks className="h-5 w-5" />}
        >
          <div
            className={cn(
              "grid items-stretch gap-4",
              canManageTemplates ? "lg:grid-cols-2" : "grid-cols-1",
            )}
          >
            {canManageTemplates ? (
              <HrFormSection
                className="h-full"
                title="New template"
                description="Name the template, add checklist items, then save."
              >
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Kind">
                      <HrOptionCombobox
                        value={tplForm.kind}
                        onChange={(value) =>
                          setTplForm((f) => ({ ...f, kind: value }))
                        }
                        options={KIND_OPTIONS}
                        placeholder="Select kind"
                        searchPlaceholder="Search kind…"
                      />
                    </Field>
                    <Field label="Template name">
                      <Input
                        className={hrFieldClass}
                        value={tplForm.name}
                        onChange={(e) =>
                          setTplForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. Front desk onboarding"
                      />
                    </Field>
                  </div>

                  <Field label="Checklist items">
                    <div className="flex gap-2">
                      <Input
                        className={hrFieldClass}
                        placeholder="Item label"
                        value={tplForm.itemLabel}
                        onChange={(e) =>
                          setTplForm((f) => ({
                            ...f,
                            itemLabel: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          addItem();
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={addItem}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tplForm.items.length > 0 ? (
                      <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-2.5">
                        {tplForm.items.map((it, i) => (
                          <li
                            key={`${it.label}-${i}`}
                            className="flex items-center justify-between gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-sm"
                          >
                            <span className="min-w-0 truncate">{it.label}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
                              onClick={() =>
                                setTplForm((f) => ({
                                  ...f,
                                  items: f.items.filter((_, idx) => idx !== i),
                                }))
                              }
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No items yet — add at least one before saving.
                      </p>
                    )}
                  </Field>

                  <PendingButton
                    pending={pending}
                    className={cn(hrPrimaryBtnClass, "w-full")}
                    onClick={async () => {
                      if (!tplForm.items.length) {
                        toast.error("Add at least one checklist item");
                        return;
                      }
                      setPending(true);
                      try {
                        await saveHrChecklistTemplateApi({
                          kind: tplForm.kind,
                          name: tplForm.name.trim() || tplForm.kind,
                          items: tplForm.items,
                        });
                        toast.success("Template saved");
                        setTplForm({
                          kind: "onboarding",
                          name: "",
                          itemLabel: "",
                          items: [],
                        });
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Could not save template");
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Save template
                  </PendingButton>
                </div>
              </HrFormSection>
            ) : null}

            <HrFormSection
              className="h-full"
              title="Saved templates"
              description={
                canManageTemplates
                  ? "Reusable onboarding and exit checklists."
                  : "Available template kinds for starting runs."
              }
            >
              <TemplatesList templates={templates} />
            </HrFormSection>
          </div>
        </HrSectionCard>

        <HrSectionCard
          title="Checklist runs"
          description={
            canApproveExit
              ? "Start runs, tick items, complete, or approve exit when awaiting Manager."
              : "Start a run for one or more employees, tick required items, then complete."
          }
          icon={<CheckSquare className="h-5 w-5" />}
        >
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <HrFormSection
              className="h-full"
              title="Start run"
              description="Pick employees and checklist kind to open new runs."
            >
              <div className="space-y-4">
                <Field label="Employees">
                  <HrEmployeeCombobox
                    multiple
                    employees={employees}
                    valueIds={startForm.employeeIds}
                    onChange={(ids) =>
                      setStartForm((f) => ({ ...f, employeeIds: ids }))
                    }
                  />
                </Field>
                <Field label="Kind">
                  <HrOptionCombobox
                    value={startForm.kind}
                    onChange={(value) =>
                      setStartForm((f) => ({ ...f, kind: value }))
                    }
                    options={KIND_OPTIONS}
                    placeholder="Select kind"
                    searchPlaceholder="Search kind…"
                  />
                </Field>
                <PendingButton
                  pending={pending}
                  className={cn(hrPrimaryBtnClass, "w-full")}
                  onClick={async () => {
                    if (startForm.employeeIds.length === 0) {
                      toast.error("Select at least one employee");
                      return;
                    }
                    setPending(true);
                    try {
                      await Promise.all(
                        startForm.employeeIds.map((employeeId) =>
                          startHrChecklistRunApi(employeeId, startForm.kind),
                        ),
                      );
                      toast.success(
                        startForm.employeeIds.length === 1
                          ? "Checklist started"
                          : `Started ${startForm.employeeIds.length} checklist runs`,
                      );
                      setStartForm({ employeeIds: [], kind: "onboarding" });
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Could not start checklist");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  Start run
                  {startForm.employeeIds.length > 1
                    ? ` (${startForm.employeeIds.length})`
                    : ""}
                </PendingButton>
              </div>
            </HrFormSection>

            <HrFormSection
              className="h-full"
              title="Active & recent runs"
              description="Tick items, complete the run, or approve exit when required."
            >
              {runs.length === 0 ? (
                <HrEmptyState
                  title="No checklist runs"
                  description="Start an onboarding or exit run from the form on the left."
                />
              ) : (
                <div className="max-h-[min(36rem,75vh)] space-y-3 overflow-y-auto pr-1">
                  {runs.map((run) => {
                    const doneCount = run.items.filter((i) => i.done).length;
                    return (
                      <div
                        key={run.id}
                        className="rounded-xl border border-border/70 bg-background/80 p-3 transition-colors hover:border-violet-500/20"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium tracking-tight">
                                {empName(run.employeeId)}
                              </p>
                              <StatusPill status={run.status} />
                            </div>
                            <p className="text-xs capitalize text-muted-foreground">
                              {run.kind} · {doneCount}/{run.items.length} items
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {run.status === "open" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await completeHrChecklistRunApi(run.id);
                                    toast.success("Run completed");
                                    await load();
                                  } catch (e) {
                                    notifyApiFailure(e, "Complete failed");
                                  }
                                }}
                              >
                                Complete
                              </Button>
                            ) : null}
                            {run.status === "awaiting_manager" &&
                            canApproveExit ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await approveHrChecklistRunApi(
                                        run.id,
                                        true,
                                      );
                                      toast.success("Exit approved");
                                      await load();
                                    } catch (e) {
                                      notifyApiFailure(e, "Approve failed");
                                    }
                                  }}
                                >
                                  Approve exit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await approveHrChecklistRunApi(
                                        run.id,
                                        false,
                                      );
                                      toast.message("Returned to open");
                                      await load();
                                    } catch (e) {
                                      notifyApiFailure(e, "Reject failed");
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="space-y-2 border-t border-border/50 pt-2">
                          {run.items.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={item.done}
                                disabled={run.status !== "open"}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await toggleHrChecklistRunItemApi({
                                      id: item.id,
                                      done: Boolean(checked),
                                    });
                                    await load();
                                  } catch (e) {
                                    notifyApiFailure(
                                      e,
                                      "Could not update item",
                                    );
                                  }
                                }}
                              />
                              <span className="min-w-0 flex-1">
                                {item.label}
                              </span>
                              {item.required ? (
                                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  required
                                </span>
                              ) : null}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </HrFormSection>
          </div>
        </HrSectionCard>

        {canApproveExit ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            Exit runs awaiting Manager appear here for approve or reject after
            HR completes required items.
          </p>
        ) : null}
      </div>
    </HrPanelShell>
  );
}
