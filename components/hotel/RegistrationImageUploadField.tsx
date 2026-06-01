"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  isCloudinaryUploadConfigured,
  uploadImageFileToCloudinary,
} from "@/lib/cloudinaryUploadOptions";
import {
  hasRegistrationImage,
  registrationPreviewImageUrl,
} from "@/lib/registrationImageUrl";
import { notifyApiFailure } from "@/lib/actions";

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/jfif";

export function RegistrationImageUploadField({
  value,
  onChange,
  itemLabel,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  itemLabel?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = registrationPreviewImageUrl(value);
  const hasImage = hasRegistrationImage(value);

  const openPicker = () => {
    if (uploading) return;
    if (!isCloudinaryUploadConfigured()) {
      toast.error("Image upload is not configured on this device.");
      return;
    }
    inputRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImageFileToCloudinary(file);
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      notifyApiFailure(e, "Could not upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-dashed border-border/80 bg-muted/15 p-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-hidden
        onChange={(e) => void onFileChange(e)}
      />
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm">
          {previewUrl && hasImage ? (
            <Image
              src={previewUrl}
              alt={itemLabel || "Item"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground text-center px-1">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">
            Product photo{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground max-w-xs">{hint}</p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="gap-2 shrink-0"
        disabled={uploading}
        onClick={openPicker}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading ? "Uploading…" : hasImage ? "Replace image" : "Browse image"}
      </Button>
    </div>
  );
}
