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
  title = "Product photo",
  optional = true,
  uploadFolder,
}: {
  value: string;
  onChange: (url: string) => void;
  itemLabel?: string;
  hint?: string;
  title?: string;
  optional?: boolean;
  /** Cloudinary folder override (e.g. lodging rooms). */
  uploadFolder?: string;
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
      const url = await uploadImageFileToCloudinary(
        file,
        uploadFolder ? { folder: uploadFolder } : undefined,
      );
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      notifyApiFailure(e, "Could not upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-background p-3.5 sm:p-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-hidden
        onChange={(e) => void onFileChange(e)}
      />
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/30 shadow-sm">
          {previewUrl && hasImage ? (
            <Image
              src={previewUrl}
              alt={itemLabel || title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium leading-snug">
            {title}{" "}
            {optional ? (
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            ) : null}
          </p>
          {hint ? (
            <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2"
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
        {hasImage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            disabled={uploading}
            onClick={() => onChange("")}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
