/** Room status codes stored on `lodging_room.status`. */
export const LODGING_ROOM_STATUSES = [
  "vacant_dirty",
  "occupied",
  "vacant_clean",
  "on_maintenance",
] as const;

export type LodgingRoomStatus = (typeof LODGING_ROOM_STATUSES)[number];

export const LODGING_ROOM_STATUS_LABELS: Record<LodgingRoomStatus, string> = {
  vacant_dirty: "Vacant and dirty",
  occupied: "Occupied",
  vacant_clean: "Vacant and clean",
  on_maintenance: "On maintenance",
};

/** Statuses the CM leader (and reception CM portal) may act on. */
export const LODGING_CM_ACTIONABLE_STATUSES: readonly LodgingRoomStatus[] = [
  "vacant_dirty",
  "on_maintenance",
];

export const LODGING_ROOM_TYPES = [
  "Standard",
  "Deluxe",
  "Suite",
  "Family",
  "Twin",
  "Single",
] as const;

export type LodgingRoomType = (typeof LODGING_ROOM_TYPES)[number];

/** Bill line categories on a guest stay. */
export const LODGING_BILL_LINE_KINDS = [
  "room",
  "food_drink",
  "laundry",
  "other",
] as const;

export type LodgingBillLineKind = (typeof LODGING_BILL_LINE_KINDS)[number];

export const LODGING_SERVICE_KINDS = ["food_drink", "laundry"] as const;

export type LodgingServiceKind = (typeof LODGING_SERVICE_KINDS)[number];
