/**
 * Quick sanity checks for Finance module gating.
 * Run: node --experimental-strip-types lib/financeHrCapabilities.test.mjs
 * or: node -e "import('./lib/financeHrCapabilities.ts')" after build.
 */
import { financeHrCapabilities } from "./financeHrCapabilities.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const invOnly = financeHrCapabilities([
  "Inventory",
  "Financial Management",
]);
assert(invOnly.canInventoryFinance && !invOnly.canHrFinance, "inv+fin");

const hrOnly = financeHrCapabilities([
  "HR Module",
  "Financial Management",
]);
assert(!hrOnly.canInventoryFinance && hrOnly.canHrFinance, "hr+fin");

const both = financeHrCapabilities([
  "Inventory",
  "HR Module",
  "Financial Management",
]);
assert(both.canInventoryFinance && both.canHrFinance, "all three");

const finAlone = financeHrCapabilities(["Financial Management"]);
assert(!finAlone.canInventoryFinance && !finAlone.canHrFinance, "fin alone");

console.log("financeHrCapabilities: PASS");
