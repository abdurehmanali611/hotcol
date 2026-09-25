/**
 * Finance role task allowlist from subscribed modules.
 * Credential Role=Finance always needs Financial Management;
 * inventory vs HR payroll surfaces split by Inventory / HR Module.
 */

export type FinanceModuleName =
  | "Financial Management"
  | "Inventory"
  | "HR Module"
  | string;

export type FinanceHrCapabilities = {
  canInventoryFinance: boolean;
  canHrFinance: boolean;
};

export function financeHrCapabilities(
  modules: Iterable<FinanceModuleName> | null | undefined,
): FinanceHrCapabilities {
  const set = new Set(
    [...(modules ?? [])].map((m) => String(m || "").trim()).filter(Boolean),
  );
  const hasFin = set.has("Financial Management");
  return {
    canInventoryFinance: hasFin && set.has("Inventory"),
    canHrFinance: hasFin && set.has("HR Module"),
  };
}
