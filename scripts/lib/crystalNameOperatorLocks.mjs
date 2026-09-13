/**
 * Operator-confirmed crystal rules. Do NOT reverse these without explicit user instruction.
 * Used as regenerate-time assertions to prevent over-correction regressions.
 */

/** @typedef {{ id: string, rule: string, mustMatchCrystal?: RegExp, variantAny?: RegExp[], mustNotMatchCrystal?: RegExp }} OperatorLock */

/** @type {OperatorLock[]} */
export const OPERATOR_LOCKS = [
  {
    id: "garlic_nech_shenkurt",
    rule: "Garlic crystal Amharic/Rom is ነጭ ሽንኩርት|Nech Shenkurt (not Chingiya)",
    variantAny: [/\bgarlic\b/i],
    mustMatchCrystal: /ነጭ ሽንኩርት\|Nech Shenkurt\|Garlic/,
  },
  {
    id: "soft_equals_roll_soft",
    rule: "soft and roll soft are the same soft tissue product",
    variantAny: [/\broll\s+soft\b/i, /^soft$/i],
    mustMatchCrystal: /ሶፍት\|Soft\|Soft tissue paper/,
  },
  {
    id: "tomato_pasta_is_pasta",
    rule: "Tomato Pasta is tomato pasta (not paste)",
    variantAny: [/\btomato\s+pasta\b/i],
    mustMatchCrystal: /የቲማቲም ፓስታ\|Ye Timatim Pasta\|Tomato pasta/,
  },
  {
    id: "esteplar_shbo_separate",
    rule: "Esteplar/esetaprale shebo ≠ eka matebiya shbo",
    variantAny: [/\b(esetaprale|setapelare|esteplar)\s+she?bo\b/i],
    mustMatchCrystal: /Esteplar Shbo\|Esteplar shbo/,
    mustNotMatchCrystal: /\|Shbo\|Cleaning detergent$/,
  },
  {
    id: "eka_matebiya_is_shbo",
    rule: "eka matebiya shebo groups with plain shbo",
    variantAny: [/\beka\s+mateb[aei]ya\s+she?bo\b/i],
    mustMatchCrystal: /ሽቦ\|Shbo\|Cleaning detergent/,
  },
  {
    id: "estracho_not_straw",
    rule: "Estracho is not drinking straw; name itself if meaning unknown",
    variantAny: [/\b(estracho|esteracho|esetercho|eseteracho)\b/i],
    mustMatchCrystal: /ኤስትራቾ\|Estracho\|Estracho/,
    mustNotMatchCrystal: /Stro\|Drinking straw/,
  },
  {
    id: "straw_separate",
    rule: "Drinking straw stays Stro (Estrow/straw)",
    variantAny: [/\b(estrow|straw)\b/i],
    mustMatchCrystal: /ስትሮ\|Stro\|Drinking straw/,
  },
  {
    id: "acheto_not_aceto",
    rule: "Vinegar crystal is አቸቶ|Acheto (not Aceto/አሴቶ)",
    variantAny: [/\b(acheto|aceto|achto|vinegar)\b/i],
    mustMatchCrystal: /አቸቶ\|Acheto\|Vinegar/,
  },
  {
    id: "gewuze_is_lewuz",
    rule: "gewuze = lewuz peanut (not peanut butter)",
    variantAny: [/\bgewuze\b/i, /^lewuz$/i, /^lewuze$/i],
    mustMatchCrystal: /ለውዝ\|Lewuz\|Peanut/,
  },
  {
    id: "akezha_self_named",
    rule: "Akezha keeps its own name when exact English unknown",
    variantAny: [/\bakezha\b/i],
    mustMatchCrystal: /አከዣ\|Akezha\|Akezha/,
  },
  {
    id: "belewa_self_named",
    rule: "Belewa keeps its own name when exact English unknown",
    variantAny: [/\bbelewa\b/i],
    mustMatchCrystal: /በለዋ.*\|Belewa/,
  },
];

/**
 * Policy reminder embedded in PDF/JSON meta.
 */
export const ANTI_OVERCORRECTION_POLICY = [
  "Prefer operator product knowledge over assistant linguistic guesses.",
  "If exact English meaning is unknown for a local name, use the name itself (e.g. Akezha|Akezha), do not invent a gloss.",
  "Do not merge lookalike spellings across different products (Estracho≠straw, Esteplar shbo≠eka matebiya shbo).",
  "Do not split products the operator says are the same (soft=roll soft, gewuze=lewuz).",
  "Do not reverse OPERATOR_LOCKS without explicit user instruction.",
];

/**
 * Validate clustered rows against operator locks.
 * @param {Array<{ crystalName: string, variants: Array<{ display: string }> }>} clusters
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function assertOperatorLocks(clusters) {
  /** @type {string[]} */
  const failures = [];
  for (const lock of OPERATOR_LOCKS) {
    const hits = clusters.filter((c) =>
      (lock.variantAny || []).some((re) =>
        c.variants.some((v) => re.test(v.display)),
      ),
    );
    if (hits.length === 0) {
      failures.push(`[${lock.id}] no matching variants found (data missing?) — ${lock.rule}`);
      continue;
    }
    for (const c of hits) {
      if (lock.mustMatchCrystal && !lock.mustMatchCrystal.test(c.crystalName)) {
        failures.push(
          `[${lock.id}] crystal "${c.crystalName}" for [${c.variants.map((v) => v.display).join("; ")}] — expected ${lock.mustMatchCrystal} — ${lock.rule}`,
        );
      }
      if (lock.mustNotMatchCrystal && lock.mustNotMatchCrystal.test(c.crystalName)) {
        failures.push(
          `[${lock.id}] crystal "${c.crystalName}" forbidden — ${lock.rule}`,
        );
      }
    }
  }
  return { ok: failures.length === 0, failures };
}
