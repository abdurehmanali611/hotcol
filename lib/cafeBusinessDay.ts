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

/** Calendar year in café business timezone, e.g. `"2026"`. */
export function cafeBusinessYear(
  dateInput: Date | string | number,
): string {
  const ymd = cafeBusinessDateYmd(dateInput);
  return ymd ? ymd.slice(0, 4) : "";
}

/** 1–12 month number in café business timezone, or 0 if invalid. */
export function cafeBusinessMonthNumber(
  dateInput: Date | string | number,
): number {
  const ym = cafeBusinessYearMonth(dateInput);
  if (!ym) return 0;
  const month = Number(ym.slice(5, 7));
  return month >= 1 && month <= 12 ? month : 0;
}

/** Calendar quarter 1–4 (Jan–Mar … Oct–Dec), or 0 if invalid. */
export function cafeBusinessQuarter(
  dateInput: Date | string | number,
): number {
  const month = cafeBusinessMonthNumber(dateInput);
  return month > 0 ? Math.ceil(month / 3) : 0;
}

/** Half-year 1 (Jan–Jun) or 2 (Jul–Dec), or 0 if invalid. */
export function cafeBusinessHalfYear(
  dateInput: Date | string | number,
): number {
  const month = cafeBusinessMonthNumber(dateInput);
  if (month <= 0) return 0;
  return month <= 6 ? 1 : 2;
}

export function isSameCafeBusinessQuarter(
  dateInput: Date | string | number,
  ref: Date | string | number = new Date(),
): boolean {
  const yearA = cafeBusinessYear(dateInput);
  const yearB = cafeBusinessYear(ref);
  const qA = cafeBusinessQuarter(dateInput);
  const qB = cafeBusinessQuarter(ref);
  return yearA !== "" && yearA === yearB && qA > 0 && qA === qB;
}

export function isSameCafeBusinessHalfYear(
  dateInput: Date | string | number,
  ref: Date | string | number = new Date(),
): boolean {
  const yearA = cafeBusinessYear(dateInput);
  const yearB = cafeBusinessYear(ref);
  const hA = cafeBusinessHalfYear(dateInput);
  const hB = cafeBusinessHalfYear(ref);
  return yearA !== "" && yearA === yearB && hA > 0 && hA === hB;
}

export function isSameCafeBusinessYear(
  dateInput: Date | string | number,
  ref: Date | string | number = new Date(),
): boolean {
  const a = cafeBusinessYear(dateInput);
  const b = cafeBusinessYear(ref);
  return a !== "" && a === b;
}
