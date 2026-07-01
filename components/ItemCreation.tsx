/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Coffee, ImageIcon, PlusCircle, Tag } from "lucide-react";
import { createItemSchema } from "@/lib/validations";
import { uploadImage } from "@/lib/actions";
import { Label } from "@/components/ui/label";

interface ItemCreationFormProps {
  hotelName: string;
  onSubmit: (data: any) => Promise<void>;
  onImageUpload: (
    result: any,
    form: any,
    setPreviewUrl: (url: string | null) => void,
    formField: string
  ) => Promise<void>;
}

const MENU_TYPE_OPTIONS = [
  { id: 1, name: "BreakFast", label: "Breakfast" },
  { id: 2, name: "Lunch", label: "Lunch" },
  { id: 3, name: "Freshs", label: "Fresh" },
  { id: 4, name: "Soups", label: "Soups" },
  { id: 5, name: "Cakes and Pasteries", label: "Cakes and pastries" },
  { id: 6, name: "Soft Drinks and Water", label: "Soft drinks and water" },
  { id: 7, name: "Fish", label: "Fish" },
  { id: 8, name: "Side Dish", label: "Side dish" },
  { id: 9, name: "Juices and Fruits", label: "Juices and fruits" },
  { id: 10, name: "Salads", label: "Salads" },
  { id: 11, name: "Chickens and Lasagnas", label: "Chicken and lasagna" },
  { id: 12, name: "Others", label: "Others" },
];

export default function ItemCreationForm({
  hotelName,
  onSubmit,
}: ItemCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof createItemSchema>>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "Food",
      type: "BreakFast",
      imageUrl: "",
      HotelName: hotelName,
    },
  });

  const handleSubmit = async (values: z.infer<typeof createItemSchema>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      setImagePreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-lg">
        <div className="h-1 bg-linear-to-r from-amber-500 via-orange-400 to-rose-400" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <Coffee className="h-5 w-5 text-amber-600" />
            Create menu item
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Add a dish or beverage to your digital menu. It appears on cashier,
            waiter, and kitchen screens after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Item details
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomFormField
                    control={form.control}
                    name="name"
                    fieldType={formFieldTypes.INPUT}
                    label="Item name"
                    placeholder="e.g. Avocado toast"
                    inputClassName="h-10 w-full"
                  />
                  <CustomFormField
                    control={form.control}
                    name="category"
                    fieldType={formFieldTypes.SELECT}
                    label="Category"
                    placeholder="Select category"
                    listdisplay={[
                      { id: 1, name: "Food" },
                      { id: 2, name: "Beverage" },
                      { id: 3, name: "Others" },
                    ]}
                    inputClassName="h-10 w-full"
                  />
                  <CustomFormField
                    control={form.control}
                    name="type"
                    fieldType={formFieldTypes.SELECT}
                    label="Menu type"
                    placeholder="Select type"
                    listdisplay={MENU_TYPE_OPTIONS.map((opt) => ({
                      id: opt.id,
                      name: opt.name,
                    }))}
                    inputClassName="h-10 w-full"
                  />
                  <CustomFormField
                    control={form.control}
                    name="price"
                    fieldType={formFieldTypes.INPUT}
                    type="number"
                    label="Price (ETB)"
                    placeholder="0"
                    inputClassName="h-10 w-full"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Photo
                </Label>
                <CustomFormField
                  control={form.control}
                  name="imageUrl"
                  fieldType={formFieldTypes.IMAGE_UPLOADER}
                  label=""
                  placeholder="Upload menu image"
                  previewUrl={imagePreview}
                  handleCloudinary={(result) =>
                    uploadImage(result, form, setImagePreview, "imageUrl")
                  }
                />
              </div>

              <PendingButton
                type="submit"
                className="h-11 w-full gap-2 text-base font-semibold"
                pending={isSubmitting}
              >
                <PlusCircle className="h-4 w-4" />
                Add to menu
              </PendingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
