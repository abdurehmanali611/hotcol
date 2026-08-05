"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import { FilterChipGroup, ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { HrConfirmAction } from "@/components/hr/HrConfirmAction";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
} from "@/components/hr/hrChrome";
import {
  HR_DOC_LABELS,
  HR_DOC_TYPES,
  hrDocumentFormSchema,
  parseHrConstraint,
} from "@/lib/hrConstraints";
import { notifyApiFailure } from "@/lib/actions";
import {
  createHrDocumentApi,
  deleteHrDocumentApi,
  type HrDocument,
  type HrEmployee,
} from "@/lib/api/hr";

type DocFilter = "all" | (typeof HR_DOC_TYPES)[number];

export function HrDocumentsPanel({
  employees,
  documents,
  onRefresh,
}: {
  employees: HrEmployee[];
  documents: HrDocument[];
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<DocFilter>("all");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    title: "",
    docType: "contract",
    fileUrl: "",
  });

  const filtered = useMemo(
    () => documents.filter((d) => (filter === "all" ? true : d.docType === filter)),
    [documents, filter],
  );

  const columns = useMemo<ColumnDef<HrDocument>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => row.original.employee?.fullName || `#${row.original.employeeId}`,
      },
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "docType",
        header: "Type",
        cell: ({ row }) =>
          HR_DOC_LABELS[row.original.docType as keyof typeof HR_DOC_LABELS] ||
          row.original.docType,
      },
      {
        accessorKey: "fileUrl",
        header: "File",
        cell: ({ row }) =>
          row.original.fileUrl ? (
            <a
              href={row.original.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Open
            </a>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <HrConfirmAction
              destructive
              title="Delete this document record?"
              description="Only the metadata row is removed. External files are not deleted."
              confirmLabel="Delete"
              trigger={
                <Button size="sm" variant="ghost">
                  Delete
                </Button>
              }
              onConfirm={async () => {
                try {
                  await deleteHrDocumentApi(row.original.id);
                  toast.success("Document deleted");
                  await onRefresh();
                } catch (e) {
                  notifyApiFailure(e, "Delete failed");
                }
              }}
            />
          </div>
        ),
      },
    ],
    [onRefresh],
  );

  return (
    <HrPanelShell>
      <HrSectionCard
        title="Add document"
        description="Store title, type, and an optional file link on the employee file."
        icon={<FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
        accent="bg-linear-to-r from-slate-500 via-sky-400 to-primary/70"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.docType}
              onValueChange={(v) => setForm((f) => ({ ...f, docType: v }))}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HR_DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {HR_DOC_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input
              className="h-10 bg-background"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>File URL</Label>
            <Input
              className="h-10 bg-background"
              placeholder="https://…"
              value={form.fileUrl}
              onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
            />
          </div>
          <PendingButton
            pending={pending}
            onClick={async () => {
              const parsed = parseHrConstraint(hrDocumentFormSchema, {
                ...form,
                employeeId: Number(form.employeeId || 0),
              });
              if (!parsed.ok) {
                toast.error(parsed.message);
                return;
              }
              setPending(true);
              try {
                await createHrDocumentApi({
                  ...parsed.data,
                  fileUrl: parsed.data.fileUrl || undefined,
                });
                toast.success("Document saved");
                setForm({ employeeId: "", title: "", docType: "contract", fileUrl: "" });
                await onRefresh();
              } catch (e) {
                notifyApiFailure(e, "Could not save document");
              } finally {
                setPending(false);
              }
            }}
          >
            Save document
          </PendingButton>
        </div>
      </HrSectionCard>

      <HrSectionCard title="Document file" description="Filter by type and open linked files.">
        <div className="space-y-4">
          <ListPanelFilterBar showClear={filter !== "all"} onClear={() => setFilter("all")}>
            <FilterChipGroup
              label="Type"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "All" },
                ...HR_DOC_TYPES.map((t) => ({ id: t, label: HR_DOC_LABELS[t] })),
              ]}
            />
          </ListPanelFilterBar>
          {filtered.length ? (
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Search documents…"
              pageSize={8}
            />
          ) : (
            <HrEmptyState
              title="No documents in this view"
              description="Add a contract, ID, or certificate record to start the file."
            />
          )}
        </div>
      </HrSectionCard>
    </HrPanelShell>
  );
}
