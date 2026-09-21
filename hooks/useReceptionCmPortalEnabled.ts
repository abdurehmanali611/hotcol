"use client";

import { useSyncExternalStore } from "react";
import {
  readReceptionCmPortalEnabledFromStorage,
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

export function useReceptionCmPortalEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    readReceptionCmPortalEnabledFromStorage,
    () => false,
  );
}
