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
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function SignUp() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      HotelName: "",
      LogoUrl: "",
      UserName: "",
      Password: "",
    },
  });
  return (
    <div className="flex flex-col gap-10 items-center h-screen justify-center" style={{backgroundImage: "url('/assets/signup.jpg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover"}}>
      <Card>
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Register your hotel</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="flex flex-col gap-5" onSubmit={form.handleSubmit((values) => {
                handleCredential(values, setIsLoading)
                form.reset()
                setPreviewUrl(null)
                toast.success("Created Successfully")
                })}>
              <div className="flex items-start gap-5">
                <CustomFormField
                  name="HotelName"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Hotel name:"
                  placeholder="Enter your hotel name"
                  inputClassName="h-fit p-2 w-56"
                />
                <CustomFormField
                  name="LogoUrl"
                  control={form.control}
                  fieldType={formFieldTypes.IMAGE_UPLOADER}
                  label="Hotel name:"
                  placeholder="Enter your image"
                  previewUrl={previewUrl}
                  handleCloudinary={(result) =>
                    uploadImage(result, form, setPreviewUrl, "LogoUrl")
                  }
                />
              </div>
              <div className="flex items-center gap-5">
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
              <Button type="submit" className="cursor-pointer bg-green-500">
                {isLoading ? "Creating...": "Create"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
