"use client";

import Image from "next/image";
import {
  CheckCircle,
  CheckCircle2,
  Hash,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import type { Order, Table } from "@/lib/actions";
import {
  groupCafeStationOrderCards,
  normalizeOrderTableNo,
  type CafeStationOrderGroup,
} from "@/lib/cafeTableOrder";
import {
  getOrderRevisionRound,
  getOrderRevisionTier,
  maxRevisionRoundInGroup,
} from "@/lib/cafeOrderRevision";
import { CafeTableLabel } from "@/components/cafe/CafeTableLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  orders: Order[];
  cafeTables: Pick<Table, "tableNo" | "orderCaption">[];
  updatingId: number | null;
  updatingGroupKey: string | null;
  onStatusUpdate: (id: number, status: "Completed" | "Cancelled") => void;
  onCompleteAll: (groupKey: string, ids: number[]) => void;
};

function RevisionBadge({ round }: { round: number }) {
  const tier = getOrderRevisionTier(round);
  if (!tier) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "ml-1 h-5 px-1.5 text-[10px] font-medium",
        tier.badge,
      )}
    >
      {tier.label}
      {round > 1 ? ` · ${round}` : ""}
    </Badge>
  );
}

function OrderLine({
  order,
  updatingId,
  groupBusy,
  showUpdateBadge,
  onStatusUpdate,
}: {
  order: Order;
  updatingId: number | null;
  groupBusy: boolean;
  showUpdateBadge: boolean;
  onStatusUpdate: (id: number, status: "Completed" | "Cancelled") => void;
}) {
  const lineBusy = groupBusy || updatingId === order.id;
  const round = getOrderRevisionRound(order);
  const tier = getOrderRevisionTier(round);

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border p-4 bg-card transition-shadow hover:shadow-md",
        tier?.border && `border-l-4 ${tier.border}`,
      )}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
        <Image
          src={order.imageUrl || "/placeholder-food.jpg"}
          alt={order.title}
          fill
          className="object-cover"
        />
      </div>

      <div className="ml-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">{order.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Hash size={12} />
              <span className="text-xs font-mono">ID: {order.id}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Qty:{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  tier?.emphasisText,
                )}
              >
                {order.orderAmount}
              </span>{" "}
              • each @ {order.price.toFixed(2)} ETB
              {tier && showUpdateBadge ? (
                <RevisionBadge round={round} />
              ) : null}
            </p>
          </div>
          <span className="shrink-0 text-lg font-bold tabular-nums">
            {(order.price * order.orderAmount).toFixed(2)} ETB
          </span>
        </div>
      </div>

      <div className="ml-4 flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => onStatusUpdate(order.id, "Cancelled")}
          disabled={lineBusy || updatingId != null}
          variant="ghost"
          size="sm"
          className="h-10 text-destructive hover:bg-destructive/10"
        >
          <XCircle className="mr-1 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={() => onStatusUpdate(order.id, "Completed")}
          disabled={lineBusy || updatingId != null}
          size="sm"
          className="h-10 bg-green-600 text-white hover:bg-green-700"
        >
          {updatingId === order.id ? (
            <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-1 h-4 w-4" />
          )}
          Ready
        </Button>
      </div>
    </div>
  );
}

function OrderGroupCard({
  group,
  cafeTables,
  updatingId,
  updatingGroupKey,
  onStatusUpdate,
  onCompleteAll,
}: {
  group: CafeStationOrderGroup;
  cafeTables: Pick<Table, "tableNo" | "orderCaption">[];
  updatingId: number | null;
  updatingGroupKey: string | null;
  onStatusUpdate: (id: number, status: "Completed" | "Cancelled") => void;
  onCompleteAll: (groupKey: string, ids: number[]) => void;
}) {
  const anchor = group.orders[0];
  const isBatch = group.orders.length > 1;
  const groupBusy = updatingGroupKey === group.key;
  const groupRound = maxRevisionRoundInGroup(group.orders);
  const groupTier = getOrderRevisionTier(groupRound);
  const groupTotal = group.orders.reduce(
    (sum, order) => sum + order.price * order.orderAmount,
    0,
  );
  const pendingIds = group.orders
    .filter((o) => o.status !== "Completed")
    .map((o) => o.id);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md",
        groupTier?.border && `border-l-4 ${groupTier.border}`,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-5">
          <CafeTableLabel
            tableNo={normalizeOrderTableNo(anchor)}
            tables={cafeTables}
            serviceCaption={anchor.serviceCaption}
            className={cn(groupTier?.badge)}
          />
          <h3
            className={cn(
              "flex items-center gap-2 text-lg",
              groupTier?.emphasisText,
            )}
          >
            <User className="h-5 w-5" />
            {anchor.waiterName}
          </h3>
          {groupTier ? <RevisionBadge round={groupRound} /> : null}
          {isBatch ? (
            <Badge variant="secondary" className="font-normal">
              Batch · {group.orders.length} items
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isBatch ? (
            <span className="text-lg font-bold tabular-nums">
              {groupTotal.toFixed(2)} ETB
            </span>
          ) : null}
          {isBatch && pendingIds.length > 0 ? (
            <Button
              type="button"
              size="sm"
              className="h-10 gap-2 bg-linear-to-r from-green-600 to-emerald-600 text-white shadow-md hover:from-green-700 hover:to-emerald-700"
              disabled={groupBusy || updatingId != null}
              onClick={() => onCompleteAll(group.key, pendingIds)}
            >
              {groupBusy ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Done All
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {group.orders.map((order) => (
          <OrderLine
            key={order.id}
            order={order}
            updatingId={updatingId}
            groupBusy={groupBusy}
            showUpdateBadge={isBatch}
            onStatusUpdate={onStatusUpdate}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="px-3 py-1 font-mono text-base">
          {new Date(anchor.createdAt).toLocaleDateString()}
        </Badge>
        <Badge variant="outline" className="px-3 py-1 font-mono text-base">
          {new Date(anchor.createdAt).toLocaleTimeString()}
        </Badge>
      </div>
    </div>
  );
}

export function CafeStationOrderCards({
  orders,
  cafeTables,
  updatingId,
  updatingGroupKey,
  onStatusUpdate,
  onCompleteAll,
}: Props) {
  const groups = groupCafeStationOrderCards(orders);

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <OrderGroupCard
          key={group.key}
          group={group}
          cafeTables={cafeTables}
          updatingId={updatingId}
          updatingGroupKey={updatingGroupKey}
          onStatusUpdate={onStatusUpdate}
          onCompleteAll={onCompleteAll}
        />
      ))}
    </div>
  );
}
