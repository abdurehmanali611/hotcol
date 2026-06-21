/** Café "today" uses property local time (Ethiopia) — matches cashier, kitchen, and API. */
export const CAFE_BUSINESS_TIMEZONE = "Africa/Addis_Ababa";

export function cafeBusinessDateYmd(
  dateInput: Date | string | number,
): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isSameCafeBusinessDay(
  dateInput: Date | string | number,
  ref: Date | string | number = new Date(),
): boolean {
  const a = cafeBusinessDateYmd(dateInput);
  const b = cafeBusinessDateYmd(ref);
  return a !== "" && a === b;
}

export function cafeBusinessYearMonth(
  dateInput: Date | string | number,
): string {
  const ymd = cafeBusinessDateYmd(dateInput);
  return ymd ? ymd.slice(0, 7) : "";
}

export function isSameCafeBusinessMonth(
  dateInput: Date | string | number,
  ref: Date | string | number = new Date(),
): boolean {
  const a = cafeBusinessYearMonth(dateInput);
  const b = cafeBusinessYearMonth(ref);
  return a !== "" && a === b;
}
