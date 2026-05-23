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
  const [supplierLevel, setSupplierLevel] = useState("Bronze");
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
            supplierLevel,
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
    <Card className="max-w-6xl mx-auto border-emerald-500/20 shadow-xl overflow-hidden">
      <div className="h-1 bg-linear-to-r from-emerald-600 via-emerald-400 to-cyan-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <PackagePlus className="h-5 w-5 text-emerald-600" />
          Batch registration (shared supplier)
        </CardTitle>
        <CardDescription>
          Register multiple items in one go when they share the same supplier name,
          phone, address, and TIN.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-8">
          <section className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Shared supplier
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier name</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Supplier legal name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier phone</Label>
                <Input
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+251..."
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Supplier address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier TIN</Label>
                <Input
                  value={supplierTinNumber}
                  onChange={(e) => setSupplierTinNumber(e.target.value)}
                  placeholder="TIN"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier level</Label>
                <Select value={supplierLevel} onValueChange={setSupplierLevel}>
                  <SelectTrigger>
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
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Item lines
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add line
              </Button>
            </div>
            {lines.map((l, index) => (
              <div
                key={l.key}
                className="rounded-xl border border-border/70 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
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
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Item name</Label>
                    <Input
                      value={l.name}
                      onChange={(e) => updateLine(l.key, { name: e.target.value })}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select
                      value={l.category}
                      onValueChange={(v) =>
                        updateLine(l.key, {
                          category: v as (typeof CATEGORIES)[number],
                        })
                      }
                    >
                      <SelectTrigger>
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
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={l.amount}
                      onChange={(e) =>
                        updateLine(l.key, { amount: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Measured by</Label>
                    <Select
                      value={l.measuredBy}
                      onValueChange={(v) => updateLine(l.key, { measuredBy: v })}
                    >
                      <SelectTrigger>
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
                  <div className="space-y-1">
                    <Label>Unit price (ETB)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={l.unitPrice}
                      onChange={(e) =>
                        updateLine(l.key, {
                          unitPrice: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Duty fee</Label>
                    <Input
                      type="number"
                      min={0}
                      value={l.dutyFee}
                      onChange={(e) =>
                        updateLine(l.key, { dutyFee: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Stock-in date</Label>
                    <Input
                      type="date"
                      value={l.registrationDate}
                      onChange={(e) =>
                        updateLine(l.key, { registrationDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={l.expireDate}
                      onChange={(e) =>
                        updateLine(l.key, { expireDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Image URL (optional)</Label>
                    <Input
                      value={l.imageUrl}
                      onChange={(e) =>
                        updateLine(l.key, { imageUrl: e.target.value })
                      }
                      placeholder="Leave blank for placeholder"
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <PendingButton
            type="submit"
            className="w-full"
            pending={isPending(submitKey)}
          >
            {`Register ${validLines.length || ""} item${validLines.length === 1 ? "" : "s"}`}
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
