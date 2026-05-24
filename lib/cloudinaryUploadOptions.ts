import type { CloudinaryUploadWidgetOptions } from "next-cloudinary";

/** Cloudinary widget: local file, URL, or camera only — one asset per upload. */
export const ITEM_REGISTRATION_IMAGE_UPLOAD_OPTIONS: CloudinaryUploadWidgetOptions =
  {
    sources: ["local", "url", "camera"],
    multiple: false,
    maxFiles: 1,
    clientAllowedFormats: ["png", "jpeg", "jpg", "webp", "jfif"],
  };

/** Single-item form also allows short video attachments when needed. */
export const ITEM_REGISTRATION_MEDIA_UPLOAD_OPTIONS: CloudinaryUploadWidgetOptions =
  {
    sources: ["local", "url", "camera"],
    multiple: false,
    maxFiles: 1,
    clientAllowedFormats: [
      "png",
      "jpeg",
      "jpg",
      "webp",
      "jfif",
      "mp4",
      "webm",
      "ogg",
      "mov",
      "avi",
    ],
  };
