"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ModuleOption } from "@/constants";
import {
  canAccessTenantModule,
  canAccessTerminalRole,
  canUseTenantSystem,
  getSubscriptionPeriodStatus,
  moduleBlockMessage,
  subscriptionBlockMessage,
} from "@/lib/tenantAccess";

import { isPaymentPortalMode } from "@/lib/tenantAccessMode";

/** Redirect home if subscription or module access is denied. */
export function useTenantRouteGuard(options?: {
  requiredModule?: ModuleOption;
  role?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (isPaymentPortalMode()) {
      router.replace("/PaymentVerification");
      return;
    }

    const status = getSubscriptionPeriodStatus();
    if (!canUseTenantSystem()) {
      toast.error(subscriptionBlockMessage(status));
      router.replace("/");
      return;
    }
    if (options?.requiredModule && !canAccessTenantModule(options.requiredModule)) {
      toast.error(moduleBlockMessage(options.requiredModule));
      router.replace("/");
      return;
    }
    if (options?.role && !canAccessTerminalRole(options.role)) {
      toast.error("This terminal is not included in your property subscription.");
      router.replace("/");
    }
  }, [options?.requiredModule, options?.role, router]);
}
