/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { updateItemSchema } from "@/lib/validations";
import Image from "next/image";
import {
  ChefHat,
  ImageIcon,
  Tag,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { updateItem } from "@/lib/actions";
import { HoverOrTouchOverlay } from "@/components/ui/hover-or-touch-overlay";
import { RecipeIngredientEditor } from "@/components/cafe/RecipeIngredientEditor";
import {
  menuRecipeToJson,
  parseMenuRecipe,
  type MenuRecipe,
} from "@/lib/cafeRecipe";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MENU_TYPE_OPTIONS = [
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
];

export default function UpdateScreen({
  item,
  onUpdateSuccess,
  hotelName,
}: any) {
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    item.imageUrl,
  );
  const [recipe, setRecipe] = useState<MenuRecipe | null>(() =>
    parseMenuRecipe(item.recipeJson),
  );
  const [activeTab, setActiveTab] = useState("details");

  const form = useForm<z.infer<typeof updateItemSchema>>({
    resolver: zodResolver(updateItemSchema),
    defaultValues: {
      id: item.id,
      name: item.name,
      price: item.price,
      type: item.type,
      category: item.category,
      imageUrl: item.imageUrl,
      HotelName: hotelName || item.HotelName || "",
    },
  });

  const itemName = form.watch("name");
  const menuPrice = form.watch("price");
  const recipeLineCount = recipe?.ingredients?.length ?? 0;

  useEffect(() => {
    form.reset({
      id: item.id,
      name: item.name,
      price: item.price,
      type: item.type,
      category: item.category,
      imageUrl: item.imageUrl,
      HotelName: hotelName || item.HotelName || "",
    });
    setImagePreview(item.imageUrl);
    setRecipe(parseMenuRecipe(item.recipeJson));
  }, [form, hotelName, item]);

  const onSubmit = async (values: z.infer<typeof updateItemSchema>) => {
    setIsUploading(true);
    try {
      const submissionData = {
        ...values,
        id: Number(values.id),
        price: Number(values.price),
        HotelName: hotelName || values.HotelName || item.HotelName || "",
        recipeJson: menuRecipeToJson(recipe),
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
      setImagePreview(imageUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList className="grid h-10 w-full grid-cols-3">
            <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm">
              <Tag className="hidden h-3.5 w-3.5 sm:inline" />
              Details
            </TabsTrigger>
            <TabsTrigger value="recipe" className="gap-1.5 text-xs sm:text-sm">
              <ChefHat className="hidden h-3.5 w-3.5 sm:inline" />
              Recipe
              {recipeLineCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 min-w-4 px-1 text-[9px] sm:ml-1"
                >
                  {recipeLineCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-1.5 text-xs sm:text-sm">
              <ImageIcon className="hidden h-3.5 w-3.5 sm:inline" />
              Photo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0 space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Item details
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomFormField
                  control={form.control}
                  name="name"
                  fieldType={formFieldTypes.INPUT}
                  label="Item name"
                  placeholder="e.g. Grilled chicken"
                  inputClassName="h-10 w-full"
                />
                <CustomFormField
                  control={form.control}
                  name="price"
                  fieldType={formFieldTypes.INPUT}
                  label="Price (ETB)"
                  type="number"
                  placeholder="0.00"
                  inputClassName="h-10 w-full"
                />
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
                  inputClassName="h-10 w-full"
                />
                <CustomFormField
                  control={form.control}
                  name="type"
                  fieldType={formFieldTypes.SELECT}
                  label="Menu type"
                  listdisplay={MENU_TYPE_OPTIONS}
                  placeholder="Select type"
                  inputClassName="h-10 w-full"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recipe" className="mt-0">
            <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-card shadow-sm">
              <div className="h-0.5 bg-linear-to-r from-amber-500 via-orange-400 to-amber-600/80" />
              <div className="border-b border-amber-500/10 bg-amber-500/5 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ChefHat className="h-4 w-4 text-amber-600" />
                  Recipe ingredients
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Same line layout as café cashout — powers cost and profit on
                  admin reports.
                </p>
              </div>
              <div className="p-4">
                <RecipeIngredientEditor
                  value={recipe}
                  onChange={setRecipe}
                  itemName={itemName}
                  menuPrice={Number(menuPrice) || 0}
                  variant="embedded"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photo" className="mt-0">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Menu photo
              </p>
              {imagePreview ? (
                <HoverOrTouchOverlay
                  mediaClassName="mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-xl border bg-muted shadow-sm"
                  overlay={
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
                  }
                  mobileAction={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full max-w-48 gap-1.5"
                      onClick={() =>
                        document.getElementById("image-upload")?.click()
                      }
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Change image
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
                <div className="mx-auto flex aspect-square w-full max-w-48 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-4 text-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 h-9 gap-1.5"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
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
          </TabsContent>
        </Tabs>

        <div
          className={cn(
            "shrink-0 border-t border-border/60 bg-background/95 pt-4",
            "-mx-4 px-4 sm:-mx-6 sm:px-6",
          )}
        >
          <PendingButton
            type="submit"
            pending={isUploading}
            className="h-11 w-full gap-2 font-semibold"
          >
            <UploadCloud className="h-4 w-4" />
            {isUploading ? "Saving changes…" : "Save menu item"}
          </PendingButton>
        </div>
      </form>
    </Form>
  );
}
