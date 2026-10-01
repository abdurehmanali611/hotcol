"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PendingButton } from "@/components/ui/pending-button";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  HrTableFrame,
  hrFieldClass,
  hrPrimaryBtnClass,
} from "@/components/hr/hrChrome";
import { cn } from "@/lib/utils";
import { notifyApiFailure } from "@/lib/actions";
import {
  createHrLibraryDocumentApi,
  deleteHrLibraryDocumentApi,
  type HrLibraryDocument,
} from "@/lib/api/hr";
import {
  isCloudinaryFileConfigured,
  uploadFileToCloudinary,
} from "@/lib/cloudinary";

export function HrDocumentsPanel({
  documents,
  canUpload,
  onRefresh,
}: {
  documents: HrLibraryDocument[];
  canUpload: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);

  const columns = useMemo<ColumnDef<HrLibraryDocument>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "fileOriginalName",
        header: "File",
        cell: ({ row }) =>
          row.original.fileSecureUrl ? (
            <a
              href={row.original.fileSecureUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              {row.original.fileOriginalName || "Open"}
            </a>
          ) : (
            "—"
          ),
      },
      { accessorKey: "uploadedBy", header: "Uploaded by" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <HrConfirmAction
            destructive
            title="Delete document?"
            description="This removes the library entry. The Cloudinary file is not deleted."
            confirmLabel="Delete"
            trigger={
              <Button type="button" size="sm" variant="outline" className="text-destructive">
                Delete
              </Button>
            }
            onConfirm={async () => {
              try {
                await deleteHrLibraryDocumentApi(row.original.id);
                toast.success("Document deleted");
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Could not delete document");
              }
            }}
          />
        ),
      },
    ],
    [onRefresh],
  );

  const submit = async () => {
    if (!canUpload) {
      toast.error("Only HR Manager can upload documents");
      return;
    }
    const title = form.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    if (!file) {
      toast.error("Choose a PDF or Word file");
      return;
    }
    if (!isCloudinaryFileConfigured()) {
      toast.error("Cloudinary file preset is not configured");
      return;
    }
    setPending(true);
    try {
      const uploaded = await uploadFileToCloudinary(file, {
        folder: "hotcol-hr-library",
      });
      await createHrLibraryDocumentApi({
        title,
        description: form.description.trim(),
        fileSecureUrl: uploaded.secureUrl,
        filePublicId: uploaded.publicId,
        fileBytes: uploaded.bytes,
        fileFormat: uploaded.format,
        fileOriginalName: uploaded.originalFilename,
      });
      toast.success("Document uploaded");
      setForm({ title: "", description: "" });
      setFile(null);
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, "Could not upload document");
    } finally {
      setPending(false);
    }
  };

  return (
    <HrPanelShell>
      <HrSectionCard
        title="HR documentation"
        description="Tenant document library — title, description, and file. HR uploads; HR and Manager can open and delete."
        icon={<FileText className="h-5 w-5" />}
        accent="bg-linear-to-r from-sky-500 via-indigo-500 to-violet-500/80"
      >
        {canUpload ? (
          <div className="mb-6 grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title</Label>
              <Input
                className={hrFieldClass}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Staff handbook 2026"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                className={cn(hrFieldClass, "min-h-20")}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short note for Managers reviewing the file"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>File (PDF / DOC / DOCX)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf"
                className={hrFieldClass}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <PendingButton
              type="button"
              pending={pending}
              className={cn(hrPrimaryBtnClass, "sm:col-span-2")}
              onClick={() => void submit()}
            >
              <Upload className="h-4 w-4" />
              Upload document
            </PendingButton>
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            You can open and delete documents. Uploads are limited to HR Manager.
          </p>
        )}

        {documents.length === 0 ? (
          <HrEmptyState
            title="No documents yet"
            description="HR Manager can upload the first policy or handbook file here."
          />
        ) : (
          <HrTableFrame>
            <DataTable columns={columns} data={documents} />
          </HrTableFrame>
        )}
      </HrSectionCard>
    </HrPanelShell>
  );
}
