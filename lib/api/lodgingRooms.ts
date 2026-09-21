import { toast } from "sonner";
import {
  api,
  API_URL,
  dedupeHotelListRead,
  invalidateGraphqlListCache,
  sanitizeGraphqlErrorMessage,
} from "./client";
import type { LodgingRoomStatus, LodgingServiceKind } from "@/constants/lodgingRooms";

/* ── Types (GraphQL ↔ Prisma lodging_* models) ─────────────────────────── */

export type LodgingRoom = {
  id: number;
  HotelName: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  pricePerNightETB: number;
  status: string;
  maintenanceUntil: string | null;
  statusExpectedEndAt?: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type LodgingGuest = {
  id: number;
  firstName: string;
  lastName: string;
  sex: string;
  phone: string;
  phoneSecondary: string;
  email: string;
  isEthiopian: boolean;
  nationalId: string;
  passportNumber: string;
  country: string;
  stateRegion: string;
  addressLine: string;
  /** Latest stay arrival (check-in). */
  lastCheckedInAt?: string | null;
  /** Latest completed stay departure (check-out). */
  lastCheckedOutAt?: string | null;
};

export type LodgingBillLine = {
  id: number;
  kind: string;
  description: string;
  quantity: number;
  unitPriceETB: number;
  amountETB: number;
  taxPercent?: number;
  taxETB?: number;
  roomNumber: string;
  fulfillmentStatus?: string;
  fulfilledAt?: string | null;
  fulfilledBy?: string;
  voided?: boolean;
  voidedAt?: string | null;
  voidedBy?: string;
  voidReason?: string;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string | null;
  approvalNote?: string;
  createdAt?: string;
  createdBy?: string;
};

export type LodgingBill = {
  id: number;
  status: string;
  totalETB: number;
  cashETB?: number;
  bankETB?: number;
  telebirrETB?: number;
  receiptNumber: string;
  lines: LodgingBillLine[];
};

export type LodgingStayRoom = {
  id: number;
  roomId: number;
  roomType: string;
  room: {
    id: number;
    roomNumber: string;
    roomType: string;
    status: string;
    pricePerNightETB: number;
  } | null;
};

export type LodgingStay = {
  id: number;
  HotelName?: string;
  voucherCode: string;
  guestId: number;
  reservationId?: number | null;
  status: string;
  arrivalAt: string;
  reservedArrivalAt?: string | null;
  departureAt: string;
  expectedNights?: number;
  expectedDepartureAt?: string | null;
  nights: number;
  adults: number;
  children: number;
  preferredRoomType: string;
  ratePlanId?: number | null;
  ratePlanName?: string;
  isCompany?: boolean;
  companyName?: string;
  companyTin?: string;
  notes: string;
  /** Guest room portal OTP (6 digits). Null after checkout. */
  guestOtp?: string | null;
  guestOtpIssuedAt?: string | null;
  guest: LodgingGuest | null;
  rooms: LodgingStayRoom[];
  bill: LodgingBill | null;
};

export type LodgingReservationRoom = {
  id: number;
  reservationId: number;
  roomId: number | null;
  roomType: string;
  room?: LodgingRoom | null;
};

export type LodgingReservation = {
  id: number;
  HotelName?: string;
  reservationCode: string;
  guestId: number | null;
  status: string;
  source: string;
  arrivalAt: string;
  departureAt: string;
  nights: number;
  adults: number;
  children: number;
  preferredRoomType: string;
  depositETB: number;
  depositPaymentMethod?: string;
  isCompany?: boolean;
  companyName?: string;
  companyTin?: string;
  notes: string;
  guest?: LodgingGuest | null;
  rooms: LodgingReservationRoom[];
};

export type LodgingTaxConfig = {
  id: number;
  kind: string;
  taxPercent: number;
};

export type LodgingBusinessDay = {
  id: number;
  businessDate: string;
  label?: string;
  fromAt?: string;
  toAt?: string;
  status: string;
  closedAt: string | null;
  closedBy: string;
  summaryJson: string;
};

export type LodgingGuestComplaint = {
  id: number;
  stayId: number;
  guestId?: number | null;
  roomId?: number | null;
  roomNumber?: string;
  category: string;
  message: string;
  status: string;
  isCritical?: boolean;
  createdAt: string;
  guestName?: string;
  voucherCode?: string;
  roomNumbers?: string;
};

export type LodgingGuestRating = {
  id: number;
  stayId: number;
  guestId?: number | null;
  overall: number;
  cleanliness: number | null;
  service: number | null;
  comment: string;
  createdAt: string;
  guestName?: string;
  voucherCode?: string;
  roomNumbers?: string;
};

export type LodgingServiceItem = {
  id: number;
  kind: string;
  name: string;
  unitPriceETB: number;
  unitLabel: string;
  imageUrl?: string | null;
  isActive: boolean;
};

export type LodgingCmAssignment = {
  id: number;
  roomId: number;
  workKind: string;
  assigneeName: string;
  notes: string;
  status: string;
  assignedBy: string;
  completedAt: string | null;
  room: {
    roomNumber: string;
    status: string;
    statusExpectedEndAt?: string | null;
  } | null;
};

export type LodgingActionLog = {
  id: number;
  actorRole: string;
  actorName: string;
  action: string;
  entityType: string;
  detailJson: string;
  createdAt: string;
};

export type LodgingDashboardStats = {
  vacantClean: number;
  vacantDirty: number;
  occupied: number;
  onMaintenance: number;
  reserved: number;
  inspected: number;
  outOfOrder: number;
  outOfService: number;
  blocked: number;
  activeStays: number;
  openCmAssignments: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  openReservations: number;
  occupancyPercent: number;
  outstandingBalanceETB: number;
};

export type CreateLodgingRoomInput = {
  roomNumber: string;
  roomType: string;
  floor?: string;
  pricePerNightETB: number;
  notes?: string;
  status?: string;
};

export type UpdateLodgingRoomInput = {
  id: number;
  roomNumber?: string;
  roomType?: string;
  floor?: string;
  pricePerNightETB?: number;
  notes?: string;
  status?: string;
  maintenanceUntil?: string | null;
};

export type UpsertLodgingServiceItemInput = {
  id?: number;
  kind: LodgingServiceKind | string;
  name: string;
  unitPriceETB: number;
  unitLabel?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export type UpsertLodgingGuestInput = {
  id?: number;
  firstName: string;
  lastName: string;
  sex?: string;
  phone: string;
  phoneSecondary?: string;
  email?: string;
  isEthiopian?: boolean;
  nationalId?: string;
  passportNumber?: string;
  country?: string;
  stateRegion?: string;
  addressLine?: string;
};

export type CreateLodgingStayInput = {
  guestId?: number;
  guest?: UpsertLodgingGuestInput;
  arrivalAt: string;
  nights: number;
  adults?: number;
  children?: number;
  preferredRoomType?: string;
  notes?: string;
  roomIds: number[];
  status?: string;
  reservationId?: number;
  isCompany?: boolean;
  companyName?: string;
  companyTin?: string;
};

export type UpdateLodgingStayInput = {
  id: number;
  arrivalAt?: string;
  departureAt?: string;
  nights?: number;
  expectedNights?: number;
  expectedDepartureAt?: string | null;
  adults?: number;
  children?: number;
  preferredRoomType?: string;
  notes?: string;
  status?: string;
  guestId?: number;
};

export type AddLodgingBillLineInput = {
  stayId: number;
  kind: string;
  description: string;
  quantity: number;
  unitPriceETB: number;
  roomNumber?: string;
};

export type TransferLodgingBillLinesInput = {
  lineIds: number[];
  toStayId: number;
};

export type SplitLodgingBillLineInput = {
  lineId: number;
  quantityToMove: number;
  toStayId: number;
};

export type RegisterLodgingServiceChargeInput = {
  stayId: number;
  serviceItemId: number;
  quantity: number;
  roomNumber?: string;
};

export type CreateLodgingCmAssignmentsInput = {
  roomId: number;
  workKind: string;
  assigneeNames: string[];
  notes?: string;
  statusExpectedEndAt?: string | null;
  /** Skip success toast (batch callers toast once). */
  quiet?: boolean;
};

/* ── Fragments ─────────────────────────────────────────────────────────── */

const ROOM_FIELDS = `
  id
  HotelName
  roomNumber
  roomType
  floor
  pricePerNightETB
  status
  maintenanceUntil
  statusExpectedEndAt
  notes
  createdAt
  updatedAt
`;

const GUEST_FIELDS = `
  id
  firstName
  lastName
  sex
  phone
  phoneSecondary
  email
  isEthiopian
  nationalId
  passportNumber
  country
  stateRegion
  addressLine
  lastCheckedInAt
  lastCheckedOutAt
`;

const STAY_FIELDS = `
  id
  HotelName
  voucherCode
  guestId
  reservationId
  status
  arrivalAt
  reservedArrivalAt
  departureAt
  expectedNights
  expectedDepartureAt
  nights
  adults
  children
  preferredRoomType
  ratePlanId
  ratePlanName
  isCompany
  companyName
  companyTin
  notes
  guestOtp
  guestOtpIssuedAt
  guest { ${GUEST_FIELDS} }
  rooms {
    id
    roomId
    roomType
    room {
      id
      roomNumber
      roomType
      status
      pricePerNightETB
    }
  }
  bill {
    id
    status
    totalETB
    cashETB
    bankETB
    telebirrETB
    receiptNumber
    lines {
      id
      kind
      description
      quantity
      unitPriceETB
      amountETB
      taxPercent
      taxETB
      roomNumber
      fulfillmentStatus
      fulfilledAt
      fulfilledBy
      voided
      voidedAt
      voidedBy
      voidReason
      approvalStatus
      approvedBy
      approvedAt
      approvalNote
    }
  }
`;

const RESERVATION_FIELDS = `
  id
  reservationCode
  guestId
  status
  source
  arrivalAt
  departureAt
  nights
  adults
  children
  preferredRoomType
  depositETB
  depositPaymentMethod
  isCompany
  companyName
  companyTin
  notes
  guest { ${GUEST_FIELDS} }
  rooms {
    id
    reservationId
    roomId
    roomType
    room { ${ROOM_FIELDS} }
  }
`;

const SERVICE_ITEM_FIELDS = `
  id
  kind
  name
  unitPriceETB
  unitLabel
  imageUrl
  isActive
`;

const CM_ASSIGNMENT_FIELDS = `
  id
  roomId
  workKind
  assigneeName
  notes
  status
  assignedBy
  completedAt
  room { roomNumber status statusExpectedEndAt }
`;

const ACTION_LOG_FIELDS = `
  id
  actorRole
  actorName
  action
  entityType
  detailJson
  createdAt
`;

const CACHE_KEYS = {
  rooms: "lodging:rooms",
  serviceItems: "lodging:serviceItems",
  stays: "lodging:stays",
  cm: "lodging:cm",
  logs: "lodging:logs",
  stats: "lodging:stats",
  guests: "lodging:guests",
} as const;

function gqlError(response: { data?: { errors?: Array<{ message?: string }> } }, fallback: string) {
  const msg = response.data?.errors?.[0]?.message;
  if (msg) throw new Error(sanitizeGraphqlErrorMessage(msg, fallback));
}

function invalidateLodgingCaches(keys: (keyof typeof CACHE_KEYS)[] = Object.keys(CACHE_KEYS) as (keyof typeof CACHE_KEYS)[]) {
  invalidateGraphqlListCache(keys.map((k) => CACHE_KEYS[k]));
}

/* ── Queries ───────────────────────────────────────────────────────────── */

export async function fetchLodgingRooms(): Promise<LodgingRoom[]> {
  return dedupeHotelListRead(CACHE_KEYS.rooms, async () => {
    const query = `query { lodgingRooms { ${ROOM_FIELDS} } }`;
    const response = await api.post(API_URL, { query });
    gqlError(response, "Failed to load rooms");
    return (response.data.data?.lodgingRooms ?? []) as LodgingRoom[];
  });
}

export async function fetchLodgingRoomsByStatus(
  status: LodgingRoomStatus | string,
): Promise<LodgingRoom[]> {
  const query = `
    query LodgingRoomsByStatus($status: String!) {
      lodgingRoomsByStatus(status: $status) { ${ROOM_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, { query, variables: { status } });
  gqlError(response, "Failed to load rooms by status");
  return (response.data.data?.lodgingRoomsByStatus ?? []) as LodgingRoom[];
}

export async function fetchLodgingCmQueue(): Promise<LodgingRoom[]> {
  return dedupeHotelListRead(`${CACHE_KEYS.rooms}:cmQueue`, async () => {
    const query = `query { lodgingCmQueue { ${ROOM_FIELDS} } }`;
    const response = await api.post(API_URL, { query });
    gqlError(response, "Failed to load CM queue");
    return (response.data.data?.lodgingCmQueue ?? []) as LodgingRoom[];
  });
}

export async function fetchLodgingGuests(search?: string): Promise<LodgingGuest[]> {
  const query = `
    query LodgingGuests($search: String) {
      lodgingGuests(search: $search) { ${GUEST_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { search: search?.trim() || null },
  });
  gqlError(response, "Failed to search guests");
  return (response.data.data?.lodgingGuests ?? []) as LodgingGuest[];
}

export async function fetchLodgingGuest(id: number): Promise<LodgingGuest | null> {
  const query = `
    query LodgingGuest($id: Int!) {
      lodgingGuest(id: $id) { ${GUEST_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, { query, variables: { id } });
  gqlError(response, "Failed to load guest");
  return (response.data.data?.lodgingGuest ?? null) as LodgingGuest | null;
}

export async function fetchLodgingActiveStays(): Promise<LodgingStay[]> {
  return dedupeHotelListRead(CACHE_KEYS.stays, async () => {
    const query = `query { lodgingActiveStays { ${STAY_FIELDS} } }`;
    const response = await api.post(API_URL, { query });
    gqlError(response, "Failed to load active stays");
    return (response.data.data?.lodgingActiveStays ?? []) as LodgingStay[];
  });
}

export async function fetchLodgingStay(id: number): Promise<LodgingStay | null> {
  const query = `
    query LodgingStay($id: Int!) {
      lodgingStay(id: $id) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, { query, variables: { id } });
  gqlError(response, "Failed to load stay");
  return (response.data.data?.lodgingStay ?? null) as LodgingStay | null;
}

export async function fetchLodgingStaysByDate(
  from: string,
  to: string,
): Promise<LodgingStay[]> {
  const query = `
    query LodgingStaysByDate($from: DateTime!, $to: DateTime!) {
      lodgingStaysByDate(from: $from, to: $to) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, { query, variables: { from, to } });
  gqlError(response, "Failed to load stays by date");
  return (response.data.data?.lodgingStaysByDate ?? []) as LodgingStay[];
}

export async function fetchLodgingServiceItems(
  kind?: LodgingServiceKind | string,
): Promise<LodgingServiceItem[]> {
  const cacheKey = kind
    ? `${CACHE_KEYS.serviceItems}:${kind}`
    : CACHE_KEYS.serviceItems;
  return dedupeHotelListRead(cacheKey, async () => {
    const query = `
      query LodgingServiceItems($kind: String) {
        lodgingServiceItems(kind: $kind) { ${SERVICE_ITEM_FIELDS} }
      }
    `;
    const response = await api.post(API_URL, {
      query,
      variables: { kind: kind ?? null },
    });
    gqlError(response, "Failed to load service prices");
    return (response.data.data?.lodgingServiceItems ?? []) as LodgingServiceItem[];
  });
}

export async function fetchLodgingCmAssignments(
  status?: string,
): Promise<LodgingCmAssignment[]> {
  const cacheKey = status ? `${CACHE_KEYS.cm}:${status}` : CACHE_KEYS.cm;
  return dedupeHotelListRead(cacheKey, async () => {
    const query = `
      query LodgingCmAssignments($status: String) {
        lodgingCmAssignments(status: $status) { ${CM_ASSIGNMENT_FIELDS} }
      }
    `;
    const response = await api.post(API_URL, {
      query,
      variables: { status: status ?? null },
    });
    gqlError(response, "Failed to load CM assignments");
    return (response.data.data?.lodgingCmAssignments ?? []) as LodgingCmAssignment[];
  });
}

export async function fetchLodgingActionLogs(
  limit = 80,
  stayId?: number,
): Promise<LodgingActionLog[]> {
  const cacheKey =
    stayId != null
      ? `${CACHE_KEYS.logs}:${limit}:${stayId}`
      : `${CACHE_KEYS.logs}:${limit}`;
  return dedupeHotelListRead(cacheKey, async () => {
    const query = `
      query LodgingActionLogs($limit: Int, $stayId: Int) {
        lodgingActionLogs(limit: $limit, stayId: $stayId) { ${ACTION_LOG_FIELDS} }
      }
    `;
    const response = await api.post(API_URL, {
      query,
      variables: { limit, stayId: stayId ?? null },
    });
    gqlError(response, "Failed to load action logs");
    return (response.data.data?.lodgingActionLogs ?? []) as LodgingActionLog[];
  });
}

export async function fetchLodgingDashboardStats(): Promise<LodgingDashboardStats> {
  return dedupeHotelListRead(CACHE_KEYS.stats, async () => {
    const query = `
      query {
        lodgingDashboardStats {
          vacantClean
          vacantDirty
          occupied
          onMaintenance
          reserved
          inspected
          outOfOrder
          outOfService
          blocked
          activeStays
          openCmAssignments
          todayCheckIns
          todayCheckOuts
          openReservations
          occupancyPercent
          outstandingBalanceETB
        }
      }
    `;
    const response = await api.post(API_URL, { query });
    gqlError(response, "Failed to load dashboard stats");
    return (response.data.data?.lodgingDashboardStats ?? {
      vacantClean: 0,
      vacantDirty: 0,
      occupied: 0,
      onMaintenance: 0,
      reserved: 0,
      inspected: 0,
      outOfOrder: 0,
      outOfService: 0,
      blocked: 0,
      activeStays: 0,
      openCmAssignments: 0,
      todayCheckIns: 0,
      todayCheckOuts: 0,
      openReservations: 0,
      occupancyPercent: 0,
      outstandingBalanceETB: 0,
    }) as LodgingDashboardStats;
  });
}

/* ── Mutations ─────────────────────────────────────────────────────────── */

async function refetchStayForUi(stayId: number): Promise<LodgingStay> {
  const stay = await fetchLodgingStay(stayId);
  if (!stay) throw new Error("Stay not found after update");
  return stay;
}

export async function createLodgingRoomApi(
  input: CreateLodgingRoomInput,
): Promise<LodgingRoom> {
  const mutation = `
    mutation CreateLodgingRoom(
      $roomNumber: String!
      $roomType: String!
      $floor: String
      $pricePerNightETB: Float!
      $notes: String
    ) {
      createLodgingRoom(
        roomNumber: $roomNumber
        roomType: $roomType
        floor: $floor
        pricePerNightETB: $pricePerNightETB
        notes: $notes
      ) { ${ROOM_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      roomNumber: input.roomNumber,
      roomType: input.roomType,
      floor: input.floor ?? null,
      pricePerNightETB: input.pricePerNightETB,
      notes: input.notes ?? null,
    },
  });
  gqlError(response, "Could not create room");
  invalidateLodgingCaches(["rooms", "stats"]);
  toast.success("Room created");
  return response.data.data.createLodgingRoom as LodgingRoom;
}

export async function updateLodgingRoomApi(
  input: UpdateLodgingRoomInput,
): Promise<LodgingRoom> {
  const mutation = `
    mutation UpdateLodgingRoom(
      $id: Int!
      $roomNumber: String
      $roomType: String
      $floor: String
      $pricePerNightETB: Float
      $notes: String
      $status: String
      $maintenanceUntil: DateTime
    ) {
      updateLodgingRoom(
        id: $id
        roomNumber: $roomNumber
        roomType: $roomType
        floor: $floor
        pricePerNightETB: $pricePerNightETB
        notes: $notes
        status: $status
        maintenanceUntil: $maintenanceUntil
      ) { ${ROOM_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      id: input.id,
      roomNumber: input.roomNumber ?? null,
      roomType: input.roomType ?? null,
      floor: input.floor ?? null,
      pricePerNightETB: input.pricePerNightETB ?? null,
      notes: input.notes ?? null,
      status: input.status ?? null,
      maintenanceUntil: input.maintenanceUntil ?? null,
    },
  });
  gqlError(response, "Could not update room");
  invalidateLodgingCaches(["rooms", "stats", "cm", "stays"]);
  toast.success("Room updated");
  return response.data.data.updateLodgingRoom as LodgingRoom;
}

export async function deleteLodgingRoomApi(id: number): Promise<boolean> {
  const mutation = `
    mutation DeleteLodgingRoom($id: Int!) {
      deleteLodgingRoom(id: $id)
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  gqlError(response, "Could not delete room");
  invalidateLodgingCaches(["rooms", "stats"]);
  toast.success("Room deleted");
  return response.data.data.deleteLodgingRoom === true;
}

export async function upsertLodgingServiceItemApi(
  input: UpsertLodgingServiceItemInput,
): Promise<LodgingServiceItem> {
  const mutation = `
    mutation UpsertLodgingServiceItem(
      $id: Int
      $kind: String!
      $name: String!
      $unitPriceETB: Float!
      $unitLabel: String
      $imageUrl: String
      $isActive: Boolean
    ) {
      upsertLodgingServiceItem(
        id: $id
        kind: $kind
        name: $name
        unitPriceETB: $unitPriceETB
        unitLabel: $unitLabel
        imageUrl: $imageUrl
        isActive: $isActive
      ) { ${SERVICE_ITEM_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      id: input.id ?? null,
      kind: input.kind,
      name: input.name,
      unitPriceETB: input.unitPriceETB,
      unitLabel: input.unitLabel ?? null,
      imageUrl: input.imageUrl ?? "",
      isActive: input.isActive ?? null,
    },
  });
  gqlError(response, "Could not save service item");
  invalidateLodgingCaches(["serviceItems"]);
  toast.success("Service price saved");
  return response.data.data.upsertLodgingServiceItem as LodgingServiceItem;
}

export async function deleteLodgingServiceItemApi(id: number): Promise<boolean> {
  const mutation = `
    mutation DeleteLodgingServiceItem($id: Int!) {
      deleteLodgingServiceItem(id: $id)
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  gqlError(response, "Could not delete service item");
  invalidateLodgingCaches(["serviceItems"]);
  toast.success("Service item removed");
  return response.data.data.deleteLodgingServiceItem === true;
}

export async function upsertLodgingGuestApi(
  input: UpsertLodgingGuestInput,
): Promise<LodgingGuest> {
  const mutation = `
    mutation UpsertLodgingGuest(
      $id: Int
      $firstName: String!
      $lastName: String!
      $sex: String
      $phone: String!
      $phoneSecondary: String
      $email: String
      $isEthiopian: Boolean
      $nationalId: String
      $passportNumber: String
      $country: String
      $stateRegion: String
      $addressLine: String
    ) {
      upsertLodgingGuest(
        id: $id
        firstName: $firstName
        lastName: $lastName
        sex: $sex
        phone: $phone
        phoneSecondary: $phoneSecondary
        email: $email
        isEthiopian: $isEthiopian
        nationalId: $nationalId
        passportNumber: $passportNumber
        country: $country
        stateRegion: $stateRegion
        addressLine: $addressLine
      ) { ${GUEST_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      id: input.id ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      sex: input.sex ?? null,
      phone: input.phone,
      phoneSecondary: input.phoneSecondary ?? null,
      email: input.email ?? null,
      isEthiopian: input.isEthiopian ?? null,
      nationalId: input.nationalId ?? null,
      passportNumber: input.passportNumber ?? null,
      country: input.country ?? null,
      stateRegion: input.stateRegion ?? null,
      addressLine: input.addressLine ?? null,
    },
  });
  gqlError(response, "Could not save guest");
  invalidateLodgingCaches(["guests"]);
  toast.success("Guest saved");
  return response.data.data.upsertLodgingGuest as LodgingGuest;
}

export async function createLodgingStayApi(
  input: CreateLodgingStayInput,
): Promise<LodgingStay> {
  const mutation = `
    mutation CreateLodgingStay(
      $guestId: Int
      $guestJson: JSON
      $arrivalAt: DateTime!
      $nights: Int!
      $adults: Int
      $children: Int
      $preferredRoomType: String
      $roomIds: [Int!]!
      $notes: String
      $status: String
      $reservationId: Int
      $isCompany: Boolean
      $companyName: String
      $companyTin: String
    ) {
      createLodgingStay(
        guestId: $guestId
        guestJson: $guestJson
        arrivalAt: $arrivalAt
        nights: $nights
        adults: $adults
        children: $children
        preferredRoomType: $preferredRoomType
        roomIds: $roomIds
        notes: $notes
        status: $status
        reservationId: $reservationId
        isCompany: $isCompany
        companyName: $companyName
        companyTin: $companyTin
      ) { ${STAY_FIELDS} }
    }
  `;
  const guestJson =
    input.guest != null
      ? {
          ...input.guest,
          id: input.guest.id ?? input.guestId ?? undefined,
        }
      : null;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      guestId: guestJson != null ? null : (input.guestId ?? null),
      guestJson,
      arrivalAt: input.arrivalAt,
      nights: input.nights,
      adults: input.adults ?? null,
      children: input.children ?? null,
      preferredRoomType: input.preferredRoomType ?? null,
      roomIds: input.roomIds,
      notes: input.notes ?? null,
      status: input.status ?? "checked_in",
      reservationId: input.reservationId ?? null,
      isCompany: input.isCompany ?? null,
      companyName: input.companyName ?? null,
      companyTin: input.companyTin ?? null,
    },
  });
  gqlError(response, "Could not check in guest");
  invalidateLodgingCaches(["stays", "rooms", "stats", "logs", "guests"]);
  toast.success("Guest checked in");
  return response.data.data.createLodgingStay as LodgingStay;
}

export async function updateLodgingStayApi(
  input: UpdateLodgingStayInput,
): Promise<LodgingStay> {
  const mutation = `
    mutation UpdateLodgingStay(
      $id: Int!
      $arrivalAt: DateTime
      $departureAt: DateTime
      $nights: Int
      $adults: Int
      $children: Int
      $preferredRoomType: String
      $notes: String
      $status: String
      $guestId: Int
    ) {
      updateLodgingStay(
        id: $id
        arrivalAt: $arrivalAt
        departureAt: $departureAt
        nights: $nights
        adults: $adults
        children: $children
        preferredRoomType: $preferredRoomType
        notes: $notes
        status: $status
        guestId: $guestId
      ) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      id: input.id,
      arrivalAt: input.arrivalAt ?? null,
      departureAt: input.departureAt ?? null,
      nights: input.nights ?? null,
      adults: input.adults ?? null,
      children: input.children ?? null,
      preferredRoomType: input.preferredRoomType ?? null,
      notes: input.notes ?? null,
      status: input.status ?? null,
      guestId: input.guestId ?? null,
    },
  });
  gqlError(response, "Could not update stay");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Stay updated");
  return response.data.data.updateLodgingStay as LodgingStay;
}

export async function addLodgingBillLineApi(
  input: AddLodgingBillLineInput,
): Promise<LodgingStay> {
  const mutation = `
    mutation AddLodgingBillLine(
      $stayId: Int!
      $kind: String!
      $description: String!
      $quantity: Float!
      $unitPriceETB: Float!
      $roomNumber: String
    ) {
      addLodgingBillLine(
        stayId: $stayId
        kind: $kind
        description: $description
        quantity: $quantity
        unitPriceETB: $unitPriceETB
        roomNumber: $roomNumber
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      stayId: input.stayId,
      kind: input.kind,
      description: input.description,
      quantity: input.quantity,
      unitPriceETB: input.unitPriceETB,
      roomNumber: input.roomNumber ?? null,
    },
  });
  gqlError(response, "Could not add bill line");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Charge added");
  return refetchStayForUi(input.stayId);
}

export async function updateLodgingBillLineApi(input: {
  lineId: number;
  quantity: number;
  stayId: number;
}): Promise<LodgingStay> {
  const mutation = `
    mutation UpdateLodgingBillLine($lineId: Int!, $quantity: Float!) {
      updateLodgingBillLine(lineId: $lineId, quantity: $quantity) {
        id
        quantity
        amountETB
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lineId: input.lineId,
      quantity: input.quantity,
    },
  });
  gqlError(response, "Could not update bill line");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Line updated");
  return refetchStayForUi(input.stayId);
}

export async function deleteLodgingBillLineApi(input: {
  lineId: number;
  stayId: number;
  silent?: boolean;
}): Promise<LodgingStay> {
  const mutation = `
    mutation DeleteLodgingBillLine($lineId: Int!) {
      deleteLodgingBillLine(lineId: $lineId)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { lineId: input.lineId },
  });
  gqlError(response, "Could not remove bill line");
  invalidateLodgingCaches(["stays", "logs"]);
  if (!input.silent) toast.success("Line cancelled");
  return refetchStayForUi(input.stayId);
}

export async function setLodgingBillLineFulfillmentApi(input: {
  lineId: number;
  status: "pending" | "completed" | "cancelled";
  stayId: number;
}): Promise<LodgingStay> {
  const mutation = `
    mutation SetLodgingBillLineFulfillment($lineId: Int!, $status: String!) {
      setLodgingBillLineFulfillment(lineId: $lineId, status: $status) {
        id
        fulfillmentStatus
        amountETB
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lineId: input.lineId,
      status: input.status,
    },
  });
  gqlError(response, "Could not update fulfillment status");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success(
    input.status === "completed"
      ? "Marked completed"
      : input.status === "cancelled"
        ? "Marked cancelled"
        : "Status updated",
  );
  return refetchStayForUi(input.stayId);
}

export async function transferLodgingBillLinesApi(
  input: TransferLodgingBillLinesInput,
): Promise<LodgingStay> {
  const mutation = `
    mutation TransferLodgingBillLines($lineIds: [Int!]!, $toStayId: Int!) {
      transferLodgingBillLines(lineIds: $lineIds, toStayId: $toStayId) {
        id
        stayId
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lineIds: input.lineIds,
      toStayId: input.toStayId,
    },
  });
  gqlError(response, "Could not transfer bill lines");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Bill lines transferred");
  return refetchStayForUi(input.toStayId);
}

export async function splitLodgingBillLineApi(
  input: SplitLodgingBillLineInput,
): Promise<LodgingStay> {
  const mutation = `
    mutation SplitLodgingBillLine(
      $lineId: Int!
      $quantityToMove: Float!
      $toStayId: Int!
    ) {
      splitLodgingBillLine(
        lineId: $lineId
        quantityToMove: $quantityToMove
        toStayId: $toStayId
      ) {
        id
        stayId
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lineId: input.lineId,
      quantityToMove: input.quantityToMove,
      toStayId: input.toStayId,
    },
  });
  gqlError(response, "Could not split bill line");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Bill line split");
  return refetchStayForUi(input.toStayId);
}

