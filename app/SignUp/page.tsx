"use client";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { handleCredential, uploadImage } from "@/lib/actions";
import { SignUpSchema } from "@/lib/validations";
import {
  BUSINESS_TYPES,
  MODULE_OPTIONS,
  SIGNUP_REQUIRED_MODULES_CAFE,
  SIGNUP_REQUIRED_MODULES_LODGING,
} from "@/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export default function SignUp() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      HotelName: "",
      LogoUrl: "",
      UserName: "",
      Password: "",
      tinNumber: "",
      type: "Cafe and Restaurant",
      modules: [...SIGNUP_REQUIRED_MODULES_CAFE],
    },
  });

  const businessType = useWatch({
    control: form.control,
    name: "type",
  });

  useEffect(() => {
    const required =
      businessType === "Cafe and Restaurant"
        ? [...SIGNUP_REQUIRED_MODULES_CAFE]
        : [...SIGNUP_REQUIRED_MODULES_LODGING];
    const current = form.getValues("modules") ?? [];
    const next = [...new Set([...required, ...current])].filter((m) =>
      (MODULE_OPTIONS as readonly string[]).includes(m),
    ) as z.infer<typeof SignUpSchema>["modules"];
    form.setValue("modules", next);
  }, [businessType, form]);

  return (
    <div
      className="flex flex-col gap-10 items-center min-h-screen justify-center py-10 px-4"
      style={{
        backgroundImage: "url('/assets/signup.jpg')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Card className="w-fit max-w-2xl">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Register your business</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="flex flex-col gap-5"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  await handleCredential(values, setIsLoading);
                  form.reset({
                    HotelName: "",
                    LogoUrl: "",
                    UserName: "",
                    Password: "",
                    tinNumber: "",
                    type: "Cafe and Restaurant",
                    modules: [...SIGNUP_REQUIRED_MODULES_CAFE],
                  });
                  setPreviewUrl(null);
                  toast.success("Created successfully");
                } catch (e: unknown) {
                  const msg =
                    e instanceof Error ? e.message : "Registration failed";
                  toast.error(msg);
                }
              })}
            >
              <div className="flex flex-wrap items-start gap-5">
                <CustomFormField
                  name="HotelName"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Business name:"
                  placeholder="Enter your business name"
                  inputClassName="h-fit p-2 w-56"
                />
                <CustomFormField
                  name="tinNumber"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="TIN number (optional):"
                  placeholder="10 digits, or leave blank — we assign TIN_…"
                  inputClassName="h-fit p-2 w-56"
                />
              </div>

              <CustomFormField
                name="type"
                control={form.control}
                fieldType={formFieldTypes.RADIO_BUTTON}
                label="Business type"
                listdisplay={[...BUSINESS_TYPES]}
                inputClassName="flex flex-row flex-wrap gap-4 items-center h-auto min-h-0 py-1"
              />

              <div className="flex flex-wrap items-center gap-5">
                <CustomFormField
                  name="UserName"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="User name:"
                  placeholder="Enter your user name"
                  inputClassName="h-fit p-2 w-56"
                />
                <CustomFormField
                  name="Password"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Password:"
                  placeholder="Enter your password"
                  inputClassName="h-fit p-2 w-56"
                  type="password"
                />
              </div>

              <CustomFormField
                name="modules"
                control={form.control}
                fieldType={formFieldTypes.CHECKBOX_GROUP}
                label="Modules"
                listdisplay={[...MODULE_OPTIONS]}
                inputClassName="sm:grid-cols-2 w-fit"
              />

              <CustomFormField
                name="LogoUrl"
                control={form.control}
                fieldType={formFieldTypes.IMAGE_UPLOADER}
                label="Logo:"
                placeholder="Upload your logo"
                previewUrl={previewUrl}
                handleCloudinary={(result) =>
                  uploadImage(result, form, setPreviewUrl, "LogoUrl")
                }
              />
              <Button type="submit" className="cursor-pointer bg-green-500">
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
