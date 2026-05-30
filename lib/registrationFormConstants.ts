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
