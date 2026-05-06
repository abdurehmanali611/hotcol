"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "costControl" | "finance";

const SECTIONS: Record<
  Variant,
  { title: string; items: { term: string; definition: string }[] }[]
> = {
  costControl: [
    {
      title: "Roles & flow",
      items: [
        {
          term: "Cost control",
          definition:
            "Checks store purchase requests and stock movements before they finalize. Existing-stock changes stop here unless rejected.",
        },
        {
          term: "Finance (next step)",
          definition:
            "After you approve a purchase request, finance authorises payment; the store registers stock when goods are received.",
        },
        {
          term: "Purchase request",
          definition:
            "Store asks to buy something not yet in inventory. Path: store → cost control → finance.",
        },
        {
          term: "Stock movement request",
          definition:
            "Store asks to reduce quantity on an existing line (stock out, wastage, or return to supplier). It applies only after you approve.",
        },
      ],
    },
    {
      title: "Audit & IDs",
      items: [
        {
          term: "Cost controller identity",
          definition:
            "A name your manager registered. Even if several people share one login, pick your name when approving so reports show who acted.",
        },
        {
          term: "Inventory registration ID",
          definition:
            "The internal row number of that item in master inventory (the line the movement will deduct from).",
        },
        {
          term: "Qty",
          definition: "Quantity — how many units of measure are involved.",
        },
      ],
    },
    {
      title: "Movement types",
      items: [
        {
          term: "Stock out",
          definition:
            "Stock leaves the store for use elsewhere (e.g. kitchen or bar), not a café sale in this screen.",
        },
        {
          term: "Wastage",
          definition: "Stock written off as spoiled, damaged, or unusable.",
        },
        {
          term: "Return to supplier",
          definition: "Stock sent back to the vendor; reduces on-hand quantity when approved.",
        },
      ],
    },
    {
      title: "Station daily counts (kitchen, bar, etc.)",
      items: [
        {
          term: "Opening pulse",
          definition:
            "Physical count when the day starts at the station (kitchen/chef is one station; bar, juicer, cleaning, and other stakeholders match store stock-out labels).",
        },
        {
          term: "Approved stock-out",
          definition:
            "Total quantity moved from the store to that station on the calendar day, only after you approve the store’s stock-out request — you do not type this on the daily form.",
        },
        {
          term: "Lights-out",
          definition:
            "System-calculated on-hand at close from opening pulse, approved stock-out that day, and usage since the prior day (today’s opening minus the previous day’s lights-out when a prior row exists).",
        },
        {
          term: "Sealed movement",
          definition:
            "When the next day’s opening pulse exists: prior opening + prior approved stock-out − today’s opening (first day in a chain has no prior seal).",
        },
        {
          term: "Sync monthly inventory",
          definition:
            "Rolls daily rows into a month: sums sealed movement for the month and stores last lights-out on-hand for finance and managers.",
        },
      ],
    },
    {
      title: "Money",
      items: [
        {
          term: "ETB",
          definition: "Ethiopian Birr — currency used for estimated prices and line totals.",
        },
        {
          term: "Est. price / unit",
          definition:
            "Rough unit price the store entered; finance uses it with quantity to estimate the line before payment.",
        },
      ],
    },
  ],
  finance: [
    {
      title: "Your role",
      items: [
        {
          term: "Finance approval",
          definition:
            "You confirm payment authorisation after cost control. The store team registers received stock separately when goods arrive.",
        },
        {
          term: "Cost control (before you)",
          definition:
            "Already checked the request; your queue only shows items they approved for payment.",
        },
      ],
    },
    {
      title: "Queue & history",
      items: [
        {
          term: "Payment queue",
          definition:
            "Purchase requests in “awaiting finance” state. Approve to record payment authorisation; the store registers inventory when goods arrive.",
        },
        {
          term: "History",
          definition:
            "Recent finance outcomes (approved or rejected) for your audit trail.",
        },
        {
          term: "Cost control reviewer",
          definition:
            "The registered identity name of the person who approved at the cost-control step (not necessarily their login username).",
        },
      ],
    },
    {
      title: "Amounts & codes",
      items: [
        {
          term: "Est. line total",
          definition:
            "Quantity × estimated unit price in ETB — indicative until you approve; store receipt is separate.",
        },
        {
          term: "ETB",
          definition: "Ethiopian Birr.",
        },
        {
          term: "Status labels",
          definition:
            "“Awaiting finance” means ready for you. “Approved by finance (awaiting store receipt)” means payment is cleared; the store still registers the item when delivered.",
        },
      ],
    },
  ],
};

export function HotelWorkflowGlossary({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sections = SECTIONS[variant];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn(className)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto gap-2 border-dashed text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Terms used on this page
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 rounded-xl border bg-card/80 p-4 sm:p-5 text-sm shadow-inner space-y-5 data-[state=closed]:animate-out">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              {section.title}
            </h3>
            <dl className="space-y-2.5">
              {section.items.map(({ term, definition }) => (
                <div key={term}>
                  <dt className="font-medium text-foreground">{term}</dt>
                  <dd className="text-muted-foreground leading-relaxed pl-0 sm:pl-0 mt-0.5">
                    {definition}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
