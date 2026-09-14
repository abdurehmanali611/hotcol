/**
 * Parse / compose crystal item names with optional qualifier.
 *
 * Stored form:
 *   Amharic|Romanized|English
 *   Amharic|Romanized(staff)|English   ← optional qualifier on romanized
 */

export type CrystalNameParts = {
  amharic: string;
  romanized: string;
  english: string;
  /** Text inside (...) on romanized, without parens. */
  qualifier: string;
  /** Romanized with qualifier stripped. */
  baseRomanized: string;
};

const QUALIFIER_RE = /^(.*)\(([^()]*)\)\s*$/;

export function parseCrystalItemName(value: string): CrystalNameParts | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parts = raw.split("|").map((p) => p.trim());
  if (parts.length < 3) {
    // Plain name fallback (legacy free text)
    const m = raw.match(QUALIFIER_RE);
    if (m) {
      return {
        amharic: "",
        romanized: raw,
        english: "",
        baseRomanized: m[1].trim(),
        qualifier: m[2].trim(),
      };
    }
    return {
      amharic: "",
      romanized: raw,
      english: "",
      baseRomanized: raw,
      qualifier: "",
    };
  }

  const amharic = parts[0];
  const romanized = parts[1];
  const english = parts.slice(2).join("|");
  const m = romanized.match(QUALIFIER_RE);
  if (m) {
    return {
      amharic,
      romanized,
      english,
      baseRomanized: m[1].trim(),
      qualifier: m[2].trim(),
    };
  }
  return {
    amharic,
    romanized,
    english,
    baseRomanized: romanized,
    qualifier: "",
  };
}

/** Crystal label used to match catalog rows (no qualifier). */
export function crystalBaseLabel(value: string): string {
  const p = parseCrystalItemName(value);
  if (!p) return "";
  if (!p.amharic && !p.english) return p.baseRomanized;
  return `${p.amharic}|${p.baseRomanized}|${p.english}`;
}

export function composeCrystalItemName(
  baseCrystalLabel: string,
  qualifierRaw: string,
): string {
  const q = String(qualifierRaw || "").trim();
  const parts = String(baseCrystalLabel || "")
    .split("|")
    .map((p) => p.trim());
  if (parts.length < 3) {
    const base = String(baseCrystalLabel || "").trim();
    if (!base) return q ? `(${q})` : "";
    // Strip existing qualifier on plain names then re-apply
    const stripped = base.replace(QUALIFIER_RE, "$1").trim() || base;
    return q ? `${stripped}(${q})` : stripped;
  }
  const amharic = parts[0];
  let romanized = parts[1];
  const english = parts.slice(2).join("|");
  romanized = romanized.replace(QUALIFIER_RE, "$1").trim() || romanized;
  const withQ = q ? `${romanized}(${q})` : romanized;
  return `${amharic}|${withQ}|${english}`;
}
