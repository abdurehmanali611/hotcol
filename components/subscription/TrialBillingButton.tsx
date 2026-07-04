"use client";

import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTenantSubscriptionState } from "@/hooks/useTenantSubscription";
import { freeTrialDaysRemaining } from "@/lib/subscriptionQuarter";
import { readTenantBillingFromStorage } from "@/lib/tenantModules";
import { persistTenantAccessMode } from "@/lib/tenantAccessMode";
import { cn } from "@/lib/utils";

export function TrialBillingButton({ className }: { className?: string }) {
  const router = useRouter();
  const { status } = useTenantSubscriptionState();

  if (status !== "trial_ending") return null;

  const snap = readTenantBillingFromStorage();
  const daysLeft = freeTrialDaysRemaining(snap) ?? 0;

  const handleClick = () => {
    persistTenantAccessMode("payment_portal", "setup");
    router.push("/PaymentVerification");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "relative shrink-0 border-amber-500/40 bg-amber-500/10 animate-pulse",
              className,
            )}
            aria-label={`Trial ends in ${daysLeft} days — submit setup payment`}
            onClick={handleClick}
          >
            <CreditCard className="h-4 w-4 text-amber-500" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
              {daysLeft}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[16rem] text-center">
          <p className="font-semibold">Trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap to submit setup payment before the trial expires
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
