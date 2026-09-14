"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decodeCafeTableSplit } from "@/lib/cafeTableOrder";
import { cn } from "@/lib/utils";

export type CafeTableSeatTab = {
  tableNo: number;
  /** Optional right-side hint (e.g. amount). */
  hint?: string;
  ready?: boolean;
};

type Props = {
  seats: CafeTableSeatTab[];
  value: number;
  onValueChange: (tableNo: number) => void;
  parentCaption?: string | null;
  className?: string;
};

function seatTabLabel(
  tableNo: number,
  parentCaption?: string | null,
): string {
  const parts = decodeCafeTableSplit(tableNo);
  if (!parts) return "Original";
  const suffix = `${parts.parentTableNo}.${parts.splitIndex}`;
  const caption = String(parentCaption ?? "").trim();
  return caption ? `${caption} ${suffix}` : suffix;
}

/** Flush-left seat switcher for original + split tickets. */
export function CafeTableSeatTabs({
  seats,
  value,
  onValueChange,
  parentCaption,
  className,
}: Props) {
  if (seats.length <= 1) return null;

  return (
    <div
      className={cn("border-b", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Tabs
        value={String(value)}
        onValueChange={(next) => onValueChange(Number(next))}
        className="gap-0"
      >
        <div className="flex items-stretch justify-start overflow-x-auto px-3 sm:px-4">
          <TabsList className="h-auto w-max max-w-none justify-start gap-0 rounded-none bg-transparent p-0">
            {seats.map((seat) => (
              <TabsTrigger
                key={seat.tableNo}
                value={String(seat.tableNo)}
                className={cn(
                  "relative h-10 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-3 text-xs font-medium shadow-none",
                  "text-muted-foreground hover:text-foreground",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
                  seat.ready &&
                    "data-[state=inactive]:text-emerald-700 dark:data-[state=inactive]:text-emerald-300",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span>{seatTabLabel(seat.tableNo, parentCaption)}</span>
                  {seat.hint ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {seat.hint}
                    </span>
                  ) : null}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}
