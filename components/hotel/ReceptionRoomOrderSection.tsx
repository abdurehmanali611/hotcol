"use client";

import { useMemo, useState } from "react";
import OrderComponent from "@/components/Order";
import OrderDetailsModal from "@/components/orderDetailsModal";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createBatchOrders,
  notifyApiFailure,
  type Item,
  type OrderCreationData,
} from "@/lib/actions";
import {
  addLodgingBillLineApi,
  type LodgingServiceItem,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import {
  roomServiceCaption,
  roomServiceTableNo,
  withCafeOrderMarker,
} from "@/lib/lodgingRoomService";
import { toast } from "sonner";

const PLACEHOLDER_IMG = "/placeholder-food.jpg";

function stayRoomOptions(stays: LodgingStay[]) {
  return stays.map((s) => {
    const rooms = s.rooms
      .map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ");
    const guest = s.guest
      ? `${s.guest.firstName} ${s.guest.lastName}`.trim()
      : "Guest";
    const label = rooms
      ? `Rm ${rooms} · ${guest} · ${s.voucherCode}`
      : `${guest} · ${s.voucherCode}`;
    return { id: s.id, name: label, realValue: s.id };
  });
}

function roomNumberForStay(stay: LodgingStay | undefined) {
  if (!stay) return "";
  return (
    stay.rooms
      .map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || ""
  );
}

export function laundryItemsAsMenuItems(
  laundry: LodgingServiceItem[],
  hotelName: string,
): Item[] {
  return laundry
    .filter((i) => i.isActive !== false && i.kind === "laundry")
    .map((i) => ({
      id: i.id,
      name: i.name,
      price: Number(i.unitPriceETB) || 0,
      HotelName: hotelName,
      category: "others",
      type: i.unitLabel || "laundry",
      imageUrl: String(i.imageUrl || "").trim() || PLACEHOLDER_IMG,
      createdAt: new Date(),
    }));
}

export function ReceptionRoomOrderSection({
  mode,
  items,
  stays,
  hotelName,
  onCompleted,
}: {
  mode: "food_drink" | "laundry";
  items: Item[];
  stays: LodgingStay[];
  hotelName: string;
  onCompleted: () => void | Promise<void>;
}) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const roomOptions = useMemo(() => stayRoomOptions(stays), [stays]);

  const chargeStay = async (
    stayId: number,
    waiterName: string,
    lines: { item: Item; qty: number }[],
  ) => {
    const stay = stays.find((s) => s.id === stayId);
    if (!stay) throw new Error("Stay not found");
    const roomNumber = roomNumberForStay(stay);

    // Food & drink: create café tickets first, then bill lines tagged with order id
    // so a kitchen/cashier cancel removes the matching stay charge.
    if (mode === "food_drink" && lines.length > 0) {
      const caption = roomServiceCaption(roomNumber);
      const tableNo = roomServiceTableNo(stayId);
      const created = await createBatchOrders(
        lines.map(({ item, qty }) => ({
          title: item.name,
          imageUrl: item.imageUrl || PLACEHOLDER_IMG,
          tableNo,
          orderAmount: qty,
          HotelName: hotelName,
          category: item.category || "food",
          type: item.type || "kitchen",
          price: item.price,
          waiterName: waiterName || "Reception",
          serviceCaption: caption,
        })),
        { silent: true },
      );
      for (let i = 0; i < lines.length; i++) {
        const { item, qty } = lines[i]!;
        const order = created[i];
        const base = waiterName
          ? `${item.name} · ${waiterName}`
          : item.name;
        await addLodgingBillLineApi({
          stayId,
          kind: "food_drink",
          description:
            order?.id != null
              ? withCafeOrderMarker(base, Number(order.id))
              : base,
          quantity: qty,
          unitPriceETB: item.price,
          roomNumber: roomNumber || undefined,
        });
      }
      return;
    }

    for (const { item, qty } of lines) {
      await addLodgingBillLineApi({
        stayId,
        kind: "laundry",
        description: waiterName
          ? `${item.name} · ${waiterName}`
          : item.name,
        quantity: qty,
        unitPriceETB: item.price,
        roomNumber: roomNumber || undefined,
      });
    }
  };

  if (stays.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No active stays</CardTitle>
          <CardDescription>
            Check a guest in before placing{" "}
            {mode === "laundry" ? "laundry" : "food & drink"} orders on a room.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No catalog items</CardTitle>
          <CardDescription>
            {mode === "laundry"
              ? "Add laundry items under Manager → Rooms → Laundry first."
              : "No café menu items available for this property."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <OrderComponent
        items={items}
        hotelName={hotelName}
        openOrders={[]}
        roomOptions={roomOptions}
        hideTypeFilters={mode === "laundry"}
        onItemSelect={setSelectedItem}
        onGoToPayment={() =>
          toast.message("Checkout and settlement are under Active stays")
        }
        onBatchOrderSuccess={() => void onCompleted()}
        onRoomBatchSubmit={async ({ stayId, waiterName, items: batch }) => {
          await chargeStay(
            stayId,
            waiterName,
            batch.map((item) => ({
              item,
              qty: item.orderAmount,
            })),
          );
          toast.success(
            mode === "laundry"
              ? "Laundry charged to room stay"
              : "Food & drink charged — sent to kitchen / bar for Room service",
          );
        }}
      />
      {selectedItem ? (
        <OrderDetailsModal
          item={selectedItem}
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          hotelName={hotelName}
          roomOptions={roomOptions}
          onSubmit={async (data: OrderCreationData) => {
            try {
              await chargeStay(Number(data.tableNo), data.waiterName, [
                {
                  item: selectedItem,
                  qty: data.orderAmount,
                },
              ]);
              toast.success(
                mode === "laundry"
                  ? "Laundry charged to room stay"
                  : "Charged to room — kitchen / bar notified",
              );
              await onCompleted();
            } catch (e) {
              notifyApiFailure(e, "Could not charge room");
              throw e;
            }
          }}
        />
      ) : null}
    </>
  );
}
