"use client";

import { useCallback, useMemo } from "react";
import { CafeCashierOrderUpdatePanel } from "@/components/cafe/CafeCashierOrderUpdatePanel";
import { ReceptionRoomOrderSection } from "@/components/hotel/ReceptionRoomOrderSection";
import { notifyApiFailure } from "@/lib/actions";
import type { Item, Order } from "@/lib/api/types";
import {
  deleteLodgingBillLineApi,
  setLodgingBillLineFulfillmentApi,
  updateLodgingBillLineApi,
  type LodgingBillLine,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import {
  isRoomServiceTableNo,
  roomServiceCaption,
  roomServiceTableNo,
  stripCafeOrderMarker,
} from "@/lib/lodgingRoomService";

function guestName(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "Guest";
  return `${g.firstName} ${g.lastName}`.trim() || "Guest";
}

function stayRooms(stay: LodgingStay) {
  return stay.rooms
    .map((r) => r.room?.roomNumber)
    .filter(Boolean)
    .join(", ");
}

function stayCaption(stay: LodgingStay) {
  const rooms = stayRooms(stay);
  const guest = guestName(stay);
  return rooms ? `Rm ${rooms} · ${guest}` : guest;
}

function laundryLinesForStay(stay: LodgingStay): LodgingBillLine[] {
  return (stay.bill?.lines ?? []).filter((l) => {
    if (l.kind !== "laundry") return false;
    const st = String(l.fulfillmentStatus || "pending").toLowerCase();
    return st !== "cancelled";
  });
}

function displayFulfillmentStatus(raw: string | undefined): string {
  const s = String(raw || "pending").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return "Pending";
}

function laundryLineAsOrder(
  stay: LodgingStay,
  line: LodgingBillLine,
  hotelName: string,
): Order {
  const rooms = stayRooms(stay);
  return {
    id: line.id,
    title: stripCafeOrderMarker(String(line.description || "Laundry")),
    imageUrl: "/placeholder-food.jpg",
    orderAmount: Math.max(1, Number(line.quantity) || 1),
    category: "others",
    type: "laundry",
    HotelName: hotelName,
    price: Number(line.unitPriceETB) || 0,
    tableNo: roomServiceTableNo(stay.id),
    waiterName: "Reception",
    status: displayFulfillmentStatus(line.fulfillmentStatus),
    payment: "Pending",
    serviceCaption: roomServiceCaption(rooms),
    createdAt: new Date(),
  };
}

export function ReceptionLodgingServiceUpdatePanel({
  mode,
  stays,
  menuItems,
  hotelName,
  cafeOrders = [],
  onRefresh,
}: {
  mode: "food_drink" | "laundry";
  stays: LodgingStay[];
  menuItems: Item[];
  hotelName: string;
  cafeOrders?: Order[];
  onRefresh: () => void | Promise<void>;
}) {
  const activeStays = useMemo(
    () => stays.filter((s) => String(s.status || "").toLowerCase() !== "checked_out"),
    [stays],
  );

  const tableCaptionOverrides = useMemo(() => {
    const map: Record<number, string> = {};
    for (const stay of activeStays) {
      map[roomServiceTableNo(stay.id)] = stayCaption(stay);
    }
    return map;
  }, [activeStays]);

  const restrictTableNos = useMemo(
    () => activeStays.map((s) => roomServiceTableNo(s.id)),
    [activeStays],
  );

  const fnbOrders = useMemo(() => {
    if (mode !== "food_drink") return [];
    const allowed = new Set(restrictTableNos);
    return cafeOrders.filter((o) => {
      const tableNo = Math.floor(Number(o.tableNo) || 0);
      if (!isRoomServiceTableNo(tableNo) || !allowed.has(tableNo)) return false;
      if (String(o.status || "").toLowerCase() === "cancelled") return false;
      return true;
    });
  }, [mode, cafeOrders, restrictTableNos]);

  const laundryOrders = useMemo(() => {
    if (mode !== "laundry") return [];
    const out: Order[] = [];
    for (const stay of activeStays) {
      for (const line of laundryLinesForStay(stay)) {
        out.push(laundryLineAsOrder(stay, line, hotelName));
      }
    }
    return out;
  }, [mode, activeStays, hotelName]);

  const lineStayById = useMemo(() => {
    const map = new Map<number, LodgingStay>();
    for (const stay of activeStays) {
      for (const line of laundryLinesForStay(stay)) {
        map.set(line.id, stay);
      }
    }
    return map;
  }, [activeStays]);

  const lodgingLineHandlers = useMemo(
    () =>
      mode === "laundry"
        ? {
            onUpdate: async (input: {
              id: number;
              orderAmount: number;
              title: string;
            }) => {
              const stay = lineStayById.get(input.id);
              if (!stay) {
                throw new Error("Stay not found for this laundry line");
              }
              await updateLodgingBillLineApi({
                lineId: input.id,
                quantity: input.orderAmount,
                stayId: stay.id,
              });
            },
            onRemove: async (id: number) => {
              const stay = lineStayById.get(id);
              if (!stay) {
                throw new Error("Stay not found for this laundry line");
              }
              await deleteLodgingBillLineApi({ lineId: id, stayId: stay.id });
            },
            onComplete: async (id: number) => {
              const stay = lineStayById.get(id);
              if (!stay) {
                throw new Error("Stay not found for this laundry line");
              }
              await setLodgingBillLineFulfillmentApi({
                lineId: id,
                status: "completed",
                stayId: stay.id,
              });
            },
          }
        : undefined,
    [mode, lineStayById],
  );

  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, "Could not refresh");
    }
  }, [onRefresh]);

  const orders = mode === "laundry" ? laundryOrders : fnbOrders;

  return (
    <CafeCashierOrderUpdatePanel
      orders={orders}
      items={menuItems}
      hotelName={hotelName}
      onRefresh={handleRefresh}
      restrictTableNos={restrictTableNos}
      tableCaptionOverrides={tableCaptionOverrides}
      groupingNoun="room"
      lodgingLineHandlers={lodgingLineHandlers}
      customAddItems={
        <ReceptionRoomOrderSection
          mode={mode}
          items={menuItems}
          stays={activeStays}
          hotelName={hotelName}
          onCompleted={handleRefresh}
        />
      }
    />
  );
}
