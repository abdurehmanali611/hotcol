/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchWaiters,
  fetchTables,
  Waiter,
  Table,
  OrderCreationData,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
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

const orderSchema = z.object({
  tableNo: z.number().min(1, "Required"),
  waiterName: z.string().min(1, "Required"),
  orderAmount: z.number().min(1),
});

export default function OrderDetailsModal({
  item,
  isOpen,
  onClose,
  hotelName, 
  onSubmit,
}: any) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    waiters: [] as Waiter[],
    tables: [] as Table[]
  });

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: { tableNo: 0, waiterName: "", orderAmount: 1 },
  });

  useEffect(() => {
    if (isOpen && item) {
      (async () => {
        const [w, t] = await Promise.all([fetchWaiters(), fetchTables()]);
        setData({
          waiters: w.filter((x) => x.HotelName === hotelName),
          tables: t.filter((x) => x.HotelName === hotelName)
        });
        form.reset({ tableNo: 0, waiterName: "", orderAmount: 1 });
      })();
    }
  }, [isOpen]);

  const onValidSubmit = async (values: z.infer<typeof orderSchema>) => {
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
                  label="Table"
                  placeholder="Select"
                  listdisplay={data.tables.map((table) => ({
                    id: table.id,
                    name: `Table ${table.tableNo}`,
                    realValue: table.tableNo,
                  }))}
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
                  {(item.price * (form.watch("orderAmount") || 1)).toFixed(2)} ETB
                </span>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : "Confirm Order"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
