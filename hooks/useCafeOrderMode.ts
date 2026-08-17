"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  cafeOrderModeReportNotices,
  parseCafeOrderMode,
  type CafeOrderMode,
} from "@/lib/cafeOrderMode";
import {
  readCafeOrderModeFromStorage,
  readCafeOrderModeHistoryFromStorage,
  TENANT_SUBSCRIPTION_CHANGED_EVENT,
} from "@/lib/tenantModules";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(TENANT_SUBSCRIPTION_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TENANT_SUBSCRIPTION_CHANGED_EVENT, callback);
  };
}

function getSnapshot() {
  return JSON.stringify({
    mode: readCafeOrderModeFromStorage(),
    history: readCafeOrderModeHistoryFromStorage(),
  });
}

function getServerSnapshot() {
  return JSON.stringify({ mode: "digital", history: [] });
}

export function useCafeOrderMode(): CafeOrderMode {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    const parsed = JSON.parse(raw) as { mode?: unknown };
    return parseCafeOrderMode(parsed.mode);
  }, [raw]);
}

export function useCafeOrderModeHistory() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    const parsed = JSON.parse(raw) as {
      history?: ReturnType<typeof readCafeOrderModeHistoryFromStorage>;
    };
    return parsed.history ?? [];
  }, [raw]);
}

export function useCafeOrderModeReportNotices() {
  const history = useCafeOrderModeHistory();
  return useMemo(() => cafeOrderModeReportNotices(history), [history]);
}
