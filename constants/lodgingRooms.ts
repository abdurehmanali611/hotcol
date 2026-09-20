/** Room status codes stored on `lodging_room.status`. */
export const LODGING_ROOM_STATUSES = [
  "vacant_dirty",
  "occupied",
  "vacant_clean",
  "on_maintenance",
  "reserved",
  "inspected",
  "out_of_order",
  "out_of_service",
  "blocked",
] as const;

export type LodgingRoomStatus = (typeof LODGING_ROOM_STATUSES)[number];

export const LODGING_ROOM_STATUS_LABELS: Record<LodgingRoomStatus, string> = {
  vacant_dirty: "Vacant and dirty",
  occupied: "Occupied",
  vacant_clean: "Vacant and clean",
  on_maintenance: "On maintenance",
  reserved: "Reserved",
  inspected: "Inspected",
  out_of_order: "Out of order",
  out_of_service: "Out of service",
  blocked: "Blocked",
};

/** Statuses the CM leader (and reception CM portal) may act on. */
export const LODGING_CM_ACTIONABLE_STATUSES: readonly LodgingRoomStatus[] = [
  "vacant_dirty",
  "on_maintenance",
  "inspected",
];

/** Manager-only inventory holds. */
export const LODGING_MANAGER_ONLY_STATUSES: readonly LodgingRoomStatus[] = [
  "out_of_order",
  "out_of_service",
  "blocked",
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

/** Bill line categories on a guest stay (tax config excludes discount). */
export const LODGING_BILL_LINE_KINDS = [
  "room",
  "food_drink",
  "laundry",
  "other",
] as const;

/** Folio discount lines — Reception requests; Manager must approve. */
export const LODGING_DISCOUNT_KIND = "discount" as const;

export type LodgingBillLineKind = (typeof LODGING_BILL_LINE_KINDS)[number];

export const LODGING_SERVICE_KINDS = ["food_drink", "laundry"] as const;

export type LodgingServiceKind = (typeof LODGING_SERVICE_KINDS)[number];

export const LODGING_RESERVATION_STATUSES = [
  "tentative",
  "confirmed",
  "cancelled",
  "no_show",
  "checked_in",
] as const;

export type LodgingReservationStatus =
  (typeof LODGING_RESERVATION_STATUSES)[number];

export const LODGING_RESERVATION_STATUS_LABELS: Record<
  LodgingReservationStatus,
  string
> = {
  tentative: "Tentative",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  no_show: "No-show",
  checked_in: "Checked in",
};

export const LODGING_RESERVATION_SOURCES = [
  "walk_in",
  "phone",
  "website",
  "agency",
  "corporate",
  "other",
] as const;

export type LodgingReservationSource =
  (typeof LODGING_RESERVATION_SOURCES)[number];

export const LODGING_RESERVATION_SOURCE_LABELS: Record<
  LodgingReservationSource,
  string
> = {
  walk_in: "Walk-in",
  phone: "Phone",
  website: "Website",
  agency: "Agency",
  corporate: "Corporate",
  other: "Other",
};

export const LODGING_PAYMENT_METHODS = ["cash", "bank", "telebirr"] as const;

export type LodgingPaymentMethod = (typeof LODGING_PAYMENT_METHODS)[number];

export const LODGING_RATE_PLAN_KINDS = [
  "standard",
  "corporate",
  "seasonal",
  "weekend",
  "promo",
  "long_stay",
  "group",
  "event",
] as const;

export type LodgingRatePlanKind = (typeof LODGING_RATE_PLAN_KINDS)[number];

export const LODGING_RATE_PLAN_KIND_LABELS: Record<LodgingRatePlanKind, string> =
  {
    standard: "Standard / rack",
    corporate: "Corporate",
    seasonal: "Seasonal",
    weekend: "Weekend",
    promo: "Promo",
    long_stay: "Long stay",
    group: "Group",
    event: "Event",
  };
