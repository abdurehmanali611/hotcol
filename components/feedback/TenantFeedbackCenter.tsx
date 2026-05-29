"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ImagePlus, Loader2, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchTenantFeedbackInbox,
  markTenantFeedbackRead,
  sendTenantFeedbackMessage,
  type TenantFeedbackMessageRow,
} from "@/lib/actions";
import {
  isCloudinaryUploadConfigured,
  uploadImageFileToCloudinary,
} from "@/lib/cloudinaryUploadOptions";
import { cn } from "@/lib/utils";

const FEEDBACK_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/jfif";
const FEEDBACK_MAX_IMAGES = 5;

function formatMessageTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function MessageBubble({ msg }: { msg: TenantFeedbackMessageRow }) {
  const fromTenant = msg.senderSide === "tenant";
  const label = fromTenant
    ? msg.tenantUserName || "You"
    : msg.apexDisplayName || "Apex Team";

  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        fromTenant ? "ml-auto items-end" : "items-start",
      )}
    >
      <p className="text-[10px] font-medium text-muted-foreground px-1">
        {label}
        {fromTenant && msg.tenantRole ? ` · ${msg.tenantRole}` : null}
      </p>
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm space-y-2",
          fromTenant
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md border border-border/60",
        )}
      >
        {msg.imageUrl ? (
          <a
            href={msg.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg"
          >
            <Image
              src={msg.imageUrl}
              alt="Feedback attachment"
              width={280}
              height={200}
              className="max-h-48 w-auto object-contain"
              unoptimized
            />
          </a>
        ) : null}
        {msg.body ? (
          <p className="whitespace-pre-wrap text-pretty">{msg.body}</p>
        ) : null}
      </div>
      <p className="text-[10px] text-muted-foreground px-1">
        {formatMessageTime(msg.createdAt)}
      </p>
    </div>
  );
}