export async function checkoutLodgingStayApi(
  stayId: number,
  departureAt: string,
  payment?: {
    nights?: number;
    cashETB?: number;
    bankETB?: number;
    telebirrETB?: number;
  },
): Promise<LodgingStay> {
  const mutation = `
    mutation CheckoutLodgingStay(
      $stayId: Int!
      $departureAt: DateTime!
      $nights: Int
      $cashETB: Float
      $bankETB: Float
      $telebirrETB: Float
    ) {
      checkoutLodgingStay(
        stayId: $stayId
        departureAt: $departureAt
        nights: $nights
        cashETB: $cashETB
        bankETB: $bankETB
        telebirrETB: $telebirrETB
      ) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      stayId,
      departureAt,
      nights: payment?.nights ?? null,
      cashETB: payment?.cashETB ?? null,
      bankETB: payment?.bankETB ?? null,
      telebirrETB: payment?.telebirrETB ?? null,
    },
  });
  gqlError(response, "Could not check out");
  invalidateLodgingCaches(["stays", "rooms", "stats", "logs"]);
  toast.success("Checkout complete");
  return response.data.data.checkoutLodgingStay as LodgingStay;
}

export async function issueLodgingGuestOtpApi(
  stayId: number,
): Promise<LodgingStay> {
  const mutation = `
    mutation IssueLodgingGuestOtp($stayId: Int!) {
      issueLodgingGuestOtp(stayId: $stayId) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { stayId },
  });
  gqlError(response, "Could not issue room code");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Room code ready — tell the guest");
  return response.data.data.issueLodgingGuestOtp as LodgingStay;
}

