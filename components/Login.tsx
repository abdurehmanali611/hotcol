"use client";
import { login } from "@/lib/validations";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { PendingButton } from "./ui/pending-button";
import { useState } from "react";
import { LoginAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    } catch {}
  };

  return (
    <Card className="mx-auto w-full max-w-sm border-primary/10 bg-card/95 shadow-2xl backdrop-blur-sm sm:max-w-104">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription className="text-base leading-relaxed text-pretty">
          Sign in with your staff username and password to open your HotCol
          dashboard.
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
              label="Username"
              placeholder="Enter your username"
              inputClassName="h-11 w-full"
            />
            <CustomFormField
              name="Password"
              control={form.control}
              fieldType={formFieldTypes.INPUT}
              label="Password"
              placeholder="Enter your password"
              inputClassName="h-11 w-full"
              type="password"
            />
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <PendingButton
              type="submit"
              pending={loading}
              className="h-11 cursor-pointer bg-green-600 font-semibold hover:bg-green-700"
            >
              {loading ? "Signing in…" : "Sign in"}
            </PendingButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/60 px-6 py-4">
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/SignUp"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default Login;
