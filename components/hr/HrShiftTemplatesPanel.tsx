"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HrEmployeeCombobox } from "@/components/hr/HrEmployeeCombobox";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  hrFieldClass,
  hrPrimaryBtnClass,
} from "@/components/hr/hrChrome";
import { Checkbox } from "@/components/ui/checkbox";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { HrEmployee } from "@/lib/api/hr";
import {
  applyHrShiftTemplateApi,
  deleteHrShiftTemplateApi,
  fetchHrShiftTemplates,
  upsertHrShiftTemplateApi,
  type HrShiftTemplate,
} from "@/lib/api/hrPhaseB";

const WEEKDAYS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 0, label: "Sun" },
];

export function HrShiftTemplatesPanel({
  employees,
  canManage,
}: {
  employees: HrEmployee[];
  canManage: boolean;
}) {
  const [templates, setTemplates] = useState<HrShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    department: "",
    startTime: "09:00",
    endTime: "17:00",
    weekdays: [1, 2, 3, 4, 5] as number[],
  });
  const [apply, setApply] = useState({
    templateId: "",
    employeeId: "",
    fromYmd: "",
    toYmd: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await fetchHrShiftTemplates());
    } catch (e) {
      notifyApiFailure(e, "Could not load shift templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!canManage) return;
    setPending(true);
    try {
      await upsertHrShiftTemplateApi({
        code: form.code.trim(),
        name: form.name.trim(),
        department: form.department.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        weekdayJson: JSON.stringify(form.weekdays),
        active: true,
      });
      toast.success("Template saved");
      setForm({
        code: "",
        name: "",
        department: "",
        startTime: "09:00",
        endTime: "17:00",
        weekdays: [1, 2, 3, 4, 5],
      });
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save template");
    } finally {
      setPending(false);
    }
  };

  const applyTemplate = async () => {
    if (!canManage) return;
    setPending(true);
    try {
      const count = await applyHrShiftTemplateApi({
        templateId: Number(apply.templateId),
        employeeIds: [Number(apply.employeeId)],
        fromYmd: apply.fromYmd,
        toYmd: apply.toYmd,
      });
      toast.success(`Created ${count} shift(s)`);
    } catch (e) {
      notifyApiFailure(e, "Could not apply template");
    } finally {
      setPending(false);
    }
  };

  return (
    <HrPanelShell>
      <HrSectionCard
        title="Shift templates"
        description="Manager-defined patterns applied to employee schedules for a date range."
        icon={<CalendarRange className="h-5 w-5" />}
      >
        {canManage ? (
          <div className="mb-6 grid gap-3 rounded-2xl border border-border/70 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                className={hrFieldClass}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                className={hrFieldClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                className={hrFieldClass}
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  className={hrFieldClass}
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  className={hrFieldClass}
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              {WEEKDAYS.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.weekdays.includes(d.id)}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({
                        ...f,
                        weekdays: checked
                          ? [...f.weekdays, d.id]
                          : f.weekdays.filter((x) => x !== d.id),
                      }))
                    }
                  />
                  {d.label}
                </label>
              ))}
            </div>
            <PendingButton
              pending={pending}
              className={cn(hrPrimaryBtnClass, "sm:col-span-2")}
              onClick={() => void save()}
            >
              <Plus className="h-4 w-4" />
              Save template
            </PendingButton>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : templates.length === 0 ? (
          <HrEmptyState
            title="No templates"
            description="Manager can create the first shift template."
          />
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {t.name}{" "}
                    <span className="text-muted-foreground">({t.code})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.startTime}–{t.endTime} · {t.department || "All depts"} ·{" "}
                    {t.weekdayJson}
                  </p>
                </div>
                {canManage ? (
                  <HrConfirmAction
                    destructive
                    title="Delete template?"
                    description="Existing shifts are kept."
                    confirmLabel="Delete"
                    trigger={
                      <Button type="button" size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    onConfirm={async () => {
                      await deleteHrShiftTemplateApi(t.id);
                      toast.success("Deleted");
                      await load();
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canManage && templates.length > 0 ? (
          <div className="mt-6 grid gap-3 rounded-2xl border border-dashed border-border/80 p-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Apply template</Label>
              <select
                className={cn(hrFieldClass, "w-full rounded-md border px-3 py-2")}
                value={apply.templateId}
                onChange={(e) =>
                  setApply((a) => ({ ...a, templateId: e.target.value }))
                }
              >
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Employee</Label>
              <HrEmployeeCombobox
                employees={employees}
                valueIds={apply.employeeId ? [Number(apply.employeeId)] : []}
                onChange={(ids) => setApply((a) => ({ ...a, employeeId: ids[0] ? String(ids[0]) : "" }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <HotelDayPicker
                value={apply.fromYmd}
                onChange={(v) => setApply((a) => ({ ...a, fromYmd: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <HotelDayPicker
                value={apply.toYmd}
                onChange={(v) => setApply((a) => ({ ...a, toYmd: v }))}
              />
            </div>
            <PendingButton
              pending={pending}
              className={cn(hrPrimaryBtnClass, "sm:col-span-2")}
              onClick={() => void applyTemplate()}
            >
              Apply to schedule
            </PendingButton>
          </div>
        ) : null}
      </HrSectionCard>
    </HrPanelShell>
  );
}
