"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { CreateItemRegistration, checkPityCashBalance } from "@/lib/actions";
import { computeInventoryPaidAmountETB } from "@/lib/hotelInventoryPayment";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";

const CATEGORIES = [
  "Food",
  "Beverage",
  "House Keeping",
  "Maintainance",
  "Office Supplies",
  "Others",
] as const;

const MEASURES = ["Litre", "Kilogram", "Piece", "Pack", "Box", "Bottle"] as const;

type Line = {
  key: string;
  name: string;
  category: (typeof CATEGORIES)[number];
  amount: number;
  measuredBy: string;
  unitPrice: number;
  registrationDate: string;
  expireDate: string;
  dutyFee: number;
  purchaseWithVat: boolean;
  paidAmount: number;
  imageUrl: string;
  supplierLevel: string;
};

function emptyLine(): Line {
  const today = new Date().toISOString().slice(0, 10);
  return {
    key: crypto.randomUUID(),
    name: "",
    category: "Food",
    amount: 0,
    measuredBy: "Litre",
    unitPrice: 0,
    registrationDate: today,
    expireDate: today,
    dutyFee: 0,
    purchaseWithVat: true,
    paidAmount: 0,
    imageUrl: "",
    supplierLevel: "Bronze",
  };
}

export function BatchItemRegistrationForm({
  hotelName,
  onRegistered,
}: {
  hotelName: string;
  onRegistered?: () => void | Promise<void>;
}) {
  const { isPending, run } = useConcurrentActions();
  const submitKey = "batch-item-registration";
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [address, setAddress] = useState("");
  const [supplierTinNumber, setSupplierTinNumber] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const validLines = useMemo(
    () => lines.filter((l) => l.name.trim().length >= 2),
    [lines],
  );

  const updateLine = useCallback((key: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !supplierPhone.trim() || !address.trim()) {
      toast.error("Enter shared supplier name, phone, and address");
      return;
    }
    if (!supplierTinNumber.trim()) {
      toast.error("Enter supplier TIN for this batch");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Add at least one item with a name");
      return;
    }

    void run(submitKey, async () => {
      let ok = 0;
      let failed = 0;
      for (const l of validLines) {
        const paidAmount =
          computeInventoryPaidAmountETB(
            l.amount,
            l.unitPrice,
            l.purchaseWithVat,
          ) + l.dutyFee;
        const totalCalc = paidAmount;
        try {
          const hasCash = await checkPityCashBalance(hotelName, totalCalc);
          if (!hasCash) {
            toast.error(`Insufficient petty cash for ${l.name.trim()}`);
            failed++;
            continue;
          }
          await CreateItemRegistration({
            name: l.name.trim(),
            imageUrl: l.imageUrl || "https://placehold.co/200x200/png",
            category: l.category,
            amount: l.amount,
            measuredBy: l.measuredBy,
            unitPrice: l.unitPrice,
            registrationDate: new Date(l.registrationDate),
            expireDate: new Date(l.expireDate),
            dutyFee: l.dutyFee,
            supplierName: supplierName.trim(),
            supplierPhone: supplierPhone.trim(),
            Address: address.trim(),
            supplierLevel: l.supplierLevel,
            purchaseWithVat: l.purchaseWithVat,
            supplierTinNumber: supplierTinNumber.trim(),
            paidAmount,
            HotelName: hotelName,
          });
          ok++;
        } catch {
          failed++;
        }
      }
      if (ok > 0) {
        toast.success(
          `Registered ${ok} item${ok === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}`,
        );
        setLines([emptyLine()]);
        await onRegistered?.();
      } else {
        toast.error("Could not register items");
      }
    });
  };

  return (
    <Card className="max-w-6xl mx-auto border-emerald-500/20 shadow-xl overflow-hidden bg-card/95 ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-emerald-600 via-emerald-400 to-cyan-500" />
      <CardHeader className="pb-2 space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <PackagePlus className="h-5 w-5 text-emerald-600" />
          Batch item registration
        </CardTitle>
        <CardDescription className="text-pretty max-w-3xl leading-relaxed">
          Add one line per product. Supplier name, phone, address, and TIN are shared
          for the whole batch (like the note block on purchase requests).
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <form onSubmit={onSubmit} className="space-y-8">
          <HotelFormSection
            title="Item lines"
            description="Each card is one product. Quantity, price, dates, and category can differ per line."
          >
            <div className="space-y-3 min-w-0">
              {lines.map((l, index) => (
                <div
                  key={l.key}
                  className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Line {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(l.key)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label htmlFor={`bi-name-${l.key}`}>Item name</Label>
                      <Input
                        id={`bi-name-${l.key}`}
                        value={l.name}
                        onChange={(e) =>
                          updateLine(l.key, { name: e.target.value })
                        }
                        placeholder="Product name"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select
                        value={l.category}
                        onValueChange={(v) =>
                          updateLine(l.key, {
                            category: v as (typeof CATEGORIES)[number],
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
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
                      <Label>Supplier level</Label>
                      <Select
                        value={l.supplierLevel}
                        onValueChange={(v) =>
                          updateLine(l.key, { supplierLevel: v })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Bronze", "Silver", "Gold"].map((lvl) => (
                            <SelectItem key={lvl} value={lvl}>
                              {lvl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={0}
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
                      <Label>Measured by</Label>
                      <Select
                        value={l.measuredBy}
                        onValueChange={(v) => updateLine(l.key, { measuredBy: v })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEASURES.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unit price (ETB)</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-10 tabular-nums"
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(l.key, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duty fee (ETB)</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-10 tabular-nums"
                        value={l.dutyFee}
                        onChange={(e) =>
                          updateLine(l.key, {
                            dutyFee: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Stock-in date</Label>
                      <Input
                        type="date"
                        className="h-10"
                        value={l.registrationDate}
                        onChange={(e) =>
                          updateLine(l.key, { registrationDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Expiry date</Label>
                      <Input
                        type="date"
                        className="h-10"
                        value={l.expireDate}
                        onChange={(e) =>
                          updateLine(l.key, { expireDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Image URL (optional)</Label>
                      <Input
                        value={l.imageUrl}
                        onChange={(e) =>
                          updateLine(l.key, { imageUrl: e.target.value })
                        }
                        placeholder="Leave blank for placeholder"
                        className="h-10"
                      />
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
            description="These four fields apply to every line above — same pattern as the shared note on purchase requests."
          >
            <div className="grid gap-4 sm:grid-cols-2 min-w-0">
              <HotelFormFieldStack>
                <Label htmlFor="bi-supplier-name">Supplier name</Label>
                <Input
                  id="bi-supplier-name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Supplier legal name"
                  className="h-10"
                  required
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="bi-supplier-phone">Supplier phone</Label>
                <Input
                  id="bi-supplier-phone"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+251..."
                  className="h-10"
                  required
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack className="sm:col-span-2">
                <Label htmlFor="bi-supplier-address">Supplier address</Label>
                <Input
                  id="bi-supplier-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                  className="h-10"
                  required
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="bi-supplier-tin">Supplier TIN</Label>
                <Input
                  id="bi-supplier-tin"
                  value={supplierTinNumber}
                  onChange={(e) => setSupplierTinNumber(e.target.value)}
                  placeholder="TIN"
                  className="h-10"
                  required
                />
              </HotelFormFieldStack>
            </div>
          </HotelFormSection>

          <PendingButton
            type="submit"
            className="w-full h-11 text-base font-semibold shadow-md"
            pending={isPending(submitKey)}
          >
            {`Register ${validLines.length || 0} item${validLines.length === 1 ? "" : "s"}`}
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
