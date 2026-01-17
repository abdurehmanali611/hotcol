/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { ShieldAlert, Users, KeyRound, RefreshCcw } from "lucide-react";
import CustomFormField, { formFieldTypes } from "./customFormField";
import {
  updateAdminPasswordSchema,
  updateCredentialSchema,
} from "@/lib/validations";

export default function UpdateCredential({
  credentials,
  hotelName,
  onUpdateCredential,
  onUpdateAdminPassword,
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
                    listdisplay={credentials.map((cred: any) => ({
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
                      { id: "1", name: "Kitchen" },
                      { id: "2", name: "Barista" },
                      { id: "3", name: "Cashier" },
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
