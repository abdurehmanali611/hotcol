/** URLs saved when no photo was uploaded during batch registration. */
const PLACEHOLDER_IMAGE_HOSTS = ["placehold.co", "via.placeholder.com"] as const;

export function isPlaceholderRegistrationImage(url?: string | null): boolean {
  const s = String(url ?? "").trim();
  if (!s) return true;
  try {
    const host = new URL(s).hostname.toLowerCase();
    return PLACEHOLDER_IMAGE_HOSTS.some(
      (p) => host === p || host.endsWith(`.${p}`),
    );
  } catch {
    return false;
  }
}

/** Use for UI preview only — omits placeholder / empty URLs. */
export function registrationPreviewImageUrl(url?: string | null): string | null {
  const s = String(url ?? "").trim();
  if (!s || isPlaceholderRegistrationImage(s)) return null;
  return s;
}
