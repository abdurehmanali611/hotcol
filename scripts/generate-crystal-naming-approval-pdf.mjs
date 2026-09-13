/**
 * READ-ONLY: Collect inventory / purchase / recipe ingredient spellings across
 * all tenants, propose crystal names, write an approval PDF. No DB writes.
 *
 *   node scripts/generate-crystal-naming-approval-pdf.mjs
 *
 * Loads DATABASE_URL from BackEnd/.env
 */
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { jsPDF } from "jspdf";
import {
  BY_CORE,
  BY_IDENTITY,
  BY_PHRASE,
  englishOnlyCrystal,
  extractSizeSuffix,
  formatCrystalTriple,
  lookupCoreTriple,
} from "./lib/crystalNameLexicon.mjs";
import {
  RECOMMENDED_CRYSTAL_ADDITIONS,
  formatRecommendedCrystal,
} from "./lib/crystalNameRecommendedAdditions.mjs";
import {
  ANTI_OVERCORRECTION_POLICY,
  OPERATOR_LOCKS,
  assertOperatorLocks,
} from "./lib/crystalNameOperatorLocks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const backendDir = path.join(root, "BackEnd");

/** Minimal .env loader (root package has no dotenv). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(path.join(backendDir, ".env"));
// prismaClient imports dotenv/config — BackEnd cwd helps that fallback find .env
process.chdir(backendDir);

const { createPrismaClient } = await import(
  pathToFileURL(path.join(backendDir, "lib", "prismaClient.js")).href
);

const outDir = path.join(root, "docs");
const outPdf = path.join(outDir, "HotCol-Crystal-Naming-Approval.pdf");
const outJson = path.join(outDir, "HotCol-Crystal-Naming-Approval.json");

/** @typedef {{ raw: string, source: string, hotel: string }} NameHit */

const UNIT_WORDS = new Set([
  "l",
  "lt",
  "ltr",
  "liter",
  "litre",
  "leter",
  "liters",
  "litres",
  "leters",
  "ml",
  "cl",
  "kg",
  "g",
  "gram",
  "grams",
  "gm",
  "mg",
  "pcs",
  "pc",
  "piece",
  "pieces",
  "pack",
  "packs",
  "pkt",
  "box",
  "boxes",
  "bottle",
  "bottles",
  "btl",
  "can",
  "cans",
  "bag",
  "bags",
  "cup",
  "cups",
  "dozen",
  "dz",
  "pair",
  // NOTE: do NOT list "roll"/"rolls" here — strips "Roll soft" down to "soft"
  // and falsely merges drinking-soft tissue with roll soft.
  "sheet",
  "sheets",
  "unit",
  "units",
]);