export function TenantFeedbackCenter({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState<TenantFeedbackMessageRow[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingFileRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const loadInbox = useCallback(
    async (opts?: { silent?: boolean; markRead?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        if (opts?.markRead && open) {
          await markTenantFeedbackRead();
        }
        const inbox = await fetchTenantFeedbackInbox(100);
        setMessages(inbox.messages);
        setUnread(opts?.markRead ? 0 : inbox.unreadFromApex);
        if (open) {
          requestAnimationFrame(scrollToBottom);
        }
      } catch (e) {
        if (!opts?.silent) {
          toast.error(
            e instanceof Error ? e.message : "Could not load feedback center",
          );
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [open, scrollToBottom],
  );

  useEffect(() => {
    void loadInbox({ silent: true });
  }, [loadInbox]);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    void loadInbox({ markRead: true });
    pollRef.current = setInterval(() => {
      void loadInbox({ silent: true, markRead: true });
    }, 20_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, loadInbox]);

  const canSend =
    Boolean(draft.trim() || pendingImageUrls.length) &&
    !sending &&
    !uploadingImage;
  const atImageLimit = pendingImageUrls.length >= FEEDBACK_MAX_IMAGES;

  const handleSend = async () => {
    const text = draft.trim();
    const images = pendingImageUrls.map((url) => url.trim()).filter(Boolean);
    if ((!text && images.length === 0) || sending || uploadingImage) return;
    setSending(true);
    try {
      if (images.length === 0) {
        await sendTenantFeedbackMessage(text);
      } else {
        for (let i = 0; i < images.length; i++) {
          await sendTenantFeedbackMessage(i === 0 ? text : "", images[i]);
        }
      }
      setDraft("");
      setPendingImageUrls([]);
      await loadInbox({ silent: true, markRead: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const handleSheetOpenChange = (next: boolean) => {
    if (!next && (uploadingImage || pickingFileRef.current)) {
      return;
    }
    setOpen(next);
  };

  const handlePickImage = () => {
    if (sending || uploadingImage || atImageLimit) return;
    pickingFileRef.current = true;
    const onWindowFocus = () => {
      window.setTimeout(() => {
        pickingFileRef.current = false;
      }, 0);
    };
    window.addEventListener("focus", onWindowFocus, { once: true });
    fileInputRef.current?.click();
  };

  const removePendingImage = (index: number) => {
    setPendingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    pickingFileRef.current = false;
    if (files.length === 0) return;

    const slotsLeft = FEEDBACK_MAX_IMAGES - pendingImageUrls.length;
    if (slotsLeft <= 0) {
      toast.error(`You can attach up to ${FEEDBACK_MAX_IMAGES} images at a time.`);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please choose image files (PNG, JPEG, or WebP).");
      return;
    }
    if (imageFiles.length < files.length) {
      toast.error("Some files were skipped because they are not images.");
    }

    const toUpload = imageFiles.slice(0, slotsLeft);
    if (imageFiles.length > slotsLeft) {
      toast.info(
        `Only ${slotsLeft} more image${slotsLeft === 1 ? "" : "s"} added (max ${FEEDBACK_MAX_IMAGES}).`,
      );
    }

    setUploadingImage(true);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${toUpload.length}…`);
        const url = await uploadImageFileToCloudinary(toUpload[i], {
          folder: "hotcol-feedback",
        });
        uploaded.push(url);
      }
      setPendingImageUrls((prev) =>
        [...prev, ...uploaded].slice(0, FEEDBACK_MAX_IMAGES),
      );
    } catch (err) {
      if (uploaded.length > 0) {
        setPendingImageUrls((prev) =>
          [...prev, ...uploaded].slice(0, FEEDBACK_MAX_IMAGES),
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Image upload failed. Try again.",
      );
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative shrink-0", className)}
          aria-label={`Feedback center${unread ? `, ${unread} unread` : ""}`}
        >
          <MessageCircle className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            Feedback center
            <Badge variant="secondary" className="text-[10px] font-normal">
              Apex Team
            </Badge>
          </SheetTitle>
          <SheetDescription className="text-pretty">
            Message the Apex support team about billing, setup, bugs, or feature
            requests. Attach up to {FEEDBACK_MAX_IMAGES} screenshots when helpful.
            Replies appear here.
          </SheetDescription>
        </SheetHeader>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-linear-to-b from-muted/20 to-background"
        >
          {loading && messages.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-background/80 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Start a conversation</p>
              <p className="mt-2 text-pretty leading-relaxed">
                Tell Apex about onboarding help, subscription questions, or anything
                you need for your café or hotel.
              </p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </div>

        <div className="border-t bg-background p-4 space-y-3">
          {pendingImageUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pendingImageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative inline-block">
                  <Image
                    src={url}
                    alt={`Attachment preview ${index + 1}`}
                    width={120}
                    height={90}
                    className="h-20 w-20 rounded-lg border object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full shadow-sm"
                    aria-label={`Remove image ${index + 1}`}
                    disabled={sending || uploadingImage}
                    onClick={() => removePendingImage(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your message to Apex…"
            rows={3}
            maxLength={4000}
            disabled={sending || uploadingImage}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={FEEDBACK_IMAGE_ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void handleImageFileChange(e)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={sending || uploadingImage || atImageLimit}
                aria-label="Attach images"
                title={
                  !isCloudinaryUploadConfigured()
                    ? "Image upload not configured"
                    : atImageLimit
                      ? `Maximum ${FEEDBACK_MAX_IMAGES} images`
                      : `Attach images (up to ${FEEDBACK_MAX_IMAGES})`
                }
                onClick={() => {
                  if (!isCloudinaryUploadConfigured()) {
                    toast.error(
                      "Image upload is not configured. Add NEXT_PUBLIC_CLOUDINARY_PRESET_NAME and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to .env.local.",
                    );
                    return;
                  }
                  handlePickImage();
                }}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {uploadProgress ??
                  (atImageLimit
                    ? `${FEEDBACK_MAX_IMAGES}/${FEEDBACK_MAX_IMAGES} images · Enter to send`
                    : `Up to ${FEEDBACK_MAX_IMAGES} images · Enter to send · Shift+Enter for new line`)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!canSend}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
