/** Resolve venue logo/TIN for agreement print (props + localStorage fallback). */
export function resolveAgreementVenueContext(
  propertyLogo?: string | null,
  propertyTin?: string | null,
): { propertyLogo: string | null; propertyTin: string | null } {
  const logo = String(propertyLogo ?? "").trim();
  let tin = String(propertyTin ?? "").trim();

  if (typeof window !== "undefined") {
    if (!tin) {
      try {
        tin = localStorage.getItem("tin_number")?.trim() || "";
      } catch {
        tin = "";
      }
    }
  }

  return {
    propertyLogo: logo || null,
    propertyTin: tin || null,
  };
}

export function normalizeAgreementCompanyLogo(
  imageUrl?: string | null,
): string | null {
  const url = String(imageUrl ?? "").trim();
  return url || null;
}

export function normalizeAgreementTin(tin?: string | null): string | null {
  const t = String(tin ?? "").trim();
  return t || null;
}

export function formatAgreementTin(tin?: string | null): string {
  const t = String(tin ?? "").trim();
  return t || "—";
}
