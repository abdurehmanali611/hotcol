export const INVENTORY_UNIT_SELECT_OPTIONS = [
  { id: 1, name: "Litre" },
  { id: 2, name: "Kilogram" },
  { id: 3, name: "Piece" },
  { id: 4, name: "Packet" },
  { id: 5, name: "Dozen" },
  { id: 6, name: "Other" },
] as const;

export const INVENTORY_UNIT_NAMES = INVENTORY_UNIT_SELECT_OPTIONS.map(
  (u) => u.name,
);

/** Options for unit selects; keeps legacy values already saved on a row. */
export function inventoryUnitSelectValues(
  current?: string | null,
): readonly string[] {
  const cur = String(current ?? "").trim();
  if (!cur) return INVENTORY_UNIT_NAMES;
  if ((INVENTORY_UNIT_NAMES as readonly string[]).includes(cur)) {
    return INVENTORY_UNIT_NAMES;
  }
  return [cur, ...INVENTORY_UNIT_NAMES];
}
