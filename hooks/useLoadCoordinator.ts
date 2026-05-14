"use client";

import { useCallback, useMemo, useRef } from "react";

export type LoadStaleCheck = () => boolean;

/**
 * Coalesces overlapping refreshes (rapid approve clicks / refresh spam) into one
 * follow-up run, and exposes `isStale()` so callers can skip applying old results.
 */
export function useLoadCoordinator() {
  const generationRef = useRef(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const queuedRef = useRef(false);

  const run = useCallback(async (loader: (isStale: LoadStaleCheck) => Promise<void>) => {
    if (inflightRef.current) {
      queuedRef.current = true;
      return inflightRef.current;
    }

    const execute = async () => {
      do {
        queuedRef.current = false;
        const gen = ++generationRef.current;
        const isStale: LoadStaleCheck = () => gen !== generationRef.current;
        await loader(isStale);
      } while (queuedRef.current);
    };

    const task = execute().finally(() => {
      if (inflightRef.current === task) {
        inflightRef.current = null;
      }
    });
    inflightRef.current = task;
    return task;
  }, []);

  const bump = useCallback(() => {
    generationRef.current += 1;
  }, []);

  return useMemo(() => ({ run, bump }), [run, bump]);
}
