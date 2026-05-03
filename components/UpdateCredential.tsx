/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
      Role: "Kitchen",
      HotelName: hotelName,
    },
  });

  const deleteForm = useForm<z.infer<typeof deleteCredentialSchema>>({
    resolver: zodResolver(deleteCredentialSchema),
    defaultValues: { UserName: "" },
  });

  const [currentUserName, setCurrentUserName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentUserName(
      typeof window !== "undefined"
        ? (localStorage.getItem("user_name")?.trim() ?? "")
        : "",
    );
  }, []);

  const nonAdminStaff = useMemo(
    () => (credentials as any[]).filter((c) => c.Role !== "Admin"),
    [credentials],
  );

  const deletableStaff = useMemo(
    () =>
      nonAdminStaff.filter(
        (c) => String(c.UserName).trim() !== currentUserName,
      ),
    [nonAdminStaff, currentUserName],
  );

  return (
    <Tabs defaultValue="staff" className="max-w-4xl mx-auto">
      <TabsList className="mb-6">
        <TabsTrigger value="staff" className="gap-2">
          <Users className="h-4 w-4" /> Staff Accounts
        </TabsTrigger>
        <TabsTrigger value="admin" className="gap-2">
          <ShieldAlert className="h-4 w-4" /> Admin Security
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
                onSubmit={staffForm.handleSubmit(onUpdateCredential)}
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
                    listdisplay={[
                      { id: 1, name: "Kitchen" },
                      { id: 2, name: "Barista" },
                      { id: 3, name: "Cashier" },
                      { id: 4, name: "Store" }
                    ]}
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
                <Button type="submit" className="w-full cursor-pointer">
                  Update Staff Access
                </Button>
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
              Permanently delete a staff login. Admin accounts cannot be removed
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
                    <strong>{deleteForm.watch("UserName")}</strong> will no longer
                    be able to sign in. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async (e) => {
                      e.preventDefault();
                      const name = deleteForm.getValues("UserName");
                      try {
                        await onDeleteCredential(name);
                        deleteForm.reset({ UserName: "" });
                        setDeleteDialogOpen(false);
                      } catch {
                        // Toasts handled in deleteCredential / server layer
                      }
                    }}
                  >
                    Delete permanently
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
              <KeyRound className="h-5 w-5 text-destructive" /> Change Admin
              Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...adminForm}>
              <form
                onSubmit={adminForm.handleSubmit(onUpdateAdminPassword)}
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
                <Button
                  variant="destructive"
                  type="submit"
                  className="w-full gap-2"
                >
                  <RefreshCcw className="h-4 w-4" /> Reset Admin Access
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
