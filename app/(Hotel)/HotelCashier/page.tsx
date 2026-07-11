"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HotelCashierDashboard } from "@/components/hotel/HotelCashierDashboard";
import { readTenantModulesFromStorage } from "@/lib/tenantModules";
import { tenantHasModule } from "@/lib/subscriptionModules";

function HotelCashierRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCafePos = tenantHasModule(
    readTenantModulesFromStorage(),
    "Cafe and Restaurant",
  );

  useEffect(() => {
    if (!hasCafePos) return;
    const query = searchParams.toString();
    router.replace(query ? `/Cashier?${query}` : "/Cashier");
  }, [hasCafePos, router, searchParams]);

  if (hasCafePos) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Opening cashier terminal…</p>
      </div>
    );
  }

  return <HotelCashierDashboard />;
}

export default function HotelCashierPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Opening hotel cashier…</p>
        </div>
      }
    >
      <HotelCashierRedirect />
    </Suspense>
  );
}
