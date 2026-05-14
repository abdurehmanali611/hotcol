"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type ConcurrentRunOptions = {
  /** When the same key is already running, show a short hint (default: true). */
  toastOnDuplicate?: boolean;
};

/**
 * Tracks many in-flight async actions by string key (cafe batch-payment style).
 * Each key is independent — finishing one action does not clear another's pending state.
 */
export function useConcurrentActions() {
  const pendingRef = useRef(new Set<string>());
  const [tick, setTick] = useState(0);

  const sync = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  const isPending = useCallback(
    (key: string) => {
      void tick;
      return pendingRef.current.has(key);
    },
    [tick],
  );

  const run = useCallback(
    async <T>(
      key: string,
      fn: () => Promise<T>,
      options?: ConcurrentRunOptions,
    ): Promise<T | undefined> => {
      if (pendingRef.current.has(key)) {
        if (options?.toastOnDuplicate !== false) {
          toast.message("Already in progress", {
            description: "This action is still running. Wait for it to finish.",
          });
        }
        return undefined;
      }
      pendingRef.current.add(key);
      sync();
      try {
        return await fn();
      } finally {
        pendingRef.current.delete(key);
        sync();
      }
    },
    [sync],
  );

  const pendingCount = pendingRef.current.size;

  return useMemo(
    () => ({ isPending, run, pendingCount, tick }),
    [isPending, run, pendingCount, tick],
  );
}