export async function registerLodgingServiceChargeApi(
  input: RegisterLodgingServiceChargeInput,
): Promise<LodgingStay> {
  const mutation = `
    mutation RegisterLodgingServiceCharge(
      $stayId: Int!
      $serviceItemId: Int!
      $quantity: Float!
      $roomNumber: String
    ) {
      registerLodgingServiceCharge(
        stayId: $stayId
        serviceItemId: $serviceItemId
        quantity: $quantity
        roomNumber: $roomNumber
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      stayId: input.stayId,
      serviceItemId: input.serviceItemId,
      quantity: input.quantity,
      roomNumber: input.roomNumber ?? null,
    },
  });
  gqlError(response, "Could not register service charge");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Service charge registered");
  return refetchStayForUi(input.stayId);
}

export async function updateLodgingRoomStatusApi(
  roomId: number,
  status: LodgingRoomStatus | string,
  maintenanceUntil?: string | null,
  notes?: string | null,
  statusExpectedEndAt?: string | null,
): Promise<LodgingRoom> {
  const mutation = `
    mutation UpdateLodgingRoomStatus(
      $roomId: Int!
      $status: String!
      $maintenanceUntil: DateTime
      $statusExpectedEndAt: DateTime
      $notes: String
    ) {
      updateLodgingRoomStatus(
        roomId: $roomId
        status: $status
        maintenanceUntil: $maintenanceUntil
        statusExpectedEndAt: $statusExpectedEndAt
        notes: $notes
      ) { ${ROOM_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      roomId,
      status,
      maintenanceUntil: maintenanceUntil ?? null,
      statusExpectedEndAt: statusExpectedEndAt ?? maintenanceUntil ?? null,
      notes: notes ?? null,
    },
  });
  gqlError(response, "Could not update room status");
  invalidateLodgingCaches(["rooms", "stats", "cm", "logs"]);
  toast.success("Room status updated");
  return response.data.data.updateLodgingRoomStatus as LodgingRoom;
}

