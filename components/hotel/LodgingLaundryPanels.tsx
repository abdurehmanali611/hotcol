"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CldUploadButton } from "next-cloudinary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { LodgingOptionCombobox } from "@/components/hotel/LodgingOptionCombobox";
import { Shirt, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { RegistrationImageUploadField } from "@/components/hotel/RegistrationImageUploadField";
import {
  LODGING_ACCENTS,
  LodgingEmptyState,
  LodgingFormSection,
  LodgingPanelShell,
  LodgingSectionCard,
  lodgingDangerBtnClass,
  lodgingFieldClass,
  lodgingGhostBtnClass,
  lodgingListDivideClass,
  lodgingListFrameClass,
  lodgingPrimaryBtnClass,
} from "@/components/hotel/lodgingChrome";
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
import { cn } from "@/lib/utils";
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
    <LodgingPanelShell className="mx-auto max-w-4xl">
      <LodgingSectionCard
        title="Add laundry items"
        description="Price laundry services charged to guest stays. Add several rows, then submit once — units match store inventory (Litre, Kilogram, Piece…). Optional photos help reception pick the right item."
        icon={<Shirt className="h-5 w-5" />}
        accent={LODGING_ACCENTS.amber}
      >
        <LodgingFormSection
          title="Laundry lines"
          description="One card per washable item or service."
          tone="amber"
        >
          <div className="min-w-0 space-y-3">
            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="min-w-0 space-y-4 rounded-xl border border-amber-500/15 bg-linear-to-br from-amber-500/4 via-card to-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900/65 dark:text-amber-200/70">
                    Item {idx + 1}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "size-8 shrink-0",
                      lodgingDangerBtnClass,
                    )}
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
                      className={lodgingFieldClass}
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
                      className={cn(lodgingFieldClass, "tabular-nums")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit</Label>
                    <LodgingOptionCombobox
                      value={line.unitLabel}
                      onChange={(v) =>
                        updateLine(line.key, { unitLabel: v })
                      }
                      options={inventoryUnitSelectValues(line.unitLabel).map(
                        (u) => ({ value: u, label: u }),
                      )}
                      placeholder="Select unit…"
                      searchPlaceholder="Search units…"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Item image{" "}
                    <span className="font-normal">(optional)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    {hasRegistrationImage(line.imageUrl) ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-amber-500/15">
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
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/15 bg-background px-3 text-xs font-medium text-teal-800/90 shadow-sm hover:bg-primary/6 dark:text-teal-200"
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
                        className={cn("h-9 text-xs", lodgingGhostBtnClass)}
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
                className={cn("h-10 rounded-xl border-primary/20", lodgingGhostBtnClass)}
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
              className={cn("h-11 w-full text-base font-semibold", lodgingPrimaryBtnClass)}
              pending={pending}
              disabled={validLines.length === 0}
              onClick={() => void onSubmit()}
            >
              Submit {validLines.length || ""} item
              {validLines.length === 1 ? "" : "s"}
            </PendingButton>
          </div>
        </LodgingFormSection>
      </LodgingSectionCard>
    </LodgingPanelShell>
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
    <LodgingPanelShell className="mx-auto max-w-4xl">
      <LodgingSectionCard
        title="Laundry menu items"
        description="Update or remove laundry catalog prices and photos used at reception."
        icon={<Shirt className="h-5 w-5" />}
        accent={LODGING_ACCENTS.sky}
      >
        {editingId != null ? (
          <LodgingFormSection
            title="Edit item"
            description="Save when the name, price, unit, and image look right."
            tone="sky"
            className="mb-5"
          >
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label>Name</Label>
                <Input
                  className={lodgingFieldClass}
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
                  className={cn(lodgingFieldClass, "tabular-nums")}
                  value={form.unitPriceETB}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitPriceETB: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <LodgingOptionCombobox
                  value={form.unitLabel}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, unitLabel: v }))
                  }
                  options={inventoryUnitSelectValues(form.unitLabel).map(
                    (u) => ({ value: u, label: u }),
                  )}
                  placeholder="Select unit…"
                  searchPlaceholder="Search units…"
                />
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
                className={lodgingPrimaryBtnClass}
                pending={pending?.startsWith("save") === true}
                onClick={() => void onSave()}
              >
                <Pencil className="h-4 w-4" />
                Update
              </PendingButton>
              <Button
                type="button"
                variant="outline"
                className={cn("rounded-xl border-primary/20", lodgingGhostBtnClass)}
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </LodgingFormSection>
        ) : null}

        {loading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <LodgingEmptyState
            title="No laundry items yet"
            description="Use Add item to create catalog prices shown at reception."
            icon={<Shirt className="h-6 w-6" />}
          />
        ) : (
          <ul className={cn(lodgingListFrameClass, lodgingListDivideClass)}>
            {items.map((item) => {
              const preview = registrationPreviewImageUrl(item.imageUrl || "");
              const hasImg = hasRegistrationImage(item.imageUrl || "");
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 bg-card/40 p-4 transition-colors hover:bg-primary/3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-primary/12 bg-primary/4">
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
                          <Shirt className="h-5 w-5 text-teal-700/55 dark:text-teal-300/60" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        ETB {Number(item.unitPriceETB).toLocaleString()} /{" "}
                        {item.unitLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn("size-8", lodgingGhostBtnClass)}
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
                      className={cn("size-8", lodgingDangerBtnClass)}
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
      </LodgingSectionCard>
    </LodgingPanelShell>
  );
}
