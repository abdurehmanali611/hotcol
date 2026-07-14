"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CldUploadButton } from "next-cloudinary";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shirt, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { RegistrationImageUploadField } from "@/components/hotel/RegistrationImageUploadField";
import {
  deleteLodgingServiceItemApi,
  fetchLodgingServiceItems,
  upsertLodgingServiceItemApi,
  type LodgingServiceItem,
} from "@/lib/api/lodgingRooms";
import {
  INVENTORY_UNIT_SELECT_OPTIONS,
  inventoryUnitSelectValues,
} from "@/lib/inventoryUnits";
import { ITEM_REGISTRATION_IMAGE_UPLOAD_OPTIONS } from "@/lib/cloudinaryUploadOptions";
import {
  hasRegistrationImage,
  registrationPreviewImageUrl,
} from "@/lib/registrationImageUrl";
import { notifyApiFailure } from "@/lib/actions";
import { toast } from "sonner";

type LaundryLine = {
  key: string;
  name: string;
  unitPriceETB: string;
  unitLabel: string;
  imageUrl: string;
};

function newKey() {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLine(): LaundryLine {
  return {
    key: newKey(),
    name: "",
    unitPriceETB: "",
    unitLabel: INVENTORY_UNIT_SELECT_OPTIONS[2]?.name ?? "Piece",
    imageUrl: "",
  };
}

function secureUrlFromUpload(result: unknown): string {
  const info =
    result && typeof result === "object" && "info" in result
      ? (result as { info?: unknown }).info
      : null;
  if (info && typeof info === "object" && info !== null && "secure_url" in info) {
    return String((info as { secure_url: unknown }).secure_url || "");
  }
  return "";
}

export function LodgingLaundryAddPanel() {
  const [lines, setLines] = useState<LaundryLine[]>([emptyLine()]);
  const [pending, setPending] = useState(false);

  const validLines = useMemo(
    () =>
      lines.filter((l) => {
        const price = Number(l.unitPriceETB);
        return l.name.trim().length >= 1 && Number.isFinite(price) && price >= 0;
      }),
    [lines],
  );

  const updateLine = (key: string, patch: Partial<LaundryLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const onSubmit = async () => {
    if (validLines.length === 0) {
      toast.error("Add at least one laundry item with name and price");
      return;
    }
    setPending(true);
    let ok = 0;
    try {
      for (const line of validLines) {
        await upsertLodgingServiceItemApi({
          kind: "laundry",
          name: line.name.trim(),
          unitPriceETB: Number(line.unitPriceETB),
          unitLabel: line.unitLabel,
          imageUrl: line.imageUrl.trim(),
          isActive: true,
        });
        ok += 1;
      }
      toast.success(
        ok === 1 ? "Laundry item saved" : `${ok} laundry items saved`,
      );
      setLines([emptyLine()]);
    } catch (e) {
      notifyApiFailure(
        e,
        ok > 0 ? `Saved ${ok}, then failed` : "Could not save laundry items",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-amber-500/60 via-primary/50 to-sky-500/40" />
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <Shirt className="h-5 w-5 text-primary" />
          Add laundry items
        </CardTitle>
        <CardDescription className="max-w-3xl text-pretty leading-relaxed">
          Price laundry services charged to guest stays. Add several rows, then
          submit once — units match store inventory (Litre, Kilogram, Piece…).
          Optional photos help reception pick the right item.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <HotelFormSection
          title="Laundry lines"
          description="One card per washable item or service."
        >
          <div className="min-w-0 space-y-3">
            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="min-w-0 space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 sm:p-5 dark:ring-white/6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Item {idx + 1}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) =>
                        prev.length <= 1
                          ? prev
                          : prev.filter((l) => l.key !== line.key),
                      )
                    }
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`laun-name-${line.key}`}>Name</Label>
                    <Input
                      id={`laun-name-${line.key}`}
                      value={line.name}
                      onChange={(e) =>
                        updateLine(line.key, { name: e.target.value })
                      }
                      placeholder="e.g. Shirt wash"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`laun-price-${line.key}`}>
                      Unit price (ETB)
                    </Label>
                    <Input
                      id={`laun-price-${line.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPriceETB}
                      onChange={(e) =>
                        updateLine(line.key, { unitPriceETB: e.target.value })
                      }
                      placeholder="0.00"
                      className="h-10 tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit</Label>
                    <Select
                      value={line.unitLabel}
                      onValueChange={(v) =>
                        updateLine(line.key, { unitLabel: v })
                      }
                    >
                      <SelectTrigger className="h-10 w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryUnitSelectValues(line.unitLabel).map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Item image{" "}
                    <span className="font-normal">(optional)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    {hasRegistrationImage(line.imageUrl) ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border">
                        <Image
                          src={
                            registrationPreviewImageUrl(line.imageUrl) ||
                            line.imageUrl
                          }
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <CldUploadButton
                      uploadPreset={
                        process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME
                      }
                      options={{ ...ITEM_REGISTRATION_IMAGE_UPLOAD_OPTIONS }}
                      onSuccess={(result) => {
                        const url = secureUrlFromUpload(result);
                        if (url) updateLine(line.key, { imageUrl: url });
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-sm hover:bg-muted"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {hasRegistrationImage(line.imageUrl)
                        ? "Change image"
                        : "Upload image"}
                    </CldUploadButton>
                    {hasRegistrationImage(line.imageUrl) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-muted-foreground"
                        onClick={() => updateLine(line.key, { imageUrl: "" })}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
              {validLines.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {validLines.length} item{validLines.length === 1 ? "" : "s"}{" "}
                  ready
                </p>
              ) : null}
            </div>
            <PendingButton
              type="button"
              className="h-11 w-full text-base font-semibold shadow-md"
              pending={pending}
              disabled={validLines.length === 0}
              onClick={() => void onSubmit()}
            >
              Submit {validLines.length || ""} item
              {validLines.length === 1 ? "" : "s"}
            </PendingButton>
          </div>
        </HotelFormSection>
      </CardContent>
    </Card>
  );
}

export function LodgingLaundryItemsPanel() {
  const [items, setItems] = useState<LodgingServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    unitPriceETB: "",
    unitLabel: "Piece",
    imageUrl: "",
  });
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLodgingServiceItems("laundry");
      setItems(rows.filter((r) => r.isActive !== false));
    } catch (e) {
      notifyApiFailure(e, "Could not load laundry items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", unitPriceETB: "", unitLabel: "Piece", imageUrl: "" });
  };

  const onSave = async () => {
    const price = Number(form.unitPriceETB);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
      toast.error("Name and valid unit price are required");
      return;
    }
    setPending(editingId != null ? `save-${editingId}` : "save");
    try {
      await upsertLodgingServiceItemApi({
        id: editingId ?? undefined,
        kind: "laundry",
        name: form.name.trim(),
        unitPriceETB: price,
        unitLabel: form.unitLabel,
        imageUrl: form.imageUrl.trim(),
        isActive: true,
      });
      resetForm();
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save item");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden border-border/80 bg-card/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-amber-500/50 via-border to-transparent" />
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <Shirt className="h-5 w-5 text-primary" />
          Laundry menu items
        </CardTitle>
        <CardDescription className="leading-relaxed">
          Update or remove laundry catalog prices and photos used at reception.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pb-8">
        {editingId != null ? (
          <HotelFormSection
            title="Edit item"
            description="Save when the name, price, unit, and image look right."
          >
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label>Name</Label>
                <Input
                  className="h-10"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit price (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10 tabular-nums"
                  value={form.unitPriceETB}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitPriceETB: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={form.unitLabel}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, unitLabel: v }))
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryUnitSelectValues(form.unitLabel).map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <RegistrationImageUploadField
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
              hint="Optional photo shown on the reception laundry menu."
            />
            <div className="flex flex-wrap gap-2">
              <PendingButton
                type="button"
                pending={pending?.startsWith("save") === true}
                onClick={() => void onSave()}
              >
                <Pencil className="h-4 w-4" />
                Update
              </PendingButton>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </HotelFormSection>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
            No laundry items yet. Use Add item to create some.
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
            {items.map((item) => {
              const preview = registrationPreviewImageUrl(item.imageUrl || "");
              const hasImg = hasRegistrationImage(item.imageUrl || "");
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 bg-card/60 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/30">
                      {hasImg && preview ? (
                        <Image
                          src={preview}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Shirt className="h-5 w-5 text-muted-foreground/60" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        ETB {Number(item.unitPriceETB).toLocaleString()} /{" "}
                        {item.unitLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          name: item.name,
                          unitPriceETB: String(item.unitPriceETB),
                          unitLabel: item.unitLabel || "Piece",
                          imageUrl: item.imageUrl || "",
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <PendingButton
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
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
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
