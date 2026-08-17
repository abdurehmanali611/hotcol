"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, ShieldCheck } from "lucide-react";
import { setCashierCancelOrdersEnabled } from "@/lib/api/auth";
import { useCashierCancelOrdersEnabled } from "@/hooks/useCashierCancelOrdersEnabled";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManagerCashierCancelPermissionCard() {
  const enabled = useCashierCancelOrdersEnabled();
  const [pending, setPending] = useState(false);

  const onToggle = async (next: boolean) => {
    setPending(true);
    try {
      await setCashierCancelOrdersEnabled(next);
      toast.success(
        next
          ? "Analog cashiers may now cancel unpaid orders"
          : "Analog cashier cancel is off — managers and admins handle cancellation",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update cashier cancel permission",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          {enabled ? (
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          ) : (
            <Ban className="h-4 w-4 text-muted-foreground" />
          )}
          Cashier order cancel
        </CardTitle>
        <CardDescription>
          Off by default on thermal-printer properties. Digital cashiers keep
          the usual cancel controls, and digital cancellations remain available
          to cashier, chef, and bar staff for manager/admin tracking. Analog
          cashiers cannot cancel unpaid tickets unless you turn this on.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Analog cashiers can remove unpaid live order lines."
            : "Analog cashiers cannot cancel orders."}
        </p>
        <Switch
          checked={enabled}
          disabled={pending}
          onCheckedChange={(v) => void onToggle(v)}
          aria-label="Allow cashiers to cancel unpaid orders"
        />
      </CardContent>
    </Card>
  );
}
