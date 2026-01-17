/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
    <div className="max-w-3xl mx-auto">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <CardTitle>Create New Menu Item</CardTitle>
          </div>
          <CardDescription>
            Add a new dish or Beverage to your digital menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="w-fit">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8"
            >
              <div className="space-y-4 flex flex-col gap-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Item Details
                </h3>
                <div className="flex items-center gap-5">
                  <CustomFormField
                    control={form.control}
                    name="name"
                    fieldType={formFieldTypes.INPUT}
                    label="Item Name"
                    placeholder="e.g., Avocado Toast"
                    inputClassName="h-fit p-2 w-56"
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
                    inputClassName="px-5 h-fit"
                  />
                </div>
                <div className="flex items-center gap-5">
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
                    inputClassName="px-5 h-fit"
                  />
                  <CustomFormField
                    control={form.control}
                    name="price"
                    fieldType={formFieldTypes.INPUT}
                    type="number"
                    label="Price (ETB)"
                    inputClassName="h-fit p-2 w-56"
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
              <Button
                type="submit"
                className="w-full h-12 text-lg shadow-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving to Database..." : "Create Menu Item"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
