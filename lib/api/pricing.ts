import { api, API_URL } from "./client";
import {
  calculateSignupPricing,
  type SignupPricing,
} from "../subscriptionModules";
import type { BusinessType, ModuleOption } from "@/constants";

export type SignupPricingSource = "catalog" | "fallback" | "local";

export type SignupPricingPreview = SignupPricing & {
  source: SignupPricingSource;
  differsFromDefault: boolean;
};

function withBaselineCompare(
  businessType: BusinessType,
  modules: readonly ModuleOption[],
  fees: SignupPricing,
  source: SignupPricingSource,
): SignupPricingPreview {
  const baseline = calculateSignupPricing(businessType, modules);
  const differsFromDefault =
    fees.setupFeeETB !== baseline.setupFeeETB ||
    fees.quarterlyFeeETB !== baseline.quarterlyFeeETB;
  return { ...fees, source, differsFromDefault };
}

/** Effective signup fees: Apex catalog when seeded/changed, else default matrix. */
export async function fetchSignupPricingPreview(
  businessType: BusinessType,
  modules: readonly ModuleOption[],
): Promise<SignupPricingPreview> {
  const fallback = calculateSignupPricing(businessType, modules);

  try {
    const response = await api.post(API_URL, {
      query: `
        query SignupPricing($businessType: String!, $modules: JSON!) {
          signupPricingPreview(businessType: $businessType, modules: $modules) {
            setupFeeETB
            quarterlyFeeETB
            source
          }
        }
      `,
      variables: {
        businessType,
        modules: [...modules],
      },
    });

    const row = response.data?.data?.signupPricingPreview;
    if (!row || response.data?.errors?.length) {
      return withBaselineCompare(businessType, modules, fallback, "local");
    }

    const fees = {
      setupFeeETB: Number(row.setupFeeETB) || 0,
      quarterlyFeeETB: Number(row.quarterlyFeeETB) || 0,
    };
    const source: SignupPricingSource =
      row.source === "catalog" ? "catalog" : "fallback";
    return withBaselineCompare(businessType, modules, fees, source);
  } catch {
    return withBaselineCompare(businessType, modules, fallback, "local");
  }
}
