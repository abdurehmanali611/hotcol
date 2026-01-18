/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { updateItemSchema } from "@/lib/validations";
import { RefreshCw, UploadCloud } from "lucide-react";
import z from "zod";
import { updateItem, uploadImage } from "@/lib/actions";

export default function UpdateScreen({
  item,
  onUpdateSuccess,
  hotelName,
}: any) {
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    item.imageUrl
  );

  const form = useForm<z.infer<typeof updateItemSchema>>({
    resolver: zodResolver(updateItemSchema),
    defaultValues: {
      id: item.id,
      name: item.name,
      price: item.price,
      type: item.type,
      category: item.category,
      imageUrl: item.imageUrl,
      HotelName: hotelName || item.HotelName || localStorage.getItem("hotel_name") || "", 
    },
  });


  const onSubmit = async (values: z.infer<typeof updateItemSchema>) => {
    setIsUploading(true);
    try {
      const submissionData = {
        ...values,
        id: Number(values.id),
        price: Number(values.price),
        HotelName: hotelName || values.HotelName || localStorage.getItem("hotel_name") || "",
      };

      await updateItem(submissionData);

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch {
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col gap-5 items-center">
          <div className="flex items-center gap-5">
            <CustomFormField
              control={form.control}
              name="name"
              fieldType={formFieldTypes.INPUT}
              label="Item Name"
              placeholder="e.g. Grilled Chicken"
              inputClassName="h-fit p-2 w-56"
            />
            <CustomFormField
              control={form.control}
              name="price"
              fieldType={formFieldTypes.INPUT}
              label="Price (ETB)"
              type="number"
              placeholder="0.00"
              inputClassName="h-fit p-2 w-56"
            />
          </div>
          <div className="flex items-center gap-5">
            <CustomFormField
              control={form.control}
              name="category"
              fieldType={formFieldTypes.SELECT}
              label="Category"
              listdisplay={[
                { id: 1, name: "Food" },
                { id: 2, name: "Beverage" },
                { id: 3, name: "Others" },
              ]}
              placeholder="Select category"
              inputClassName="h-fit p-2 w-56"
            />
            <CustomFormField
              control={form.control}
              name="type"
              fieldType={formFieldTypes.SELECT}
              label="Specific Category"
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
              placeholder="Select type"
              inputClassName="h-fit p-2 w-56"
            />
          </div>

          <div className="space-y-4">
            <CustomFormField 
            name="imageUrl"
            control={form.control}
            fieldType={formFieldTypes.IMAGE_UPLOADER}
            label="Image: "
            previewUrl={imagePreview}
            fileType={imagePreview?.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? "video" : "image"}
            handleCloudinary={(result) => uploadImage(result, form, setImagePreview, "imageUrl")}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full gap-2 cursor-pointer" disabled={isUploading}>
            {isUploading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Update Menu Item
          </Button>
        </div>
      </form>
    </Form>
  );
}
