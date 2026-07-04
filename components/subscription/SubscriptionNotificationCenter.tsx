"use client";

import { AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTenantSubscriptionState } from "@/hooks/useTenantSubscription";
import { APEX_SOLUTION_CBE_ACCOUNT } from "@/lib/signupPayment";
import { cn } from "@/lib/utils";

export function SubscriptionNotificationCenter({
  className,
}: {
  className?: string;
}) {
  const { notifications, summary, status } = useTenantSubscriptionState();

  if (notifications.length === 0) return null;

  const badgeCount = summary.critical + summary.warning;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "relative shrink-0 border-destructive/40 bg-destructive/5",
            className,
          )}
          aria-label={`Subscription alerts, ${badgeCount} high priority`}
        >
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] p-0 border-destructive/30"
      >
        <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-destructive">
            Subscription — high priority
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            CBE account:{" "}
            <span className="font-mono font-semibold text-foreground">
              {APEX_SOLUTION_CBE_ACCOUNT}
            </span>
          </p>
        </div>
        <ul className="max-h-80 space-y-2 overflow-y-auto p-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 space-y-1.5",
                n.severity === "critical"
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-amber-500/30 bg-amber-500/10",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {n.severity === "critical" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <CreditCard className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span className="text-sm font-semibold leading-tight">
                    {n.title}
                  </span>
                </div>
                <Badge
                  variant={n.severity === "critical" ? "destructive" : "secondary"}
                  className="shrink-0 text-[10px] uppercase"
                >
                  {n.severity}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty pl-6">
                {n.message}
              </p>
            </li>
          ))}
        </ul>
        {status === "trial_ending" || status === "trial_expired" ? (
          <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            Submit the setup fee to Apex. Once approved, your subscription activates and all staff can log in.
          </p>
        ) : status === "grace" || status === "warning" ? (
          <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            After Apex approves your quarterly payment, access continues for the
            next 90-day quarter from your registration date.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function SubscriptionAlertBanner() {
  const { notifications } = useTenantSubscriptionState();
  const top = notifications[0];
  if (!top) return null;

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm",
        top.severity === "critical"
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
      )}
      role="alert"
    >
      <p className="font-semibold">{top.title}</p>
      <p className="mt-1 text-xs opacity-90 leading-relaxed text-pretty">
        {top.message}
      </p>
    </div>
  );
}
