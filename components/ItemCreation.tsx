/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Coffee, ImageIcon, PlusCircle, Tag, UploadCloud } from "lucide-react";
import { createItemSchema } from "@/lib/validations";
import { Label } from "@/components/ui/label";
import { RecipeIngredientEditor } from "@/components/cafe/RecipeIngredientEditor";
import { menuRecipeToJson, type MenuRecipe } from "@/lib/cafeRecipe";

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
  const [recipe, setRecipe] = useState<MenuRecipe | null>(null);
  const [recipeEditorKey, setRecipeEditorKey] = useState(0);

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
      await onSubmit({
        ...values,
        recipeJson: menuRecipeToJson(recipe),
      });
      form.reset();
      setImagePreview(null);
      setRecipe(null);
      setRecipeEditorKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
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
    } catch (error) {
      console.error("Image upload failed", error);
    } finally {
      e.target.value = "";
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

              <RecipeIngredientEditor
                key={recipeEditorKey}
                value={recipe}
                onChange={setRecipe}
                itemName={form.watch("name")}
              />

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Photo
                </Label>
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 p-4">
                  {imagePreview ? (
                    <div className="relative h-28 w-28 overflow-hidden rounded-xl border bg-muted shadow-sm">
                      <Image
                        src={imagePreview}
                        alt="Menu preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed bg-muted/40">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2"
                    onClick={() => document.getElementById("create-item-image-upload")?.click()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {imagePreview ? "Change image" : "Upload image"}
                  </Button>
                  <input
                    id="create-item-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
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
