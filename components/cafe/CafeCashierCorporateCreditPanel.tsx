"use client";

import { useSearchParams } from "next/navigation";
import { HotelCashierDashboard } from "@/components/hotel/HotelCashierDashboard";
import { HotelCreditorUsageReportPanel } from "@/components/hotel/HotelCreditorUsageReportPanel";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CafeCashierCorporateCreditPanel() {
  const searchParams = useSearchParams();
  const { displayName, tenantScope } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const tenantLabel = displayName || tenantScope || "Property";

  return (
    <Tabs defaultValue="companies" className="w-full space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="companies">Company deals</TabsTrigger>
        <TabsTrigger value="report">Usage report</TabsTrigger>
      </TabsList>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Register corporate company deals here (admin authorizes and prints the
        agreement). Staff name and phone are entered at payment when using
        corporate credit.
      </p>
      <TabsContent value="companies" className="mt-0 space-y-4">
        <HotelCashierDashboard embedded cafeCashier companiesOnly />
      </TabsContent>
      <TabsContent value="report" className="mt-0">
        <HotelCreditorUsageReportPanel tenantLabel={tenantLabel} />
      </TabsContent>
    </Tabs>
  );
}
