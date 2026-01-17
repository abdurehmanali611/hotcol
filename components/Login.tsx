"use client";
import { login } from "@/lib/validations";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Button } from "./ui/button";
import { useState } from "react";
import { LoginAction } from "@/lib/actions";
import { useRouter } from "next/navigation";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof login>>({
    resolver: zodResolver(login),
    defaultValues: {
      UserName: "",
      Password: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof login>) => {
    try {
      await LoginAction(values, setLoading, setError, router);
      form.reset();
    } catch {
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-serif font-semibold">
          Login
        </CardTitle>
        <CardDescription className="text-lg font-serif">
          Authenticate YourSelf
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <CustomFormField
              name="UserName"
              control={form.control}
              fieldType={formFieldTypes.INPUT}
              label="Username:"
              placeholder="Enter your username"
              inputClassName="h-fit p-2 w-60"
            />
            <CustomFormField
              name="Password"
              control={form.control}
              fieldType={formFieldTypes.INPUT}
              label="Password:"
              placeholder="Enter your password"
              inputClassName="h-fit p-2 w-60"
              type="password"
            />
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="cursor-pointer bg-green-500 hover:bg-green-600"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </span>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      {/* <CardFooter className="flex justify-center">
        <Link href="/SignUp" className="font-serif text-lg text-blue-400 underline cursor-pointer">Create an account</Link>
      </CardFooter> */}
    </Card>
  );
};

export default Login;
