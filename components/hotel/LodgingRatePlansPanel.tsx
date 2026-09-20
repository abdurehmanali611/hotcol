"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LODGING_RATE_PLAN_KINDS,
  LODGING_RATE_PLAN_KIND_LABELS,
  LODGING_ROOM_TYPES,
  type LodgingRatePlanKind,
} from "@/constants/lodgingRooms";
import {
  createLodgingRatePlanApi,
  deleteLodgingRatePlanApi,
  fetchLodgingRatePlans,
  updateLodgingRatePlanApi,
  type LodgingRatePlan,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Draft = {
  name: string;
  code: string;
  kind: LodgingRatePlanKind;
  roomType: string;
  pricePerNightETB: string;
  startDate: string;
  endDate: string;
  minNights: string;
  priority: string;
  isActive: boolean;
  notes: string;
};

function emptyDraft(): Draft {
  return {
    name: "",
    code: "",
    kind: "standard",
    roomType: "",
    pricePerNightETB: "",
    startDate: "",
    endDate: "",
    minNights: "1",
    priority: "0",
    isActive: true,
    notes: "",
  };
}

export function LodgingRatePlansPanel() {
  const [rows, setRows] = useState<LodgingRatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchLodgingRatePlans(false));
    } catch (e) {
      notifyApiFailure(e, "Could not load rate plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (p: LodgingRatePlan) => {
    setEditingId(p.id);
    setDraft({
      name: p.name,
      code: p.code || "",
      kind: (LODGING_RATE_PLAN_KINDS.includes(
        p.kind as LodgingRatePlanKind,
      )
        ? p.kind
        : "standard") as LodgingRatePlanKind,
      roomType: p.roomType || "",
      pricePerNightETB: String(p.pricePerNightETB ?? ""),
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      minNights: String(p.minNights ?? 1),
      priority: String(p.priority ?? 0),
      isActive: p.isActive !== false,
      notes: p.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    const price = Number(draft.pricePerNightETB);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid nightly price");
      return;
    }
    setPending("save");
    try {
      const payload = {
        name: draft.name.trim(),
        code: draft.code.trim(),
        kind: draft.kind,
        roomType: draft.roomType.trim(),
        pricePerNightETB: price,
        startDate: draft.startDate.trim(),
        endDate: draft.endDate.trim(),
        minNights: Math.max(1, Number(draft.minNights) || 1),
        priority: Math.floor(Number(draft.priority) || 0),
        isActive: draft.isActive,
        notes: draft.notes.trim(),
      };
      if (editingId != null) {
        await updateLodgingRatePlanApi({ id: editingId, ...payload });
      } else {
        await createLodgingRatePlanApi(payload);
      }
      cancelEdit();
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save rate plan");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <div className="h-1 bg-linear-to-r from-indigo-500/55 via-primary/40 to-emerald-500/40" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Tags className="h-5 w-5 text-primary" />
            {editingId != null ? "Edit rate plan" : "Rate plans"}
          </CardTitle>
          <CardDescription>
            Define rack, corporate, seasonal, weekend, promo, and long-stay
            rates. At check-in the highest-priority matching active plan sets
            room night price (otherwise the room&apos;s rack rate is used).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Corporate Standard"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Code (optional)</Label>
            <Input
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              placeholder="CORP"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select
              value={draft.kind}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, kind: v as LodgingRatePlanKind }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LODGING_RATE_PLAN_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {LODGING_RATE_PLAN_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Room type (empty = all)</Label>
            <Select
              value={draft.roomType || "__all__"}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  roomType: v === "__all__" ? "" : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {LODGING_ROOM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Price / night (ETB)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="tabular-nums"
              value={draft.pricePerNightETB}
              onChange={(e) =>
                setDraft((d) => ({ ...d, pricePerNightETB: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority (higher wins)</Label>
            <Input
              type="number"
              className="tabular-nums"
              value={draft.priority}
              onChange={(e) =>
                setDraft((d) => ({ ...d, priority: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input
              type="date"
              value={draft.startDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, startDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input
              type="date"
              value={draft.endDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, endDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Min nights</Label>
            <Input
              type="number"
              min={1}
              value={draft.minNights}
              onChange={(e) =>
                setDraft((d) => ({ ...d, minNights: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
            <Label htmlFor="rate-active">Active</Label>
            <Switch
              id="rate-active"
              checked={draft.isActive}
              onCheckedChange={(v) =>
                setDraft((d) => ({ ...d, isActive: v }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <PendingButton
              type="button"
              pending={pending === "save"}
              onClick={() => void save()}
            >
              <Plus className="h-4 w-4" />
              {editingId != null ? "Update plan" : "Create plan"}
            </PendingButton>
            {editingId != null ? (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configured plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No rate plans yet — room rack prices are used until you add plans.
            </div>
          ) : (
            rows.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {p.code ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.code}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="capitalize">
                      {LODGING_RATE_PLAN_KIND_LABELS[
                        p.kind as LodgingRatePlanKind
                      ] || p.kind}
                    </Badge>
                    {!p.isActive ? (
                      <Badge variant="outline">Inactive</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    ETB {Number(p.pricePerNightETB).toLocaleString()}/night
                    {p.roomType ? ` · ${p.roomType}` : " · all types"}
                    {p.minNights > 1 ? ` · min ${p.minNights}n` : ""}
                    {` · priority ${p.priority}`}
                    {p.startDate || p.endDate
                      ? ` · ${p.startDate || "…"} → ${p.endDate || "…"}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => startEdit(p)}
                    aria-label={`Edit ${p.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <PendingButton
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    pending={pending === `del-${p.id}`}
                    onClick={async () => {
                      setPending(`del-${p.id}`);
                      try {
                        await deleteLodgingRatePlanApi(p.id);
                        if (editingId === p.id) cancelEdit();
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Delete failed");
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </PendingButton>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
