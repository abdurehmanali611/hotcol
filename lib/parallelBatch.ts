/** Default parallel fan-out when batch GraphQL is unavailable. */
export const HOTEL_BATCH_CONCURRENCY = 6;

export type PoolResult<T> = { ok: T[]; failed: string[] };

/**
 * Run async work over many items with a fixed concurrency cap.
 * Independent keys (e.g. voucher A + voucher B) can each call this in parallel.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = HOTEL_BATCH_CONCURRENCY,
): Promise<PoolResult<R>> {
  const ok: R[] = [];
  const failed: string[] = [];
  if (!items.length) return { ok, failed };

  let next = 0;
  const limit = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        const item = items[i];
        try {
          ok.push(await fn(item, i));
        } catch (err: unknown) {
          const label =
            err instanceof Error ? err.message : String(err ?? "failed");
          const prefix =
            typeof item === "number" || typeof item === "string"
              ? `#${item}`
              : `#${i + 1}`;
          failed.push(`${prefix}: ${label}`);
        }
      }
    }),
  );

  return { ok, failed };
}

export function formatPoolFailures(
  failed: string[],
  max = 5,
): string | undefined {
  if (!failed.length) return undefined;
  return failed.slice(0, max).join(" · ");
}
