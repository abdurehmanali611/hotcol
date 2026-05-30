export function normalizeRejectionReasonInput(raw: string): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (text.length > 2000) return null;
  return text;
}

export function rejectionReasonRequiredMessage(): string {
  return "Enter a reason for rejection before submitting.";
}
