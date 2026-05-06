"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { HotelCashierDashboard } from "@/components/hotel/HotelCashierDashboard";

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
      <HotelCashierDashboard />
    </Suspense>
  );
}
