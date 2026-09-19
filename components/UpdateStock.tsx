/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
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
import {
  REGISTRATION_CATEGORIES,
  normalizeRegistrationCategory,
  type RegistrationCategory,
} from "@/lib/registrationFormConstants";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { ImageIcon } from "lucide-react";
import Image from "next/image";
import {
  computeInventoryPaidAmountETB,
  isVatEnabled,
} from "@/lib/hotelInventoryPayment";
import { registrationPreviewImageUrl } from "@/lib/registrationImageUrl";
import { CrystalItemNameField } from "@/components/crystal/CrystalItemNameField";
import { Separator } from "@/components/ui/separator";
import { INVENTORY_UNIT_SELECT_OPTIONS } from "@/lib/inventoryUnits";

interface UpdateStockProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemRegistration | null;
  hotelInventory?: boolean;
  onUpdateSuccess: () => void;
}

const FIELD_INPUT = "h-10 w-full min-w-0";

const UpdateStock = ({
  isOpen,
  onOpenChange,
  item,
  onUpdateSuccess,
}: UpdateStockProps) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastSeededItemIdRef = useRef<number | null>(null);

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
      supplierName: "",
      supplierPhone: "",
      Address: "",
      purchaseWithVat: true,
      supplierTinNumber: "",
      paidAmount: 0,
      HotelName: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      lastSeededItemIdRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !item) return;
    if (lastSeededItemIdRef.current === item.id) return;
    lastSeededItemIdRef.current = item.id;

    form.reset({
      name: item.name,
      imageUrl: item.imageUrl,
      category: normalizeRegistrationCategory(
        item.category,
      ) as RegistrationCategory,
      amount: item.amount,
      measuredBy: item.measuredBy,
      unitPrice: item.unitPrice,
      registrationDate: new Date(item.registrationDate),
      expireDate: new Date(item.expireDate),
      supplierName: item.supplierName,
      supplierPhone: item.supplierPhone,
      Address: item.Address,
      purchaseWithVat: isVatEnabled(item.purchaseWithVat),
      supplierTinNumber: (item.supplierTinNumber || "").trim(),
      paidAmount: item.paidAmount,
      HotelName: item.HotelName,
    });
    setPreviewUrl(registrationPreviewImageUrl(item.imageUrl));
  }, [item, isOpen, form]);

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

      form.setValue("imageUrl", imageUrl, { shouldValidate: true });
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
      await UpdateItemRegistration({
        ...values,
        id: item.id,
        imageUrl: values.imageUrl ?? "",
        supplierPhone: values.supplierPhone ?? "",
      });
      toast.success(`${values.name.trim() || item.name} updated successfully`);
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
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-6 py-4 pr-12 text-left">
          <SheetTitle>Update stock item</SheetTitle>
          <SheetDescription>
            Edit the item details below, then save.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="mx-auto w-full max-w-lg space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-2">
                      <FormControl>
                        <CrystalItemNameField
                          id="update-stock-name"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Search crystal name…"
                          source="registration"
                          className="grid-cols-2 gap-3 items-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomFormField
                    name="category"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Category"
                    placeholder="Choose category"
                    listdisplay={REGISTRATION_CATEGORIES.map((name, index) => ({
                      id: index + 1,
                      name,
                    }))}
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="measuredBy"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Unit"
                    listdisplay={[...INVENTORY_UNIT_SELECT_OPTIONS]}
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="amount"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Quantity"
                    type="number"
                    allowDecimal
                    min={0}
                    step="any"
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="unitPrice"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Unit price (ETB)"
                    type="number"
                    allowDecimal
                    min={0}
                    step="any"
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="registrationDate"
                    control={form.control}
                    fieldType={formFieldTypes.CALENDAR}
                    label="Registration date"
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="expireDate"
                    control={form.control}
                    fieldType={formFieldTypes.CALENDAR}
                    label="Expiry date"
                    inputClassName={FIELD_INPUT}
                  />
                </div>

                <div className="flex flex-col items-center gap-2 text-center">
                  <FormLabel>
                    Item image <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/20 group">
                    {previewUrl ? (
                      <>
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              document.getElementById("image-upload")?.click()
                            }
                          >
                            Change image
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() =>
                            document.getElementById("image-upload")?.click()
                          }
                        >
                          Upload image
                        </Button>
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
                  {form.formState.errors.imageUrl ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.imageUrl.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomFormField
                    name="supplierName"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Supplier name"
                    placeholder="ABC company"
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="supplierPhone"
                    control={form.control}
                    fieldType={formFieldTypes.PHONE_INPUT}
                    label="Supplier phone (optional)"
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="Address"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Address / note"
                    placeholder="123 street"
                    inputClassName={FIELD_INPUT}
                  />
                  <CustomFormField
                    name="supplierTinNumber"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Supplier TIN (optional)"
                    placeholder="10-digit TIN"
                    inputClassName={FIELD_INPUT}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-end">
                  <CustomFormField
                    name="purchaseWithVat"
                    control={form.control}
                    fieldType={formFieldTypes.SWITCH}
                    label="Purchase price includes VAT"
                    formItemClassName="flex w-full min-w-0 flex-col items-start gap-2"
                  />
                  <CustomFormField
                    name="paidAmount"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Paid amount (ETB)"
                    type="number"
                    allowDecimal
                    min={0}
                    step="any"
                    inputClassName={FIELD_INPUT}
                  />
                </div>
              </div>
            </div>

            <Separator className="shrink-0" />
            <div className="flex shrink-0 flex-wrap justify-end gap-3 bg-muted/10 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <PendingButton
                type="submit"
                pending={loading}
                className="min-w-[132px] bg-green-600 hover:bg-green-700"
              >
                {loading ? "Updating…" : "Update item"}
              </PendingButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default UpdateStock;
