"use client";

import { useMemo, useState } from "react";
import { ItemRegistration } from "@/lib/actions";
import { DataTableClientWrapper } from "@/app/StoreItems/DataTableClientWrapper";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { lineOwedETB } from "@/lib/hotelInventoryPayment";
import { Users, Filter, Truck, Package } from "lucide-react";

type SupplierSummary = {
  name: string;
  lineCount: number;
  totalValue: number;
  itemNames: Set<string>;
};

export default function Suppliers({
  items = [],
}: {
  items?: ItemRegistration[];
}) {
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const safeItems = useMemo(
    () => (Array.isArray(items) ? items : []),
    [items],
  );

  const supplierSummaries = useMemo(() => {
    const map = new Map<string, SupplierSummary>();
    for (const row of safeItems) {
      const name = (row.supplierName || "").trim();
      if (!name) continue;
      const cur = map.get(name) ?? {
        name,
        lineCount: 0,
        totalValue: 0,
        itemNames: new Set<string>(),
      };
      cur.lineCount += 1;
      cur.totalValue += lineOwedETB(row);
      cur.itemNames.add(row.name);
      map.set(name, cur);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [safeItems]);

  const filteredItems = useMemo(() => {
    if (selectedSupplier === "all") return safeItems;
    return safeItems.filter((i) => i.supplierName === selectedSupplier);
  }, [safeItems, selectedSupplier]);

  const activeSummary =
    selectedSupplier === "all"
      ? null
      : supplierSummaries.find((s) => s.name === selectedSupplier);

  const totalLines = safeItems.length;
  const totalSuppliers = supplierSummaries.length;

  return (
    <main className="container mx-auto py-6 px-0 flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Users size={20} />
            <h1 className="text-2xl font-bold tracking-tight">Supply chain audit</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl text-pretty">
            Each registration line is listed separately — the same item name from
            different suppliers appears as its own row. Filter by supplier to audit
            payments and stock received.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
            Filter by provider
          </span>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="h-10 w-64 bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <SelectValue placeholder="All registered suppliers" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-2xl">
              <SelectGroup>
                <SelectLabel>Suppliers</SelectLabel>
                <SelectItem value="all" className="cursor-pointer">
                  All suppliers ({totalSuppliers})
                </SelectItem>
                {supplierSummaries.map((s) => (
                  <SelectItem key={s.name} value={s.name} className="cursor-pointer">
                    {s.name} · {s.lineCount} line{s.lineCount !== 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-primary/15 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Suppliers
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totalSuppliers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Registration lines
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totalLines}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardDescription>Filtered value (ETB)</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-emerald-800 dark:text-emerald-300">
              {filteredItems
                .reduce((sum, r) => sum + lineOwedETB(r), 0)
                .toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {activeSummary ? (
        <Card className="border-dashed border-primary/25 bg-primary/5">
          <CardContent className="py-4 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Supplier
              </p>
              <p className="font-semibold">{activeSummary.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Lines
              </p>
              <p className="font-semibold tabular-nums">{activeSummary.lineCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Distinct items
              </p>
              <p className="font-semibold tabular-nums">
                {activeSummary.itemNames.size}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Total value
              </p>
              <p className="font-semibold tabular-nums text-primary">
                ETB {activeSummary.totalValue.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <DataTableClientWrapper
          data={filteredItems}
          readOnly
          showStoreMovementActions={false}
          aggregateInventory={false}
        />
      </div>
    </main>
  );
}
