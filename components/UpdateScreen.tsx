/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { updateItemSchema } from "@/lib/validations";
import Image from "next/image";
import { ImageIcon, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { updateItem } from "@/lib/actions";
import { HoverOrTouchOverlay } from "@/components/ui/hover-or-touch-overlay";

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
      HotelName: hotelName || item.HotelName || "", // Ensure HotelName is set
    },
  });


  const onSubmit = async (values: z.infer<typeof updateItemSchema>) => {
    setIsUploading(true);
    try {
      const submissionData = {
        ...values,
        id: Number(values.id),
        price: Number(values.price),
        HotelName: hotelName || values.HotelName || item.HotelName || "",
      };

      await updateItem(submissionData);
      toast.success("Item updated successfully!");

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error: any) {
      toast.error(`Failed to update item: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = () => setImagePreview(reader.result as string);
  reader.readAsDataURL(file);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME || '');
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    const imageUrl = data.secure_url;
    
    form.setValue("imageUrl", imageUrl);
    setImagePreview(imageUrl);
    toast.success("Image uploaded successfully");
  } catch (error: any) {
    toast.error(`Failed to upload image: ${error.message}`);
  }
};

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">        
        <div className="flex w-full min-w-0 flex-col items-stretch gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
            <CustomFormField
              control={form.control}
              name="name"
              fieldType={formFieldTypes.INPUT}
              label="Item Name"
              placeholder="e.g. Grilled Chicken"
              inputClassName="h-fit w-full p-2 sm:w-56"
            />
            <CustomFormField
              control={form.control}
              name="price"
              fieldType={formFieldTypes.INPUT}
              label="Price (ETB)"
              type="number"
              placeholder="0.00"
              inputClassName="h-fit w-full p-2 sm:w-56"
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
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
              inputClassName="h-fit w-full p-2 sm:w-56"
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
              inputClassName="h-fit w-full p-2 sm:w-56"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Item Image</label>
            {imagePreview ? (
              <HoverOrTouchOverlay
                mediaClassName="mx-auto mt-1 aspect-square w-full max-w-[10.5rem] overflow-hidden rounded-lg border bg-muted"
                overlay={
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
                }
                mobileAction={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full max-w-[10.5rem] gap-1.5"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Change Image
                  </Button>
                }
              >
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </HoverOrTouchOverlay>
            ) : (
              <div className="mx-auto mt-1 flex aspect-square w-full max-w-[10.5rem] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4 text-center">
                <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-9 w-full gap-1.5"
                  onClick={() =>
                    document.getElementById("image-upload")?.click()
                  }
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload Image
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
        </div>

        <div className="pt-4">
          <PendingButton
            type="submit"
            pending={isUploading}
            className="w-full gap-2 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            {isUploading ? "Updating…" : "Update Menu Item"}
          </PendingButton>
        </div>
      </form>
    </Form>
  );
}