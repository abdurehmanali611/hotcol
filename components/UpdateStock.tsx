/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UpdateItemRegistration, ItemRegistration } from "@/lib/actions";
import { toast } from "sonner";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ItemRegistrationSchema } from "@/lib/validations";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { ImageIcon } from "lucide-react";
import Image from "next/image";
import {
  computeInventoryPaidAmountETB,
  isVatEnabled,
} from "@/lib/hotelInventoryPayment";

interface UpdateStockProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemRegistration | null;
  hotelInventory?: boolean;
  onUpdateSuccess: () => void;
}

const UpdateStock = ({
  isOpen,
  onOpenChange,
  item,
  hotelInventory = false,
  onUpdateSuccess,
}: UpdateStockProps) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  type ItemRegForm = z.infer<typeof ItemRegistrationSchema>;
  const form = useForm<ItemRegForm>({
    resolver: zodResolver(ItemRegistrationSchema) as Resolver<ItemRegForm>,
    defaultValues: {
      name: "",
      imageUrl: "",
      category: "Food",
      amount: 0,
      measuredBy: "Litre",
      unitPrice: 0,
      registrationDate: new Date(),
      expireDate: new Date(),
      dutyFee: 0,
      supplierName: "",
      supplierPhone: "",
      Address: "",
      supplierLevel: "Bronze",
      purchaseWithVat: true,
      supplierTinNumber: "",
      paidAmount: 0,
      HotelName: "",
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category as
          | "Food"
          | "Beverage"
          | "House Keeping"
          | "Maintainance"
          | "Office Supplies"
          | "Others",
        amount: item.amount,
        measuredBy: item.measuredBy,
        unitPrice: item.unitPrice,
        registrationDate: new Date(item.registrationDate),
        expireDate: new Date(item.expireDate),
        dutyFee: item.dutyFee,
        supplierName: item.supplierName,
        supplierPhone: item.supplierPhone,
        Address: item.Address,
        supplierLevel: (item.supplierLevel === "Bronze" ||
        item.supplierLevel === "Silver" ||
        item.supplierLevel === "Gold"
          ? item.supplierLevel
          : "") as "Bronze" | "Silver" | "Gold" | "",
        purchaseWithVat: isVatEnabled(item.purchaseWithVat),
        supplierTinNumber: (item.supplierTinNumber || "").trim(),
        paidAmount: item.paidAmount,
        HotelName: item.HotelName,
      });
      setPreviewUrl(item.imageUrl);
    }
  }, [item, form]);

  const watchedAmount = form.watch("amount");
  const watchedUnitPrice = form.watch("unitPrice");
  const watchedPurchaseWithVat = form.watch("purchaseWithVat");
  const lastAutoPaidAmountRef = useRef<number | null>(null);

  useEffect(() => {
    const paidAmount = computeInventoryPaidAmountETB(
      watchedAmount,
      watchedUnitPrice,
      watchedPurchaseWithVat,
    );
    const currentPaidAmount = Number(form.getValues("paidAmount")) || 0;
    const paidAmountState = form.getFieldState("paidAmount");
    const canAutoSync =
      !paidAmountState.isDirty ||
      currentPaidAmount === lastAutoPaidAmountRef.current;

    if (canAutoSync) {
      form.setValue("paidAmount", paidAmount, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }

    lastAutoPaidAmountRef.current = paidAmount;
  }, [form, watchedAmount, watchedUnitPrice, watchedPurchaseWithVat]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME || "",
      );

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      const imageUrl = data.secure_url;

      form.setValue("imageUrl", imageUrl);
      setPreviewUrl(imageUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
    }
  };

  const onSubmit = async (values: z.infer<typeof ItemRegistrationSchema>) => {
    if (!item) return;

    setLoading(true);
    try {
      const updateData = {
        ...values,
        id: item.id,
        dutyFee: hotelInventory ? 0 : values.dutyFee,
      };

      await UpdateItemRegistration(updateData);
      toast.success(`${item.name} updated successfully`);
      onUpdateSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update ${item.name}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-fit sm:max-w-2xl overflow-y-auto p-3">
        <SheetHeader>
          <SheetTitle>Update Stock Item</SheetTitle>
          <SheetDescription>
            Edit the item details below. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 flex flex-col gap-4 items-center"
            >
              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="name"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Name:"
                  placeholder="Item name"
                  inputClassName="h-fit p-2 w-56"
                />
                <CustomFormField
                  name="category"
                  control={form.control}
                  fieldType={formFieldTypes.SELECT}
                  label="Category:"
                  placeholder="Choose Category"
                  listdisplay={[
                    { id: 1, name: "Food" },
                    { id: 2, name: "Beverage" },
                    { id: 3, name: "House Keeping" },
                    { id: 4, name: "Maintainance" },
                    { id: 5, name: "Office Supplies" },
                    { id: 6, name: "Others" },
                  ]}
                  inputClassName="h-fit p-2 w-56"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="amount"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Amount:"
                  type="number"
                  inputClassName="h-fit p-2 w-56"
                />
                <CustomFormField
                  name="measuredBy"
                  control={form.control}
                  fieldType={formFieldTypes.SELECT}
                  label="Measured By:"
                  listdisplay={[
                    { id: 1, name: "Litre" },
                    { id: 2, name: "Kilogram" },
                    { id: 3, name: "Piece" },
                    { id: 4, name: "Packet" },
                    { id: 5, name: "Dozen" },
                    { id: 6, name: "Other" },
                  ]}
                  inputClassName="h-fit p-2 w-56"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="unitPrice"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Unit Price:"
                  type="number"
                  inputClassName="h-fit p-2 w-56"
                />
                {!hotelInventory && (
                  <CustomFormField
                    name="dutyFee"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Duty Fee:"
                    type="number"
                    inputClassName="h-fit p-2 w-56"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="registrationDate"
                  control={form.control}
                  fieldType={formFieldTypes.CALENDAR}
                  label="Registration Date:"
                  inputClassName="h-fit p-2 w-56 mx-1"
                />
                <CustomFormField
                  name="expireDate"
                  control={form.control}
                  fieldType={formFieldTypes.CALENDAR}
                  label="Expire Date:"
                  inputClassName="h-fit p-2 w-56 mx-1"
                />
              </div>

              <div className="space-y-4 self-center">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Image</label>
                  <div className="relative w-42 h-42 rounded-lg flex items-center justify-center overflow-hidden group mt-2">
                    {previewUrl ? (
                      <>
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() =>
                              document.getElementById("image-upload")?.click()
                            }
                          >
                            Change Image
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() =>
                              document.getElementById("image-upload")?.click()
                            }
                          >
                            Upload Image
                          </Button>
                        </div>
                      </div>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="supplierName"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Supplier Name:"
                  placeholder="ABC company"
                  inputClassName="h-fit p-2 w-56"
                />
                <CustomFormField
                  name="supplierPhone"
                  control={form.control}
                  fieldType={formFieldTypes.PHONE_INPUT}
                  label="Supplier Contact"
                  inputClassName="h-fit p-2 w-56"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="Address"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Address:"
                  placeholder="123 street"
                  inputClassName="h-fit p-2 w-56"
                />
                <>
                  <CustomFormField
                    name="purchaseWithVat"
                    control={form.control}
                    fieldType={formFieldTypes.SWITCH}
                    label="Purchase price includes VAT"
                  />
                  <CustomFormField
                    name="supplierTinNumber"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Supplier TIN (tax ID)"
                    placeholder="10-digit TIN"
                    inputClassName="h-fit p-2 w-56"
                  />
                </>
              </div>

              <CustomFormField
                name="paidAmount"
                control={form.control}
                fieldType={formFieldTypes.INPUT}
                label="Paid Amount:"
                type="number"
                inputClassName="h-fit p-2 w-56"
              />

              <div className="flex gap-10 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Updating..." : "Update Item"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UpdateStock;