function normalizeKey(raw) {
  return String(raw || "")
    .normalize("NFKC")
    .toLowerCase()
    // Keep fractions intact before slash/backslash cleanup: 1/2, 1\2 → 0.5
    .replace(/(\d+)\s*[\/\\]\s*(\d+)/g, (_, a, b) => {
      const n = Number(a);
      const d = Number(b);
      if (!d) return `${a} ${b}`;
      const q = n / d;
      return String(Number(q.toFixed(4)));
    })
    .replace(/[''`´]/g, "")
    .replace(/[_\-–—\\]+/g, " ")
    .replace(/[^\p{L}\p{N}\s/&+.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical qty tokens so 1/2, 0.5, 1\2 stay comparable — different sizes never merge. */
function extractQtySignature(normalized) {
  let s = ` ${normalized} `.replace(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)/gi, " $1x$2 ");

  const tokens = [];
  const re =
    /(\d+(?:\.\d+)?)(?:\s*)(l|lt|ltr|liter|litre|leter|liters|litres|leters|ml|cl|kg|g|gram|grams|gm|mg|pcs|pc|piece|pieces|pack|packs|pkt|box|boxes|bottle|bottles|btl|can|cans|bag|bags|cup|cups|dozen|dz|pair|roll|rolls|sheet|sheets|unit|units)?(?=\s|$|[^a-z0-9.])/gi;

  function canonUnit(unit) {
    let u = (unit || "").toLowerCase();
    if (
      u === "lt" ||
      u === "ltr" ||
      u === "leter" ||
      u === "liter" ||
      u === "litre" ||
      u === "liters" ||
      u === "litres" ||
      u === "leters"
    ) {
      u = "l";
    }
    if (u === "gram" || u === "grams" || u === "gm") u = "g";
    if (u === "piece" || u === "pieces" || u === "pc") u = "pcs";
    if (u === "packs" || u === "pkt") u = "pack";
    if (u === "bottles" || u === "btl") u = "bottle";
    if (u === "boxes") u = "box";
    if (u === "bags") u = "bag";
    if (u === "cans") u = "can";
    if (u === "cups") u = "cup";
    if (u === "rolls") u = "roll";
    if (u === "sheets") u = "sheet";
    if (u === "units") u = "unit";
    if (u === "dz") u = "dozen";
    return u;
  }

  let m;
  while ((m = re.exec(s)) !== null) {
    const num = Number(m[1]);
    if (!Number.isFinite(num)) continue;
    const unit = canonUnit(m[2] || "");
    tokens.push(unit ? `${num}:${unit}` : `${num}`);
  }

  if (tokens.length === 0) return "NONE";
  return [...new Set(tokens)].sort().join("|");
}

/** Letters-only product core (sizes/units stripped) for typo matching. */
function letterCore(normalized) {
  let s = ` ${normalized} `
    .replace(/(\d+)\s*[\/\\]\s*(\d+)/g, " ")
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/[/&+.]+/g, " ");
  const parts = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !UNIT_WORDS.has(t) && !/^\d/.test(t));
  return parts.join("").replace(/[^a-z]/gi, "").toLowerCase();
}

/** Drop vowels for typo clustering on the letter core only. */
function skeleton(core) {
  return core.replace(/[aeiouy]/g, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * Same size if numeric amounts match; unit may be missing on one side
 * (Water 1/2 ≈ Water 1/2 L) but conflicting units never match (ml ≠ l).
 */
function qtyCompatible(sigA, sigB) {
  if (sigA === sigB) return true;
  if (sigA === "NONE" || sigB === "NONE") return false;

  const parse = (sig) =>
    sig.split("|").map((t) => {
      const [n, u = ""] = t.split(":");
      return { n: Number(n), u };
    });

  const a = parse(sigA);
  const b = parse(sigB);
  if (a.length !== b.length) return false;

  const used = new Set();
  for (const x of a) {
    let found = -1;
    for (let i = 0; i < b.length; i++) {
      if (used.has(i)) continue;
      const y = b[i];
      if (x.n !== y.n) continue;
      if (x.u && y.u && x.u !== y.u) continue;
      found = i;
      break;
    }
    if (found < 0) return false;
    used.add(found);
  }
  return true;
}

/**
 * Domain product identities from operator approval notes.
 * Same id → may merge (typos). Different id → never merge.
 */
function productIdentity(normalized) {
  const n = normalized;
  const core = letterCore(n);

  // Esteplar shbo ≠ eka matebiya / plain shbo (operator correction)
  if (
    /\b(esetaprale|setapelare|esteplar|estetaprale|estepler)\s+(shbo|shebo|shibo)\b/.test(
      n,
    ) ||
    [
      "esetapraleshebo",
      "setapelareshebo",
      "esteplarshebo",
      "esteplarshbo",
      "estetapraleshebo",
    ].includes(core)
  ) {
    return "esteplar_shbo";
  }

  // Cleaning soap/detergent (shbo) — eka matebiya shbo + plain shbo/shebo
  if (
    /\beka\s+mateb[aei]ya\s+(shbo|shebo|shibo)\b/.test(n) ||
    core === "shbo" ||
    core === "shebo" ||
    core === "shibo" ||
    /ekamateb.*sh[ei]?bo/.test(core)
  ) {
    return "shbo_cleaning";
  }

  // Shiro / shro food — subtypes are different products (never merge):
  // plain shro ≠ yeshro bakela ≠ yeshro ater ≠ mtn shro
  if (
    /\b(ye\s*)?(shro|shero|shiro)\s+bakela\b/.test(n) ||
    /\byeshro\s+bakela\b/.test(n) ||
    ["yeshrobakela", "shrobakela", "sherobakela", "shirobakela"].includes(core)
  ) {
    return "shiro_bakela";
  }
  if (
    /\b(ye\s*)?(shro|shero|shiro)\s+ater\b/.test(n) ||
    /\byeshro\s+ater\b/.test(n) ||
    ["yeshroater", "shroater", "sheroater", "shiroater"].includes(core)
  ) {
    return "shiro_ater";
  }
  if (
    /\bmtn\s+(shro|shero|shiro)\b/.test(n) ||
    ["mtnshro", "mtnshero", "mtnshiro"].includes(core)
  ) {
    return "shiro_mtn";
  }
  if (
    /\b(shro|shero|shiro|shrowet)\b/.test(n) ||
    core === "shro" ||
    core === "shero" ||
    core === "shiro" ||
    core === "shrowet" ||
    core === "shrostaff" ||
    core === "shrokitchen" ||
    /\byeshro\b/.test(n)
  ) {
    return "shiro_food";
  }

  // Fish fillet vs selit (food oilseed/ingredient)
  if (
    /\b(flite|filite|fillet|filet|flito|felite|felit)\b/.test(n) ||
    ["flite", "filite", "fillet", "filet", "flito", "felite", "felit"].includes(
      core,
    )
  ) {
    return "fish_fillet";
  }
  if (/\bselit\b/.test(n) || core === "selit") return "selit_ingredient";

  // Agricultural kosta vs industrial pasta vs packaging posta
  if (/\b(kosta|koseta)\b/.test(n) || core === "kosta" || core === "koseta") {
    return "kosta_food";
  }
  if (
    (/\bpasta\b/.test(n) || core === "pasta") &&
    !/\btomato\b/.test(n) &&
    !/\bpeste\b/.test(n)
  ) {
    return "pasta_food";
  }
  if (/\bposta\b/.test(n) || core === "posta") return "posta_packaging";

  // Flours
  if (/\bwheat\s+flour\b/.test(n) || core === "wheatflour") return "wheat_flour";
  if (/\bwhite\s+flour\b/.test(n) || core === "whiteflour") return "white_flour";

  // Flaming / fire-starting keberete family
  if (
    /\b(keberete|keberet|kebrete|keberate|kebererti|keberte|keberite|meberte)\b/.test(
      n,
    ) ||
    core.startsWith("keberet") ||
    core === "kebrete" ||
    core === "keberte" ||
    core === "keberite" ||
    core === "meberte"
  ) {
    return "keberete_flame";
  }

  // Coffee drink typos (coffee/coffe) — never powder / cup / mug ware
  if (
    !/\b(powder|powders|cup|cups|glass|glasses|mug|mugs)\b/.test(n) &&
    (core === "coffee" || core === "coffe")
  ) {
    return "coffee_drink";
  }
  if (/\bcoffee\s+powder\b/.test(n) || core === "coffeepowder") {
    return "coffee_powder";
  }
  if (
    /\b(coffee|coffe)\s+(cup|cups)\b/.test(n) ||
    core === "coffeecup" ||
    core === "coffecup"
  ) {
    return "coffee_cup";
  }

  // Addis tea ingredient vs bag packaging
  if (/\b(addis|adis|adiss)\s+tea\s+bags?\b/.test(n)) return "addis_tea_bag";
  if (/\b(addis|adis|adiss)\s+tea\b/.test(n)) return "addis_tea";

  // Short hardware — lamp ≈ lump (typo); both ≠ pump.
  // Exact product only (do not tag "energy saving lamp" / "h2op … lamp").
  if (core === "pump" || n === "pump") return "pump";
  if (core === "lamp" || n === "lamp" || core === "lump" || n === "lump") {
    return "lamp";
  }

  // Peanut / nut: lewuz ≈ gewuze ≈ ocholoni (not chewza snack spice; not peanut butter)
  if (
    !/\b(butter|better|kibe|wetet|milk)\b/.test(n) &&
    (/\b(lewuz|lewuze|lewz|gewuze|gewuz|geuze|gawuze|peanut|peanuts|ocholoni|ocholony)\b/.test(
      n,
    ) ||
      [
        "lewuz",
        "lewuze",
        "lewz",
        "gewuze",
        "gewuz",
        "geuze",
        "gawuze",
        "peanut",
        "peanuts",
        "ocholoni",
        "ocholony",
        "ocholonyewz",
        "ocholonilewz",
      ].includes(core) ||
      /ocholon.*lew/.test(core))
  ) {
    return "lewuz_peanut";
  }

  // Drinking straw ≠ Estracho (lookalike spellings; keep separate)
  if (
    [
      "estracho",
      "esteracho",
      "esetercho",
      "eseteracho",
    ].includes(core) ||
    /\b(estracho|esteracho|esetercho|eseteracho)\b/.test(n)
  ) {
    return "estracho_item";
  }
  if (
    !/\b(berry|syrap|syrup|cerap)\b/.test(n) &&
    ([
      "straw",
      "stro",
      "estrow",
      "estro",
      "extrasstraw",
      "extrastraw",
    ].includes(core) ||
      /\b(straw|estrow|estro)\b/.test(n) ||
      /\bextra\s*\/?\s*straw\b/.test(n))
  ) {
    return "straw_drinking";
  }

  // Garlic uses ነጭ ሽንኩርት (operator). Keep explicit "white onion" spellings separate.
  if (
    /\bgarlic\b/.test(n) ||
    ["garlic", "garlicstaff", "chingiya", "chinigiya", "nechshengurt"].includes(
      core,
    )
  ) {
    return "garlic_bulb";
  }
  if (
    /\bgradia\b.*\bwhite\s+onion\b|\bwhite\s+onion\b/.test(n) ||
    /\bnech\s+shenkurt\b|\bnech\s+shenkuret\b|\bnech\s+senkuret\b|\bnech\s+shenkurte\b/.test(
      n,
    ) ||
    ["nechshenkuret", "nechshenkurt", "nechsenkuret", "nechshenkurte", "gradiawhiteonion"].includes(
      core,
    )
  ) {
    return "white_onion";
  }

  // Soft tissue paper — soft ≈ roll soft (operator)
  if (
    /\broll\s+soft\b/.test(n) ||
    core === "rollsoft" ||
    /rollsoft/.test(core) ||
    ((core === "soft" || n === "soft") &&
      !/\b(drink|dirnk|drike|napkin|gebeta|gebata|toilet)\b/.test(n))
  ) {
    return "soft_tissue";
  }

  // Tomato paste ≠ tomato pasta (operator: pasta is pasta)
  if (
    /\btomato\s+(peste|pest|paste)\b/.test(n) ||
    ["tomatopeste", "tomatopest", "tomatopaste"].includes(core)
  ) {
    return "tomato_paste";
  }
  if (/\btomato\s+pasta\b/.test(n) || core === "tomatopasta") {
    return "tomato_pasta";
  }

  // Soft drink brands before generic soft drink
  if (
    /\b(soft\s+dr(?:i|ie|in)nk\s+)?pep[si]{1,2}\b|\bpepis\b/.test(n) ||
    ["pepsi", "softdirnkpepis", "softdrinkpepsi", "softdrinkpepis"].includes(core)
  ) {
    return "pepsi_drink";
  }

  // H2O proof abrasive ≠ plain waterproof ≠ waterproof bulb
  if (/\babrass?ive\b/.test(n) || /proofabras/.test(core)) {
    return "h20_abrasive";
  }
  if (/\bh20proof\s*\(?\s*ampole/.test(n) || /proofampole/.test(core)) {
    return "h20_proof_ampole";
  }

  return null;
}

/** Serving / packaging role — coffee ≠ coffee cup; tea ≠ tea bag. */
function roleSignature(normalized) {
  const n = ` ${normalized} `;
  if (/\b(cups?|glasses?|mugs?|plates?|bowls?|saucers?)\b/.test(n)) {
    return "serving_ware";
  }
  if (
    /\b(bags?|packet|packets|sachet|sachets|packaging|wrapper|wrappers|carton|cartons)\b/.test(
      n,
    )
  ) {
    return "packaging";
  }
  if (/\b(holder|holders|dispenser|dispensers)\b/.test(n)) return "accessory";
  return "product";
}

/**
 * Model / SKU tokens (Toner 85A ≠ Toner 83A ≠ plain Toner).
 * Prefers trailing codes like 85a / 83a / 42a.
 */
function modelSignature(normalized) {
  const n = normalized;
  const models = [];
  const re = /\b(\d{2,4})\s*([a-z])\b/gi;
  let m;
  while ((m = re.exec(n)) !== null) {
    models.push(`${m[1]}${m[2].toLowerCase()}`);
  }
  // glued: toner83a
  const glued = n.matchAll(/(\d{2,4}[a-z])\b/gi);
  for (const g of glued) {
    const token = g[1].toLowerCase();
    if (!models.includes(token)) models.push(token);
  }
  if (models.length === 0) return "NONE";
  return [...new Set(models)].sort().join("|");
}

function modelCompatible(a, b) {
  return a === b;
}

function roleCompatible(a, b) {
  return a === b;
}

/**
 * High-care similarity:
 * - qty / model / serving-role must agree
 * - known domain identities never cross (shbo≠shro, pasta≠posta≠kosta, …)
 * - same known identity may merge across wording (eka matebiya shbo ≈ shbo)
 * - short cores: no fuzzy (blocks pump↔lamp, flite↔selit via weak edits)
 * - lamp ≈ lump (same identity); coffee ≈ coffe; coffee powder / coffee cup stay separate
 */
function similarEnough(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  const qtyA = extractQtySignature(a);
  const qtyB = extractQtySignature(b);
  if (!qtyCompatible(qtyA, qtyB)) return false;

  const modelA = modelSignature(a);
  const modelB = modelSignature(b);
  if (!modelCompatible(modelA, modelB)) return false;

  const roleA = roleSignature(a);
  const roleB = roleSignature(b);
  if (!roleCompatible(roleA, roleB)) return false;

  const idA = productIdentity(a);
  const idB = productIdentity(b);
  if (idA && idB && idA !== idB) return false;
  if (idA && idB && idA === idB) return true;

  // If only one side is tagged, do not fuzzy-merge into an untagged lookalike
  // unless cores are exact (avoids shro absorbing unknown shebo-like noise).
  if ((idA && !idB) || (!idA && idB)) {
    const cA = letterCore(a);
    const cB = letterCore(b);
    return Boolean(cA && cA === cB);
  }

  const coreA = letterCore(a);
  const coreB = letterCore(b);
  if (!coreA || !coreB) return false;
  if (coreA === coreB) return true;

  const lenA = coreA.length;
  const lenB = coreB.length;
  const minLen = Math.min(lenA, lenB);
  const maxLen = Math.max(lenA, lenB);

  // Short product names: exact core only (no skeleton / edit distance)
  if (minLen <= 5) return false;

  if (maxLen - minLen > Math.max(2, Math.floor(maxLen * 0.2))) return false;

  const skA = skeleton(coreA);
  const skB = skeleton(coreB);
  // Skeleton only when long enough and not a known confusable family prefix
  if (
    skA &&
    skA === skB &&
    skA.length >= 5 &&
    Math.abs(lenA - lenB) <= 2 &&
    !/^(whtflr|pmp|lmp)/.test(skA)
  ) {
    return true;
  }

  const dist = levenshtein(coreA, coreB);
  const ratio = dist / maxLen;
  if (maxLen <= 9) return dist <= 1;
  if (maxLen <= 14) return dist <= 2 && ratio <= 0.15;
  return dist <= 2 && ratio <= 0.1;
}

/**
 * Crystal format: AmharicScript|RomanizedAmharic|EnglishMeaning
 * e.g. ዳቦ|Dabo|Bread
 * Middle part = Amharic in English letters (romanization), not Latin-as-language.
 */
function proposeCrystal(variants) {
  // Prefer forms with slash gloss (acheto/vinegar), then most occurrences, then longest.
  const scored = [...variants].sort((a, b) => {
    const slash = (s) => (s.includes("/") ? 1 : 0);
    if (slash(b.display) !== slash(a.display)) return slash(b.display) - slash(a.display);
    if (b.count !== a.count) return b.count - a.count;
    if (b.tenants !== a.tenants) return b.tenants - a.tenants;
    return b.display.length - a.display.length;
  });
  const bestDisplay = scored[0]?.display || "";
  const norms = scored.map((v) => normalizeKey(v.display)).filter(Boolean);
  const primary = norms[0] || normalizeKey(bestDisplay);
  const sizeSuffix = extractSizeSuffix(primary);

  // 1) productIdentity on any variant (domain-tagged items)
  for (const n of norms) {
    const id = productIdentity(n);
    if (id && BY_IDENTITY[id]) {
      return formatCrystalTriple(BY_IDENTITY[id], sizeSuffix);
    }
  }

  // 2) phrase patterns — only against the top spelling (avoid rare variants stealing the crystal)
  for (const { re, triple } of BY_PHRASE) {
    if (re.test(primary)) {
      return formatCrystalTriple(triple, sizeSuffix);
    }
  }

  // 3) letterCore lookup — prefer cores from highest-count spellings, then longer
  const coresByPriority = [];
  for (const v of scored) {
    const core = letterCore(normalizeKey(v.display));
    if (core) coresByPriority.push(core);
  }
  const cores = [...new Set(coresByPriority)];
  for (const core of cores) {
    const hit = lookupCoreTriple(core, levenshtein);
    if (hit) return formatCrystalTriple(hit, sizeSuffix);
  }

  // 4) Token-wise fallback for multi-word leftovers (e.g. rare compounds)
  for (const n of norms) {
    const tokens = n.split(/\s+/).filter((t) => t.length >= 4);
    for (const t of tokens) {
      const hit = lookupCoreTriple(letterCore(t), levenshtein);
      if (hit && tokens.length === 1) {
        return formatCrystalTriple(hit, sizeSuffix);
      }
    }
  }

  // 5) Fallback: keep observed English spelling in pipe format
  return englishOnlyCrystal(bestDisplay);
}

function clusterNames(hits) {
  /** @type {Map<string, NameHit[]>} */
  const byNorm = new Map();
  for (const hit of hits) {
    const key = normalizeKey(hit.raw);
    if (!key || key.length < 2) continue;
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key).push(hit);
  }

  const norms = [...byNorm.keys()].sort((a, b) => a.localeCompare(b));

  // Union-find: pairwise edges only when similarEnough (no loose substring chaining)
  const parent = new Map(norms.map((n) => [n, n]));
  function find(x) {
    let p = parent.get(x);
    while (p !== parent.get(p)) p = parent.get(p);
    let cur = x;
    while (cur !== p) {
      const next = parent.get(cur);
      parent.set(cur, p);
      cur = next;
    }
    return p;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (let i = 0; i < norms.length; i++) {
    for (let j = i + 1; j < norms.length; j++) {
      if (similarEnough(norms[i], norms[j])) union(norms[i], norms[j]);
    }
  }

  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const n of norms) {
    const root = find(n);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(n);
  }

  return [...groups.values()].map((normKeys) => {
    /** @type {Map<string, { display: string, count: number, tenants: Set<string>, sources: Set<string> }>} */
    const variants = new Map();
    const allHotels = new Set();
    const allSources = new Set();
    let total = 0;

    for (const nk of normKeys) {
      const rows = byNorm.get(nk) || [];
      for (const row of rows) {
        total += 1;
        allHotels.add(row.hotel);
        allSources.add(row.source);
        const display = String(row.raw).trim();
        const vk = normalizeKey(display);
        if (!variants.has(vk)) {
          variants.set(vk, {
            display,
            count: 0,
            tenants: new Set(),
            sources: new Set(),
          });
        }
        const v = variants.get(vk);
        v.count += 1;
        v.tenants.add(row.hotel);
        v.sources.add(row.source);
        if (display.length > v.display.length) v.display = display;
      }
    }

    const variantList = [...variants.values()].map((v) => ({
      display: v.display,
      count: v.count,
      tenants: v.tenants.size,
      sources: [...v.sources].sort(),
    }));

    return {
      crystalName: proposeCrystal(variantList),
      variants: variantList.sort((a, b) => b.count - a.count),
      sources: [...allSources].sort(),
      tenantCount: allHotels.size,
      occurrenceCount: total,
      exampleTenants: [...allHotels].sort().slice(0, 8),
      needsApproval: variantList.length > 1 || allHotels.size > 1,
      qtySignature: extractQtySignature(normKeys[0]),
    };
  });
}

function pushHit(hits, raw, source, hotel) {
  const name = String(raw || "").trim();
  if (!name) return;
  hits.push({ raw: name, source, hotel: String(hotel || "").trim() || "(unknown)" });
}

function extractRecipeIngredients(recipeJson) {
  if (!recipeJson) return [];
  let obj = recipeJson;
  if (typeof recipeJson === "string") {
    try {
      obj = JSON.parse(recipeJson);
    } catch {
      return [];
    }
  }
  const list = obj?.ingredients;
  if (!Array.isArray(list)) return [];
  return list
    .map((ing) => (ing && typeof ing === "object" ? ing.name : null))
    .filter(Boolean);
}

/** Demo / sales illustration properties — names are not reliable for crystal approval. */
const ILLUSTRATION_HOTEL_NAMES = new Set([
  "apex cafe and restaurant",
  "apex hotel",
]);

/**
 * Build exclusion set: HotelName keys on inventory rows may be display name OR tinNumber.
 * Prefer DB flag isIllustrationTenant; also hard-exclude known Apex illustration properties.
 */
async function loadExcludedTenantKeys(prisma) {
  const users = await prisma.user.findMany({
    select: {
      HotelName: true,
      tinNumber: true,
      isIllustrationTenant: true,
    },
  });

  const excluded = new Set();
  for (const u of users) {
    const display = String(u.HotelName || "").trim();
    const displayKey = display.toLowerCase();
    const tin = String(u.tinNumber || "").trim();
    const namedIllustration = ILLUSTRATION_HOTEL_NAMES.has(displayKey);
    if (u.isIllustrationTenant || namedIllustration) {
      if (display) {
        excluded.add(display);
        excluded.add(displayKey);
      }
      if (tin) excluded.add(tin);
    }
  }
  // Always exclude by canonical illustration display names (any casing)
  for (const name of ILLUSTRATION_HOTEL_NAMES) {
    excluded.add(name);
  }
  return excluded;
}

function isExcludedHotel(hotel, excludedKeys) {
  const raw = String(hotel || "").trim();
  if (!raw) return false;
  if (excludedKeys.has(raw)) return true;
  if (excludedKeys.has(raw.toLowerCase())) return true;
  return ILLUSTRATION_HOTEL_NAMES.has(raw.toLowerCase());
}

async function collectHits(prisma) {
  /** @type {NameHit[]} */
  const hits = [];
  const excludedHotels = await loadExcludedTenantKeys(prisma);
  console.log(
    `Excluding illustration tenants (${excludedHotels.size} keys): ${[...excludedHotels].slice(0, 12).join(", ")}${excludedHotels.size > 12 ? "…" : ""}`,
  );

  function push(raw, source, hotel) {
    if (isExcludedHotel(hotel, excludedHotels)) return;
    pushHit(hits, raw, source, hotel);
  }

  const registrations = await prisma.itemRegistration.findMany({
    select: { name: true, HotelName: true },
  });
  for (const r of registrations) push(r.name, "Inventory registration", r.HotelName);

  const statuses = await prisma.itemStatus.findMany({
    select: { name: true, HotelName: true },
  });
  for (const r of statuses) push(r.name, "Inventory movement", r.HotelName);

  const purchases = await prisma.purchaseRequest.findMany({
    select: { itemName: true, HotelName: true },
  });
  for (const r of purchases) push(r.itemName, "Purchase request", r.HotelName);

  const stockOuts = await prisma.stockOutRequest.findMany({
    select: { itemNameSnapshot: true, HotelName: true },
  });
  for (const r of stockOuts) {
    push(r.itemNameSnapshot, "Stock-out snapshot", r.HotelName);
  }

  const stationStock = await prisma.stationIngredientStock.findMany({
    select: { itemName: true, HotelName: true },
  });
  for (const r of stationStock) push(r.itemName, "Station stock", r.HotelName);

  const consumptions = await prisma.recipeStockConsumption.findMany({
    select: { ingredientName: true, HotelName: true },
  });
  for (const r of consumptions) {
    push(r.ingredientName, "Recipe consumption", r.HotelName);
  }

  const menuItems = await prisma.item.findMany({
    select: { recipeJson: true, HotelName: true },
    where: { recipeJson: { not: null } },
  });
  for (const item of menuItems) {
    for (const name of extractRecipeIngredients(item.recipeJson)) {
      push(name, "Recipe ingredient", item.HotelName);
    }
  }

  return hits;
}

function registerEthiopicFont(doc) {
  const candidates = [
    path.join("C:", "Windows", "Fonts", "nyala.ttf"),
    path.join("C:", "Windows", "Fonts", "ebrima.ttf"),
    "/usr/share/fonts/truetype/noto/NotoSansEthiopic-Regular.ttf",
  ];
  for (const fontPath of candidates) {
    if (!fs.existsSync(fontPath)) continue;
    try {
      const b64 = fs.readFileSync(fontPath).toString("base64");
      const vfsName = path.basename(fontPath);
      doc.addFileToVFS(vfsName, b64);
      doc.addFont(vfsName, "Ethiopic", "normal");
      doc.addFont(vfsName, "Ethiopic", "bold");
      return "Ethiopic";
    } catch {
      // try next candidate
    }
  }
  return null;
}

function buildPdf(clusters, meta, recommendedAdditions) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const ethiopicFont = registerEthiopicFont(doc);
  const crystalFont = ethiopicFont || "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;
  let page = 1;
  /** @type {"observed" | "recommended"} */
  let activeTable = "observed";

  const observedCols = [
    { key: "n", label: "#", w: 7 },
    { key: "crystal", label: "Proposed crystal (Amharic|Romanized|English)", w: 72 },
    { key: "variants", label: "Observed spellings (count)", w: 62 },
    { key: "sources", label: "Sources", w: 36 },
    { key: "tenants", label: "Tenants", w: 14 },
    { key: "occ", label: "Hits", w: 12 },
    { key: "examples", label: "Example tenants", w: 54 },
  ];
  const recommendedCols = [
    { key: "n", label: "#", w: 8 },
    { key: "crystal", label: "Proposed crystal (Amharic|Romanized|English)", w: 90 },
    { key: "category", label: "Category", w: 45 },
    { key: "purpose", label: "Purpose", w: 55 },
    { key: "note", label: "Note", w: 40 },
  ];

  function normalizeCols(cols) {
    const sumW = cols.reduce((s, c) => s + c.w, 0);
    cols.forEach((c) => {
      c.w = (c.w / sumW) * contentW;
    });
    return cols;
  }
  normalizeCols(observedCols);
  normalizeCols(recommendedCols);

  function activeCols() {
    return activeTable === "recommended" ? recommendedCols : observedCols;
  }

  function footer() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(
      `HotCol — Crystal naming approval (READ-ONLY draft)  ·  ${meta.generatedAt}  ·  Page ${page}`,
      pageW / 2,
      pageH - 6,
      { align: "center" },
    );
    doc.setTextColor(0);
  }

  function newPage() {
    footer();
    doc.addPage();
    page += 1;
    y = margin;
    drawHeaderRow();
  }

  function ensureSpace(need) {
    if (y + need > pageH - 12) newPage();
  }

  function drawHeaderRow() {
    const cols = activeCols();
    doc.setFillColor(25, 55, 85);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255);
    let x = margin;
    for (const c of cols) {
      doc.text(c.label, x + 1.2, y + 5.2);
      x += c.w;
    }
    doc.setTextColor(0);
    y += 8;
  }

  // Title page block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 40, 60);
  doc.text("Crystal naming — approval draft", margin, y + 4);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50);
  const intro = [
    "Purpose: Propose one crystal (canonical) name per ingredient/product group so inventory, purchase requests, and recipe lines can align later.",
    "Crystal format: AmharicScript|RomanizedAmharic|EnglishMeaning (example: ዳቦ|Dabo|Bread). The middle part is Amharic written with English letters (romanization), not Latin-as-a-language. When Amharic is unknown: —|English|English.",
    "Scope: Real tenants only (Apex Cafe and Restaurant / Apex Hotel illustration properties excluded). Sources: inventory registrations, inventory movements, purchase requests, stock-out snapshots, station stock, recipe ingredients, recipe consumptions.",
    "Clustering (high care): different sizes never merge; packaging/serving roles stay separate (tea ≠ tea bag; coffee/coffe ≠ coffee powder ≠ coffee cup); model codes stay separate (Toner ≠ 85A ≠ 83A). Domain rules: shbo(cleaning)≠shro/shiro(food); plain shro ≠ yeshro bakela ≠ yeshro ater ≠ mtn shro; flite≠selit; kosta≠pasta≠posta; wheat flour≠white flour; lamp≈lump but ≠pump; eka matebiya shbo≈shbo.",
    "Important: This PDF is for review/approval only. No database or system changes were made.",
    "Anti-overcorrection: prefer operator product knowledge; if English meaning is unknown, keep the local name (Akezha|Akezha). Do not merge lookalikes across products; do not split products the operator says are the same.",
    `Stats: ${meta.totalHits} name hits · ${meta.uniqueNormalized} unique spellings · ${meta.clusterCount} groups · ${meta.multiVariantCount} groups with multiple spellings · ${meta.tenantCount} tenants · ${meta.recommendedAdditionCount} recommended additions (section C).`,
  ];
  for (const line of intro) {
    doc.setFont(ethiopicFont && /[\u1200-\u137F]/.test(line) ? crystalFont : "helvetica", "normal");
    const wrapped = doc.splitTextToSize(line, contentW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.2 + 1.5;
  }
  y += 3;

  // Only multi-variant first (approval priority), then singles appendix note
  const multi = clusters.filter((c) => c.variants.length > 1);
  const singles = clusters.filter((c) => c.variants.length === 1);

  activeTable = "observed";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25, 55, 85);
  doc.text(`A. Groups needing spelling alignment (${multi.length})`, margin, y);
  y += 6;
  doc.setTextColor(0);

  drawHeaderRow();

  function drawRow(row, idx, zebra) {
    const cols = activeCols();
    const variantText = row.variants
      .map((v) => `${v.display} (${v.count})`)
      .join("; ");
    const cells = {
      n: String(idx),
      crystal: row.crystalName,
      variants: variantText,
      sources: row.sources.join(", "),
      tenants: String(row.tenantCount),
      occ: String(row.occurrenceCount),
      examples: row.exampleTenants.join(", "),
    };

    doc.setFontSize(6.5);
    const cellLines = cols.map((c, i) => {
      doc.setFont(i === 1 ? crystalFont : "helvetica", i === 1 ? "bold" : "normal");
      return doc.splitTextToSize(cells[c.key] || "", c.w - 2.2);
    });
    const lineH = 3.2;
    const rowH = Math.max(7, ...cellLines.map((lines) => lines.length * lineH + 2));
    ensureSpace(rowH + 1);

    if (zebra) {
      doc.setFillColor(245, 248, 252);
      doc.rect(margin, y, contentW, rowH, "F");
    }
    doc.setDrawColor(220);
    doc.setLineWidth(0.1);
    doc.rect(margin, y, contentW, rowH, "S");

    let x = margin;
    for (let i = 0; i < cols.length; i++) {
      const lines = cellLines[i];
      doc.setTextColor(i === 1 ? 20 : 30, i === 1 ? 60 : 30, i === 1 ? 90 : 30);
      doc.setFont(i === 1 ? crystalFont : "helvetica", i === 1 ? "bold" : "normal");
      doc.text(lines, x + 1.1, y + 3.6);
      x += cols[i].w;
      if (i < cols.length - 1) {
        doc.setDrawColor(230);
        doc.line(x, y, x, y + rowH);
      }
    }
    doc.setTextColor(0);
    y += rowH;
  }

  multi
    .sort(
      (a, b) =>
        b.variants.length - a.variants.length ||
        b.occurrenceCount - a.occurrenceCount,
    )
    .forEach((row, i) => drawRow(row, i + 1, i % 2 === 1));

  ensureSpace(20);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25, 55, 85);
  doc.text(
    `B. Single-spelling names (sample of ${Math.min(singles.length, 120)} / ${singles.length}) — already consistent`,
    margin,
    y,
  );
  y += 6;
  doc.setTextColor(0);
  drawHeaderRow();

  singles
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 120)
    .forEach((row, i) => drawRow(row, i + 1, i % 2 === 1));

  // Section C — recommended additions (not observed inventory hits)
  ensureSpace(24);
  y += 8;
  activeTable = "recommended";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25, 55, 85);
  doc.text(
    `C. Recommended additions (${recommendedAdditions.length}) — proposed for fuller registration / purchase / recipe options`,
    margin,
    y,
  );
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70);
  const sectionCNote = doc.splitTextToSize(
    "These are not observed inventory hits. They are candidate crystal names to add so pickers cover common kitchen, cafe, and store gaps. Dishes (kitfo, tibs, etc.) are intentionally omitted.",
    contentW,
  );
  doc.text(sectionCNote, margin, y);
  y += sectionCNote.length * 3.6 + 3;
  doc.setTextColor(0);
  drawHeaderRow();

  function drawRecommendedRow(row, idx, zebra) {
    const cols = activeCols();
    const cells = {
      n: String(idx),
      crystal: row.crystalName,
      category: row.category,
      purpose: row.purpose,
      note: "Candidate — not a DB hit",
    };
    doc.setFontSize(6.5);
    const cellLines = cols.map((c, i) => {
      doc.setFont(i === 1 ? crystalFont : "helvetica", i === 1 ? "bold" : "normal");
      return doc.splitTextToSize(cells[c.key] || "", c.w - 2.2);
    });
    const lineH = 3.2;
    const rowH = Math.max(7, ...cellLines.map((lines) => lines.length * lineH + 2));
    ensureSpace(rowH + 1);

    if (zebra) {
      doc.setFillColor(245, 248, 252);
      doc.rect(margin, y, contentW, rowH, "F");
    }
    doc.setDrawColor(220);
    doc.setLineWidth(0.1);
    doc.rect(margin, y, contentW, rowH, "S");

    let x = margin;
    for (let i = 0; i < cols.length; i++) {
      const lines = cellLines[i];
      doc.setTextColor(i === 1 ? 20 : 30, i === 1 ? 60 : 30, i === 1 ? 90 : 30);
      doc.setFont(i === 1 ? crystalFont : "helvetica", i === 1 ? "bold" : "normal");
      doc.text(lines, x + 1.1, y + 3.6);
      x += cols[i].w;
      if (i < cols.length - 1) {
        doc.setDrawColor(230);
        doc.line(x, y, x, y + rowH);
      }
    }
    doc.setTextColor(0);
    y += rowH;
  }

  recommendedAdditions.forEach((row, i) =>
    drawRecommendedRow(row, i + 1, i % 2 === 1),
  );

  footer();
  return doc;
}

/**
 * Human-review candidates only — never auto-changed.
 * Flags interpretive English on local-only spellings, and same Am|Rom with different EN.
 */
function buildReviewFlags(clusters) {
  /** @type {Array<Record<string, unknown>>} */
  const flags = [];

  const byAR = new Map();
  for (const c of clusters) {
    const [am, rom, en] = c.crystalName.split("|");
    const key = `${am || ""}|${rom || ""}`;
    if (!byAR.has(key)) byAR.set(key, []);
    byAR.get(key).push(c);
  }
  for (const [key, rows] of byAR) {
    const ens = new Set(rows.map((r) => r.crystalName.split("|")[2] || ""));
    if (ens.size > 1) {
      flags.push({
        type: "same_am_rom_different_english",
        key,
        englishMeanings: [...ens],
        note: "Same Amharic|Romanized with different English — confirm if intentional (e.g. garlic vs white onion).",
        examples: rows.map((r) => ({
          crystalName: r.crystalName,
          variants: r.variants.map((v) => v.display),
          hits: r.occurrenceCount,
        })),
      });
    }
  }

  for (const c of clusters) {
    const [am, rom, en] = c.crystalName.split("|");
    if (!rom || !en) continue;
    const romCore = rom.toLowerCase().replace(/[^a-z]/g, "");
    const enCore = en.toLowerCase().replace(/[^a-z]/g, "");
    if (!romCore || romCore === enCore) continue;
    const blob = c.variants.map((v) => v.display.toLowerCase()).join(" | ");
    const enTokens = en
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4);
    if (enTokens.some((t) => blob.includes(t))) continue;
    // local-looking variants (mostly non-English product words)
    const localHeavy = c.variants.every((v) => {
      const d = v.display.toLowerCase();
      return !/\b(milk|egg|meat|soap|oil|beer|rice|water|potato|onion|garlic|coffee|sugar|tomato|butter|cheese|paper|plastic|powder|sauce|drink)\b/.test(
        d,
      );
    });
    if (!localHeavy) continue;
    if (
      /\b(snack|blend|detergent|kindling|starter|skewer|cocktail|relish|pickle|shallot|cottage|fixture|cilantro|coriander|greens|herb|spice|flour|sieve|tray|drawer|packaging)\b/i.test(
        en,
      )
    ) {
      flags.push({
        type: "interpretive_english_on_local_name",
        crystalName: c.crystalName,
        variants: c.variants.map((v) => `${v.display}(${v.count})`),
        hits: c.occurrenceCount,
        note: "English gloss may be interpretive. If unsure, prefer using the local name itself as English.",
      });
    }
  }

  flags.sort((a, b) => (b.hits || 0) - (a.hits || 0));
  return flags;
}

async function main() {
  console.log("Connecting (read-only)…");
  const prisma = createPrismaClient();

  try {
    const hits = await collectHits(prisma);
    console.log(`Collected ${hits.length} name hits`);

    const clusters = clusterNames(hits).sort(
      (a, b) =>
        b.variants.length - a.variants.length ||
        b.occurrenceCount - a.occurrenceCount,
    );

    const lockCheck = assertOperatorLocks(clusters);
    if (!lockCheck.ok) {
      console.error("OPERATOR LOCK FAILURES (refusing to overwrite approval pack):");
      for (const f of lockCheck.failures) console.error(" -", f);
      process.exitCode = 2;
      return;
    }
    console.log(`Operator locks OK (${OPERATOR_LOCKS.length} rules)`);

    const reviewFlags = buildReviewFlags(clusters);

    const recommendedAdditions = RECOMMENDED_CRYSTAL_ADDITIONS.map((row) => ({
      crystalName: formatRecommendedCrystal(row),
      category: row.category,
      purpose: row.purpose,
      am: row.triple.am,
      rom: row.triple.rom,
      en: row.triple.en,
      cores: row.cores || [],
      note: "Candidate addition — not an observed inventory hit",
    }));

    const tenants = new Set(hits.map((h) => h.hotel));
    const meta = {
      generatedAt: new Date().toISOString(),
      totalHits: hits.length,
      uniqueNormalized: new Set(hits.map((h) => normalizeKey(h.raw))).size,
      clusterCount: clusters.length,
      multiVariantCount: clusters.filter((c) => c.variants.length > 1).length,
      tenantCount: tenants.size,
      recommendedAdditionCount: recommendedAdditions.length,
      operatorLockCount: OPERATOR_LOCKS.length,
      reviewFlagCount: reviewFlags.length,
      antiOvercorrectionPolicy: ANTI_OVERCORRECTION_POLICY,
      note: "Approval draft only — no DB or system changes. Section C items are proposed additions, not DB hits. reviewFlags are for human review only (not auto-changed).",
    };

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      outJson,
      JSON.stringify({ meta, clusters, recommendedAdditions, reviewFlags }, null, 2),
      "utf8",
    );

    const doc = buildPdf(clusters, meta, recommendedAdditions);
    doc.save(outPdf);

    console.log(`Wrote ${outPdf}`);
    console.log(`Wrote ${outJson}`);
    console.log(
      `Groups: ${meta.clusterCount} total, ${meta.multiVariantCount} with multiple spellings, ${meta.tenantCount} tenants, ${meta.recommendedAdditionCount} recommended additions, ${meta.reviewFlagCount} review flags`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
