"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingButton } from "@/components/ui/pending-button";
import { HrEmployeeCombobox } from "@/components/hr/HrEmployeeCombobox";
import {
  HrEmptyState,
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
  const [startForm, setStartForm] = useState({ employeeId: "", kind: "onboarding" });

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

  return (
    <HrPanelShell>
      <div className="space-y-4">
        {canManageTemplates ? (
          <HrSectionCard
            title="Checklist templates"
            description="Onboarding and exit templates. Exit completion requires Manager approval."
            icon={<CheckSquare className="h-5 w-5" />}
          >
            <div className="mb-4 grid gap-3 rounded-2xl border border-border/70 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <select
                  className={cn(hrFieldClass, "w-full rounded-md border px-3 py-2")}
                  value={tplForm.kind}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, kind: e.target.value }))
                  }
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="exit">Exit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Template name</Label>
                <Input
                  className={hrFieldClass}
                  value={tplForm.name}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Input
                  className={hrFieldClass}
                  placeholder="Item label"
                  value={tplForm.itemLabel}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, itemLabel: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const label = tplForm.itemLabel.trim();
                    if (!label) return;
                    setTplForm((f) => ({
                      ...f,
                      itemLabel: "",
                      items: [
                        ...f.items,
                        { label, required: true, defaultOwner: "HR" },
                      ],
                    }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tplForm.items.map((it, i) => (
                <p key={i} className="text-sm sm:col-span-2">
                  • {it.label}
                </p>
              ))}
              <PendingButton
                pending={pending}
                className={cn(hrPrimaryBtnClass, "sm:col-span-2")}
                onClick={async () => {
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
                Save template
              </PendingButton>
            </div>
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-border/70 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{t.name}</span> · {t.kind} ·{" "}
                  {t.items.length} items
                </div>
              ))}
            </div>
          </HrSectionCard>
        ) : null}

        <HrSectionCard
          title="Checklist runs"
          description="Start a run for an employee, tick required items, then complete."
          icon={<CheckSquare className="h-5 w-5" />}
        >
          <div className="mb-4 grid gap-3 rounded-2xl border border-border/70 p-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Employee</Label>
              <HrEmployeeCombobox
                employees={employees}
                valueIds={startForm.employeeId ? [Number(startForm.employeeId)] : []}
                onChange={(ids) => setStartForm((f) => ({ ...f, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <select
                className={cn(hrFieldClass, "w-full rounded-md border px-3 py-2")}
                value={startForm.kind}
                onChange={(e) =>
                  setStartForm((f) => ({ ...f, kind: e.target.value }))
                }
              >
                <option value="onboarding">Onboarding</option>
                <option value="exit">Exit</option>
              </select>
            </div>
            <PendingButton
              pending={pending}
              className={cn(hrPrimaryBtnClass, "sm:col-span-3")}
              onClick={async () => {
                setPending(true);
                try {
                  await startHrChecklistRunApi(
                    Number(startForm.employeeId),
                    startForm.kind,
                  );
                  toast.success("Checklist started");
                  await load();
                } catch (e) {
                  notifyApiFailure(e, "Could not start checklist");
                } finally {
                  setPending(false);
                }
              }}
            >
              Start run
            </PendingButton>
          </div>

          {runs.length === 0 ? (
            <HrEmptyState
              title="No checklist runs"
              description="Start an onboarding or exit run for an employee."
            />
          ) : (
            <div className="space-y-4">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-border/70 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {empName(run.employeeId)} · {run.kind} · {run.status}
                    </p>
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
                      {run.status === "awaiting_manager" && canApproveExit ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={async () => {
                              await approveHrChecklistRunApi(run.id, true);
                              toast.success("Exit approved");
                              await load();
                            }}
                          >
                            Approve exit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await approveHrChecklistRunApi(run.id, false);
                              toast.message("Returned to open");
                              await load();
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
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
                              notifyApiFailure(e, "Could not update item");
                            }
                          }}
                        />
                        {item.label}
                        {item.required ? (
                          <span className="text-xs text-muted-foreground">
                            required
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </HrSectionCard>
      </div>
    </HrPanelShell>
  );
}
