"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { PendingButton } from "@/components/ui/pending-button";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Phone } from "lucide-react";
import {
  fetchTenantHotelContact,
  updateTenantHotelPhoneApi,
} from "@/lib/api/lodgingHotelContact";
import { notifyApiFailure } from "@/lib/actions";

const hotelContactSchema = z.object({
  hotelPhone: z
    .string()
    .trim()
    .min(8, "Primary phone is required"),
  hotelPhoneSecondary: z.string().trim().optional(),
});

type HotelContactForm = z.infer<typeof hotelContactSchema>;

export function LodgingHotelContactPanel() {
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<HotelContactForm>({
    resolver: zodResolver(hotelContactSchema),
    defaultValues: {
      hotelPhone: "",
      hotelPhoneSecondary: "",
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchTenantHotelContact();
      form.reset({
        hotelPhone: row.hotelPhone || "",
        hotelPhoneSecondary: row.hotelPhoneSecondary || "",
      });
      setDisplayName(row.hotelDisplayName || "");
    } catch (e) {
      notifyApiFailure(e, "Could not load hotel phones");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(data: HotelContactForm) {
    setSaving(true);
    try {
      const row = await updateTenantHotelPhoneApi({
        hotelPhone: data.hotelPhone,
        hotelPhoneSecondary: data.hotelPhoneSecondary || "",
      });
      form.reset({
        hotelPhone: row.hotelPhone || "",
        hotelPhoneSecondary: row.hotelPhoneSecondary || "",
      });
      setDisplayName(row.hotelDisplayName || displayName);
    } catch (e) {
      notifyApiFailure(e, "Could not save hotel phones");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-xl overflow-hidden border-border/80 bg-card/95 shadow-md ring-1 ring-black/5 dark:ring-white/10">
      <div className="h-1 bg-linear-to-r from-primary/60 via-sky-500/45 to-emerald-500/40" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-5 w-5 text-primary" />
          Guest call center
        </CardTitle>
        <CardDescription>
          Primary number is required. Guests dial from the HotCol Room phone
          icon next to Exit. If you add a second line, guests choose which to
          call.
          {displayName ? (
            <>
              {" "}
              Property:{" "}
              <span className="font-medium text-foreground">{displayName}</span>.
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Form {...form}>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((data) => void onSubmit(data))}
            >
              <CustomFormField
                name="hotelPhone"
                control={form.control}
                fieldType={formFieldTypes.PHONE_INPUT}
                label="Primary phone (required)"
                placeholder="Front desk"
                required
                inputClassName="h-fit w-full"
              />
              <CustomFormField
                name="hotelPhoneSecondary"
                control={form.control}
                fieldType={formFieldTypes.PHONE_INPUT}
                label="Secondary phone (optional)"
                placeholder="Reception / alternate"
                inputClassName="h-fit w-full"
              />
              <PendingButton type="submit" pending={saving}>
                Save numbers
              </PendingButton>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