export async function createLodgingCmAssignmentsApi(
  input: CreateLodgingCmAssignmentsInput,
): Promise<LodgingCmAssignment[]> {
  const mutation = `
    mutation CreateLodgingCmAssignments(
      $roomId: Int!
      $workKind: String!
      $assigneeNames: [String!]!
      $notes: String
      $statusExpectedEndAt: DateTime
    ) {
      createLodgingCmAssignments(
        roomId: $roomId
        workKind: $workKind
        assigneeNames: $assigneeNames
        notes: $notes
        statusExpectedEndAt: $statusExpectedEndAt
      ) { ${CM_ASSIGNMENT_FIELDS} }
    }
  `;
  const names = [
    ...new Set(
      (input.assigneeNames || [])
        .map((n) => String(n || "").trim())
        .filter(Boolean),
    ),
  ];
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      roomId: input.roomId,
      workKind: input.workKind,
      assigneeNames: names,
      notes: input.notes ?? null,
      statusExpectedEndAt: input.statusExpectedEndAt ?? null,
    },
  });
  gqlError(response, "Could not create assignment");
  invalidateLodgingCaches(["cm", "stats", "logs", "rooms"]);
  if (!input.quiet) {
    toast.success(
      names.length === 1
        ? "Assignment created"
        : `${names.length} assignments created`,
    );
  }
  return (response.data.data.createLodgingCmAssignments ??
    []) as LodgingCmAssignment[];
}

