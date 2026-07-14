/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchWaiters,
  fetchTables,
  Waiter,
  Table,
  OrderCreationData,
  Order,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  buildTableSelectOptions,
  CAFE_TABLE_UNSELECTED,
  occupiedTableNumbersFromOrders,
} from "@/lib/cafeTableOrder";
import { orderDetailsSchema } from "@/lib/validations";
import { PendingButton } from "@/components/ui/pending-button";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import CustomFormField, { formFieldTypes } from "./customFormField";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

const tableOrderSchema = orderDetailsSchema.extend({
  orderAmount: z.number().min(1),
});

const roomOrderSchema = z.object({
  tableNo: z.number().int().positive("Please select a room"),
  waiterName: z.string().min(1, "Please select a waiter"),
  orderAmount: z.number().min(1, "Order amount must be at least 1"),
});

interface OrderDetailsModalProps {
  item: {
    name: string;
    price: number;
    imageUrl: string;
    category: string;
    type: string;
  };
  isOpen: boolean;
  onClose: () => void;
  hotelName: string;
  openOrders?: Order[];
  onSubmit: (data: OrderCreationData) => Promise<unknown>;
  /** When set, "Table" becomes "Room" and these options replace café tables (value = stay id). */
  roomOptions?: { id: number; name: string; realValue: number }[];
}

export default function OrderDetailsModal({
  item,
  isOpen,
  onClose,
  hotelName,
  openOrders = [],
  onSubmit,
  roomOptions,
}: OrderDetailsModalProps) {
  const roomMode = roomOptions != null;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    waiters: [] as Waiter[],
    tables: [] as Table[],
  });

  const form = useForm<z.infer<typeof tableOrderSchema>>({
    resolver: zodResolver(roomMode ? roomOrderSchema : tableOrderSchema) as never,
    defaultValues: {
      tableNo: CAFE_TABLE_UNSELECTED,
      waiterName: "",
      orderAmount: 1,
    },
  });

  useEffect(() => {
    if (isOpen && item) {
      (async () => {
        const [w, t] = await Promise.all([
          fetchWaiters(),
          roomMode ? Promise.resolve([] as Table[]) : fetchTables(),
        ]);
        setData({
          waiters: w.filter((x) =>
            rowHotelMatchesTenantScope(x.HotelName, hotelName),
          ),
          tables: t.filter((x) =>
            rowHotelMatchesTenantScope(x.HotelName, hotelName),
          ),
        });
        form.reset({
          tableNo: CAFE_TABLE_UNSELECTED,
          waiterName: "",
          orderAmount: 1,
        });
      })();
    }
  }, [isOpen, roomMode]);

  const occupiedTables = useMemo(
    () => occupiedTableNumbersFromOrders(openOrders, hotelName),
    [openOrders, hotelName],
  );

  const tableSelectOptions = useMemo(
    () => buildTableSelectOptions(data.tables, occupiedTables),
    [data.tables, occupiedTables],
  );

  const anchorOptions = roomMode ? roomOptions ?? [] : tableSelectOptions;

  const onValidSubmit = async (values: z.infer<typeof tableOrderSchema>) => {
    setLoading(true);
    try {
      const fullOrderData: OrderCreationData = {
        title: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category,
        type: item.type,
        orderAmount: values.orderAmount,
        tableNo: values.tableNo,
        waiterName: values.waiterName,
        HotelName: hotelName,
      };

      await onSubmit(fullOrderData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Customize Order</DialogTitle>
        </DialogHeader>
        {item && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onValidSubmit)}
              className="space-y-5"
            >
              <div className="flex gap-4 items-center bg-muted/30 p-3 rounded-lg border">
                <div className="h-16 w-16 relative rounded-md overflow-hidden shrink-0">
                  <Image
                    src={item.imageUrl || "/placeholder.jpg"}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-primary font-semibold">
                    {item.price.toFixed(2)} ETB
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 items-center">
                <CustomFormField
                  control={form.control}
                  name="tableNo"
                  fieldType={formFieldTypes.SELECT}
                  label={roomMode ? "Room" : "Table"}
                  placeholder="Select"
                  listdisplay={anchorOptions}
                  isNumeric={true}
                />
                <CustomFormField
                  control={form.control}
                  name="waiterName"
                  fieldType={formFieldTypes.SELECT}
                  label="Waiter"
                  placeholder="Select"
                  listdisplay={data.waiters}
                />
              </div>
              <CustomFormField
                control={form.control}
                name="orderAmount"
                fieldType={formFieldTypes.INPUT}
                type="number"
                label="Quantity"
                inputClassName="h-fit p-2 w-75"
              />
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total Amount:</span>
                <span className="text-lg text-primary">
                  {(item.price * (form.watch("orderAmount") || 1)).toFixed(2)}{" "}
                  ETB
                </span>
              </div>

              <DialogFooter>
                <PendingButton type="submit" className="w-full" pending={loading}>
                  {loading ? "Processing…" : "Confirm Order"}
                </PendingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
