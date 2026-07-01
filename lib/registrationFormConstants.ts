/** Categories used on item registration and store review edits. */
export const REGISTRATION_CATEGORIES = [
  "Food",
  "Beverage",
  "House Keeping",
  "Maintenance",
  "Office Supplies",
  "Others",
] as const;

export type RegistrationCategory = (typeof REGISTRATION_CATEGORIES)[number];

/**
 * Normalize a stored category to the canonical spelling. Older rows (and the
 * legacy edit forms) saved the misspelled "Maintainance"; map it back to
 * "Maintenance" so values always line up with {@link REGISTRATION_CATEGORIES}.
 * Unknown values fall through unchanged so schema validation can flag them.
 */
export function normalizeRegistrationCategory(value: unknown): string {
  const v = String(value ?? "").trim();
  if (v === "Maintainance") return "Maintenance";
  return v;
}
