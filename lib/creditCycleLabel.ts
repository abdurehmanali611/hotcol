export function formatCreditCycle(timeInterval: number, timeFrame: string): string {
  const n = Math.max(0, Number(timeInterval) || 0);
  const tf = String(timeFrame || "").trim().toLowerCase();
  let unit = "days";
  if (tf.startsWith("week")) unit = "weeks";
  else if (tf.startsWith("month")) unit = "months";
  else if (tf.startsWith("day")) unit = "days";
  if (n === 1) {
    unit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  }
  return `${n} ${unit}`;
}