/** @deprecated Use createLodgingCmAssignmentsApi */
export async function createLodgingCmAssignmentApi(input: {
  roomId: number;
  workKind: string;
  assigneeName: string;
  notes?: string;
}): Promise<LodgingCmAssignment> {
  const rows = await createLodgingCmAssignmentsApi({
    roomId: input.roomId,
    workKind: input.workKind,
    assigneeNames: [input.assigneeName],
    notes: input.notes,
  });
  return rows[0]!;
}

export async function completeLodgingCmAssignmentApi(
  id: number,
): Promise<LodgingCmAssignment> {
  const mutation = `
    mutation CompleteLodgingCmAssignment($id: Int!) {
      completeLodgingCmAssignment(id: $id) { ${CM_ASSIGNMENT_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  gqlError(response, "Could not complete assignment");
  // Drop CM queue/assignments/rooms/stats so vacant_clean shows without a hard refresh.
  invalidateLodgingCaches(["cm", "rooms", "stats", "logs"]);
  const row = response.data.data
    .completeLodgingCmAssignment as LodgingCmAssignment;
  const cleared = String(row?.room?.status || "").toLowerCase();
  toast.success(
    cleared === "inspected"
      ? `Done — room ${row.room?.roomNumber ?? ""} is inspected (ready for vacant clean)`
      : cleared === "vacant_clean"
        ? `Done — room ${row.room?.roomNumber ?? ""} is vacant clean`
        : cleared === "vacant_dirty"
          ? `Done — room ${row.room?.roomNumber ?? ""} is vacant dirty`
          : "Assignment completed",
  );
  return row;
}

export async function updateLodgingCmAssignmentApi(input: {
  id: number;
  assigneeName?: string;
  notes?: string;
  /** ISO datetime or null to clear */
  statusExpectedEndAt?: string | null;
}): Promise<LodgingCmAssignment> {
  const mutation = `
    mutation UpdateLodgingCmAssignment(
      $id: Int!
      $assigneeName: String
      $notes: String
      $statusExpectedEndAt: DateTime
    ) {
      updateLodgingCmAssignment(
        id: $id
        assigneeName: $assigneeName
        notes: $notes
        statusExpectedEndAt: $statusExpectedEndAt
      ) { ${CM_ASSIGNMENT_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      id: input.id,
      assigneeName: input.assigneeName ?? null,
      notes: input.notes ?? null,
      statusExpectedEndAt:
        input.statusExpectedEndAt === undefined
          ? null
          : input.statusExpectedEndAt,
    },
  });
  gqlError(response, "Could not update assignment");
  invalidateLodgingCaches(["cm", "rooms", "stats", "logs"]);
  toast.success("Assignment updated");
  return response.data.data.updateLodgingCmAssignment as LodgingCmAssignment;
}

