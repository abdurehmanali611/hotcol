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
