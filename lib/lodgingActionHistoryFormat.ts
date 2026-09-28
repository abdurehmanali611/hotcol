/** Prefer human-readable snippets from lodging action detailJson. */

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    return value
      .map((v) => formatDetailValue(v))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const nested = formatDetailValue(v);
        return nested ? `${k}: ${nested}` : "";
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

export function formatLodgingActionDetails(detailJson: string): string {
  const raw = String(detailJson ?? "").trim();
  if (!raw) return "—";

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || parsed === "") return "—";
    if (typeof parsed !== "object") return String(parsed);

    const obj = parsed as Record<string, unknown>;
    const preferredKeys = [
      "voucherCode",
      "roomNumber",
      "roomNumbers",
      "roomIds",
      "status",
      "fromStatus",
      "toStatus",
      "workKind",
      "assigneeName",
      "assigneeNames",
      "nights",
      "amountETB",
      "totalETB",
      "lineIds",
      "toStayId",
      "guestId",
      "notes",
      "message",
      "reason",
    ];

    const parts: string[] = [];
    for (const key of preferredKeys) {
      if (!(key in obj)) continue;
      const formatted = formatDetailValue(obj[key]);
      if (!formatted) continue;
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .trim()
        .toLowerCase();
      parts.push(`${label}: ${formatted}`);
    }

    if (parts.length === 0) {
      const fallback = formatDetailValue(obj);
      return fallback || "—";
    }
    return parts.join(" · ");
  } catch {
    return raw;
  }
}

export function lodgingActionLabel(action: string) {
  return String(action || "").replace(/_/g, " ");
}
