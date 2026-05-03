"use client";

import { fetchItemStatus, ItemStatus } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

export default function Inactive({
  items,
  admin,
  hotelName,
  embedded = false,
}: {
  items: ItemStatus[];
  admin: boolean;
  hotelName: string | null;
  embedded?: boolean;
}) {
  const [data, setData] = useState<ItemStatus[]>(items);

  useEffect(() => {
    setData(items);
  }, [items]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const refreshData = async () => {
    try {
      const response = await fetchItemStatus();
      if (Array.isArray(response)) {
        const hotelItems = response.filter((item) =>
          rowHotelMatchesTenantScope(item.HotelName, hotelName ?? ""),
        );
        setData(hotelItems);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filteredData = date !== undefined
    ? data.filter((item) => new Date(item.actionDate).toDateString() === date.toDateString())
    : data;

  return (
    <div
      className={`flex flex-col ${embedded ? "gap-4" : "gap-8"} animate-in fade-in duration-700`}
    >
      <div
        className={`flex flex-col md:flex-row md:items-center gap-4 ${embedded ? "justify-end" : "justify-between"}`}
      >
        {!embedded && (
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Historical Audit Logs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tracking movement and payments for {hotelName}.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {date && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDate(undefined)}
              className="text-muted-foreground hover:text-primary"
            >
              <FilterX size={14} className="mr-2" /> Clear
            </Button>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 border-dashed border-2 hover:border-primary/50 transition-all font-medium"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {date ? date.toLocaleDateString() : "Filter by Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => {
                  setDate(date);
                  setOpen(false);
                }}
                initialFocus
                className="rounded-xl border bg-card"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div
        className={
          embedded
            ? "rounded-xl border border-border/60 bg-card/80 shadow-inner overflow-hidden"
            : "bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"
        }
      >
        <DataTableClientWrapper data={filteredData ?? []} admin={admin} refresh={refreshData}/>
      </div>
    </div>
  );
}