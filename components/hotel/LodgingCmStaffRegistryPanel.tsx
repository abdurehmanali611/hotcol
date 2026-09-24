"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  createLodgingCmStaffApi,
  deleteLodgingCmStaffApi,
  fetchLodgingCmStaff,
  updateLodgingCmStaffApi,
  type LodgingCmStaff,
  type LodgingCmStaffRole,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { Pencil, Plus, Sparkles, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

type StaffDraft = {
  key: string;
  firstName: string;
  lastName: string;
};

function emptyDraft(): StaffDraft {
  return {
    key: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    firstName: "",
    lastName: "",
  };
}

function fullName(row: Pick<LodgingCmStaff, "firstName" | "lastName">) {
  return `${row.firstName} ${row.lastName}`.trim();
}

function RoleRosterForm({
  role,
  title,
  description,
  accentClass,
  Icon,
  refreshKey,
}: {
  role: LodgingCmStaffRole;
  title: string;
  description: string;
  accentClass: string;
  Icon: typeof Sparkles;
  refreshKey: number;
}) {
  const [rows, setRows] = useState<LodgingCmStaff[]>([]);
  const [drafts, setDrafts] = useState<StaffDraft[]>([emptyDraft()]);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LodgingCmStaff | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchLodgingCmStaff(role, true));
    } catch (e) {
      notifyApiFailure(
        e,
        role === "cleaner"
          ? "Could not load cleaners"
          : "Could not load maintainers",
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const activeCount = useMemo(
    () => rows.filter((r) => r.isActive !== false).length,
    [rows],
  );

  const saveBatch = async () => {
    const valid = drafts.filter(
      (d) => d.firstName.trim() && d.lastName.trim(),
    );
    if (valid.length === 0) {
      toast.error("Add at least one line with first and last name");
      return;
    }
    setPending("save");
    try {
      await createLodgingCmStaffApi(
        role,
        valid.map((d) => ({
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
        })),
      );
      setDrafts([emptyDraft()]);
      await load();
    } catch (e) {
      notifyApiFailure(
        e,
        role === "cleaner"
          ? "Could not save cleaners"
          : "Could not save maintainers",
      );
    } finally {
      setPending(null);
    }
  };

  const openEdit = (row: LodgingCmStaff) => {
    setEditing(row);
    setEditFirst(row.firstName);
    setEditLast(row.lastName);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const firstName = editFirst.trim();
    const lastName = editLast.trim();
    if (!firstName || !lastName) {
      toast.error("First and last name are required");
      return;
    }
    setPending(`edit-${editing.id}`);
    try {
      await updateLodgingCmStaffApi(editing.id, { firstName, lastName });
      setEditing(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not update");
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border/70 shadow-md">
        <div className={`h-1 bg-linear-to-r ${accentClass}`} />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base tracking-tight">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="text-pretty leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <HotelFormSection
            title={`Add ${role === "cleaner" ? "cleaners" : "maintainers"}`}
            description="First and last name per line — save the batch once. Edit any saved person anytime."
          >
            <div className="space-y-3">
              {drafts.map((draft, idx) => (
                <div
                  key={draft.key}
                  className="grid gap-3 rounded-xl border border-border/70 bg-muted/15 p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      First name
                    </Label>
                    <Input
                      value={draft.firstName}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) =>
                            d.key === draft.key
                              ? { ...d, firstName: e.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder={role === "cleaner" ? "Abebe" : "Tigist"}
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Last name
                    </Label>
                    <Input
                      value={draft.lastName}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) =>
                            d.key === draft.key
                              ? { ...d, lastName: e.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder={role === "cleaner" ? "Kebede" : "Hailu"}
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-10 text-muted-foreground hover:text-destructive"
                      disabled={drafts.length <= 1}
                      onClick={() =>
                        setDrafts((prev) =>
                          prev.length <= 1
                            ? prev
                            : prev.filter((d) => d.key !== draft.key),
                        )
                      }
                      aria-label={`Remove line ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
              <PendingButton
                type="button"
                className="h-10 min-w-36 gap-2"
                pending={pending === "save"}
                onClick={() => void saveBatch()}
              >
                Save batch
              </PendingButton>
            </div>
          </HotelFormSection>

          <div className="space-y-2">
            <p className="text-sm font-medium tracking-tight">
              Saved roster
              <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                {loading ? "…" : `${activeCount} active`}
              </span>
            </p>
            {rows.length === 0 && !loading ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
                No {role === "cleaner" ? "cleaners" : "maintainers"} yet.
              </p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                  >
                    <span className="font-medium">
                      {fullName(r)}
                      {!r.isActive ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (inactive)
                        </span>
                      ) : null}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        disabled={Boolean(pending)}
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-destructive hover:text-destructive"
                        disabled={Boolean(pending)}
                        onClick={() => {
                          void (async () => {
                            setPending(`del-${r.id}`);
                            try {
                              await deleteLodgingCmStaffApi(r.id);
                              await load();
                            } catch (e) {
                              notifyApiFailure(e, "Could not delete");
                            } finally {
                              setPending(null);
                            }
                          })();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {role === "cleaner" ? "cleaner" : "maintainer"}
            </DialogTitle>
            <DialogDescription>
              Update the name used when assigning rooms in the CM portal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-${role}-first`}>First name</Label>
              <Input
                id={`edit-${role}-first`}
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-${role}-last`}>Last name</Label>
              <Input
                id={`edit-${role}-last`}
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              pending={editing != null && pending === `edit-${editing.id}`}
              onClick={() => void saveEdit()}
            >
              Save changes
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Manager roster for cleaners & maintainers (folio voids / CM section). */
export function LodgingCmStaffRegistryPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <RoleRosterForm
        role="cleaner"
        title="Cleaners"
        description="Register housekeepers by first and last name. CM Leaders and Reception (when allowed) search and pick from this roster when assigning dirty rooms."
        accentClass="from-emerald-500/55 via-teal-500/40 to-sky-500/35"
        Icon={Sparkles}
        refreshKey={refreshKey}
      />
      <RoleRosterForm
        role="maintainer"
        title="Maintainers"
        description="Register maintenance staff by first and last name. Searchable in the CM portal when rooms go on maintenance."
        accentClass="from-amber-500/55 via-orange-500/40 to-rose-500/35"
        Icon={Wrench}
        refreshKey={refreshKey}
      />
    </div>
  );
}
