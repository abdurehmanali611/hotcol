"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrPanelShell, HrSectionCard, HrEmptyState } from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import {
  deleteHrApprovalFlowApi,
  deleteHrTeamApi,
  fetchHrApprovalFlowsApi,
  fetchHrDepartments,
  fetchHrTeamsApi,
  upsertHrApprovalFlowApi,
  upsertHrTeamApi,
  type HrApprovalFlow,
  type HrDepartment,
  type HrTeam,
} from "@/lib/api/hr";

const STEP_OPTIONS = [
  { kind: "team_leader", label: "Team leader" },
  { kind: "department_leader", label: "Department leader" },
  { kind: "hr", label: "HR Manager" },
  { kind: "manager", label: "Manager" },
  { kind: "admin", label: "Admin" },
] as const;

const REQUEST_TYPES = [
  { value: "leave", label: "Leave" },
  { value: "overtime", label: "Overtime" },
];

export function HrApprovalConfigPanel() {
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [teams, setTeams] = useState<HrTeam[]>([]);
  const [flows, setFlows] = useState<HrApprovalFlow[]>([]);
  const [requestType, setRequestType] = useState("leave");
  const [loading, setLoading] = useState(true);

  const [teamDeptId, setTeamDeptId] = useState<string>("");
  const [teamCode, setTeamCode] = useState("");
  const [teamLabel, setTeamLabel] = useState("");

  const [flowDeptId, setFlowDeptId] = useState<string>("default");
  const [requireTeam, setRequireTeam] = useState(true);
  const [steps, setSteps] = useState<{ kind: string }[]>([
    { kind: "department_leader" },
    { kind: "manager" },
  ]);
  const [editingFlowId, setEditingFlowId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [deps, tms, fl] = await Promise.all([
        fetchHrDepartments(),
        fetchHrTeamsApi(),
        fetchHrApprovalFlowsApi(requestType),
      ]);
      setDepartments(deps);
      setTeams(tms);
      setFlows(fl);
    } catch (e) {
      notifyApiFailure(e, "Could not load workflow config");
    } finally {
      setLoading(false);
    }
  }, [requestType]);

  useEffect(() => {
    void load();
  }, [load]);

  const flowsForType = useMemo(
    () => flows.filter((f) => f.requestType === requestType),
    [flows, requestType],
  );

  const addStep = (kind: string) => {
    setSteps((prev) => [...prev, { kind }]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveFlow = async () => {
    try {
      await upsertHrApprovalFlowApi({
        id: editingFlowId ?? undefined,
        requestType,
        departmentId:
          flowDeptId === "default" ? null : Number(flowDeptId),
        requireTeamLeaderFirst: requireTeam,
        stepsJson: steps,
        active: true,
      });
      toast.success(editingFlowId ? "Flow updated" : "Flow saved");
      setEditingFlowId(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save flow");
    }
  };

  const startEdit = (f: HrApprovalFlow) => {
    setEditingFlowId(f.id);
    setFlowDeptId(f.departmentId != null ? String(f.departmentId) : "default");
    setRequireTeam(Boolean(f.requireTeamLeaderFirst));
    const raw = Array.isArray(f.stepsJson) ? f.stepsJson : [];
    setSteps(
      raw.map((s: { kind?: string } | string) =>
        typeof s === "string" ? { kind: s } : { kind: String(s?.kind || "") },
      ).filter((s) => s.kind),
    );
  };

  return (
    <HrPanelShell>
      <HrSectionCard
        title="Approval workflows"
        description="Per request type and department: ordered steps (team/department leaders and desk roles). Café defaults apply when no flow is saved."
        icon={<GitBranch className="h-5 w-5" />}
        accent="bg-linear-to-r from-sky-600 to-cyan-500"
      >
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Request type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {flowsForType.length === 0 ? (
              <HrEmptyState
                title="No custom flows yet"
                description="Save a default or department override below."
              />
            ) : (
              flowsForType.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {f.departmentId == null
                        ? "Tenant default"
                        : departments.find((d) => d.id === f.departmentId)
                            ?.label || `Dept #${f.departmentId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(Array.isArray(f.stepsJson) ? f.stepsJson : [])
                        .map((s: { kind?: string } | string) =>
                          typeof s === "string" ? s : s?.kind,
                        )
                        .filter(Boolean)
                        .join(" → ")}
                      {f.requireTeamLeaderFirst ? " · team leader first when on team" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(f)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deleteHrApprovalFlowApi(f.id);
                          toast.message("Flow deleted");
                          await load();
                        } catch (e) {
                          notifyApiFailure(e, "Delete failed");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}

        <div className="space-y-4 rounded-xl border p-4">
          <p className="text-sm font-medium">
            {editingFlowId ? "Edit flow" : "New flow"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select value={flowDeptId} onValueChange={setFlowDeptId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Tenant default</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Require team leader first</p>
                <p className="text-xs text-muted-foreground">
                  When the employee is on a team
                </p>
              </div>
              <Switch checked={requireTeam} onCheckedChange={setRequireTeam} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Steps (order)</Label>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li
                  key={`${s.kind}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {i + 1}.{" "}
                    {STEP_OPTIONS.find((o) => o.kind === s.kind)?.label || s.kind}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => removeStep(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {STEP_OPTIONS.map((o) => (
                <Button
                  key={o.kind}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addStep(o.kind)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void saveFlow()}>
              Save flow
            </Button>
            {editingFlowId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingFlowId(null);
                  setSteps([{ kind: "department_leader" }, { kind: "manager" }]);
                  setFlowDeptId("default");
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
      </HrSectionCard>

      <HrSectionCard
        title="Teams"
        description="Optional teams under a department. Leaders on a team approve when the flow includes Team leader."
        icon={<Plus className="h-5 w-5" />}
        accent="bg-linear-to-r from-amber-500 to-orange-400"
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Department</Label>
            <Select value={teamDeptId} onValueChange={setTeamDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={teamCode} onChange={(e) => setTeamCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Label</Label>
            <Input value={teamLabel} onChange={(e) => setTeamLabel(e.target.value)} />
          </div>
        </div>
        <Button
          type="button"
          className="mb-4"
          disabled={!teamDeptId || !teamCode.trim() || !teamLabel.trim()}
          onClick={async () => {
            try {
              await upsertHrTeamApi({
                departmentId: Number(teamDeptId),
                code: teamCode.trim(),
                label: teamLabel.trim(),
              });
              toast.success("Team created");
              setTeamCode("");
              setTeamLabel("");
              await load();
            } catch (e) {
              notifyApiFailure(e, "Could not create team");
            }
          }}
        >
          Add team
        </Button>
        <ul className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            teams.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {t.label}{" "}
                  <span className="text-muted-foreground">
                    (
                    {departments.find((d) => d.id === t.departmentId)?.label ||
                      t.departmentId}
                    )
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await deleteHrTeamApi(t.id);
                      toast.message("Team deleted");
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </HrSectionCard>
    </HrPanelShell>
  );
}
