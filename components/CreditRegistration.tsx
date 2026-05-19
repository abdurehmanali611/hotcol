/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Form } from "./ui/form";
import { Button } from "./ui/button";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { creditRegistrationSchema } from "@/lib/validations";
import {
  CreateCreditRegistration,
  creditLevel,
  CreditRegistration,
  Item,
  fetchItems,
  fetchCreditLevels,
  fetchCreditRegistrations,
  uploadImage,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Image from "next/image";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import Credittor from "@/app/Credittor/page";
import { formatCreditCycle } from "@/lib/creditCycleLabel";
import { Scissors } from "lucide-react";

interface CreditRegistrationProps {
  hotelName: string;
  businessDisplayName?: string;
}

type CreditAgreementCopyProps = {
  copyLabel: string;
  copyHint: string;
  businessNameLabel: string;
  propertyLogoUrl: string | null;
  customerName: string;
  customerImageUrl: string;
  phoneNumber: string;
  sex: string;
  creditLevel: string;
  creditLimit: number;
  timeInterval: number;
  timeFrame: string;
  effectiveDate: Date | undefined;
  paidAmount: number;
  allowedItems: string[];
};

function CreditAgreementDetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/10 py-2 print:border-stone-200">
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400 print:text-stone-500">
        {label}
      </span>
      <span
        className={`text-right text-[11px] font-medium leading-snug ${
          highlight
            ? "text-amber-300 print:text-amber-800"
            : "text-slate-100 print:text-stone-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CreditAgreementCopy({
  copyLabel,
  copyHint,
  businessNameLabel,
  propertyLogoUrl,
  customerName,
  customerImageUrl,
  phoneNumber,
  sex,
  creditLevel,
  creditLimit,
  timeInterval,
  timeFrame,
  effectiveDate,
  paidAmount,
  allowedItems,
}: CreditAgreementCopyProps) {
  const displayName = customerName.trim() || "—";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <article className="credit-agreement-copy flex h-full w-full min-h-0 flex-col overflow-hidden border-0 border-b border-white/10 bg-slate-900/90 px-5 py-3 last:border-b-0 print:border-stone-200 print:bg-white print:px-[10mm] print:py-[7mm]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200 print:border-indigo-300 print:bg-indigo-50 print:text-indigo-900">
          {copyLabel}
        </span>
        <span className="text-[9px] italic text-slate-500 print:text-stone-500">
          {copyHint}
        </span>
      </div>

      <header className="mb-3 flex items-center gap-3 border-b border-white/15 pb-3 print:border-stone-300">
        <Avatar className="h-11 w-11 shrink-0 border-2 border-white/20 print:border-stone-300">
          <AvatarImage src={propertyLogoUrl || undefined} alt={businessNameLabel} />
          <AvatarFallback className="bg-indigo-600/20 text-[10px] font-bold text-indigo-200 print:bg-indigo-100 print:text-indigo-900">
            {businessNameLabel.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-400 print:text-stone-500">
            Credit agreement
          </p>
          <h2 className="truncate text-base font-serif font-semibold tracking-wide text-slate-50 print:text-stone-950">
            {businessNameLabel}
          </h2>
          <p className="truncate text-[10px] text-slate-400 print:text-stone-600">
            & {displayName}
          </p>
        </div>
        <Avatar className="h-11 w-11 shrink-0 border-2 border-white/20 print:border-stone-300">
          <AvatarImage src={customerImageUrl || undefined} alt={displayName} />
          <AvatarFallback className="bg-violet-600/20 text-[10px] font-bold text-violet-200 print:bg-violet-100 print:text-violet-900">
            {initials}
          </AvatarFallback>
        </Avatar>
      </header>

      <div className="mb-3 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1 print:border-stone-200 print:bg-stone-50">
        <CreditAgreementDetailRow label="Customer" value={displayName} highlight />
        <CreditAgreementDetailRow label="Phone" value={phoneNumber || "—"} />
        <CreditAgreementDetailRow label="Gender" value={sex || "—"} />
        <CreditAgreementDetailRow
          label="Credit level"
          value={creditLevel || "—"}
          highlight
        />
        <CreditAgreementDetailRow
          label="Credit limit"
          value={`${Number(creditLimit).toLocaleString()} ETB`}
          highlight
        />
        <CreditAgreementDetailRow
          label="Term"
          value={formatCreditCycle(timeInterval, timeFrame)}
        />
        <CreditAgreementDetailRow
          label="Effective date"
          value={
            effectiveDate ? new Date(effectiveDate).toLocaleDateString() : "—"
          }
        />
      </div>

      <div className="mb-3 min-h-0 flex-1">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 print:text-stone-500">
          Allowed items
        </p>
        <ul className="max-h-[28mm] list-disc space-y-0.5 overflow-hidden pl-4 text-[10px] leading-snug text-slate-300 print:text-[10px] print:text-stone-800">
          {allowedItems.length > 0 ? (
            allowedItems.map((name) => (
              <li key={`${copyLabel}-${name}`} className="line-clamp-1">
                {name}
              </li>
            ))
          ) : (
            <li className="list-none pl-0 text-slate-500 print:text-stone-500">
              —
            </li>
          )}
        </ul>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 print:border-emerald-300 print:bg-emerald-50">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90 print:text-emerald-800">
          Initial payment
        </span>
        <span className="text-lg font-bold tabular-nums text-emerald-200 print:text-emerald-900">
          {Number(paidAmount).toLocaleString()} ETB
        </span>
      </div>

      <div className="border-t border-white/10 pt-3 print:border-stone-300">
        <p className="mb-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 print:text-stone-500">
          Signatures
        </p>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1">
            <div className="h-8 border-b-2 border-dotted border-slate-500 print:border-stone-500" />
            <p className="text-center text-[9px] text-slate-400 print:text-stone-600">
              Customer
            </p>
          </div>
          <div className="space-y-1">
            <div className="h-8 border-b-2 border-dotted border-slate-500 print:border-stone-500" />
            <p className="text-center text-[9px] text-slate-400 print:text-stone-600">
              {businessNameLabel} representative
            </p>
          </div>
        </div>
        <p className="mt-2 text-center text-[8px] text-slate-500 print:text-stone-500">
          Date: ___________________
        </p>
      </div>
    </article>
  );
}

function CreditAgreementCutLine() {
  return (
    <div
      role="separator"
      aria-label="Cut along this line to separate hotel and creditor copies"
      className="credit-agreement-cut relative z-10 flex w-full shrink-0 flex-col items-center justify-center gap-1 bg-slate-950 py-2 print:bg-white"
      style={{ height: "10mm" }}
    >
      <div className="w-full border-t-2 border-dashed border-amber-400/70 print:border-stone-500" />
      <div className="flex items-center gap-2 rounded-full border border-dashed border-amber-400/50 bg-slate-900 px-3 py-1 print:border-stone-400 print:bg-stone-100">
        <Scissors className="h-3 w-3 text-amber-400 print:text-stone-600" aria-hidden />
        <span className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.18em] text-amber-200 print:text-stone-700">
          Cut here
        </span>
        <Scissors className="h-3 w-3 text-amber-400 print:text-stone-600" aria-hidden />
      </div>
      <div className="w-full border-t-2 border-dashed border-amber-400/70 print:border-stone-500" />
    </div>
  );
}

const CreditRegistrationForm = ({
  hotelName,
  businessDisplayName,
}: CreditRegistrationProps) => {
  const businessNameLabel = (businessDisplayName || "").trim() || "Cafe";
  const [loading, setLoading] = useState(false);
  const [creditLevels, setCreditLevels] = useState<creditLevel[]>([]);
  const agreementRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creditRegistrant, setCreditRegistrant] = useState<
    CreditRegistration[]
  >([]);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [propertyLogoUrl, setPropertyLogoUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof creditRegistrationSchema>>({
    resolver: zodResolver(creditRegistrationSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      phoneNumber: "",
      sex: "Male",
      creditLevel: "Bronze",
      registrationDate: new Date(),
      paidAmount: 0,
      HotelName:
        (typeof window !== "undefined" &&
          localStorage.getItem("hotel_name")) ||
        hotelName,
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPropertyLogoUrl(localStorage.getItem("logo_url"));
    }
  }, []);

  useEffect(() => {
    const fetchingCreditLevel = async () => {
      try {
        const data = await fetchCreditLevels();
        if (Array.isArray(data)) {
          const filtered = data.filter((item: creditLevel) =>
            rowHotelMatchesTenantScope(item.HotelName, hotelName),
          );
          setCreditLevels(filtered);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to fetch credit levels");
      }
    };
    const fetchingRegistrant = async () => {
      try {
        const response = await fetchCreditRegistrations();
        if (Array.isArray(response)) {
          const hotelReg = response.filter((item) =>
            rowHotelMatchesTenantScope(item.HotelName, hotelName),
          );
          setCreditRegistrant(hotelReg);
        } else {
          setCreditRegistrant([]);
        }
      } catch (error: any) {
        toast.error(error.message);
        throw error;
      }
    };
    const fetchingMenuItems = async () => {
      try {
        const rows = await fetchItems();
        if (Array.isArray(rows)) {
          const filtered = rows.filter((it: Item) =>
            rowHotelMatchesTenantScope(it.HotelName, hotelName),
          );
          setMenuItems(filtered);
        } else {
          setMenuItems([]);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to fetch items");
      }
    };
    fetchingCreditLevel();
    fetchingRegistrant();
    fetchingMenuItems();
  }, [hotelName]);

  const watchedValues = form.watch();
  const selectedItemNames = useMemo(
    () =>
      menuItems
        .filter((it) => selectedItems[it.id])
        .map((it) => it.name),
    [menuItems, selectedItems],
  );

  const selectedLevelDetails = useMemo(() => {
    return creditLevels.find(
      (item) => item.level === watchedValues.creditLevel,
    );
  }, [creditLevels, watchedValues.creditLevel]);

  const handlePrint = useReactToPrint({
    contentRef: agreementRef,
    documentTitle: `Credit_Agreement_${form.getValues("name")}`,
  });

  const handleDownloadPDF = async () => {
    const element = agreementRef.current;
    if (!element) return;

    try {
      setLoading(true);

      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const img = new window.Image();
      img.src = dataUrl;

      img.onload = () => {
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;

        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Agreement_${form.getValues("name") || "User"}.pdf`);
      };

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error(`Failed to generate PDF ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof creditRegistrationSchema>) => {
    if (!selectedLevelDetails)
      return toast.error("Please select a valid credit level");

    try {
      setLoading(true);
      if (!selectedLevelDetails?.level) {
        toast.error("No Credit Level Created: Please Announce the Admin");
      } else if (values.creditLevel !== selectedLevelDetails.level) {
        toast.error(
          `${values.creditLevel} is not Created yet: Please Announce the Admin`,
        );
      } else {
        const payload = {
          ...values,
          amount: selectedLevelDetails.requiredAmount,
          timeInterval: selectedLevelDetails.timeInterval,
          timeFrame: selectedLevelDetails.timeFrame,
        };
        await CreateCreditRegistration(payload);
        toast.success("Credit registration successful");
      }
    } catch (error: any) {
      toast.error(error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">
          Credit Registration
        </CardTitle>
        <CardDescription>
          Managing credit users for{" "}
          <span className="font-semibold text-primary">{businessNameLabel}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border h-fit">
            <h2 className="text-xl font-semibold mb-6 border-b pb-2">
              User Information
            </h2>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    name="name"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Customer Name"
                    placeholder="e.g. John Doe"
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="phoneNumber"
                    control={form.control}
                    fieldType={formFieldTypes.PHONE_INPUT}
                    label="Phone Number"
                    formItemClassName="items-center w-56"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    name="sex"
                    control={form.control}
                    fieldType={formFieldTypes.RADIO_BUTTON}
                    label="Gender"
                    listdisplay={["Male", "Female"]}
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="creditLevel"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Credit Level"
                    listdisplay={[
                      { id: 1, name: "Bronze" },
                      { id: 2, name: "Silver" },
                      { id: 3, name: "Gold" },
                    ]}
                    inputClassName="h-fit p-2 w-56"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    name="registrationDate"
                    control={form.control}
                    fieldType={formFieldTypes.CALENDAR}
                    label="Registration Date"
                    inputClassName="mx-1 h-fit p-2 w-40"
                  />
                  <CustomFormField
                    name="paidAmount"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Paid Amount"
                    type="number"
                    inputClassName="h-fit p-2 w-56"
                  />
                </div>
                <CustomFormField
                  name="imageUrl"
                  control={form.control}
                  fieldType={formFieldTypes.IMAGE_UPLOADER}
                  label="Customer Image"
                  previewUrl={previewUrl}
                  handleCloudinary={(result) =>
                    uploadImage(result, form, setPreviewUrl, "imageUrl")
                  }
                />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Select allowed items</h3>
                    <p className="text-xs text-muted-foreground">
                      Same style as hotel cashier: pick dishes/drinks this credit user can take.
                    </p>
                  </div>
                  <ScrollArea className="h-[min(22rem,45vh)] rounded-xl border border-border/70 bg-muted/10">
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                      {menuItems.map((it) => (
                        <div
                          key={it.id}
                          className={`rounded-xl border bg-card overflow-hidden shadow-sm transition-all ${
                            selectedItems[it.id]
                              ? "ring-2 ring-primary border-primary/35 shadow-md"
                              : "border-border/70 hover:border-primary/25"
                          }`}
                        >
                          <div className="relative aspect-video bg-muted">
                            {it.imageUrl ? (
                              <Image
                                src={it.imageUrl}
                                alt={it.name}
                                fill
                                className="object-cover"
                                sizes="(max-width:640px) 90vw, 45vw"
                              />
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-2.5 pb-2 pt-6">
                              <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                                {it.name}
                              </p>
                              <p className="mt-1 text-[10px] tabular-nums text-emerald-200">
                                ETB {Number(it.price).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-border/60 bg-card/95 p-3">
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                              <Checkbox
                                checked={!!selectedItems[it.id]}
                                onCheckedChange={(ck) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [it.id]: ck === true,
                                  }))
                                }
                                className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              Select item
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <Button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  {loading ? "Registering..." : "Register User"}
                </Button>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-3">
            <section
              ref={agreementRef}
              className="credit-agreement-sheet mx-auto flex w-full max-w-[210mm] flex-col flex-nowrap overflow-hidden rounded-xl border border-indigo-500/30 bg-slate-950 text-slate-50 shadow-2xl print:m-0 print:flex print:flex-col print:h-[297mm] print:w-[210mm] print:rounded-none print:border-stone-300 print:bg-white print:text-stone-950 print:shadow-none"
              style={{ height: "297mm" }}
            >
              <div
                className="flex min-h-0 flex-[1_1_0] flex-col"
                style={{ height: "calc((297mm - 10mm) / 2)" }}
              >
                <CreditAgreementCopy
                  copyLabel="Hotel copy"
                  copyHint="Retain at property"
                  businessNameLabel={businessNameLabel}
                  propertyLogoUrl={propertyLogoUrl}
                  customerName={watchedValues.name}
                  customerImageUrl={watchedValues.imageUrl}
                  phoneNumber={watchedValues.phoneNumber}
                  sex={watchedValues.sex}
                  creditLevel={watchedValues.creditLevel}
                  creditLimit={selectedLevelDetails?.requiredAmount ?? 0}
                  timeInterval={selectedLevelDetails?.timeInterval ?? 0}
                  timeFrame={selectedLevelDetails?.timeFrame ?? ""}
                  effectiveDate={watchedValues.registrationDate}
                  paidAmount={watchedValues.paidAmount}
                  allowedItems={selectedItemNames}
                />
              </div>
              <CreditAgreementCutLine />
              <div
                className="flex min-h-0 flex-[1_1_0] flex-col"
                style={{ height: "calc((297mm - 10mm) / 2)" }}
              >
                <CreditAgreementCopy
                  copyLabel="Creditor copy"
                  copyHint="Give to customer"
                  businessNameLabel={businessNameLabel}
                  propertyLogoUrl={propertyLogoUrl}
                  customerName={watchedValues.name}
                  customerImageUrl={watchedValues.imageUrl}
                  phoneNumber={watchedValues.phoneNumber}
                  sex={watchedValues.sex}
                  creditLevel={watchedValues.creditLevel}
                  creditLimit={selectedLevelDetails?.requiredAmount ?? 0}
                  timeInterval={selectedLevelDetails?.timeInterval ?? 0}
                  timeFrame={selectedLevelDetails?.timeFrame ?? ""}
                  effectiveDate={watchedValues.registrationDate}
                  paidAmount={watchedValues.paidAmount}
                  allowedItems={selectedItemNames}
                />
              </div>
              <p className="hidden shrink-0 bg-slate-950 py-1 text-center text-[8px] text-slate-500 print:block print:bg-white print:text-stone-500">
                One A4 sheet — cut along the dashed line — two identical agreements
              </p>
            </section>
            <div className="grid grid-cols-2 gap-2 print:hidden">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownloadPDF()}
                disabled={!watchedValues.name || !selectedLevelDetails}
                className="w-full text-xs cursor-pointer"
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePrint()}
                disabled={!watchedValues.name || !selectedLevelDetails}
                className="w-full text-xs cursor-pointer"
              >
                Print A4
              </Button>
            </div>
          </div>
        </div>
        <Credittor credittor={creditRegistrant} />
      </CardContent>
    </Card>
  );
};

export default CreditRegistrationForm;
