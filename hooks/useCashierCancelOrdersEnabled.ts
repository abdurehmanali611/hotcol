"use client";

import { useSyncExternalStore } from "react";
import {
  readCashierCancelOrdersEnabledFromStorage,
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

export function useCashierCancelOrdersEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    readCashierCancelOrdersEnabledFromStorage,
    () => false,
  );
}
