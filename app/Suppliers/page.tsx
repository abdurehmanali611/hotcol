"use client";
import { ItemRegistration } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Users, Filter } from "lucide-react";

export default function Suppliers({
  items = [],
}: {
  items?: ItemRegistration[];
}) {
  // 1. Change initial state to "all" instead of ""
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  
  // 2. Extract unique supplier names and filter out any null/undefined/empty strings
  const safeItems = Array.isArray(items) ? items : [];
  const uniqueSuppliers = Array.from(
    new Set(
      safeItems
        .map((i) => i.supplierName)
        .filter((name): name is string => Boolean(name && name.trim() !== ""))
    )
  );

  return (
    <main className="container mx-auto py-6 px-0 flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Users size={20} />
            <h1 className="text-2xl font-bold tracking-tight">Supply Chain Audit</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Monitor registered items and financial standings per supplier.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Provider</span>
          <Select 
            value={selectedSupplier} 
            onValueChange={(value) => setSelectedSupplier(value)}
          >
            <SelectTrigger className="h-10 w-64 bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <SelectValue placeholder="All Registered Suppliers" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-2xl">
              <SelectGroup>
                <SelectLabel>Suppliers</SelectLabel>
                {/* 3. Use "all" as the value instead of an empty string */}
                <SelectItem value="all">All Suppliers</SelectItem>
                {uniqueSuppliers.map((name, idx) => (
                  <SelectItem key={idx} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <DataTableClientWrapper
          data={
            selectedSupplier === "all"
              ? safeItems
              : safeItems.filter((i) => i.supplierName === selectedSupplier)
          }
        />
      </div>
    </main>
  );
}
