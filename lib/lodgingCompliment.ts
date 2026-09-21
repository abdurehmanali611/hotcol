/** Structured lodging_room.notes marker for complimentary staff rooms. */
export const LODGING_COMPLIMENT_PREFIX = "COMPLIMENT|";

export type LodgingComplimentMeta = {
  assignee: string;
  assignedBy: string;
  assignedAt: string;
  note: string;
};

export function encodeLodgingComplimentNotes(input: {
  assignee: string;
  assignedBy: string;
  assignedAt?: Date | string;
  note?: string;
}): string {
  const assignee = String(input.assignee || "").trim() || "Staff";
  const assignedBy = String(input.assignedBy || "").trim() || "Manager";
  const at =
    input.assignedAt instanceof Date
      ? input.assignedAt.toISOString()
      : String(input.assignedAt || new Date().toISOString());
  const note = String(input.note || "")
    .trim()
    .replace(/\|/g, "/");
  return `${LODGING_COMPLIMENT_PREFIX}${assignee}|${assignedBy}|${at}|${note}`;
}

export function parseLodgingComplimentNotes(
  notes: string | null | undefined,
): LodgingComplimentMeta | null {
  const raw = String(notes || "");
  if (!raw.startsWith(LODGING_COMPLIMENT_PREFIX)) return null;
  const rest = raw.slice(LODGING_COMPLIMENT_PREFIX.length);
  const [assignee = "", assignedBy = "", assignedAt = "", ...noteParts] =
    rest.split("|");
  return {
    assignee: assignee.trim() || "Staff",
    assignedBy: assignedBy.trim() || "—",
    assignedAt: assignedAt.trim() || "",
    note: noteParts.join("|").trim(),
  };
}

export function isLodgingComplimentRoom(room: {
  status?: string | null;
  notes?: string | null;
}): boolean {
  if (parseLodgingComplimentNotes(room.notes)) return true;
  return false;
}
