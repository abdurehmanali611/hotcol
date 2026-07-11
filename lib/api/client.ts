import axios from "axios";
import { isStoredAuthTokenExpired, readAuthToken } from "../authToken";
import {
  graphqlErrorsIndicateSessionExpiry,
  graphqlMessageIndicatesPermissionDenied,
  isSessionExpiredError,
  scheduleSessionExpiredRedirect,
  SessionExpiredError,
} from "../sessionExpiry";
import {
  invalidateGraphqlListCache,
  readListCache,
  writeListCache,
  tenantScopedGraphqlListKey,
} from "../graphqlListCache";
import { bumpCafeOrdersFeed } from "../cafeOrdersSync";
import { toast } from "sonner";

/** Ensures POSTs hit the GraphQL HTTP endpoint (avoids 404/400 when env omits `/graphql`). */
function normalizeGraphqlHttpUrl(raw: string | undefined): string {
  const fallback = "https://hotcol-backend.vercel.app/graphql";
  const s = (raw ?? fallback).trim() || fallback;
  const base = s.replace(/\/+$/, "");
  if (/\/graphql$/i.test(base)) return base;
  return `${base}/graphql`;
}

const API_URL = normalizeGraphqlHttpUrl(process.env.NEXT_PUBLIC_GRAPHQL_URL);
export { API_URL };

function resolveGraphqlTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_GRAPHQL_TIMEOUT_MS;
  const n = raw ? Number.parseInt(String(raw).trim(), 10) : NaN;
  if (Number.isFinite(n) && n >= 10_000 && n <= 300_000) return n;
  return 60_000;
}

/** Default 60s; slow links: set `NEXT_PUBLIC_GRAPHQL_TIMEOUT_MS` (10000–300000). */
export const GRAPHQL_TIMEOUT_MS = resolveGraphqlTimeoutMs();

/** Set `NEXT_PUBLIC_DEBUG_SLOW_GRAPHQL_MS` (e.g. 400) to log `[hotcol][graphql] <key> <ms>ms` in the browser console. */
const GRAPHQL_SLOW_FETCH_LOG_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_DEBUG_SLOW_GRAPHQL_MS;
  const n = raw ? Number.parseInt(String(raw).trim(), 10) : NaN;
  if (Number.isFinite(n) && n >= 0) return n;
  return -1;
})();

const api = axios.create({
  timeout: GRAPHQL_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = readAuthToken();
      if (token && isStoredAuthTokenExpired()) {
        scheduleSessionExpiredRedirect();
        return Promise.reject(new SessionExpiredError());
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    const errs = response.data?.errors as Array<{ message?: string }> | undefined;
    if (graphqlErrorsIndicateSessionExpiry(errs)) {
      scheduleSessionExpiredRedirect();
      return Promise.reject(new SessionExpiredError());
    }
    return response;
  },
  (error) => {
    if (isSessionExpiredError(error)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && typeof window !== "undefined") {
      scheduleSessionExpiredRedirect();
      return Promise.reject(new SessionExpiredError());
    }
    return Promise.reject(error);
  },
);

const hotelListReadInflight = new Map<string, Promise<unknown>>();

/** When several surfaces request the same list read at once, share one HTTP round-trip. */
function dedupeHotelListRead<T>(key: string, run: () => Promise<T>): Promise<T> {
  // Always isolate by signed-in tenant — never reuse another property's list.
  const scopedKey = tenantScopedGraphqlListKey(key);
  const cached = readListCache<T>(scopedKey);
  if (cached != null) return Promise.resolve(cached);

  const existing = hotelListReadInflight.get(scopedKey);
  if (existing) return existing as Promise<T>;
  const startedAt =
    GRAPHQL_SLOW_FETCH_LOG_MS >= 0 && typeof performance !== "undefined"
      ? performance.now()
      : null;
  const p = (async () => {
    try {
      const result = await run();
      writeListCache(scopedKey, result);
      return result;
    } finally {
      hotelListReadInflight.delete(scopedKey);
      if (
        startedAt != null &&
        GRAPHQL_SLOW_FETCH_LOG_MS >= 0 &&
        typeof performance !== "undefined"
      ) {
        const ms = Math.round(performance.now() - startedAt);
        if (ms >= GRAPHQL_SLOW_FETCH_LOG_MS) {
          console.info(`[hotcol][graphql] ${scopedKey} ${ms}ms`);
        }
      }
    }
  })();
  hotelListReadInflight.set(scopedKey, p);
  return p;
}

export { api, dedupeHotelListRead };
export { invalidateGraphqlListCache } from "../graphqlListCache";

export function refreshCafeOrdersFeed() {
  invalidateGraphqlListCache("cafe:orders");
  bumpCafeOrdersFeed();
}

/** Hide raw Prisma/GraphQL schema errors from staff-facing toasts. */
export function sanitizeGraphqlErrorMessage(raw: string, fallback = "Request failed"): string {
  const msg = String(raw ?? "").trim();
  if (!msg) return fallback;
  if (/expired transaction|transaction was \d+ ms|P2028/i.test(msg)) {
    return "This batch took too long on the server. Try fewer lines at once, or wait a moment and try again.";
  }
  if (/Invalid `prisma\./i.test(msg) || /Unknown argument/i.test(msg)) {
    return "The server could not save this request. If you just updated the app, the database may need a migration — contact Apex support.";
  }
  if (/Unknown field|Cannot query field|Unknown type/i.test(msg)) {
    return "This action is not supported by the current API version. Contact Apex support to deploy the latest backend.";
  }
  return msg;
}

let lastFailureToast = "";
let lastFailureToastAt = 0;

/** UI catch helper: session expiry is already toasted + redirecting; surface timeouts/network clearly. */
export function notifyApiFailure(error: unknown, fallback = "Request failed"): void {
  if (typeof window === "undefined") return;
  if (isSessionExpiredError(error)) return;
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      toast.error(
        `Request timed out (>${GRAPHQL_TIMEOUT_MS / 1000}s). If your connection is slow, wait and try again.`,
      );
      return;
    }
    if (!error.response && error.message === "Network Error") {
      toast.error(
        "Could not reach the API server. For local dev, run BackEnd on port 4000 and set NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000.",
      );
      return;
    }
  }
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;
  if (raw === "SESSION_EXPIRED") return;

  const message = sanitizeGraphqlErrorMessage(raw, fallback);
  if (graphqlMessageIndicatesPermissionDenied(message)) {
    const friendly =
      message.toLowerCase() === "not authorized"
        ? "You do not have permission for this action."
        : message;
    const now = Date.now();
    if (friendly === lastFailureToast && now - lastFailureToastAt < 4000) return;
    lastFailureToast = friendly;
    lastFailureToastAt = now;
    toast.error(friendly, { id: "hotcol-permission-denied", duration: 5000 });
    return;
  }

  const now = Date.now();
  if (message === lastFailureToast && now - lastFailureToastAt < 3000) return;
  lastFailureToast = message;
  lastFailureToastAt = now;
  toast.error(message);
}

