"use client";

import { HotelManagerCompanyApprovals } from "@/components/hotel/HotelManagerCompanyApprovals";
import { ManagerCorporateCreditTiers } from "@/components/hotel/ManagerCorporateCreditTiers";

export function CafeAdminCorporateCredit({
  tenantScope,
  propertyName,
  propertyLogo,
  propertyTin,
  variant = "cafe-admin",
}: {
  tenantScope: string;
  propertyName: string;
  propertyLogo?: string | null;
  propertyTin?: string | null;
  /** Café admin vs hotel manager (same screens, different approval copy). */
  variant?: "cafe-admin" | "hotel-manager";
}) {
  const audience =
    variant === "cafe-admin" ? "cafe-admin" : "hotel-manager";
  const tierVariant = variant === "cafe-admin" ? "cafe" : "hotel";

  return (
    <div className="space-y-8">
      <HotelManagerCompanyApprovals
        audience={audience}
        tenantScope={tenantScope}
        propertyName={propertyName}
        propertyLogo={propertyLogo}
        propertyTin={propertyTin}
      />
      <ManagerCorporateCreditTiers variant={tierVariant} />
    </div>
  );
}
