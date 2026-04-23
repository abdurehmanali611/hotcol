"use client";
import { useState, useCallback, useEffect } from "react";
import { fetchItemRegistrations, ItemRegistration } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import UpdateStock from "@/components/UpdateStock";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, LayoutGrid } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

export default function StoreItems({
  items = [],
}: {
  items?: ItemRegistration[];
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemRegistration | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [data, setData] = useState<ItemRegistration[]>(
    Array.isArray(items) ? items : []
  );

  const refresh = useCallback(async () => {
    try {
      const freshData = await fetchItemRegistrations();
      setData(freshData);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshTrigger]);

  useEffect(() => {
    setData(Array.isArray(items) ? items : []);
  }, [items]);

  const handleEdit = (item: ItemRegistration) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleUpdateSuccess = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const filteredData = date !== undefined
    ? data.filter(
        (item) =>
          new Date(item.registrationDate).toDateString() === date.toDateString()
      )
    : data;

  return (
    <main className="container mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <LayoutGrid size={24} />
            <h1 className="text-3xl font-extrabold tracking-tight">Master Inventory</h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Live stock tracking and supplier verification for Apex Solutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-px bg-border mx-2 hidden md:block" />
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Arrival</span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-56 justify-between border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <CalendarIcon size={14} className="text-primary" />
                    {date ? date.toLocaleDateString() : "All Historical Data"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setOpen(false); }}
                  initialFocus
                  className="rounded-xl border bg-card"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/2 overflow-hidden">
        <DataTableClientWrapper
          data={filteredData}
          onEdit={handleEdit}
          refresh={refresh}
        />
      </div>

      <UpdateStock
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        item={selectedItem}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </main>
  );
}
