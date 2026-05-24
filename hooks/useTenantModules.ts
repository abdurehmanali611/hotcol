"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readTenantModulesFromStorage } from "@/lib/tenantModules";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return JSON.stringify(readTenantModulesFromStorage());
}

function getServerSnapshot() {
  return "[]";
}

export function useTenantModules() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => readTenantModulesFromStorage(), [raw]);
}
