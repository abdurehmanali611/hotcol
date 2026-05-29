import { toast } from "sonner";
import { clearTenantSubscriptionStorage } from "./tenantModules";
import { clearTenantAccessModeStorage } from "./tenantAccessMode";

/** Matches `app/page.tsx` (login is the home route). */
const LOGIN_PATH = "/";
const TOAST_ID = "hotcol-session-expired";

let redirectScheduled = false;

const AUTH_KEYS = [
  "auth_token",
  "user_role",
  "hotel_name",
  "tin_number",
  "hotel_display_name",
  "logo_url",
  "user_name",
  "business_type",
  "tenant_modules",
  "tenant_setup_fee_etb",
  "tenant_quarterly_fee_etb",
] as const;

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  for (const k of AUTH_KEYS) {
    localStorage.removeItem(k);
  }
  clearTenantSubscriptionStorage();
  clearTenantAccessModeStorage();
}

/** One toast + redirect; safe to call from multiple overlapping failures (deduped). */
export function scheduleSessionExpiredRedirect(): void {
  if (typeof window === "undefined") return;
  if (redirectScheduled) return;
  redirectScheduled = true;
  toast.error("Your session has expired. Please sign in again.", {
    id: TOAST_ID,
    duration: 8000,
  });
  clearAuthStorage();
  window.setTimeout(() => {
    window.location.href = LOGIN_PATH;
  }, 1600);
}

export class SessionExpiredError extends Error {
  readonly isSessionExpired = true;
  constructor() {
    super("SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}

export function isSessionExpiredError(e: unknown): e is SessionExpiredError {
  return e instanceof SessionExpiredError;
}

export function graphqlMessageIndicatesSessionExpiry(raw: string): boolean {
  const m = String(raw || "").trim().toLowerCase();
  if (m === "not authenticated" || m === "not authenticated.") return true;
  if (m === "unauthorized") return true;
  if (m === "jwt expired") return true;
  if (m.includes("jwt expired")) return true;
  if (m.includes("jwt malformed")) return true;
  if (m.includes("invalid token")) return true;
  if (m.includes("invalid signature")) return true;
  return false;
}

export function graphqlErrorsIndicateSessionExpiry(
  errors: Array<{ message?: string }> | undefined,
): boolean {
  if (!Array.isArray(errors) || errors.length === 0) return false;
  return errors.some((e) =>
    graphqlMessageIndicatesSessionExpiry(String(e?.message ?? "")),
  );
}
