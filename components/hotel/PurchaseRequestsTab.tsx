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
import { createPurchaseRequestApi, type PurchaseRequestRow } from "@/lib/actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  return {
    key: newLineKey(),
    itemName: "",
    quantity: 1,
    measuredBy: "Piece",
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
}: {
  tenantScope?: string;
  onCreated?: (row: PurchaseRequestRow) => void;
}) {
  const { isPending, run } = useConcurrentActions();
  const submitKey = "purchase-request-batch-submit";
  const [lines, setLines] = useState<DraftLine[]>(() => [emptyLine()]);
  const [sharedNote, setSharedNote] = useState("");

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
    void run(submitKey, async () => {
      const user =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      const notePayload = sharedNote.trim() || undefined;
      let ok = 0;
      let failed = 0;
      for (let i = 0; i < validLines.length; i++) {
        const l = validLines[i];
        try {
          const supplierName = l.supplierName.trim() || undefined;
          const supplierPhone = l.supplierPhone.trim() || undefined;
          const result = await createPurchaseRequestApi(
            {
              itemName: l.itemName.trim(),
              quantity: l.quantity,
              measuredBy: l.measuredBy,
              notes: notePayload,
              estimatedUnitPrice: l.estimatedUnitPrice,
              supplierName,
              supplierPhone,
              category: l.category,
            },
            { suppressSuccessToast: true },
          );
          onCreated?.(
            buildOptimisticPurchaseRequestRow(
              {
                itemName: l.itemName.trim(),
                quantity: l.quantity,
                measuredBy: l.measuredBy,
                notes: notePayload,
                estimatedUnitPrice: l.estimatedUnitPrice,
                supplierName,
                supplierPhone,
                category: l.category,
              },
              result,
              user || "—",
              tenant || "—",
            ),
          );
          ok++;
        } catch {
          failed++;
        }
      }
      if (ok > 0) {
        toast.success(
          `Submitted ${ok} purchase request${ok === 1 ? "" : "s"}${
            failed ? ` (${failed} failed)` : ""
          }`,
        );
        setLines([emptyLine()]);
        setSharedNote("");
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
          Each row is a separate request with its own supplier. Use one shared note below for
          context that applies to the whole batch (delivery window, budget code, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 space-y-8">
        <form onSubmit={onSubmit} className="space-y-8">
          <HotelFormSection
            title="Request lines"
            description="Supplier name and phone are per item. Leave supplier blank only if you truly have no contact yet for that line."
          >
            <div className="rounded-xl border border-border/80 overflow-x-auto shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/45 hover:bg-muted/45 border-b border-border/70">
                    <TableHead className="min-w-[150px] font-semibold">Item</TableHead>
                    <TableHead className="w-[88px] text-right font-semibold">Qty</TableHead>
                    <TableHead className="w-[100px] font-semibold">Unit</TableHead>
                    <TableHead className="w-[120px] font-semibold">Category</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">
                      Est. ETB
                    </TableHead>
                    <TableHead className="min-w-[130px] font-semibold">Supplier</TableHead>
                    <TableHead className="min-w-[160px] font-semibold">Supplier phone</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow
                      key={l.key}
                      className="border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="align-top py-3">
                        <Input
                          value={l.itemName}
                          onChange={(e) =>
                            updateLine(l.key, { itemName: e.target.value })
                          }
                          placeholder="Item name"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(l.key, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                          className="h-9 tabular-nums text-right"
                        />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Select
                          value={l.measuredBy}
                          onValueChange={(v) =>
                            updateLine(l.key, { measuredBy: v })
                          }
                        >
                          <SelectTrigger className="h-9">
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
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Select
                          value={l.category}
                          onValueChange={(v) =>
                            updateLine(l.key, { category: v })
                          }
                        >
                          <SelectTrigger className="h-9">
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
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.estimatedUnitPrice}
                          onChange={(e) =>
                            updateLine(l.key, {
                              estimatedUnitPrice: Number(e.target.value) || 0,
                            })
                          }
                          className="h-9 tabular-nums text-right"
                        />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input
                          value={l.supplierName}
                          onChange={(e) =>
                            updateLine(l.key, { supplierName: e.target.value })
                          }
                          placeholder="Supplier"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell className="align-top py-3 min-w-[200px]">
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
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="align-top py-3 text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(l.key)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
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
