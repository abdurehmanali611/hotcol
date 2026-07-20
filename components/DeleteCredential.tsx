"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { deleteCredentialSchema } from "@/lib/validations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CredentialRow = {
  id: number;
  UserName: string;
  Role: string;
};

export default function DeleteCredential({
  credentials,
  onDeleteCredential,
  variant = "cafe",
}: {
  credentials: CredentialRow[];
  onDeleteCredential: (userName: string) => Promise<void>;
  variant?: "cafe" | "hotel";
}) {
  const deleteForm = useForm<z.infer<typeof deleteCredentialSchema>>({
    resolver: zodResolver(deleteCredentialSchema),
    defaultValues: { UserName: "" },
  });
  const deleteUserName = useWatch({
    control: deleteForm.control,
    name: "UserName",
  });

  const [currentUserName] = useState(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("user_name")?.trim() ?? "")
      : "",
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const deletableStaff = useMemo(
    () =>
      credentials.filter((c) => {
        if (String(c.UserName).trim() === currentUserName) return false;
        if (variant === "hotel") {
          return c.Role !== "Admin" && c.Role !== "Manager";
        }
        return c.Role !== "Admin";
      }),
    [credentials, currentUserName, variant],
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <Card className="overflow-hidden border-destructive/20 bg-card/95 shadow-lg ring-1 ring-black/3 dark:ring-white/6">
        <div className="h-1 bg-linear-to-r from-rose-500 via-red-400 to-orange-400" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <UserMinus className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            Delete credential
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Remove a staff login permanently. To change someone&apos;s role,
            delete the account here, then grant a new credential. Staff update
            their own passwords from their terminal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletableStaff.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <UserMinus className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No staff accounts to remove</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Only non-owner staff logins appear here.
              </p>
            </div>
          ) : (
            <Form {...deleteForm}>
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                <CustomFormField
                  control={deleteForm.control}
                  name="UserName"
                  fieldType={formFieldTypes.SELECT}
                  listdisplay={deletableStaff.map((cred) => ({
                    id: cred.id,
                    name: cred.UserName,
                  }))}
                  label="Staff member"
                />
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={async () => {
                    const ok = await deleteForm.trigger("UserName");
                    if (ok) setDeleteDialogOpen(true);
                  }}
                >
                  Delete account
                </Button>
              </div>
            </Form>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this staff account?</AlertDialogTitle>
            <AlertDialogDescription>
              User <strong>{deleteUserName}</strong> will no longer be able to
              sign in. To assign a different role later, grant a new credential
              with the desired role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePending}
              onClick={async (e) => {
                e.preventDefault();
                const name = deleteForm.getValues("UserName");
                setDeletePending(true);
                try {
                  await onDeleteCredential(name);
                  deleteForm.reset({ UserName: "" });
                  setDeleteDialogOpen(false);
                } catch {
                  // Toasts handled in deleteCredential / server layer
                } finally {
                  setDeletePending(false);
                }
              }}
            >
              {deletePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
