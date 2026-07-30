"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Phone } from "lucide-react";
import {
  fetchTenantHotelContact,
  updateTenantHotelPhoneApi,
} from "@/lib/api/lodgingHotelContact";
import { notifyApiFailure } from "@/lib/actions";

export function LodgingHotelContactPanel() {
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchTenantHotelContact();
      setPhone(row.hotelPhone || "");
      setDisplayName(row.hotelDisplayName || "");
    } catch (e) {
      notifyApiFailure(e, "Could not load hotel phone");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    try {
      const row = await updateTenantHotelPhoneApi(phone);
      setPhone(row.hotelPhone || "");
      setDisplayName(row.hotelDisplayName || displayName);
    } catch (e) {
      notifyApiFailure(e, "Could not save hotel phone");
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
          Set the front-desk number guests dial from the HotCol Room app (phone
          icon next to Exit). Include country code when possible, e.g.{" "}
          <span className="font-medium text-foreground">+251911234567</span>.
          {displayName ? (
            <>
              {" "}
              Property:{" "}
              <span className="font-medium text-foreground">{displayName}</span>.
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="hotel-phone">Hotel phone number</Label>
              <Input
                id="hotel-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251…"
                autoComplete="tel"
              />
            </div>
            <PendingButton pending={saving} onClick={() => void onSave()}>
              Save number
            </PendingButton>
          </>
        )}
      </CardContent>
    </Card>
  );
}
