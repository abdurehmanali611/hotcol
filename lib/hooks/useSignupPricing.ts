"use client";

import { useEffect, useState } from "react";
import {
  fetchSignupPricingPreview,
  type SignupPricingPreview,
} from "@/lib/api/pricing";
import { calculateSignupPricing } from "@/lib/subscriptionModules";
import type { BusinessType, ModuleOption } from "@/constants";

export type SignupPricingState = SignupPricingPreview & { loading: boolean };

export function useSignupPricing(
  businessType: BusinessType,
  modules: readonly ModuleOption[],
): SignupPricingState {
  const baseline = calculateSignupPricing(businessType, modules);
  const [pricing, setPricing] = useState<SignupPricingState>({
    ...baseline,
    source: "local",
    differsFromDefault: false,
    loading: true,
  });

  const modulesKey = modules.join("|");

  useEffect(() => {
    let cancelled = false;
    setPricing((prev) => ({ ...prev, loading: true }));
    void fetchSignupPricingPreview(businessType, modules).then((result) => {
      if (!cancelled) {
        setPricing({ ...result, loading: false });
      }
    });
    return () => {
      cancelled = true;
    };
  // modulesKey tracks modules without unstable array reference in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessType, modulesKey]);

  return pricing;
}
