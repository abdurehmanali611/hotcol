"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Sparkles } from "lucide-react";
import { setReceptionCmPortalEnabled } from "@/lib/api/auth";
import { useReceptionCmPortalEnabled } from "@/hooks/useReceptionCmPortalEnabled";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManagerReceptionCmPortalPermissionCard() {
  const enabled = useReceptionCmPortalEnabled();
  const [pending, setPending] = useState(false);

  const onToggle = async (next: boolean) => {
    setPending(true);
    try {
      await setReceptionCmPortalEnabled(next);
      toast.success(
        next
          ? "Reception can now open the CM portal"
          : "Reception CM portal is off — use CM Leader for cleaning & maintenance",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update Reception CM portal permission",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 shadow-md">
      <div className="h-1 bg-linear-to-r from-amber-500/55 via-primary/35 to-emerald-500/40" />
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          {enabled ? (
            <Sparkles className="h-4 w-4 text-emerald-500" />
          ) : (
            <Ban className="h-4 w-4 text-muted-foreground" />
          )}
          Reception CM portal
        </CardTitle>
        <CardDescription>
          Off by default. When enabled, Reception sees the Cleaning &amp;
          Maintenance portal (queue and assignments). CM Leader always has full
          access.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Reception may assign cleaners, maintenance, and mark rooms clean."
            : "Reception cannot open the CM portal."}
        </p>
        <Switch
          checked={enabled}
          disabled={pending}
          onCheckedChange={(v) => void onToggle(v)}
          aria-label="Allow Reception to use the CM portal"
        />
      </CardContent>
    </Card>
  );
}
