"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StoreComponent } from "@/app/(Cafe)/Store/page";

export default function HotelStorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Initializing hotel store terminal…
          </p>
        </div>
      }
    >
      <StoreComponent hotelInventory />
    </Suspense>
  );
}
