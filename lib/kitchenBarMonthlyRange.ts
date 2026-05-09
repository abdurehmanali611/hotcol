/** YYYY-MM list from calendar-day range (inclusive). Swaps if from > to. */
export function monthPeriodsBetweenInclusive(
  fromYmd: string,
  toYmd: string,
): string[] {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  let a = parse(fromYmd);
  let b = parse(toYmd);
  if (!a || !b) return [];
  if (a > b) [a, b] = [b, a];
  const out: string[] = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  const end = new Date(b.getFullYear(), b.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${mo}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
