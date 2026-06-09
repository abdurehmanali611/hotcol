"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createPurchaseRequestsBatchApi,
  type PurchaseRequestRow,
} from "@/lib/actions";
import { buildOptimisticPurchaseRequestRow } from "@/lib/hotelOptimisticPurchase";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DepartmentLeaderSelect } from "@/components/hotel/DepartmentLeaderSelect";
import { PURCHASE_REQUESTED_BY_DEPARTMENT_CODES } from "@/lib/departments";
import { Switch } from "@/components/ui/switch";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";

const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);

type DraftLine = {
  key: string;
  itemName: string;
  quantity: number;
  measuredBy: string;
  entranceDate: string;
  estimatedUnitPrice: number;
  supplierName: string;
  supplierPhone: string;
  category: string;
};

function newLineKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyLine(): DraftLine {
  const today = new Date().toISOString().slice(0, 10);
  return {
    key: newLineKey(),
    itemName: "",
    quantity: 1,
    measuredBy: "Piece",
    entranceDate: today,
    estimatedUnitPrice: 0,
    supplierName: "",
    supplierPhone: "",
    category: "Others",
  };
}

const UNITS = ["Litre", "Kilogram", "Piece", "Packet", "Dozen", "Other"] as const;
const CATEGORIES = ["Food", "Beverage", "House Keeping", "Others"] as const;

