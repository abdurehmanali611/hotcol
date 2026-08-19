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
import {
  AUTH_BAND,
  AUTH_BUTTON,
  AUTH_CARD_CLASS,
  AUTH_EYEBROW,
  AUTH_LABEL_COOL,
  AUTH_LABEL_WARM,
  AUTH_LINK,
  AUTH_MUTED,
  AUTH_PANEL_COOL,
  AUTH_PANEL_WARM,
  AUTH_SUBTITLE,
  AUTH_TITLE,
} from "./AuthPageShell";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { PendingButton } from "./ui/pending-button";
import { useState } from "react";
import { LoginAction } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    <Card
      className={cn(
        "mx-auto w-full max-w-105 gap-0 py-0",
        AUTH_CARD_CLASS,
      )}
    >
      <CardHeader className={cn("space-y-1.5 px-8 pt-6 pb-2 text-center", AUTH_BAND)}>
        <p className={AUTH_EYEBROW}>Staff access</p>
        <CardTitle className={cn("text-[1.65rem]", AUTH_TITLE)}>
          Welcome back
        </CardTitle>
        <CardDescription className={cn("text-[15px]", AUTH_SUBTITLE)}>
          Sign in with your staff username and password to open your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pt-4 pb-5">
        <Form {...form}>
          <form
            className="flex flex-col gap-3.5"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className={AUTH_PANEL_WARM}>
              <CustomFormField
                name="UserName"
                control={form.control}
                fieldType={formFieldTypes.INPUT}
                label="Username"
                placeholder="Enter your username"
                labelClassName={AUTH_LABEL_WARM}
                inputClassName="h-11 w-full border-violet-500/30 bg-black/25 text-violet-50 placeholder:text-violet-200/45 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/25"
              />
            </div>
            <div className={AUTH_PANEL_COOL}>
              <CustomFormField
                name="Password"
                control={form.control}
                fieldType={formFieldTypes.INPUT}
                label="Password"
                placeholder="Enter your password"
                labelClassName={AUTH_LABEL_COOL}
                inputClassName="h-11 w-full border-indigo-500/35 bg-black/25 text-indigo-50 placeholder:text-indigo-200/45 focus-visible:border-indigo-400/70 focus-visible:ring-indigo-400/30"
                type="password"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-sm leading-relaxed text-red-200">
                {error}
              </div>
            )}
            <PendingButton
              type="submit"
              pending={loading}
              className={cn(
                "h-11 cursor-pointer font-semibold tracking-wide",
                AUTH_BUTTON,
              )}
            >
              {loading ? "Signing in…" : "Sign in"}
            </PendingButton>
          </form>
        </Form>
      </CardContent>
      <CardFooter className={cn("justify-center border-t px-8 py-4", AUTH_BAND)}>
        <p className={cn("text-center text-sm", AUTH_MUTED)}>
          Don&apos;t have an account?{" "}
          <Link href="/SignUp" className={AUTH_LINK}>
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default Login;
