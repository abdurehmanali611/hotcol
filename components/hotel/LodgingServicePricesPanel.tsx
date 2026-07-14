"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteLodgingServiceItemApi,
  fetchLodgingServiceItems,
  upsertLodgingServiceItemApi,
  type LodgingServiceItem,
} from "@/lib/api/lodgingRooms";
import {
  LODGING_SERVICE_KINDS,
  type LodgingServiceKind,
} from "@/constants/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";

const KIND_LABELS: Record<LodgingServiceKind, string> = {
  food_drink: "Food & drink",
  laundry: "Laundry",
};

const emptyForm = {
  name: "",
  unitPriceETB: "",
  unitLabel: "pcs",
};

export function LodgingServicePricesPanel() {
  const [kind, setKind] = useState<LodgingServiceKind>("food_drink");
  const [items, setItems] = useState<LodgingServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLodgingServiceItems(kind);
      setItems(rows.filter((r) => r.isActive !== false));
    } catch (e) {
      notifyApiFailure(e, "Could not load service prices");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (item: LodgingServiceItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      unitPriceETB: String(item.unitPriceETB ?? ""),
      unitLabel: item.unitLabel || "pcs",
    });
  };

  const onSubmit = async () => {
    const name = form.name.trim();
    const price = Number(form.unitPriceETB);
    if (!name || !Number.isFinite(price) || price < 0) return;
    setPending(editingId != null ? `save-${editingId}` : "create");
    try {
      await upsertLodgingServiceItemApi({
        id: editingId ?? undefined,
        kind,
        name,
        unitPriceETB: price,
        unitLabel: form.unitLabel.trim() || "pcs",
        isActive: true,
      });
      resetForm();
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save service item");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="max-w-3xl border-border/80 shadow-md bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Room service prices
        </CardTitle>
        <CardDescription>
          Catalog prices for food & drink and laundry charged to guest stays from
          reception.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs
          value={kind}
          onValueChange={(v) => {
            setKind(v as LodgingServiceKind);
            resetForm();
          }}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            {LODGING_SERVICE_KINDS.map((k) => (
              <TabsTrigger key={k} value={k}>
                {KIND_LABELS[k]}
              </TabsTrigger>
            ))}
          </TabsList>

          {LODGING_SERVICE_KINDS.map((k) => (
            <TabsContent key={k} value={k} className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-medium">
                  {editingId != null ? "Edit item" : `Add ${KIND_LABELS[k]} item`}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`svc-name-${k}`}>Name</Label>
                    <Input
                      id={`svc-name-${k}`}
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g. Breakfast"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`svc-price-${k}`}>Unit price (ETB)</Label>
                    <Input
                      id={`svc-price-${k}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.unitPriceETB}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          unitPriceETB: e.target.value,
                        }))
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`svc-unit-${k}`}>Unit label</Label>
                    <Input
                      id={`svc-unit-${k}`}
                      value={form.unitLabel}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unitLabel: e.target.value }))
                      }
                      placeholder="pcs"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PendingButton
                    type="button"
                    pending={
                      pending === "create" || pending?.startsWith("save-") === true
                    }
                    disabled={!form.name.trim() || form.unitPriceETB === ""}
                    onClick={() => void onSubmit()}
                  >
                    {editingId != null ? (
                      <>
                        <Pencil className="h-4 w-4" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </PendingButton>
                  {editingId != null ? (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/70 p-6 text-center">
                  No {KIND_LABELS[k].toLowerCase()} items yet.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border border-border/70">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          ETB {Number(item.unitPriceETB).toLocaleString()} /{" "}
                          {item.unitLabel || "pcs"}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <PendingButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          pending={pending === `del-${item.id}`}
                          onClick={async () => {
                            setPending(`del-${item.id}`);
                            try {
                              await deleteLodgingServiceItemApi(item.id);
                              if (editingId === item.id) resetForm();
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Could not remove item");
                            } finally {
                              setPending(null);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </PendingButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
