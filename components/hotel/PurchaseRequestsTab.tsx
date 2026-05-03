"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPurchaseRequestApi } from "@/lib/actions";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";

export default function PurchaseRequestsTab({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [measuredBy, setMeasuredBy] = useState("Piece");
  const [notes, setNotes] = useState("");
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState<number>(0);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [category, setCategory] = useState("Others");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setLoading(true);
    try {
      await createPurchaseRequestApi({
        itemName: itemName.trim(),
        quantity,
        measuredBy,
        notes: notes || undefined,
        estimatedUnitPrice,
        supplierName: supplierName || undefined,
        supplierPhone: supplierPhone || undefined,
        category,
      });
      setItemName("");
      setQuantity(1);
      setNotes("");
      onCreated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto border-primary/20 shadow-xl overflow-hidden bg-card/95 backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-gradient-to-r from-primary/55 via-violet-500/45 to-cyan-500/40" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Purchase request (missing stock)</CardTitle>
        <CardDescription className="text-pretty max-w-2xl">
          Sent to cost control, then finance for payment. Existing stock moves go
          through the inventory tab with approvals.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <HotelFormSection
            title="What you need"
            description="Describe the item and how it is counted so approvers can validate the line."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <HotelFormFieldStack className="sm:col-span-2">
                <Label htmlFor="pr-item">Item name</Label>
                <Input
                  id="pr-item"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="What you need to bring into inventory"
                  required
                  className="h-10 border-border/80 shadow-sm"
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="pr-qty">Quantity</Label>
                <Input
                  id="pr-qty"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="h-10 tabular-nums border-border/80 shadow-sm"
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label>Unit</Label>
                <Select value={measuredBy} onValueChange={setMeasuredBy}>
                  <SelectTrigger className="h-10 w-full border-border/80 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Litre",
                      "Kilogram",
                      "Piece",
                      "Packet",
                      "Dozen",
                      "Other",
                    ].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 w-full border-border/80 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Food", "Beverage", "House Keeping", "Others"].map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </HotelFormFieldStack>
            </div>
          </HotelFormSection>

          <HotelFormSection
            title="Estimate & supplier"
            description="Rough unit price helps finance; supplier fields are optional but useful when you already have a quote."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <HotelFormFieldStack>
                <Label htmlFor="pr-price">Est. unit price (ETB)</Label>
                <Input
                  id="pr-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={estimatedUnitPrice}
                  onChange={(e) =>
                    setEstimatedUnitPrice(Number(e.target.value))
                  }
                  className="h-10 tabular-nums border-border/80 shadow-sm"
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack>
                <Label htmlFor="pr-supplier">Supplier name (optional)</Label>
                <Input
                  id="pr-supplier"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-10 border-border/80 shadow-sm"
                />
              </HotelFormFieldStack>
              <HotelFormFieldStack className="sm:col-span-2">
                <Label htmlFor="pr-phone">Supplier phone (optional)</Label>
                <Input
                  id="pr-phone"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="h-10 border-border/80 shadow-sm"
                />
              </HotelFormFieldStack>
            </div>
          </HotelFormSection>

          <HotelFormSection title="Notes" description="Optional context for cost control and finance.">
            <HotelFormFieldStack>
              <Label htmlFor="pr-notes">Notes</Label>
              <Textarea
                id="pr-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any detail for cost control / finance"
                rows={3}
                className="min-h-[5.5rem] resize-y border-border/80 shadow-sm"
              />
            </HotelFormFieldStack>
          </HotelFormSection>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 gap-2 text-base shadow-md"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
