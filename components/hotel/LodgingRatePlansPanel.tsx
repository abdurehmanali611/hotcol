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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LODGING_RATE_PLAN_KINDS,
  LODGING_RATE_PLAN_KIND_LABELS,
  LODGING_ROOM_TYPES,
  type LodgingRatePlanKind,
} from "@/constants/lodgingRooms";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  createLodgingRatePlanApi,
  deleteLodgingRatePlanApi,
  fetchLodgingRatePlans,
  updateLodgingRatePlanApi,
  type LodgingRatePlan,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Tags, Trash2, X } from "lucide-react";
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

function formatPlanDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LodgingRatePlansPanel() {
  const [rows, setRows] = useState<LodgingRatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LodgingRatePlan | null>(
    null,
  );

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
    setShowForm(true);
    setDraft({
      name: p.name,
      code: p.code || "",
      kind: (LODGING_RATE_PLAN_KINDS.includes(p.kind as LodgingRatePlanKind)
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPending(`del-${deleteTarget.id}`);
    try {
      await deleteLodgingRatePlanApi(deleteTarget.id);
      if (editingId === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Delete failed");
    } finally {
      setPending(null);
    }
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
        toast.success("Rate plan updated");
      } else {
        await createLodgingRatePlanApi(payload);
        toast.success("Rate plan created");
      }
      cancelEdit();
      setShowForm(false);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save rate plan");
    } finally {
      setPending(null);
    }
  };

  const formPanel = (
    <Card className="overflow-hidden border-primary/20 shadow-lg ring-1 ring-black/5 dark:ring-white/10 lg:sticky lg:top-4">
      <div className="h-1 bg-linear-to-r from-indigo-500/55 via-primary/40 to-emerald-500/40" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {editingId != null ? (
            <Pencil className="h-4 w-4 text-primary" />
          ) : (
            <Plus className="h-4 w-4 text-primary" />
          )}
          {editingId != null ? "Edit rate plan" : "New rate plan"}
        </CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Highest-priority matching active plan sets room-night price at
          check-in; otherwise the room rack rate is used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <HotelFormSection
          title="Basics"
          description="Name, code, kind, and which room types this plan covers."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Label htmlFor="rp-name">Name</Label>
              <Input
                id="rp-name"
                className="h-10 bg-background"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Corporate Standard"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="rp-code">Code</Label>
              <Input
                id="rp-code"
                className="h-10 bg-background font-mono"
                value={draft.code}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, code: e.target.value }))
                }
                placeholder="CORP"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Kind</Label>
              <Select
                value={draft.kind}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, kind: v as LodgingRatePlanKind }))
                }
              >
                <SelectTrigger className="h-10 w-full bg-background">
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
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Label>Room type</Label>
              <Select
                value={draft.roomType || "__all__"}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    roomType: v === "__all__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="h-10 w-full bg-background">
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
          </div>
        </HotelFormSection>

        <HotelFormSection
          title="Pricing"
          description="Nightly rate, priority, and minimum stay."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="rp-price">Price / night (ETB)</Label>
              <Input
                id="rp-price"
                type="number"
                min={0}
                step="0.01"
                className="h-10 tabular-nums bg-background"
                value={draft.pricePerNightETB}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    pricePerNightETB: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="rp-priority">Priority</Label>
              <Input
                id="rp-priority"
                type="number"
                className="h-10 tabular-nums bg-background"
                value={draft.priority}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priority: e.target.value }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Higher priority wins when multiple plans match.
              </p>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="rp-min">Min nights</Label>
              <Input
                id="rp-min"
                type="number"
                min={1}
                className="h-10 tabular-nums bg-background"
                value={draft.minNights}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, minNights: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="rate-active" className="text-sm">
                  Active
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Inactive plans are ignored at check-in.
                </p>
              </div>
              <Switch
                id="rate-active"
                checked={draft.isActive}
                onCheckedChange={(v) =>
                  setDraft((d) => ({ ...d, isActive: v }))
                }
              />
            </div>
          </div>
        </HotelFormSection>

        <HotelFormSection
          title="Validity"
          description="Optional date window. Leave empty for always-on."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <HotelDayPicker
              label="Start date"
              id="rp-start"
              value={draft.startDate}
              onChange={(v) => setDraft((d) => ({ ...d, startDate: v }))}
              placeholder="No start"
              compact
              buttonClassName="bg-background"
            />
            <HotelDayPicker
              label="End date"
              id="rp-end"
              value={draft.endDate}
              onChange={(v) => setDraft((d) => ({ ...d, endDate: v }))}
              placeholder="No end"
              compact
              buttonClassName="bg-background"
            />
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Label htmlFor="rp-notes">Notes</Label>
              <Textarea
                id="rp-notes"
                rows={2}
                value={draft.notes}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, notes: e.target.value }))
                }
                placeholder="Optional notes for managers"
                className="resize-none bg-background"
              />
            </div>
          </div>
        </HotelFormSection>

        <div className="space-y-2 pt-1">
          <PendingButton
            type="button"
            className="h-10 w-full gap-1.5"
            pending={pending === "save"}
            onClick={() => void save()}
          >
            {editingId != null ? (
              <>
                <Pencil className="h-4 w-4" />
                Update plan
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create plan
              </>
            )}
          </PendingButton>
          {editingId != null || showForm ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full gap-1.5"
              onClick={() => {
                cancelEdit();
                setShowForm(false);
              }}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Tags className="h-5 w-5 text-primary" />
            Rate plans
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty leading-relaxed">
            Rack, corporate, seasonal, weekend, promo, and long-stay rates.
            Matching active plans override room rack prices at check-in.
          </p>
        </div>
        <Button
          type="button"
          className="gap-2 shrink-0 lg:hidden"
          onClick={() => {
            if (showForm) {
              cancelEdit();
              setShowForm(false);
            } else {
              cancelEdit();
              setShowForm(true);
            }
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Hide form" : "New plan"}
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className={cn("min-w-0", showForm ? "block" : "hidden lg:block")}>
          {formPanel}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-sm font-medium tracking-tight">Configured plans</p>
            {!loading ? (
              <Badge variant="secondary" className="tabular-nums font-normal">
                {rows.length}
              </Badge>
            ) : null}
          </div>

          {loading ? (
            <p className="py-8 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                No rate plans yet. Use the form to add rack, corporate, or promo
                rates — room rack prices apply until then.
              </CardContent>
            </Card>
          ) : (
            rows.map((p) => {
              const startLabel = formatPlanDate(p.startDate);
              const endLabel = formatPlanDate(p.endDate);
              const isEditing = editingId === p.id;
              return (
                <Card
                  key={p.id}
                  className={cn(
                    "border-border/70 shadow-sm transition-shadow hover:shadow-md",
                    isEditing && "border-primary/40 ring-1 ring-primary/20",
                  )}
                >
                  <CardContent className="flex flex-col gap-4 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">{p.name}</p>
                        {p.code ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {p.code}
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="capitalize">
                          {LODGING_RATE_PLAN_KIND_LABELS[
                            p.kind as LodgingRatePlanKind
                          ] || p.kind}
                        </Badge>
                        {p.isActive === false ? (
                          <Badge variant="outline">Inactive</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200 border-emerald-500/25">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm tabular-nums">
                        <span className="font-semibold text-foreground">
                          ETB {Number(p.pricePerNightETB).toLocaleString()}
                        </span>
                        <span className="text-muted-foreground"> / night</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.roomType ? p.roomType : "All room types"}
                        {p.minNights > 1 ? ` · min ${p.minNights} nights` : ""}
                        {` · priority ${p.priority}`}
                        {startLabel || endLabel
                          ? ` · ${startLabel || "…"} → ${endLabel || "…"}`
                          : " · always on"}
                      </p>
                      {p.notes ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {p.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1.5"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto h-9 gap-1.5 text-destructive hover:text-destructive"
                        disabled={Boolean(pending)}
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !pending?.startsWith("del-")) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="h-1 bg-linear-to-r from-rose-500 via-amber-500/70 to-transparent" />
          <AlertDialogHeader className="space-y-3 px-6 pt-6 text-left">
            <AlertDialogTitle className="flex items-center gap-2 text-xl tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-300">
                <Trash2 className="size-4" />
              </span>
              Delete rate plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty leading-relaxed">
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name || "this rate plan"}
              </span>
              {deleteTarget?.code ? (
                <>
                  {" "}
                  (
                  <span className="font-mono text-foreground">
                    {deleteTarget.code}
                  </span>
                  )
                </>
              ) : null}
              . Existing stays that already used this plan keep their frozen
              rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <AlertDialogCancel
              disabled={Boolean(pending?.startsWith("del-"))}
              className="h-10 rounded-xl"
            >
              Keep plan
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(pending?.startsWith("del-"))}
              className={cn(
                "h-10 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {pending?.startsWith("del-") ? "Deleting…" : "Delete plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
