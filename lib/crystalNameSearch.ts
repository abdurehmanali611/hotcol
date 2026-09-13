/**
 * Fuzzy / subsequence crystal-name search for illustration selectors.
 *
 * Example: query "sg" or "sga" matches "sega" because those letters appear
 * in order (not necessarily consecutive).
 */

export type CrystalSearchable = {
  amharic: string;
  romanized: string;
  english: string;
  crystalLabel: string;
};

/** Lower is better. null = no match. */
export function scoreCrystalQuery(
  query: string,
  row: CrystalSearchable,
): number | null {
  const q = normalizeQuery(query);
  if (!q) return 0;

  const fields = [
    row.romanized,
    row.english,
    row.amharic,
    row.crystalLabel,
    // Compact forms help "sg" hit "se ga" / spaced tokens.
    compact(row.romanized),
    compact(row.english),
    compact(`${row.amharic}${row.romanized}${row.english}`),
  ];

  let best: number | null = null;
  for (const field of fields) {
    const score = scoreAgainstField(q, field);
    if (score == null) continue;
    if (best == null || score < best) best = score;
  }
  return best;
}

export function normalizeQuery(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compact(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u1200-\u137F]+/gi, "");
}

function scoreAgainstField(query: string, fieldRaw: string): number | null {
  const field = String(fieldRaw || "").toLowerCase();
  if (!field) return null;

  const qCompact = query.replace(/\s+/g, "");
  const fieldCompact = compact(field);

  // Exact
  if (field === query || fieldCompact === qCompact) return 0;

  // Prefix
  if (field.startsWith(query) || fieldCompact.startsWith(qCompact)) return 1;

  // Contiguous substring
  const subIdx = field.indexOf(query);
  if (subIdx >= 0) return 10 + subIdx;
  const compactIdx = fieldCompact.indexOf(qCompact);
  if (compactIdx >= 0) return 20 + compactIdx;

  // Ordered subsequence: s…g…a matches "sega"
  const sub = subsequenceScore(qCompact, fieldCompact);
  if (sub != null) return 1000 + sub;

  // Also try spaced query against full field (letters + spaces)
  const spaced = subsequenceScore(query.replace(/\s+/g, ""), field.replace(/\s+/g, ""));
  if (spaced != null) return 1100 + spaced;

  return null;
}

/**
 * Returns a tightness score when every query char appears in order in `text`.
 * Lower = tighter / earlier match.
 */
function subsequenceScore(query: string, text: string): number | null {
  if (!query || !text) return null;
  let ti = 0;
  let first = -1;
  let last = -1;
  let gaps = 0;

  for (let qi = 0; qi < query.length; qi++) {
    const ch = query[qi];
    let found = -1;
    while (ti < text.length) {
      if (text[ti] === ch) {
        found = ti;
        ti += 1;
        break;
      }
      ti += 1;
    }
    if (found < 0) return null;
    if (first < 0) first = found;
    else gaps += found - (last + 1);
    last = found;
  }

  const span = last - first + 1;
  return gaps * 20 + span + first;
}

export function filterAndRankCrystalRows<T extends CrystalSearchable>(
  rows: T[],
  query: string,
  limit: number,
): { visible: T[]; totalMatches: number } {
  const q = normalizeQuery(query);
  if (!q) {
    return {
      visible: rows.slice(0, limit),
      totalMatches: rows.length,
    };
  }

  const scored: { row: T; score: number }[] = [];
  for (const row of rows) {
    const score = scoreCrystalQuery(q, row);
    if (score == null) continue;
    scored.push({ row, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.row.romanized.localeCompare(b.row.romanized);
  });

  return {
    visible: scored.slice(0, limit).map((s) => s.row),
    totalMatches: scored.length,
  };
}
