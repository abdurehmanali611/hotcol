export type HrIncidentTypeSetting = {
  code: string;
  label: string;
  /** When true, amountETB is taken from salary; when false, amountETB is an increase. */
  deduct: boolean;
  amountETB: number;
  active: boolean;
};

/** Synthetic HR option when Manager has not defined a type named "other". */
export const HR_INCIDENT_ADHOC_OTHER_CODE = "other";

export function slugIncidentTypeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function activeHrIncidentTypes(types: HrIncidentTypeSetting[] = []) {
  return types.filter((t) => t.active);
}

/** True when Manager already configured a type with code `other`. */
export function managerDefinesOtherType(
  types: HrIncidentTypeSetting[] = [],
) {
  return types.some(
    (t) => t.active !== false && t.code === HR_INCIDENT_ADHOC_OTHER_CODE,
  );
}

/**
 * Types HR can pick: manager list, plus synthetic Other unless Manager already
 * named a type "other".
 */
export function hrIncidentTypeChoices(
  types: HrIncidentTypeSetting[] = [],
): HrIncidentTypeSetting[] {
  const active = activeHrIncidentTypes(types);
  if (managerDefinesOtherType(active)) return active;
  return [
    ...active,
    {
      code: HR_INCIDENT_ADHOC_OTHER_CODE,
      label: "Other",
      deduct: false,
      amountETB: 0,
      active: true,
    },
  ];
}

export function isAdHocOtherSelection(
  kind: string,
  types: HrIncidentTypeSetting[] = [],
) {
  return (
    kind === HR_INCIDENT_ADHOC_OTHER_CODE &&
    !managerDefinesOtherType(activeHrIncidentTypes(types))
  );
}

export function incidentTypeLabel(
  code: string,
  types: HrIncidentTypeSetting[] = [],
) {
  if (
    code === HR_INCIDENT_ADHOC_OTHER_CODE &&
    !managerDefinesOtherType(types)
  ) {
    return "Other";
  }
  return types.find((t) => t.code === code)?.label || code.replaceAll("_", " ");
}

export function findIncidentType(
  code: string,
  types: HrIncidentTypeSetting[] = [],
) {
  return types.find((t) => t.code === code) || null;
}

export function formatIncidentPayImpact(deduct: boolean, amountETB: number) {
  const amount = Number(amountETB) || 0;
  if (amount <= 0) return "No pay impact";
  const formatted = amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return deduct
    ? `Deduct ${formatted} ETB`
    : `Increase ${formatted} ETB`;
}
