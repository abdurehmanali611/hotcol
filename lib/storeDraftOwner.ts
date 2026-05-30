/** Match backend `matchesStoreOwner` in storeDraftWorkflow.js */
export function matchesStoreOwner(
  actualName?: string | null,
  currentUser?: string | null,
): boolean {
  return (
    String(actualName ?? "").trim() === String(currentUser ?? "").trim()
  );
}
