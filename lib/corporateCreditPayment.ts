import type { HotelCreditCompanyRow, Order } from "@/lib/actions";

export type ConsumptionLine = {
  name: string;
  qty: number;
  unitPrice: number;
};

export function parseCompanyAllowedMenuNames(json: string): Set<string> {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return new Set();
    return new Set(
      arr
        .map((x) =>
          String((x as { name?: string; title?: string }).name ?? (x as { title?: string }).title ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

export function ordersToConsumptionLines(orders: Order[]): ConsumptionLine[] {
  const map = new Map<string, ConsumptionLine>();
  for (const o of orders) {
    const name = String(o.title ?? "").trim();
    if (!name) continue;
    const qty = Number(o.orderAmount) || 0;
    const unitPrice = Number(o.price) || 0;
    const prev = map.get(name);
    if (prev) {
      prev.qty += qty;
    } else {
      map.set(name, { name, qty, unitPrice });
    }
  }
  return [...map.values()].filter((l) => l.qty > 0);
}

export function corporateCreditorDisplayName(
  companyName: string,
  staffName: string,
): string {
  return `${companyName.trim()} — ${staffName.trim()}`;
}

export function ordersOffCompanyDeal(
  orders: Order[],
  company: HotelCreditCompanyRow | null,
): string[] {
  if (!company) return [];
  const allowed = parseCompanyAllowedMenuNames(company.allowedMenuJson);
  if (allowed.size === 0) return [];
  const off: string[] = [];
  for (const o of orders) {
    const nm = String(o.title ?? "").trim().toLowerCase();
    if (nm && !allowed.has(nm)) off.push(String(o.title));
  }
  return [...new Set(off)];
}

export function isCorporateCreditFormReady(
  companyId: string,
  staffName: string,
  staffPhone: string,
): boolean {
  return (
    !!companyId &&
    staffName.trim().length >= 2 &&
    staffPhone.replace(/\D/g, "").length >= 8
  );
}