/** Add/remove open assignees for a room's cleaning or maintenance job. */
export async function syncLodgingCmOpenAssigneesApi(input: {
  roomId: number;
  workKind: "cleaning" | "maintenance" | string;
  assigneeNames: string[];
  notes?: string;
  /** ISO datetime or null to clear */
  statusExpectedEndAt?: string | null;
}): Promise<LodgingCmAssignment[]> {
  const names = [
    ...new Set(
      (input.assigneeNames || [])
        .map((n) => String(n ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (names.length === 0) {
    throw new Error("At least one assignee is required");
  }
  const mutation = `
    mutation SyncLodgingCmOpenAssignees(
      $roomId: Int!
      $workKind: String!
      $assigneeNames: [String!]!
      $notes: String
      $statusExpectedEndAt: DateTime
    ) {
      syncLodgingCmOpenAssignees(
        roomId: $roomId
        workKind: $workKind
        assigneeNames: $assigneeNames
        notes: $notes
        statusExpectedEndAt: $statusExpectedEndAt
      ) { ${CM_ASSIGNMENT_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      roomId: input.roomId,
      workKind: input.workKind,
      assigneeNames: names,
      notes: input.notes ?? null,
      statusExpectedEndAt:
        input.statusExpectedEndAt === undefined
          ? null
          : input.statusExpectedEndAt,
    },
  });
  gqlError(response, "Could not update assignees");
  invalidateLodgingCaches(["cm", "rooms", "stats", "logs"]);
  toast.success("Assignees updated");
  return (response.data.data.syncLodgingCmOpenAssignees ??
    []) as LodgingCmAssignment[];
}

/* ── Reservations, transfer, tax, night audit, search ─────────────────── */

export async function fetchLodgingSearch(query: string): Promise<LodgingStay[]> {
  const q = String(query || "").trim();
  if (!q) return [];
  const gql = `
    query LodgingSearch($query: String!) {
      lodgingSearch(query: $query) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: gql,
    variables: { query: q },
  });
  gqlError(response, "Search failed");
  return (response.data.data?.lodgingSearch ?? []) as LodgingStay[];
}

export async function fetchLodgingHoldableRooms(
  arrivalAt: string,
): Promise<LodgingRoom[]> {
  const gql = `
    query LodgingHoldableRooms($arrivalAt: DateTime!) {
      lodgingHoldableRooms(arrivalAt: $arrivalAt) { ${ROOM_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: gql,
    variables: { arrivalAt },
  });
  gqlError(response, "Failed to load holdable rooms");
  return (response.data.data?.lodgingHoldableRooms ?? []) as LodgingRoom[];
}

export async function fetchLodgingReservations(opts?: {
  status?: string;
  from?: string;
  to?: string;
}): Promise<LodgingReservation[]> {
  const gql = `
    query LodgingReservations($status: String, $from: DateTime, $to: DateTime) {
      lodgingReservations(status: $status, from: $from, to: $to) { ${RESERVATION_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: gql,
    variables: {
      status: opts?.status ?? null,
      from: opts?.from ?? null,
      to: opts?.to ?? null,
    },
  });
  gqlError(response, "Failed to load reservations");
  return (response.data.data?.lodgingReservations ?? []) as LodgingReservation[];
}

export async function createLodgingReservationApi(input: {
  guestId?: number;
  guest?: UpsertLodgingGuestInput;
  source: string;
  status?: string;
  arrivalAt: string;
  nights: number;
  adults?: number;
  children?: number;
  preferredRoomType?: string;
  roomIds?: number[];
  depositETB?: number;
  depositPaymentMethod?: string;
  isCompany?: boolean;
  companyName?: string;
  companyTin?: string;
  notes?: string;
}): Promise<LodgingReservation> {
  const mutation = `
    mutation CreateLodgingReservation(
      $guestId: Int
      $guestJson: JSON
      $source: String!
      $status: String
      $arrivalAt: DateTime!
      $nights: Int!
      $adults: Int
      $children: Int
      $preferredRoomType: String
      $roomIds: [Int!]
      $depositETB: Float
      $depositPaymentMethod: String
      $isCompany: Boolean
      $companyName: String
      $companyTin: String
      $notes: String
    ) {
      createLodgingReservation(
        guestId: $guestId
        guestJson: $guestJson
        source: $source
        status: $status
        arrivalAt: $arrivalAt
        nights: $nights
        adults: $adults
        children: $children
        preferredRoomType: $preferredRoomType
        roomIds: $roomIds
        depositETB: $depositETB
        depositPaymentMethod: $depositPaymentMethod
        isCompany: $isCompany
        companyName: $companyName
        companyTin: $companyTin
        notes: $notes
      ) { ${RESERVATION_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      guestId: input.guestId ?? null,
      guestJson: input.guest ?? null,
      source: input.source,
      status: input.status ?? null,
      arrivalAt: input.arrivalAt,
      nights: input.nights,
      adults: input.adults ?? null,
      children: input.children ?? null,
      preferredRoomType: input.preferredRoomType ?? null,
      roomIds: input.roomIds ?? null,
      depositETB: input.depositETB ?? null,
      depositPaymentMethod: input.depositPaymentMethod ?? null,
      isCompany: input.isCompany ?? null,
      companyName: input.companyName ?? null,
      companyTin: input.companyTin ?? null,
      notes: input.notes ?? null,
    },
  });
  gqlError(response, "Could not create reservation");
  invalidateLodgingCaches(["rooms", "stats", "logs"]);
  toast.success("Reservation saved");
  return response.data.data.createLodgingReservation as LodgingReservation;
}

export async function cancelLodgingReservationApi(
  id: number,
  asNoShow = false,
): Promise<LodgingReservation> {
  const mutation = `
    mutation CancelLodgingReservation($id: Int!, $asNoShow: Boolean) {
      cancelLodgingReservation(id: $id, asNoShow: $asNoShow) { ${RESERVATION_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, asNoShow },
  });
  gqlError(response, "Could not cancel reservation");
  invalidateLodgingCaches(["rooms", "stats", "logs"]);
  toast.success(asNoShow ? "Marked no-show" : "Reservation cancelled");
  return response.data.data.cancelLodgingReservation as LodgingReservation;
}

export async function checkInLodgingReservationApi(input: {
  reservationId: number;
  roomIds: number[];
  arrivalAt?: string;
  notes?: string;
}): Promise<LodgingStay> {
  const mutation = `
    mutation CheckInLodgingReservation(
      $reservationId: Int!
      $roomIds: [Int!]!
      $arrivalAt: DateTime
      $notes: String
    ) {
      checkInLodgingReservation(
        reservationId: $reservationId
        roomIds: $roomIds
        arrivalAt: $arrivalAt
        notes: $notes
      ) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      reservationId: input.reservationId,
      roomIds: input.roomIds,
      arrivalAt: input.arrivalAt ?? null,
      notes: input.notes ?? null,
    },
  });
  gqlError(response, "Could not check in from reservation");
  invalidateLodgingCaches(["stays", "rooms", "stats", "logs"]);
  toast.success("Checked in from reservation");
  return response.data.data.checkInLodgingReservation as LodgingStay;
}

export async function transferLodgingStayRoomApi(input: {
  stayId: number;
  fromRoomId: number;
  toRoomId: number;
  reason?: string;
  markOldOnMaintenance?: boolean;
  maintenanceUntil?: string | null;
}): Promise<LodgingStay> {
  const mutation = `
    mutation TransferLodgingStayRoom(
      $stayId: Int!
      $fromRoomId: Int!
      $toRoomId: Int!
      $reason: String
      $markOldOnMaintenance: Boolean
      $maintenanceUntil: DateTime
    ) {
      transferLodgingStayRoom(
        stayId: $stayId
        fromRoomId: $fromRoomId
        toRoomId: $toRoomId
        reason: $reason
        markOldOnMaintenance: $markOldOnMaintenance
        maintenanceUntil: $maintenanceUntil
      ) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      stayId: input.stayId,
      fromRoomId: input.fromRoomId,
      toRoomId: input.toRoomId,
      reason: input.reason ?? null,
      markOldOnMaintenance: input.markOldOnMaintenance ?? false,
      maintenanceUntil: input.maintenanceUntil ?? null,
    },
  });
  gqlError(response, "Could not transfer room");
  invalidateLodgingCaches(["stays", "rooms", "stats", "logs"]);
  toast.success("Guest transferred");
  return response.data.data.transferLodgingStayRoom as LodgingStay;
}

export async function voidLodgingBillLineApi(
  lineId: number,
  reason: string,
): Promise<void> {
  const mutation = `
    mutation VoidLodgingBillLine($lineId: Int!, $reason: String!) {
      voidLodgingBillLine(lineId: $lineId, reason: $reason) { id voided }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { lineId, reason },
  });
  gqlError(response, "Could not void line");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success("Charge voided");
}

export async function requestLodgingDiscountApi(input: {
  stayId: number;
  amountETB: number;
  reason: string;
}): Promise<LodgingBillLine> {
  const mutation = `
    mutation RequestLodgingDiscount(
      $stayId: Int!
      $amountETB: Float!
      $reason: String!
    ) {
      requestLodgingDiscount(
        stayId: $stayId
        amountETB: $amountETB
        reason: $reason
      ) {
        id
        kind
        amountETB
        unitPriceETB
        approvalStatus
        description
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      stayId: input.stayId,
      amountETB: input.amountETB,
      reason: input.reason,
    },
  });
  gqlError(response, "Could not request discount");
  invalidateLodgingCaches(["stays", "logs"]);
  const line = response.data.data.requestLodgingDiscount as LodgingBillLine;
  toast.success(
    String(line.approvalStatus || "").toLowerCase() === "approved"
      ? "Discount applied"
      : "Discount sent for manager approval",
  );
  return line;
}

export async function fetchPendingLodgingDiscounts(): Promise<
  (LodgingBillLine & { billId?: number })[]
> {
  const query = `
    query {
      pendingLodgingDiscounts {
        id
        billId
        kind
        description
        quantity
        unitPriceETB
        amountETB
        roomNumber
        approvalStatus
        createdAt
        createdBy
      }
    }
  `;
  const response = await api.post(API_URL, { query });
  gqlError(response, "Failed to load pending discounts");
  return (response.data.data?.pendingLodgingDiscounts ??
    []) as LodgingBillLine[];
}

export async function resolveLodgingDiscountApi(input: {
  lineId: number;
  approve: boolean;
  note?: string;
}): Promise<void> {
  const mutation = `
    mutation ResolveLodgingDiscount(
      $lineId: Int!
      $approve: Boolean!
      $note: String
    ) {
      resolveLodgingDiscount(
        lineId: $lineId
        approve: $approve
        note: $note
      ) {
        id
        approvalStatus
        amountETB
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lineId: input.lineId,
      approve: input.approve,
      note: input.note ?? null,
    },
  });
  gqlError(response, "Could not resolve discount");
  invalidateLodgingCaches(["stays", "logs"]);
  toast.success(input.approve ? "Discount approved" : "Discount rejected");
}

export async function fetchLodgingTaxConfigs(): Promise<LodgingTaxConfig[]> {
  const query = `query { lodgingTaxConfigs { id kind taxPercent } }`;
  const response = await api.post(API_URL, { query });
  gqlError(response, "Failed to load tax config");
  return (response.data.data?.lodgingTaxConfigs ?? []) as LodgingTaxConfig[];
}

export async function upsertLodgingTaxConfigApi(
  kind: string,
  taxPercent: number,
): Promise<LodgingTaxConfig> {
  const mutation = `
    mutation UpsertLodgingTaxConfig($kind: String!, $taxPercent: Float!) {
      upsertLodgingTaxConfig(kind: $kind, taxPercent: $taxPercent) {
        id kind taxPercent
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { kind, taxPercent },
  });
  gqlError(response, "Could not save tax config");
  toast.success("Tax updated");
  return response.data.data.upsertLodgingTaxConfig as LodgingTaxConfig;
}

export async function closeLodgingBusinessDayApi(input: {
  businessDate?: string;
  fromAt: string;
  toAt: string;
  label?: string;
  id?: number;
}): Promise<LodgingBusinessDay> {
  const mutation = `
    mutation CloseLodgingBusinessDay(
      $businessDate: String
      $fromAt: DateTime!
      $toAt: DateTime!
      $label: String
      $id: Int
    ) {
      closeLodgingBusinessDay(
        businessDate: $businessDate
        fromAt: $fromAt
        toAt: $toAt
        label: $label
        id: $id
      ) {
        id businessDate label fromAt toAt status closedAt closedBy summaryJson
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      businessDate: input.businessDate ?? null,
      fromAt: input.fromAt,
      toAt: input.toAt,
      label: input.label ?? null,
      id: input.id ?? null,
    },
  });
  gqlError(response, "Could not close business day");
  invalidateLodgingCaches(["stats", "logs"]);
  toast.success("Business day closed");
  return response.data.data.closeLodgingBusinessDay as LodgingBusinessDay;
}

export async function fetchLodgingBusinessDays(
  limit = 30,
): Promise<LodgingBusinessDay[]> {
  const query = `
    query LodgingBusinessDays($limit: Int) {
      lodgingBusinessDays(limit: $limit) {
        id businessDate label fromAt toAt status closedAt closedBy summaryJson
      }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { limit },
  });
  gqlError(response, "Failed to load business days");
  return (response.data.data?.lodgingBusinessDays ??
    []) as LodgingBusinessDay[];
}

