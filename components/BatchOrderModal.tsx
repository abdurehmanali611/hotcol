/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Minus, Trash2 } from "lucide-react";
import {
  fetchWaiters,
  fetchTables,
  createBatchOrders,
  Item,
  Waiter,
  Table,
} from "@/lib/actions";
import { batchOrderSchema } from "@/lib/validations";
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
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

interface BatchOrderModalProps {
  items: (Item & { orderAmount: number })[];
  isOpen: boolean;
  onClose: () => void;
  hotelName: string;
  onSubmitSuccess: () => void;
}

export default function BatchOrderModal({
  items: initialItems,
  isOpen,
  onClose,
  hotelName,
  onSubmitSuccess,
}: BatchOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedItems, setSelectedItems] = useState(initialItems);

  const form = useForm<z.infer<typeof batchOrderSchema>>({
    resolver: zodResolver(batchOrderSchema),
    defaultValues: {
      singleWaiterName: "",
      singleTableNo: 0,
      HotelName: hotelName,
      items: [],
      assignmentType: "single",
    },
  });

  useEffect(() => {
    setSelectedItems(initialItems);
    const formItems = initialItems.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      imageUrl: item.imageUrl,
      price: item.price,
      category: item.category,
      type: item.type,
      orderAmount: item.orderAmount,
    }));
    form.setValue("items", formItems);
    form.setValue("HotelName", hotelName);
    form.setValue("assignmentType", "single");
  }, [initialItems, hotelName, form]);

  useEffect(() => {
    if (isOpen) {
      fetchWaiters()
        .then((res) => res.filter((w) => w.HotelName === hotelName)).then(setWaiters)
        .catch(() => toast.error("Failed to load waiters"));
      fetchTables()
        .then((res) => res.filter((t) => t.HotelName === hotelName)).then(setTables)
        .catch(() => toast.error("Failed to load tables"));

      const formItems = initialItems.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        imageUrl: item.imageUrl,
        price: item.price,
        category: item.category,
        type: item.type,
        orderAmount: item.orderAmount,
      }));

      form.reset({
        singleWaiterName: "",
        singleTableNo: 0,
        HotelName: hotelName,
        items: formItems,
        assignmentType: "single",
      });
    }
  }, [isOpen, hotelName, form, initialItems]);

  const updateQuantity = (id: number, delta: number) => {
    setSelectedItems((prev) => {
      const updated = prev.map((si) =>
        si.id === id
          ? { ...si, orderAmount: Math.max(1, si.orderAmount + delta) }
          : si,
      );
      const formItems = updated.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        imageUrl: item.imageUrl,
        price: item.price,
        category: item.category,
        type: item.type,
        orderAmount: item.orderAmount,
      }));
      form.setValue("items", formItems);
      return updated;
    });
  };

  const removeItem = (id: number) => {
    setSelectedItems((prev) => {
      const updated = prev.filter((si) => si.id !== id);
      // Sync form items
      const formItems = updated.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        imageUrl: item.imageUrl,
        price: item.price,
        category: item.category,
        type: item.type,
        orderAmount: item.orderAmount,
      }));
      form.setValue("items", formItems);
      return updated;
    });
  };

  const totalAmount = selectedItems.reduce(
    (sum, si) => sum + si.price * si.orderAmount,
    0,
  );

  const onSubmit = async (values: z.infer<typeof batchOrderSchema>) => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!values.singleTableNo || values.singleTableNo === 0) {
      toast.error("Please select a table number");
      return;
    }

    if (!values.singleWaiterName || values.singleWaiterName === "") {
      toast.error("Please select a waiter");
      return;
    }

    setLoading(true);
    try {
      const finalOrders = selectedItems.map((si) => ({
        title: si.name,
        price: si.price,
        imageUrl: si.imageUrl,
        category: si.category,
        type: si.type,
        orderAmount: si.orderAmount,
        tableNo: values.singleTableNo,
        waiterName: values.singleWaiterName,
        HotelName: hotelName,
      }));

      await createBatchOrders(finalOrders);
      toast.success(
        `Successfully sent ${finalOrders.length} order(s) to kitchen!`,
      );
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err?.message || "Failed to create batch orders. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Review Batch Order
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              const firstError = Object.values(errors)[0];
              if (firstError?.message) {
                toast.error(firstError.message as string);
              } else {
                toast.error("Please fill in all required fields correctly");
              }
            })}
            className="space-y-6"
          >
            {/* 1. Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <CustomFormField
                control={form.control}
                name="singleTableNo"
                fieldType={formFieldTypes.SELECT}
                label="Table Number"
                placeholder="Select Table"
                isNumeric={true}
                inputClassName="h-fit p-2 w-56"
                listdisplay={tables.map((t) => ({
                  id: t.id,
                  name: `Table ${t.tableNo}`,
                  realValue: t.tableNo,
                }))}
              />
              <CustomFormField
                control={form.control}
                name="singleWaiterName"
                fieldType={formFieldTypes.SELECT}
                label="Assigned Waiter"
                placeholder="Select Waiter"
                inputClassName="h-fit p-2 w-56"
                listdisplay={waiters.map((w) => ({ id: w.id, name: w.name }))}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Items Selected
              </h3>
              {selectedItems.map((si) => (
                <div
                  key={si.id}
                  className="flex items-center justify-between p-3 border rounded-xl bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={si.imageUrl}
                        alt={si.name}
                        width={200}
                        height={200}
                        loading="eager"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{si.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {si.price.toFixed(2)} ETB/ unit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center border rounded-lg bg-background">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(si.id, -1)}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">
                        {si.orderAmount}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(si.id, 1)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => removeItem(si.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Footer Summary */}
            <div className="bg-primary/5 p-4 rounded-xl flex justify-between items-center">
              <span className="text-muted-foreground">
                Total to be charged:
              </span>
              <span className="text-2xl font-black text-primary">
                {totalAmount.toFixed(2)} ETB
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 min-w-40 cursor-pointer"
              >
                {loading
                  ? "Processing..."
                  : `Send ${selectedItems.length} Orders`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
