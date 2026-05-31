import { toast } from "sonner";
import { clearAuthTokenMetadata, readAuthToken } from "./authToken";
import { clearTenantSubscriptionStorage } from "./tenantModules";
import { clearTenantAccessModeStorage } from "./tenantAccessMode";

/** Matches `app/page.tsx` (login is the home route). */
const LOGIN_PATH = "/";
const TOAST_ID = "hotcol-session-expired";

let redirectScheduled = false;

/** Call after a fresh login so a prior redirect guard does not block the new session. */
export function resetSessionExpiryGuard(): void {
  redirectScheduled = false;
}

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
  clearAuthTokenMetadata();
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

function clientHasAuthToken(): boolean {
  return Boolean(readAuthToken());
}

/** Permission / role failures — must not trigger session logout. */
export function graphqlMessageIndicatesPermissionDenied(raw: string): boolean {
  const m = String(raw || "").trim().toLowerCase();
  if (m === "not authorized" || m === "not authorized.") return true;
  if (m.includes("not authorized to")) return true;
  if (m.includes("not authorized for")) return true;
  if (m === "forbidden") return true;
  return false;
}

/**
 * Session loss only — avoids treating role errors as logout.
 * "Not Authenticated" counts only when a token was sent (stale/invalid session).
 */
export function graphqlMessageIndicatesSessionExpiry(raw: string): boolean {
  if (graphqlMessageIndicatesPermissionDenied(raw)) return false;

  const m = String(raw || "").trim().toLowerCase();
  if (m === "jwt expired" || m.includes("jwt expired")) return true;
  if (m.includes("token expired")) return true;

  const hasToken =
    typeof window === "undefined" ? true : clientHasAuthToken();

  if (m === "not authenticated" || m === "not authenticated.") {
    return hasToken;
  }

  if (hasToken && (m.includes("jwt malformed") || m.includes("invalid signature"))) {
    return true;
  }
  if (hasToken && m.includes("invalid token") && !m.includes("not authorized")) {
    return true;
  }

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
