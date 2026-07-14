"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ReceptionDashboard } from "@/components/hotel/ReceptionDashboard";

export default function ReceptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Opening reception…</p>
        </div>
      }
    >
      <ReceptionDashboard />
    </Suspense>
  );
}
