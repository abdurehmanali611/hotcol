"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Ban } from "lucide-react";
import { setWaiterPaymentApprovalEnabled } from "@/lib/api/auth";
import { useWaiterOrderingEnabled } from "@/hooks/useWaiterOrderingEnabled";
import { useWaiterPaymentApprovalEnabled } from "@/hooks/useWaiterPaymentApprovalEnabled";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManagerWaiterPaymentApprovalCard() {
  const orderingEnabled = useWaiterOrderingEnabled();
  const enabled = useWaiterPaymentApprovalEnabled();
  const [pending, setPending] = useState(false);

  if (!orderingEnabled) return null;

  const onToggle = async (next: boolean) => {
    setPending(true);
    try {
      await setWaiterPaymentApprovalEnabled(next);
      toast.success(
        next
          ? "Waiters may send payment approval requests to cashiers"
          : "Waiter payment approval requests are off",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update waiter payment approval permission",
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
            <Banknote className="h-4 w-4 text-emerald-500" />
          ) : (
            <Ban className="h-4 w-4 text-muted-foreground" />
          )}
          Waiter payment approval
        </CardTitle>
        <CardDescription>
          When on, waiters can request cashiers to approve payment (amount +
          method). Waiters cannot mark orders paid themselves — cashiers approve
          or dismiss each request.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Waiters can send payment approval requests."
            : "Waiters cannot request payment approval."}
        </p>
        <Switch
          checked={enabled}
          disabled={pending}
          onCheckedChange={(v) => void onToggle(v)}
          aria-label="Allow waiters to send payment approval requests"
        />
      </CardContent>
    </Card>
  );
}
