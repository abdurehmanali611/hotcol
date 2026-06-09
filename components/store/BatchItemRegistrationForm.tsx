"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CldUploadButton } from "next-cloudinary";
import { ITEM_REGISTRATION_IMAGE_UPLOAD_OPTIONS } from "@/lib/cloudinaryUploadOptions";
import { PackagePlus, Plus, Trash2, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import {
  createItemRegistrationsBatchApi,
  checkPityCashBalance,
  notifyApiFailure,
} from "@/lib/actions";
import { computeInventoryPaidAmountETB } from "@/lib/hotelInventoryPayment";
import { hasRegistrationImage } from "@/lib/registrationImageUrl";
import { INVENTORY_UNIT_SELECT_OPTIONS } from "@/lib/inventoryUnits";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { DepartmentLeaderSelect } from "@/components/hotel/DepartmentLeaderSelect";
import { REGISTRATION_RECEIVED_BY_CODES } from "@/lib/departments";

const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);

const REGISTRATION_CATEGORIES = [
  "Food",
  "Beverage",
  "House Keeping",
  "Maintenance",
  "Office Supplies",
  "Others",
] as const;

type RegistrationLine = {
  key: string;
  name: string;
  category: (typeof REGISTRATION_CATEGORIES)[number];
  amount: number;
  measuredBy: string;
  unitPrice: number;
  registrationDate: string;
  expireDate: string;
  imageUrl: string;
  purchaseWithVat: boolean;
  paidAmount: number;
  paidAmountDirty: boolean;
};

function newLineKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyLine(): RegistrationLine {
  const today = new Date().toISOString().slice(0, 10);
  return {
    key: newLineKey(),
    name: "",
    category: "Food",
    amount: 0,
    measuredBy: "Litre",
    unitPrice: 0,
    registrationDate: today,
    expireDate: today,
    imageUrl: "",
    purchaseWithVat: true,
    paidAmount: 0,
    paidAmountDirty: false,
  };
}

function suggestedPaidAmount(line: RegistrationLine): number {
  return computeInventoryPaidAmountETB(
    line.amount,
    line.unitPrice,
    line.purchaseWithVat,
  );
}

function resolvePaidAmount(line: RegistrationLine): number {
  if (line.paidAmountDirty) {
    return Math.max(0, Number(line.paidAmount) || 0);
  }
  return suggestedPaidAmount(line);
}

function buildAddressWithNote(address: string, note: string): string {
  const base = address.trim();
  const n = note.trim();
  if (!n) return base;
  return `${base}\n\n[Registration note]: ${n}`;
}

