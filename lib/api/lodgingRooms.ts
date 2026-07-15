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
  roomNumber: string;
};

export type LodgingBill = {
  id: number;
  status: string;
  totalETB: number;
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
  voucherCode: string;
  guestId: number;
  status: string;
  arrivalAt: string;
  departureAt: string;
  nights: number;
  adults: number;
  children: number;
  preferredRoomType: string;
  notes: string;
  guest: LodgingGuest | null;
  rooms: LodgingStayRoom[];
  bill: LodgingBill | null;
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
  room: { roomNumber: string; status: string } | null;
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
  activeStays: number;
  openCmAssignments: number;
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
};

export type UpdateLodgingStayInput = {
  id: number;
  arrivalAt?: string;
  departureAt?: string;
  nights?: number;
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
  voucherCode
  guestId
  status
  arrivalAt
  departureAt
  nights
  adults
  children
  preferredRoomType
  notes
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
    receiptNumber
    lines {
      id
      kind
      description
      quantity
      unitPriceETB
      amountETB
      roomNumber
    }
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
  room { roomNumber status }
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
          activeStays
          openCmAssignments
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
      activeStays: 0,
      openCmAssignments: 0,
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
      status: input.status ?? null,
    },
  });
  gqlError(response, "Could not check in guest");
  invalidateLodgingCaches(["stays", "rooms", "stats", "logs", "guests"]);
  toast.success("Check-in complete");
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
  if (!input.silent) toast.success("Line removed");
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
): Promise<LodgingStay> {
  const mutation = `
    mutation CheckoutLodgingStay($stayId: Int!, $departureAt: DateTime!) {
      checkoutLodgingStay(stayId: $stayId, departureAt: $departureAt) { ${STAY_FIELDS} }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { stayId, departureAt },
  });
  gqlError(response, "Could not check out");
  invalidateLodgingCaches(["stays", "rooms", "stats", "logs"]);
  toast.success("Checkout complete");
  return response.data.data.checkoutLodgingStay as LodgingStay;
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
): Promise<LodgingRoom> {
  const mutation = `
    mutation UpdateLodgingRoomStatus(
      $roomId: Int!
      $status: String!
      $maintenanceUntil: DateTime
      $notes: String
    ) {
      updateLodgingRoomStatus(
        roomId: $roomId
        status: $status
        maintenanceUntil: $maintenanceUntil
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
    ) {
      createLodgingCmAssignments(
        roomId: $roomId
        workKind: $workKind
        assigneeNames: $assigneeNames
        notes: $notes
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
  const cleared =
    String(row?.room?.status || "").toLowerCase() === "vacant_clean";
  toast.success(
    cleared
      ? `Done — room ${row.room?.roomNumber ?? ""} is vacant clean`
      : "Assignment completed",
  );
  return row;
}
