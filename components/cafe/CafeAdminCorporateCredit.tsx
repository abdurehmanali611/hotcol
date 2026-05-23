"use client";

import { HotelManagerCompanyApprovals } from "@/components/hotel/HotelManagerCompanyApprovals";
import { ManagerCorporateCreditTiers } from "@/components/hotel/ManagerCorporateCreditTiers";

export function CafeAdminCorporateCredit({
  tenantScope,
  propertyName,
  propertyLogo,
  propertyTin,
}: {
  tenantScope: string;
  propertyName: string;
  propertyLogo?: string | null;
  propertyTin?: string | null;
}) {
  return (
    <div className="space-y-8">
      <HotelManagerCompanyApprovals
        audience="cafe-admin"
        tenantScope={tenantScope}
        propertyName={propertyName}
        propertyLogo={propertyLogo}
        propertyTin={propertyTin}
      />
      <ManagerCorporateCreditTiers />
    </div>
  );
}
