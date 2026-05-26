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
import { PlusCircle, Package } from "lucide-react";
import { createItemSchema } from "@/lib/validations";
import { uploadImage } from "@/lib/actions";

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
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 shrink-0 text-primary" />
            <CardTitle className="text-base sm:text-lg">Create New Menu Item</CardTitle>
          </div>
          <CardDescription className="text-pretty text-xs sm:text-sm">
            Add a new dish or beverage to your digital menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full min-w-0 px-0">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8"
            >
              <div className="space-y-4 flex flex-col gap-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Item Details
                </h3>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                  <CustomFormField
                    control={form.control}
                    name="name"
                    fieldType={formFieldTypes.INPUT}
                    label="Item Name"
                    placeholder="e.g., Avocado Toast"
                    inputClassName="h-fit w-full p-2 sm:w-56"
                  />
                  <CustomFormField
                    control={form.control}
                    name="category"
                    fieldType={formFieldTypes.SELECT}
                    label="Category: "
                    placeholder="Select"
                    listdisplay={[
                      { id: 1, name: "Food" },
                      { id: 2, name: "Beverage" },
                      { id: 3, name: "Others" },
                    ]}
                    inputClassName="h-fit w-full px-5 sm:w-auto"
                  />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                  <CustomFormField
                    control={form.control}
                    name="type"
                    fieldType={formFieldTypes.SELECT}
                    label="Type: "
                    placeholder="Select"
                    listdisplay={[
                      { id: 1, name: "BreakFast" },
                      { id: 2, name: "Lunch" },
                      { id: 3, name: "Freshs" },
                      { id: 4, name: "Soups" },
                      { id: 5, name: "Cakes and Pasteries" },
                      { id: 6, name: "Soft Drinks and Water" },
                      { id: 7, name: "Fish" },
                      { id: 8, name: "Side Dish" },
                      { id: 9, name: "Juices and Fruits" },
                      { id: 10, name: "Salads" },
                      { id: 11, name: "Chickens and Lasagnas" },
                      { id: 12, name: "Others" },
                    ]}
                    inputClassName="h-fit w-full px-5 sm:w-auto"
                  />
                  <CustomFormField
                    control={form.control}
                    name="price"
                    fieldType={formFieldTypes.INPUT}
                    type="number"
                    label="Price (ETB)"
                    inputClassName="h-fit w-full p-2 sm:w-56"
                  />
                </div>
                <CustomFormField
                  control={form.control}
                  name="imageUrl"
                  fieldType={formFieldTypes.IMAGE_UPLOADER}
                  label="Upload an Image: "
                  placeholder="upload an image"
                  previewUrl={imagePreview}
                  handleCloudinary={(result) =>
                    uploadImage(result, form, setImagePreview, "imageUrl")
                  }
                />
              </div>
              <PendingButton
                type="submit"
                className="h-11 w-full text-base shadow-md sm:h-12 sm:text-lg"
                pending={isSubmitting}
              >
                Create Menu Item
              </PendingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
