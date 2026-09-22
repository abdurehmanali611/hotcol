"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LODGING_BILL_LINE_KINDS,
  LODGING_BILL_LINE_KIND_LABELS,
  type LodgingBillLineKind,
} from "@/constants/lodgingRooms";
import {
  deleteLodgingTaxConfigApi,
  fetchLodgingTaxConfigs,
  upsertLodgingTaxConfigApi,
  type LodgingTaxConfig,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Layers, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type DraftTax = {
  key: string;
  name: string;
  kind: string;
  taxPercent: string;
};

function emptyDraft(): DraftTax {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    kind: "room",
    taxPercent: "",
  };
}

function kindLabel(kind: string) {
  return (
    LODGING_BILL_LINE_KIND_LABELS[kind as LodgingBillLineKind] || kind
  );
}

function draftReadyCount(drafts: DraftTax[]) {
  return drafts.filter((d) => d.name.trim()).length;
}

export function LodgingTaxConfigPanel() {
  const [saved, setSaved] = useState<LodgingTaxConfig[]>([]);
  const [drafts, setDrafts] = useState<DraftTax[]>([emptyDraft()]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<LodgingTaxConfig | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState("room");
  const [editPercent, setEditPercent] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<LodgingTaxConfig | null>(
    null,
  );

  const draftPreviewCount = draftReadyCount(drafts);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSaved(await fetchLodgingTaxConfigs());
    } catch (e) {
      notifyApiFailure(e, "Could not load tax config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (key: string, patch: Partial<DraftTax>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );
  };

  const removeLine = (key: string) => {
    setDrafts((prev) =>
      prev.length <= 1 ? [emptyDraft()] : prev.filter((d) => d.key !== key),
    );
  };

  const saveAll = async () => {
    const payload = drafts.map((d) => ({
      name: d.name.trim(),
      kind: d.kind,
      taxPercent: Math.max(0, Number(d.taxPercent) || 0),
    }));

    const filled = payload.filter((d) => d.name || d.taxPercent > 0);
    if (!filled.length) {
      toast.error("Add at least one tax line");
      return;
    }
    for (const row of filled) {
      if (!row.name) {
        toast.error("Each tax needs a name");
        return;
      }
    }

    setPending("save");
    try {
      for (const row of filled) {
        await upsertLodgingTaxConfigApi({
          name: row.name,
          kind: row.kind,
          taxPercent: row.taxPercent,
          quiet: true,
        });
      }
      toast.success(
        filled.length === 1 ? "Tax saved" : `${filled.length} taxes saved`,
      );
      setDrafts([emptyDraft()]);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save taxes");
    } finally {
      setPending(null);
    }
  };

  const openEdit = (row: LodgingTaxConfig) => {
    setEditRow(row);
    setEditName(row.name || "Tax");
    setEditKind(row.kind);
    setEditPercent(String(row.taxPercent ?? 0));
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Tax name is required");
      return;
    }
    setPending(`edit-${editRow.id}`);
    try {
      await upsertLodgingTaxConfigApi({
        id: editRow.id,
        name,
        kind: editKind,
        taxPercent: Math.max(0, Number(editPercent) || 0),
      });
      setEditRow(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not update tax");
    } finally {
      setPending(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPending(`del-${deleteTarget.id}`);
    try {
      await deleteLodgingTaxConfigApi(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not delete tax");
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Percent className="h-5 w-5 text-primary" />
            Named lodging taxes
          </h2>
          <p className="text-sm text-muted-foreground">
            Add named percent taxes per folio kind. Same-kind taxes stack on
            charges. Edit or remove saved rows anytime.
          </p>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
          <Card className="relative overflow-hidden border-primary/25 shadow-lg ring-1 ring-black/5 dark:ring-white/10 lg:sticky lg:top-4">
            <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="h-1 bg-linear-to-r from-indigo-500/80 via-primary/55 to-emerald-500/50" />

            <div className="relative space-y-1 border-b border-border/60 bg-linear-to-br from-indigo-500/10 via-background to-emerald-500/5 px-5 pb-4 pt-5 sm:px-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-indigo-950 dark:text-indigo-300">
                <Layers className="size-3" />
                Batch entry
              </div>
              <div className="flex items-start gap-3 pt-2">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                  <Percent className="size-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-lg tracking-tight">
                    Add taxes
                  </CardTitle>
                  <CardDescription className="text-pretty leading-relaxed">
                    Name each tax, pick the folio kind it applies to, set the
                    percent — then save the batch once.
                  </CardDescription>
                </div>
              </div>
            </div>

            <CardContent className="relative space-y-4 pb-6 pt-5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Tax lines
                </p>
                <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {drafts.length} line{drafts.length === 1 ? "" : "s"}
                  {draftPreviewCount > 0
                    ? ` · ${draftPreviewCount} ready`
                    : ""}
                </span>
              </div>

              <div className="space-y-3">
                {drafts.map((draft, idx) => (
                  <div
                    key={draft.key}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3.5 shadow-sm ring-1 ring-black/4 transition-shadow hover:shadow-md dark:ring-white/6 sm:p-4"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 font-semibold tabular-nums text-primary ring-1 ring-primary/20">
                          {idx + 1}
                        </span>
                        Tax line
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                        disabled={drafts.length <= 1}
                        onClick={() => removeLine(draft.key)}
                        aria-label="Remove tax line"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Name
                        </Label>
                        <Input
                          value={draft.name}
                          onChange={(e) =>
                            patchDraft(draft.key, { name: e.target.value })
                          }
                          placeholder="VAT"
                          className="h-11 w-full rounded-xl bg-background py-0"
                        />
                      </div>

                      <div className="grid grid-cols-2 items-end gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Applies to
                          </Label>
                          <Select
                            value={draft.kind}
                            onValueChange={(v) =>
                              patchDraft(draft.key, { kind: v })
                            }
                          >
                            <SelectTrigger className="h-11 w-full rounded-xl bg-background py-0 data-[size=default]:h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LODGING_BILL_LINE_KINDS.map((k) => (
                                <SelectItem key={k} value={k}>
                                  {LODGING_BILL_LINE_KIND_LABELS[k]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="min-w-0 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Percent
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={draft.taxPercent}
                              onChange={(e) =>
                                patchDraft(draft.key, {
                                  taxPercent: e.target.value,
                                })
                              }
                              placeholder="15"
                              className="h-11 w-full rounded-xl bg-background py-0 pr-8 tabular-nums"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col pt-1">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 rounded-xl border-dashed px-4 hover:border-primary/40 hover:bg-primary/5"
                    onClick={() =>
                      setDrafts((prev) => [...prev, emptyDraft()])
                    }
                  >
                    <Plus className="size-4" />
                    Add tax line
                  </Button>
                </div>
                <div className="mt-8 space-y-2.5">
                  <PendingButton
                    type="button"
                    className="h-12 w-full gap-2 rounded-xl text-base font-semibold shadow-md"
                    pending={pending === "save"}
                    onClick={() => void saveAll()}
                  >
                    <Percent className="size-4" />
                    Save taxes
                  </PendingButton>
                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    Taxes for the same folio kind stack on that charge.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 shadow-md">
            <div className="h-1 bg-linear-to-r from-emerald-500/60 via-primary/35 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle className="text-base tracking-tight">
                    Saved taxes
                  </CardTitle>
                  <CardDescription>
                    Active folio taxes for this property.
                  </CardDescription>
                </div>
                {!loading ? (
                  <Badge
                    variant="secondary"
                    className="tabular-nums font-normal"
                  >
                    {saved.length}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : saved.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-14 text-center text-sm text-muted-foreground">
                  No taxes saved yet. Add a line on the left and save.
                </div>
              ) : (
                <ul className="max-h-[28rem] space-y-2.5 overflow-y-auto pr-0.5">
                  {saved.map((row) => {
                    const isEditing = editRow?.id === row.id;
                    return (
                      <li key={row.id}>
                        <Card
                          className={cn(
                            "border-border/70 shadow-sm transition-shadow hover:shadow-md",
                            isEditing &&
                              "border-primary/40 ring-1 ring-primary/20",
                          )}
                        >
                          <CardContent className="flex flex-col gap-3 py-4">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold tracking-tight">
                                  {row.name || "Tax"}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="font-normal"
                                >
                                  {kindLabel(row.kind)}
                                </Badge>
                              </div>
                              <p className="text-sm tabular-nums">
                                <span className="font-semibold text-foreground">
                                  {Number(row.taxPercent)}%
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  on {kindLabel(row.kind).toLowerCase()} charges
                                </span>
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-9 gap-1.5 rounded-xl"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="size-3.5" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="ml-auto h-9 gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={Boolean(pending)}
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="h-1 bg-linear-to-r from-indigo-500/70 via-primary/50 to-transparent" />
          <div className="space-y-4 px-6 pt-6 pb-2">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Pencil className="size-4" />
                </span>
                Edit tax
              </DialogTitle>
              <DialogDescription className="text-pretty leading-relaxed">
                Update the display name, folio kind, and percent for this tax
                row.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-tax-name">Name</Label>
                <Input
                  id="edit-tax-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="VAT"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Applies to</Label>
                <Select value={editKind} onValueChange={setEditKind}>
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LODGING_BILL_LINE_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {LODGING_BILL_LINE_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-tax-percent">Percent</Label>
                <Input
                  id="edit-tax-percent"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editPercent}
                  onChange={(e) => setEditPercent(e.target.value)}
                  placeholder="15"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setEditRow(null)}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              className="h-10 gap-2 rounded-xl"
              pending={
                editRow != null && pending === `edit-${editRow.id}`
              }
              onClick={() => void saveEdit()}
            >
              <Pencil className="size-3.5" />
              Save changes
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Delete tax?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty leading-relaxed">
              This removes{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name || "this tax"}
              </span>
              {deleteTarget ? (
                <>
                  {" "}
                  ({kindLabel(deleteTarget.kind)} ·{" "}
                  <span className="tabular-nums">
                    {Number(deleteTarget.taxPercent)}%
                  </span>
                  )
                </>
              ) : null}
              . Existing folio lines already posted keep their tax amounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <AlertDialogCancel
              disabled={Boolean(pending?.startsWith("del-"))}
              className="h-10 rounded-xl"
            >
              Cancel
            </AlertDialogCancel>
            <PendingButton
              type="button"
              variant="destructive"
              className="h-10 gap-2 rounded-xl"
              pending={Boolean(pending?.startsWith("del-"))}
              onClick={() => void confirmDelete()}
            >
              <Trash2 className="size-3.5" />
              Delete tax
            </PendingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
