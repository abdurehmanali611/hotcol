"use client";

import type { ReactNode } from "react";
import type { Order } from "@/lib/actions";
import { CafeStationPrepSummary } from "@/components/cafe/CafeStationPrepSummary";

type Station = "kitchen" | "bar";

type Props = {
  orders: Order[];
  station: Station;
  qtyVisibleTitles?: ReadonlySet<string>;
  children: ReactNode;
};

export function CafeStationOrdersLayout({
  orders,
  station,
  qtyVisibleTitles,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72 xl:w-80">
        <CafeStationPrepSummary
          orders={orders}
          station={station}
          qtyVisibleTitles={qtyVisibleTitles}
        />
      </aside>
      <div className="order-1 min-w-0 flex-1 lg:order-2">{children}</div>
    </div>
  );
}
