import { Box, CreditCard } from "lucide-react";
import AdminCredit from "./AdminCredit";
import AdminInventory from "./AdminInventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useState } from "react";

interface InventoryAndCreditProps {
  hotelName: string;
}

const InventoryAndCredit = ({ hotelName }: InventoryAndCreditProps) => {
  const [displayName] = useState(() => {
    if (typeof window === "undefined") return hotelName;
    const d = localStorage.getItem("hotel_display_name")?.trim();
    return d || hotelName;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="inventory" className="w-full px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <TabsList className="grid w-full max-w-100 grid-cols-2 h-10 bg-muted/50 p-1.5 rounded-xl border border-border/60">
            <TabsTrigger 
              value="inventory" 
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-500 data-[state=active]:shadow-sm transition-all"
            >
              <Box size={18} />
              <span className="font-semibold text-sm">Inventory</span>
            </TabsTrigger>
            <TabsTrigger 
              value="credit" 
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-blue-500 data-[state=active]:shadow-sm transition-all"
            >
              <CreditCard size={18} />
              <span className="font-semibold text-sm">Credit</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Subtle info tag for context */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/30 border border-border/50">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {displayName} Management
            </span>
          </div>
        </div>

        <TabsContent 
          value="inventory" 
          className="mt-0 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
            <AdminInventory hotelName={hotelName} />
          </div>
        </TabsContent>

        <TabsContent 
          value="credit" 
          className="mt-0 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-4 shadow-sm">
            <AdminCredit hotelName={hotelName} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryAndCredit;