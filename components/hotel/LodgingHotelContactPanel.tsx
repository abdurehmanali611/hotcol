"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { PendingButton } from "@/components/ui/pending-button";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Phone } from "lucide-react";
import {
  fetchTenantHotelContact,
  updateTenantHotelPhoneApi,
} from "@/lib/api/lodgingHotelContact";
import { notifyApiFailure } from "@/lib/actions";
import {
  LODGING_ACCENTS,
  LodgingPanelShell,
  LodgingSectionCard,
  lodgingPrimaryBtnClass,
} from "@/components/hotel/lodgingChrome";
import { cn } from "@/lib/utils";

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
    <LodgingPanelShell className="mx-auto max-w-xl">
      <LodgingSectionCard
        title="Guest call center"
        description={
          displayName
            ? `Primary number is required. Guests dial from the HotCol Room phone icon next to Exit. If you add a second line, guests choose which to call. Property: ${displayName}.`
            : "Primary number is required. Guests dial from the HotCol Room phone icon next to Exit. If you add a second line, guests choose which to call."
        }
        icon={<Phone className="h-4 w-4" />}
        accent={LODGING_ACCENTS.primary}
      >
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
                fieldType={FormFieldTypes.PHONE_INPUT}
                label="Primary phone (required)"
                placeholder="Front desk"
                required
                inputClassName="h-fit w-full"
              />
              <CustomFormField
                name="hotelPhoneSecondary"
                control={form.control}
                fieldType={FormFieldTypes.PHONE_INPUT}
                label="Secondary phone (optional)"
                placeholder="Reception / alternate"
                inputClassName="h-fit w-full"
              />
              <PendingButton
                type="submit"
                className={cn(lodgingPrimaryBtnClass)}
                pending={saving}
              >
                Save numbers
              </PendingButton>
            </form>
          </Form>
        )}
      </LodgingSectionCard>
    </LodgingPanelShell>
  );
}