export function BatchItemRegistrationForm({
  hotelName,
  hotelInventory = false,
  onRegistered,
  onSubmittedForReview,
}: {
  hotelName: string;
  hotelInventory?: boolean;
  onRegistered?: () => void | Promise<void>;
  onSubmittedForReview?: () => void;
}) {
  const { isPending, run } = useConcurrentActions();
  const submitKey = "batch-item-registration";
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [address, setAddress] = useState("");
  const [supplierTinNumber, setSupplierTinNumber] = useState("");
  const [sharedNote, setSharedNote] = useState("");
  const [receivedByDepartment, setReceivedByDepartment] = useState("");
  const [lines, setLines] = useState<RegistrationLine[]>([emptyLine()]);
  const lastAutoPaidRef = useRef<Map<string, number>>(new Map());

  const validLines = useMemo(
    () => lines.filter((l) => l.name.trim().length >= 2),
    [lines],
  );

  const updateLine = useCallback((key: string, patch: Partial<RegistrationLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        const pricingChanged =
          patch.amount !== undefined ||
          patch.unitPrice !== undefined ||
          patch.purchaseWithVat !== undefined;
        if (pricingChanged && !next.paidAmountDirty) {
          const suggested = suggestedPaidAmount(next);
          lastAutoPaidRef.current.set(key, suggested);
          next.paidAmount = suggested;
        }
        if (patch.paidAmount !== undefined) {
          next.paidAmountDirty = true;
        }
        return next;
      }),
    );
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key),
    );
    lastAutoPaidRef.current.delete(key);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !address.trim()) {
      toast.error("Enter shared supplier name and address");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Add at least one item with a name (2+ characters)");
      return;
    }
    if (!receivedByDepartment.trim()) {
      toast.error("Select who received the goods (department leader)");
      return;
    }

    const addressPayload = buildAddressWithNote(address, sharedNote);

    void run(submitKey, async () => {
      let ok = 0;
      let failed = 0;
      const linesToSubmit: Parameters<typeof createItemRegistrationsBatchApi>[0] =
        [];

      for (const l of validLines) {
        const paidAmount = resolvePaidAmount(l);
        if (!hotelInventory) {
          try {
            const hasCash = await checkPityCashBalance(hotelName, paidAmount);
            if (!hasCash) {
              toast.error(`Insufficient petty cash for ${l.name.trim()}`);
              failed++;
              continue;
            }
          } catch {
            failed++;
            continue;
          }
        }
        linesToSubmit.push({
          name: l.name.trim(),
          imageUrl: l.imageUrl.trim(),
          category: l.category,
          amount: l.amount,
          measuredBy: l.measuredBy,
          unitPrice: l.unitPrice,
          registrationDate: new Date(l.registrationDate),
          expireDate: new Date(l.expireDate),
          supplierName: supplierName.trim(),
          supplierPhone: supplierPhone.trim(),
          Address: addressPayload,
          purchaseWithVat: l.purchaseWithVat,
          supplierTinNumber: supplierTinNumber.trim() || undefined,
          paidAmount,
        });
      }

      if (linesToSubmit.length > 0) {
        try {
          await createItemRegistrationsBatchApi(
            linesToSubmit,
            hotelName,
            receivedByDepartment,
          );
          ok = linesToSubmit.length;
        } catch (e: unknown) {
          failed += linesToSubmit.length;
          notifyApiFailure(e, "Could not register items");
        }
      }
      if (ok > 0) {
        toast.success(
          hotelInventory
            ? `Saved ${ok} item${ok === 1 ? "" : "s"} for your review${failed ? ` (${failed} failed)` : ""}. Open Review before send to confirm.`
            : `Registered ${ok} item${ok === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}`,
        );
        if (hotelInventory) onSubmittedForReview?.();
        setLines([emptyLine()]);
        setSharedNote("");
        lastAutoPaidRef.current.clear();
        await onRegistered?.();
      } else if (failed === 0) {
        toast.error("Could not register items");
      }
    });
  };

  const accentBar = hotelInventory
    ? "from-primary/55 via-violet-500/45 to-cyan-500/40"
    : "from-emerald-600 via-emerald-400 to-cyan-500";

  return (
    <Card className="mx-auto max-w-6xl overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
      <div className={`h-1 bg-linear-to-r ${accentBar}`} />
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <PackagePlus className="h-5 w-5 text-emerald-600" />
          Item registration (shared supplier)
        </CardTitle>
        <CardDescription className="max-w-3xl text-pretty leading-relaxed">
          Add one or more items under the same supplier. Each line has its own
          quantity, price, dates, VAT setting, and paid amount — supplier
          details, phone, TIN, photos, and note are shared once for the batch.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <form onSubmit={onSubmit} className="space-y-8">
          <HotelFormSection
            title="Registration lines"
            description="Add one card per product. Item name through paid amount are unique per line."
          >
            <div className="min-w-0 space-y-3">
              {lines.map((l, index) => (
                <div
                  key={l.key}
                  className="min-w-0 space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 sm:p-5 dark:ring-white/6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Line {index + 1}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(l.key)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                    <div
                      className={`space-y-1.5 min-w-0 ${
                        index === 0 ? "col-span-2" : "col-span-2 sm:col-span-4"
                      }`}
                    >
                      <Label htmlFor={`reg-name-${l.key}`}>Item name</Label>
                      <Input
                        id={`reg-name-${l.key}`}
                        value={l.name}
                        onChange={(e) =>
                          updateLine(l.key, { name: e.target.value })
                        }
                        placeholder="Product name"
                        className="h-10 min-w-0"
                      />
                    </div>
                    {index === 0 ? (
                      <div className="col-span-2 space-y-1.5 min-w-0">
                        <DepartmentLeaderSelect
                          id="reg-received-by"
                          label="Received by"
                          compact
                          value={receivedByDepartment}
                          onChange={setReceivedByDepartment}
                          allowedDepartments={REGISTRATION_RECEIVED_BY_CODES}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="col-span-2 space-y-1.5 sm:col-span-1">
                      <Label>Category</Label>
                      <Select
                        value={l.category}
                        onValueChange={(v) =>
                          updateLine(l.key, {
                            category: v as (typeof REGISTRATION_CATEGORIES)[number],
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REGISTRATION_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`reg-qty-${l.key}`}>Quantity</Label>
                      <Input
                        id={`reg-qty-${l.key}`}
                        type="number"
                        min={0}
                        step="any"
                        className="h-10 tabular-nums"
                        value={l.amount}
                        onChange={(e) =>
                          updateLine(l.key, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unit</Label>
                      <Select
                        value={l.measuredBy}
                        onValueChange={(v) =>
                          updateLine(l.key, { measuredBy: v })
                        }
                      >
                        <SelectTrigger className="h-10 w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVENTORY_UNIT_SELECT_OPTIONS.map((u) => (
                            <SelectItem key={u.id} value={u.name}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`reg-price-${l.key}`}>Unit price (ETB)</Label>
                      <Input
                        id={`reg-price-${l.key}`}
                        type="number"
                        min={0}
                        step="any"
                        className="h-10 tabular-nums"
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(l.key, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <HotelDayPicker
                      id={`reg-in-${l.key}`}
                      label="Registration date"
                      value={l.registrationDate}
                      onChange={(ymd) =>
                        updateLine(l.key, { registrationDate: ymd })
                      }
                      buttonClassName="min-w-0"
                    />
                    <HotelDayPicker
                      id={`reg-exp-${l.key}`}
                      label="Expiry date"
                      value={l.expireDate}
                      onChange={(ymd) =>
                        updateLine(l.key, { expireDate: ymd })
                      }
                      buttonClassName="min-w-0"
                    />
                    <div className="col-span-2 space-y-1.5 sm:col-span-1">
                      <Label htmlFor={`reg-paid-${l.key}`}>Paid amount (ETB)</Label>
                      <Input
                        id={`reg-paid-${l.key}`}
                        type="number"
                        min={0}
                        step="any"
                        className="h-10 tabular-nums"
                        value={l.paidAmount}
                        onChange={(e) =>
                          updateLine(l.key, {
                            paidAmount: Number(e.target.value) || 0,
                            paidAmountDirty: true,
                          })
                        }
                      />
                      {!l.paidAmountDirty ? (
                        <p className="text-[10px] text-muted-foreground">
                          Auto from qty × price
                          {l.purchaseWithVat ? " (incl. VAT)" : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        id={`reg-vat-${l.key}`}
                        checked={l.purchaseWithVat}
                        onCheckedChange={(checked) =>
                          updateLine(l.key, { purchaseWithVat: checked })
                        }
                      />
                      <Label
                        htmlFor={`reg-vat-${l.key}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        Price includes VAT
                      </Label>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:items-end">
                      <Label className="text-xs text-muted-foreground">
                        Item image{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <div className="flex items-center gap-3">
                      {l.imageUrl && hasRegistrationImage(l.imageUrl) ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-md border">
                          <Image
                            src={l.imageUrl}
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
                          const info = result?.info;
                          const url =
                            typeof info === "object" &&
                            info !== null &&
                            "secure_url" in info
                              ? String(info.secure_url)
                              : "";
                          if (url) updateLine(l.key, { imageUrl: url });
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-sm hover:bg-muted"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {hasRegistrationImage(l.imageUrl)
                          ? "Change image"
                          : "Upload image"}
                      </CldUploadButton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-2 font-medium"
              onClick={addLine}
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          </HotelFormSection>

          <HotelFormSection
            title="Shared supplier (whole batch)"
            description="Supplier name and address apply to every line above. Phone, TIN, and product photos are optional."
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <HotelFormFieldStack>
                <Label htmlFor="reg-supplier-name">Supplier name</Label>
                <Input
                  id="reg-supplier-name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Supplier legal name"
                  className="h-10"
                  required
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="reg-supplier-phone">
                  Supplier phone{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <PhoneInput
                  id="reg-supplier-phone"
                  defaultCountry="ET"
                  international
                  countryCallingCodeEditable
                  value={supplierPhone}
                  onChange={(v) => setSupplierPhone((v as string) || "")}
                  className="w-full min-w-0"
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="reg-supplier-address">Supplier address</Label>
                <Input
                  id="reg-supplier-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Physical address"
                  className="h-10"
                  required
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="reg-supplier-tin">
                  Supplier TIN{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="reg-supplier-tin"
                  value={supplierTinNumber}
                  onChange={(e) => setSupplierTinNumber(e.target.value)}
                  placeholder="Tax identification number"
                  className="h-10"
                />
              </HotelFormFieldStack>
            </div>
          </HotelFormSection>

          <HotelFormSection
            title="Shared note for this batch"
            description="Optional context for the whole submission (delivery window, invoice ref, etc.) — like purchase request notes."
          >
            <HotelFormFieldStack>
              <Label htmlFor="reg-shared-note">Note for all lines</Label>
              <Textarea
                id="reg-shared-note"
                value={sharedNote}
                onChange={(e) => setSharedNote(e.target.value)}
                placeholder="Optional — applies to each item registered in this batch"
                rows={4}
                className="min-h-24 resize-y border-border/80 shadow-sm"
              />
            </HotelFormFieldStack>
          </HotelFormSection>

          <PendingButton
            type="submit"
            className="h-11 w-full text-base font-semibold shadow-md"
            pending={isPending(submitKey)}
          >
            {hotelInventory
              ? `Submit ${validLines.length || 0} item${validLines.length === 1 ? "" : "s"} for approval`
              : `Register ${validLines.length || 0} item${validLines.length === 1 ? "" : "s"}`}
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
