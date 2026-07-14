/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ModuleOption } from "@/constants";
import { useTenantModules } from "@/hooks/useTenantModules";
import { tenantHasModule } from "@/lib/subscriptionModules";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Users, KeyRound, RefreshCcw, UserMinus } from "lucide-react";
import CustomFormField, { formFieldTypes } from "./customFormField";
import {
  deleteCredentialSchema,
  updateAdminPasswordSchema,
  updateCredentialSchema,
} from "@/lib/validations";
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

export default function UpdateCredential({
  credentials,
  hotelName,
  onUpdateCredential,
  onUpdateAdminPassword,
  onDeleteCredential,
  variant = "cafe",
}: any) {
  const adminForm = useForm({
    resolver: zodResolver(updateAdminPasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      HotelName: hotelName,
    },
  });

  const staffForm = useForm({
    resolver: zodResolver(updateCredentialSchema) as any,
    defaultValues: {
      UserName: "",
      Password: "",
      confirmPassword: "",
      Role: variant === "hotel" ? "Store" : "Kitchen",
      HotelName: hotelName,
    },
  });

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
  const [staffPending, setStaffPending] = useState(false);
  const [adminPending, setAdminPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const tenantModules = useTenantModules();

  const roleOptions = useMemo(() => {
    type RoleRow = {
      id: number;
      name: string;
      label?: string;
      module?: ModuleOption;
      modulesAny?: ModuleOption[];
    };
    const rows: RoleRow[] =
      variant === "hotel"
        ? [
            { id: 1, name: "Kitchen", label: "Kitchen (Chef)", module: "Cafe and Restaurant" },
            { id: 2, name: "Barista", label: "Bar (Barista)", module: "Cafe and Restaurant" },
            {
              id: 3,
              name: "Cashier",
              label: "Cash (Cashier)",
              modulesAny: ["Cafe and Restaurant", "Credit Management"],
            },
            { id: 4, name: "Store", label: "Store Keeper", module: "Inventory" },
            { id: 5, name: "CostControl", label: "Cost control", module: "Financial Management" },
            { id: 6, name: "Finance", label: "Finance", module: "Financial Management" },
            { id: 7, name: "Reception", label: "Reception", module: "Room Management" },
            {
              id: 8,
              name: "CMLeader",
              label: "CM leader (Cleaning & Maintenance)",
              module: "Cleaning and Maintenance",
            },
          ]
        : [
            { id: 1, name: "Kitchen" },
            { id: 2, name: "Barista" },
            { id: 3, name: "Cashier" },
            { id: 4, name: "Store" },
          ];
    return rows.filter((role) => {
      if (role.modulesAny?.length) {
        return role.modulesAny.some((m) => tenantHasModule(tenantModules, m));
      }
      return !role.module || tenantHasModule(tenantModules, role.module);
    });
  }, [variant, tenantModules]);

  const nonAdminStaff = useMemo(
    () =>
      (credentials as any[]).filter((c) =>
        variant === "hotel"
          ? c.Role !== "Admin" && c.Role !== "Manager"
          : c.Role !== "Admin",
      ),
    [credentials, variant],
  );

  const deletableStaff = useMemo(
    () =>
      nonAdminStaff.filter(
        (c) => String(c.UserName).trim() !== currentUserName,
      ),
    [nonAdminStaff, currentUserName],
  );

  return (
    <Tabs defaultValue="staff" className="mx-auto w-full min-w-0 max-w-4xl">
      <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:mb-6 sm:inline-flex sm:w-auto">
        <TabsTrigger value="staff" className="gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
          <Users className="hidden h-4 w-4 sm:inline" /> Staff
        </TabsTrigger>
        <TabsTrigger value="admin" className="gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
          <ShieldAlert className="hidden h-4 w-4 sm:inline" />{" "}
          {variant === "hotel" ? "Manager" : "Admin"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="staff">
        <Card>
          <CardHeader>
            <CardTitle>Update Staff Credentials</CardTitle>
            <CardDescription>
              Select a user and set their new access role or password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...staffForm}>
              <form
                onSubmit={staffForm.handleSubmit(async (data) => {
                  setStaffPending(true);
                  try {
                    await onUpdateCredential(data);
                  } finally {
                    setStaffPending(false);
                  }
                })}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    control={staffForm.control}
                    name="UserName"
                    fieldType={formFieldTypes.SELECT}
                    listdisplay={nonAdminStaff.map((cred: any) => ({
                      id: cred.id,
                      name: cred.UserName,
                    }))}
                    label="Select Staff Member"
                  />
                  <CustomFormField
                    control={staffForm.control}
                    name="Role"
                    fieldType={formFieldTypes.SELECT}
                    label="Update Role"
                    listdisplay={roleOptions}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    control={staffForm.control}
                    name="Password"
                    type="password"
                    label="New Password"
                    fieldType={formFieldTypes.INPUT}
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    control={staffForm.control}
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    fieldType={formFieldTypes.INPUT}
                    inputClassName="h-fit p-2 w-56"
                  />
                </div>
                <PendingButton
                  type="submit"
                  pending={staffPending}
                  className="w-full cursor-pointer"
                >
                  {staffPending ? "Updating…" : "Update Staff Access"}
                </PendingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-5 w-5" />
              Remove staff access
            </CardTitle>
            <CardDescription>
              Permanently delete a staff login. Owner accounts cannot be removed
              here, and you cannot delete your own session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...deleteForm}>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <div className="flex-1">
                  <CustomFormField
                    control={deleteForm.control}
                    name="UserName"
                    fieldType={formFieldTypes.SELECT}
                    listdisplay={deletableStaff.map((cred: any) => ({
                      id: cred.id,
                      name: cred.UserName,
                    }))}
                    label="Staff member"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="cursor-pointer shrink-0"
                  onClick={async () => {
                    const ok = await deleteForm.trigger("UserName");
                    if (ok) setDeleteDialogOpen(true);
                  }}
                >
                  Delete account
                </Button>
              </div>
            </Form>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this staff account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    User{" "}
                    <strong>{deleteUserName}</strong> will no longer
                    be able to sign in. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">
                    Cancel
                  </AlertDialogCancel>
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="admin">
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-destructive" /> Change{" "}
              {variant === "hotel" ? "manager" : "admin"} password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...adminForm}>
              <form
                onSubmit={adminForm.handleSubmit(async (data) => {
                  setAdminPending(true);
                  try {
                    await onUpdateAdminPassword(data);
                  } finally {
                    setAdminPending(false);
                  }
                })}
                className="space-y-4"
              >
                <CustomFormField
                  control={adminForm.control}
                  name="oldPassword"
                  type="password"
                  label="Current Password"
                  fieldType={formFieldTypes.INPUT}
                  inputClassName="h-fit p-2 w-56"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    control={adminForm.control}
                    name="newPassword"
                    type="password"
                    label="New Password"
                    fieldType={formFieldTypes.INPUT}
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    control={adminForm.control}
                    name="confirmPassword"
                    type="password"
                    label="Confirm New Password"
                    fieldType={formFieldTypes.INPUT}
                    inputClassName="h-fit p-2 w-56"
                  />
                </div>
                <PendingButton
                  variant="destructive"
                  type="submit"
                  pending={adminPending}
                  className="w-full gap-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {adminPending ? "Resetting…" : "Reset owner access"}
                </PendingButton>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