export async function voidLodgingBillApi(
  billId: number,
  reason: string,
): Promise<LodgingBill> {
  const mutation = `
    mutation VoidLodgingBill($billId: Int!, $reason: String!) {
      voidLodgingBill(billId: $billId, reason: $reason) {
        id status totalETB
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { billId, reason },
  });
  gqlError(response, "Could not void bill");
  invalidateLodgingCaches(["stays", "stats", "logs"]);
  toast.success("Bill voided");
  return response.data.data.voidLodgingBill as LodgingBill;
}

export async function voidLodgingRoomChargesApi(
  stayId: number,
  roomNumber: string,
  reason: string,
): Promise<LodgingStay> {
  const mutation = `
    mutation VoidLodgingRoomCharges(
      $stayId: Int!
      $roomNumber: String!
      $reason: String!
    ) {
      voidLodgingRoomCharges(
        stayId: $stayId
        roomNumber: $roomNumber
        reason: $reason
      ) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { stayId, roomNumber, reason },
  });
  gqlError(response, "Could not void room charges");
  invalidateLodgingCaches(["stays", "stats", "logs"]);
  toast.success("Room charges voided");
  return response.data.data.voidLodgingRoomCharges as LodgingStay;
}

export async function openLodgingBusinessDayApi(input: {
  fromAt: string;
  toAt: string;
  label?: string;
  businessDate?: string;
}): Promise<LodgingBusinessDay> {
  const mutation = `
    mutation OpenLodgingBusinessDay(
      $fromAt: DateTime!
      $toAt: DateTime!
      $label: String
      $businessDate: String
    ) {
      openLodgingBusinessDay(
        fromAt: $fromAt
        toAt: $toAt
        label: $label
        businessDate: $businessDate
      ) {
        id businessDate label fromAt toAt status closedAt closedBy summaryJson
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      fromAt: input.fromAt,
      toAt: input.toAt,
      label: input.label ?? null,
      businessDate: input.businessDate ?? null,
    },
  });
  gqlError(response, "Could not open business day");
  invalidateLodgingCaches(["stats", "logs"]);
  toast.success("Business day / shift opened");
  return response.data.data.openLodgingBusinessDay as LodgingBusinessDay;
}

export async function fetchLodgingBusinessDay(
  businessDate?: string,
): Promise<LodgingBusinessDay | null> {
  const query = `
    query LodgingBusinessDay($businessDate: String) {
      lodgingBusinessDay(businessDate: $businessDate) {
        id businessDate label fromAt toAt status closedAt closedBy summaryJson
      }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { businessDate: businessDate ?? null },
  });
  gqlError(response, "Failed to load business day");
  return (response.data.data?.lodgingBusinessDay ?? null) as LodgingBusinessDay | null;
}

