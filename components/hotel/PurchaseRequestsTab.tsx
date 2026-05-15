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
  notes: string;
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
    notes: "",
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
  const [sharedSupplierName, setSharedSupplierName] = useState("");
  const [sharedSupplierPhone, setSharedSupplierPhone] = useState("");

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
      let ok = 0;
      let failed = 0;
      for (let i = 0; i < validLines.length; i++) {
        const l = validLines[i];
        try {
          const supplierName =
            (l.supplierName || sharedSupplierName).trim() || undefined;
          const supplierPhone =
            (l.supplierPhone || sharedSupplierPhone).trim() || undefined;
          const result = await createPurchaseRequestApi(
            {
              itemName: l.itemName.trim(),
              quantity: l.quantity,
              measuredBy: l.measuredBy,
              notes: l.notes || undefined,
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
                notes: l.notes || undefined,
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
      } else {
        toast.error("Could not submit purchase requests");
      }
    });
  };

  return (
    <Card className="max-w-5xl mx-auto border-primary/20 shadow-xl overflow-hidden bg-card/95 backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-primary/55 via-violet-500/45 to-cyan-500/40" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Purchase requests (single or batch)</CardTitle>
        <CardDescription className="text-pretty max-w-3xl">
          Add one or more lines below — each line becomes its own request to cost control,
          then finance. Submit all at once (same idea as paying multiple café orders together).
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 space-y-6">
        <form onSubmit={onSubmit} className="space-y-8">
          <HotelFormSection
            title="Request lines"
            description="Every row with an item name is submitted. Optional supplier fields on each row override the shared defaults below when filled."
          >
            <div className="rounded-lg border border-border/80 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[160px]">Item</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-28">Unit</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-28 text-right">Est. ETB</TableHead>
                    <TableHead className="min-w-[120px]">Notes</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.key}>
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
                        <Textarea
                          value={l.notes}
                          onChange={(e) =>
                            updateLine(l.key, { notes: e.target.value })
                          }
                          placeholder="Optional"
                          rows={2}
                          className="min-h-0 text-sm resize-y"
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
            title="Shared supplier (optional)"
            description="Used for any line that does not set its own supplier name or phone."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <HotelFormFieldStack>
                <Label htmlFor="pr-shared-supplier">Supplier name</Label>
                <Input
                  id="pr-shared-supplier"
                  value={sharedSupplierName}
                  onChange={(e) => setSharedSupplierName(e.target.value)}
                  className="h-10 border-border/80 shadow-sm"
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack className="sm:col-span-2">
                <Label htmlFor="pr-shared-phone">Supplier phone</Label>
                <PhoneInput
                  id="pr-shared-phone"
                  defaultCountry="ET"
                  countryCallingCodeEditable
                  international
                  value={sharedSupplierPhone || undefined}
                  onChange={(v) => setSharedSupplierPhone((v as string) || "")}
                  className="w-full"
                />
              </HotelFormFieldStack>
            </div>
          </HotelFormSection>

          <PendingButton
            type="submit"
            pending={isPending(submitKey)}
            className="w-full h-11 gap-2 text-base shadow-md"
          >
            Submit {validLines.length || 0} request
            {validLines.length === 1 ? "" : "s"}
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
