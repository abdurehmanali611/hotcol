/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { updateItemSchema } from "@/lib/validations";
import Image from "next/image";
import { ImageIcon, RefreshCw, UploadCloud } from "lucide-react";
import { toast } from "sonner";
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
      HotelName: hotelName || item.HotelName || localStorage.getItem("hotel_name") || "", // Ensure HotelName is set
    },
  });


  const onSubmit = async (values: z.infer<typeof updateItemSchema>) => {
    setIsUploading(true);
    try {
      const submissionData = {
        ...values,
        id: Number(values.id),
        price: Number(values.price),
        HotelName: hotelName || values.HotelName || item.HotelName || localStorage.getItem("hotel_name") || "",
      };

      console.log("Submitting update:", submissionData); 

      await updateItem(submissionData);
      toast.success("Item updated successfully!");

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error: any) {
      toast.error(`Failed to update item: ${error.message}`);
      console.error("Update error:", error);
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
      const url = (await uploadImage(
        file,
        form,
        setImagePreview,
        "imageUrl"
      )) as unknown as string;
      form.setValue("imageUrl", url);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("HotelName")} />
        
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Image</label>
              <div className="relative w-42 h-42 rounded-lg flex items-center justify-center overflow-hidden group mt-2">
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
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