export async function fetchLodgingGuestComplaints(
  status?: string,
): Promise<LodgingGuestComplaint[]> {
  const query = `
    query LodgingGuestComplaints($status: String) {
      lodgingGuestComplaints(status: $status, limit: 100) {
        id
        stayId
        guestId
        roomId
        roomNumber
        category
        message
        status
        isCritical
        createdAt
        guestName
        voucherCode
        roomNumbers
      }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { status: status ?? null },
  });
  gqlError(response, "Failed to load complaints");
  return (response.data.data?.lodgingGuestComplaints ??
    []) as LodgingGuestComplaint[];
}

export async function updateLodgingGuestComplaintApi(
  id: number,
  status: string,
): Promise<LodgingGuestComplaint> {
  const mutation = `
    mutation UpdateLodgingGuestComplaint($id: Int!, $status: String!) {
      updateLodgingGuestComplaint(id: $id, status: $status) {
        id
        status
        guestName
        voucherCode
        roomNumbers
        category
        message
        createdAt
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, status },
  });
  gqlError(response, "Could not update complaint");
  invalidateLodgingCaches(["logs"]);
  toast.success(
    status === "resolved"
      ? "Complaint resolved"
      : status === "acknowledged"
        ? "Complaint acknowledged"
        : "Complaint updated",
  );
  return response.data.data
    .updateLodgingGuestComplaint as LodgingGuestComplaint;
}

export async function fetchLodgingGuestRatings(): Promise<LodgingGuestRating[]> {
  const query = `
    query {
      lodgingGuestRatings(limit: 100) {
        id
        stayId
        guestId
        overall
        cleanliness
        service
        comment
        createdAt
        guestName
        voucherCode
        roomNumbers
      }
    }
  `;
  const response = await api.post(API_URL, { query });
  gqlError(response, "Failed to load ratings");
  return (response.data.data?.lodgingGuestRatings ??
    []) as LodgingGuestRating[];
}

export type LodgingRatePlan = {
  id: number;
  name: string;
  code: string;
  kind: string;
  roomType: string;
  pricePerNightETB: number;
  startDate: string;
  endDate: string;
  minNights: number;
  priority: number;
  isActive: boolean;
  notes: string;
};

export type LodgingPerformanceReport = {
  fromDate: string;
  toDate: string;
  roomNightsSold: number;
  availableRoomNights: number;
  occupancyPercent: number;
  roomRevenueETB: number;
  adrETB: number;
  revparETB: number;
  staysCheckedOut: number;
  staysInHouse: number;
  byRoomType: {
    roomType: string;
    roomNightsSold: number;
    roomRevenueETB: number;
    adrETB: number;
  }[];
  bySource: {
    source: string;
    stays: number;
    roomRevenueETB: number;
  }[];
};

const RATE_PLAN_FIELDS = `
  id name code kind roomType pricePerNightETB
  startDate endDate minNights priority isActive notes
`;

export async function fetchLodgingRatePlans(
  activeOnly = false,
): Promise<LodgingRatePlan[]> {
  const query = `
    query LodgingRatePlans($activeOnly: Boolean) {
      lodgingRatePlans(activeOnly: $activeOnly) { ${RATE_PLAN_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { activeOnly },
  });
  gqlError(response, "Failed to load rate plans");
  return (response.data.data?.lodgingRatePlans ?? []) as LodgingRatePlan[];
}

export async function createLodgingRatePlanApi(input: {
  name: string;
  code?: string;
  kind: string;
  roomType?: string;
  pricePerNightETB: number;
  startDate?: string;
  endDate?: string;
  minNights?: number;
  priority?: number;
  isActive?: boolean;
  notes?: string;
}): Promise<LodgingRatePlan> {
  const mutation = `
    mutation CreateLodgingRatePlan(
      $name: String!
      $code: String
      $kind: String!
      $roomType: String
      $pricePerNightETB: Float!
      $startDate: String
      $endDate: String
      $minNights: Int
      $priority: Int
      $isActive: Boolean
      $notes: String
    ) {
      createLodgingRatePlan(
        name: $name
        code: $code
        kind: $kind
        roomType: $roomType
        pricePerNightETB: $pricePerNightETB
        startDate: $startDate
        endDate: $endDate
        minNights: $minNights
        priority: $priority
        isActive: $isActive
        notes: $notes
      ) { ${RATE_PLAN_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      name: input.name,
      code: input.code ?? null,
      kind: input.kind,
      roomType: input.roomType ?? null,
      pricePerNightETB: input.pricePerNightETB,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      minNights: input.minNights ?? null,
      priority: input.priority ?? null,
      isActive: input.isActive ?? true,
      notes: input.notes ?? null,
    },
  });
  gqlError(response, "Could not create rate plan");
  invalidateLodgingCaches(["logs"]);
  toast.success("Rate plan created");
  return response.data.data.createLodgingRatePlan as LodgingRatePlan;
}

export async function updateLodgingRatePlanApi(
  input: Partial<LodgingRatePlan> & { id: number },
): Promise<LodgingRatePlan> {
  const mutation = `
    mutation UpdateLodgingRatePlan(
      $id: Int!
      $name: String
      $code: String
      $kind: String
      $roomType: String
      $pricePerNightETB: Float
      $startDate: String
      $endDate: String
      $minNights: Int
      $priority: Int
      $isActive: Boolean
      $notes: String
    ) {
      updateLodgingRatePlan(
        id: $id
        name: $name
        code: $code
        kind: $kind
        roomType: $roomType
        pricePerNightETB: $pricePerNightETB
        startDate: $startDate
        endDate: $endDate
        minNights: $minNights
        priority: $priority
        isActive: $isActive
        notes: $notes
      ) { ${RATE_PLAN_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      id: input.id,
      name: input.name ?? null,
      code: input.code ?? null,
      kind: input.kind ?? null,
      roomType: input.roomType ?? null,
      pricePerNightETB: input.pricePerNightETB ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      minNights: input.minNights ?? null,
      priority: input.priority ?? null,
      isActive: input.isActive ?? null,
      notes: input.notes ?? null,
    },
  });
  gqlError(response, "Could not update rate plan");
  invalidateLodgingCaches(["logs"]);
  toast.success("Rate plan updated");
  return response.data.data.updateLodgingRatePlan as LodgingRatePlan;
}

export async function deleteLodgingRatePlanApi(id: number): Promise<void> {
  const mutation = `
    mutation DeleteLodgingRatePlan($id: Int!) {
      deleteLodgingRatePlan(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  gqlError(response, "Could not delete rate plan");
  invalidateLodgingCaches(["logs"]);
  toast.success("Rate plan deleted");
}

export async function fetchLodgingPerformanceReport(
  fromDate: string,
  toDate: string,
): Promise<LodgingPerformanceReport> {
  const query = `
    query LodgingPerformanceReport($fromDate: String!, $toDate: String!) {
      lodgingPerformanceReport(fromDate: $fromDate, toDate: $toDate) {
        fromDate
        toDate
        roomNightsSold
        availableRoomNights
        occupancyPercent
        roomRevenueETB
        adrETB
        revparETB
        staysCheckedOut
        staysInHouse
        byRoomType { roomType roomNightsSold roomRevenueETB adrETB }
        bySource { source stays roomRevenueETB }
      }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { fromDate, toDate },
  });
  gqlError(response, "Failed to load performance report");
  return response.data.data
    .lodgingPerformanceReport as LodgingPerformanceReport;
}