export default function PurchaseRequestsTab({
  tenantScope = "",
  onCreated,
  onSubmittedForReview,
}: {
  tenantScope?: string;
  onCreated?: (row: PurchaseRequestRow) => void;
  onSubmittedForReview?: () => void;
}) {
  const { isPending, run } = useConcurrentActions();
  const submitKey = "purchase-request-batch-submit";
  const [lines, setLines] = useState<DraftLine[]>(() => [emptyLine()]);
  const [sharedNote, setSharedNote] = useState("");
  const [requestedByDepartment, setRequestedByDepartment] = useState("");
  const [purchaseWithVat, setPurchaseWithVat] = useState(true);

  const tenant = tenantScope.trim();

  const validLines = useMemo(
    () => lines.filter((l) => l.itemName.trim().length > 0),
    [lines],
  );

  const updateLine = useCallback((key: string, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validLines.length === 0) {
      toast.error("Add at least one line with an item name");
      return;
    }
    if (!requestedByDepartment.trim()) {
      toast.error("Select the requesting department");
      return;
    }
    void run(submitKey, async () => {
      const user =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      const notePayload = sharedNote.trim() || undefined;
      const batchLines = validLines.map((l) => ({
        itemName: l.itemName.trim(),
        quantity: l.quantity,
        measuredBy: l.measuredBy,
        entranceDate: new Date(l.entranceDate),
        notes: notePayload,
        estimatedUnitPrice: l.estimatedUnitPrice,
        supplierName: l.supplierName.trim() || undefined,
        supplierPhone: l.supplierPhone.trim() || undefined,
        category: l.category,
        purchaseWithVat,
      }));
      let ok = 0;
      let failed = 0;
      try {
        const results = await createPurchaseRequestsBatchApi(
          batchLines,
          requestedByDepartment,
          { suppressSuccessToast: true },
        );
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (!result) continue;
          onCreated?.(
            buildOptimisticPurchaseRequestRow(
              batchLines[i],
              result,
              user,
              tenant,
            ),
          );
          ok++;
        }
      } catch {
        failed = validLines.length;
      }
      if (ok > 0) {
        toast.success(
          `Saved ${ok} purchase line${ok === 1 ? "" : "s"} for your review${
            failed ? ` (${failed} failed)` : ""
          }. Open Review before send to confirm.`,
        );
        onSubmittedForReview?.();
        setLines([emptyLine()]);
        setSharedNote("");
        setRequestedByDepartment("");
        setPurchaseWithVat(true);
      } else {
        toast.error("Could not submit purchase requests");
      }
    });
  };

  return (
    <Card className="max-w-6xl mx-auto border-primary/20 shadow-xl overflow-hidden bg-card/95 backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-primary/55 via-violet-500/45 to-cyan-500/40" />
      <CardHeader className="pb-2 space-y-1">
        <CardTitle className="text-xl tracking-tight">
          Purchase requests (single or batch)
        </CardTitle>
        <CardDescription className="text-pretty max-w-3xl leading-relaxed">
          Each line is a separate request with its own supplier. Use one shared note below for
          context that applies to the whole batch (delivery window, budget code, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 space-y-8">
        <form onSubmit={onSubmit} className="space-y-8">
          <HotelFormSection
            title="Request lines"
            description="Each card is one purchase request. Supplier and phone are per line. Set the entrance date (when stock is expected to arrive) per line."
          >
            <div className="space-y-3 min-w-0">
              {lines.map((l, index) => (
                <div
                  key={l.key}
                  className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 dark:ring-white/6 min-w-0"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 min-w-0">
                      <div
                        className={`space-y-1.5 min-w-0 ${
                          index === 0 ? "col-span-2" : "col-span-2 sm:col-span-4"
                        }`}
                      >
                        <Label htmlFor={`pr-item-${l.key}`}>Item name</Label>
                        <Input
                          id={`pr-item-${l.key}`}
                          value={l.itemName}
                          onChange={(e) =>
                            updateLine(l.key, { itemName: e.target.value })
                          }
                          placeholder="What to order"
                          className="h-10 min-w-0"
                        />
                      </div>
                      {index === 0 ? (
                        <div className="col-span-2 space-y-1.5 min-w-0">
                          <DepartmentLeaderSelect
                            id="pr-requested-by"
                            label="Requested by"
                            description="House Keeping (Room) and House Keeping (Public) are listed separately when both leaders are registered."
                            compact
                            value={requestedByDepartment}
                            onChange={setRequestedByDepartment}
                            allowedDepartments={PURCHASE_REQUESTED_BY_DEPARTMENT_CODES}
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
                            updateLine(l.key, { category: v })
                          }
                        >
                          <SelectTrigger className="h-10 w-full min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`pr-qty-${l.key}`}>Qty</Label>
                        <Input
                          id={`pr-qty-${l.key}`}
                          type="number"
                          min={0.01}
                          step="any"
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(l.key, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                          className="h-10 tabular-nums"
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
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`pr-price-${l.key}`}>Est. ETB</Label>
                        <Input
                          id={`pr-price-${l.key}`}
                          type="number"
                          min={0}
                          step="any"
                          value={l.estimatedUnitPrice}
                          onChange={(e) =>
                            updateLine(l.key, {
                              estimatedUnitPrice: Number(e.target.value) || 0,
                            })
                          }
                          className="h-10 tabular-nums"
                        />
                      </div>
                      <HotelDayPicker
                        id={`pr-date-${l.key}`}
                        label="Entrance date"
                        compact
                        value={l.entranceDate}
                        onChange={(ymd) =>
                          updateLine(l.key, { entranceDate: ymd })
                        }
                        className="col-span-2 sm:col-span-1"
                        buttonClassName="min-w-0"
                      />
                    </div>
                    {index === 0 ? (
                      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
                        <Switch
                          id="pr-batch-vat"
                          checked={purchaseWithVat}
                          onCheckedChange={setPurchaseWithVat}
                        />
                        <Label
                          htmlFor="pr-batch-vat"
                          className="cursor-pointer text-sm font-normal"
                        >
                          Estimated prices include VAT (15%) for this batch
                        </Label>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-w-0">
                      <div className="space-y-1.5 min-w-0">
                        <Label htmlFor={`pr-supplier-${l.key}`}>Supplier</Label>
                        <Input
                          id={`pr-supplier-${l.key}`}
                          value={l.supplierName}
                          onChange={(e) =>
                            updateLine(l.key, { supplierName: e.target.value })
                          }
                          placeholder="Supplier name"
                          className="h-10 min-w-0"
                        />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <Label htmlFor={`pr-supplier-phone-${l.key}`}>
                          Supplier phone
                        </Label>
                        <PhoneInput
                          id={`pr-supplier-phone-${l.key}`}
                          defaultCountry="ET"
                          countryCallingCodeEditable
                          international
                          value={l.supplierPhone || undefined}
                          onChange={(v) =>
                            updateLine(l.key, {
                              supplierPhone: (v as string) || "",
                            })
                          }
                          className="w-full min-w-0"
                        />
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
            title="Shared note for this batch"
            description="One note is copied onto every request in this submission (e.g. expected delivery, GL reference)."
          >
            <HotelFormFieldStack>
              <Label htmlFor="pr-shared-note">Note for all lines</Label>
              <Textarea
                id="pr-shared-note"
                value={sharedNote}
                onChange={(e) => setSharedNote(e.target.value)}
                placeholder="Optional — applies to each line submitted together"
                rows={4}
                className="min-h-24 resize-y border-border/80 shadow-sm"
              />
            </HotelFormFieldStack>
          </HotelFormSection>

          <PendingButton
            type="submit"
            pending={isPending(submitKey)}
            className="w-full h-11 gap-2 text-base font-semibold shadow-md"
          >
            Submit {validLines.length || 0} request
            {validLines.length === 1 ? "" : "s"}
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
