/** Cross-tab + in-app bump when waiter payment-approval requests change. */

const CHANNEL = "hotcol-waiter-payment-approval";
const STORAGE_KEY = "hotcol_waiter_payment_approval_bump";

export const WAITER_PAYMENT_APPROVAL_CHANGED_EVENT =
  "hotcol-waiter-payment-approval-changed";

export function bumpWaiterPaymentApprovalFeed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(WAITER_PAYMENT_APPROVAL_CHANGED_EVENT));
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ t: Date.now() });
    bc.close();
  } catch {
    /* ignore */
  }
}

export function subscribeWaiterPaymentApprovalChanged(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const onCustom = () => callback();
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = () => callback();
  } catch {
    bc = null;
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener(WAITER_PAYMENT_APPROVAL_CHANGED_EVENT, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WAITER_PAYMENT_APPROVAL_CHANGED_EVENT, onCustom);
    try {
      bc?.close();
    } catch {
      /* ignore */
    }
  };
}
