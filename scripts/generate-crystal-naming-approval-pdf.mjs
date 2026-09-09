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
  "roll",
  "rolls",
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

  // Cleaning soap/detergent (shbo) — includes "eka matebiya shbo"
  if (
    /\b(eka\s+mateb[ei]ya\s+)?(shbo|shebo|shibo)\b/.test(n) ||
    core === "shbo" ||
    core === "shebo" ||
    core === "shibo" ||
    /ekamateb.*shb/.test(core)
  ) {
    return "shbo_cleaning";
  }

  // Shiro / shro food ingredient (not cleaning)
  if (
    /\b(shro|shero|shiro|shrowet)\b/.test(n) ||
    core === "shro" ||
    core === "shero" ||
    core === "shiro" ||
    core === "shrowet" ||
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
    /\b(keberete|keberet|kebrete|keberate|kebererti)\b/.test(n) ||
    core.startsWith("keberet") ||
    core === "kebrete"
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

function proposeCrystal(variants) {
  // Prefer forms with slash gloss (acheto/vinegar), then most occurrences, then longest.
  const scored = [...variants].sort((a, b) => {
    const slash = (s) => (s.includes("/") ? 1 : 0);
    if (slash(b.display) !== slash(a.display)) return slash(b.display) - slash(a.display);
    if (b.count !== a.count) return b.count - a.count;
    if (b.tenants !== a.tenants) return b.tenants - a.tenants;
    return b.display.length - a.display.length;
  });
  const best = scored[0]?.display || "";
  return best
    .split("/")
    .map((part) =>
      part
        .trim()
        .split(/\s+/)
        .map((w) =>
          w.length <= 2
            ? w.toUpperCase()
            : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        )
        .join(" "),
    )
    .join("/");
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

function buildPdf(clusters, meta) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;
  let page = 1;

  const cols = [
    { key: "n", label: "#", w: 8 },
    { key: "crystal", label: "Proposed crystal name", w: 48 },
    { key: "variants", label: "Observed spellings (count)", w: 78 },
    { key: "sources", label: "Sources", w: 42 },
    { key: "tenants", label: "Tenants", w: 16 },
    { key: "occ", label: "Hits", w: 14 },
    { key: "examples", label: "Example tenants", w: 66 },
  ];
  // normalize widths to contentW
  const sumW = cols.reduce((s, c) => s + c.w, 0);
  cols.forEach((c) => {
    c.w = (c.w / sumW) * contentW;
  });

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
    "Scope: Real tenants only (Apex Cafe and Restaurant / Apex Hotel illustration properties excluded). Sources: inventory registrations, inventory movements, purchase requests, stock-out snapshots, station stock, recipe ingredients, recipe consumptions.",
    "Clustering (high care): different sizes never merge; packaging/serving roles stay separate (tea ≠ tea bag; coffee/coffe ≠ coffee powder ≠ coffee cup); model codes stay separate (Toner ≠ 85A ≠ 83A). Domain rules: shbo(cleaning)≠shro/shiro(food); flite≠selit; kosta≠pasta≠posta; wheat flour≠white flour; lamp≈lump but ≠pump; eka matebiya shbo≈shbo.",
    "Important: This PDF is for review/approval only. No database or system changes were made.",
    `Stats: ${meta.totalHits} name hits · ${meta.uniqueNormalized} unique spellings · ${meta.clusterCount} groups · ${meta.multiVariantCount} groups with multiple spellings · ${meta.tenantCount} tenants.`,
  ];
  for (const line of intro) {
    const wrapped = doc.splitTextToSize(line, contentW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.2 + 1.5;
  }
  y += 3;

  // Only multi-variant first (approval priority), then singles appendix note
  const multi = clusters.filter((c) => c.variants.length > 1);
  const singles = clusters.filter((c) => c.variants.length === 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25, 55, 85);
  doc.text(`A. Groups needing spelling alignment (${multi.length})`, margin, y);
  y += 6;
  doc.setTextColor(0);

  drawHeaderRow();

  function drawRow(row, idx, zebra) {
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

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const cellLines = cols.map((c) =>
      doc.splitTextToSize(cells[c.key] || "", c.w - 2.2),
    );
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
      if (i === 1) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
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

  footer();
  return doc;
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

    const tenants = new Set(hits.map((h) => h.hotel));
    const meta = {
      generatedAt: new Date().toISOString(),
      totalHits: hits.length,
      uniqueNormalized: new Set(hits.map((h) => normalizeKey(h.raw))).size,
      clusterCount: clusters.length,
      multiVariantCount: clusters.filter((c) => c.variants.length > 1).length,
      tenantCount: tenants.size,
      note: "Approval draft only — no DB or system changes.",
    };

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      outJson,
      JSON.stringify({ meta, clusters }, null, 2),
      "utf8",
    );

    const doc = buildPdf(clusters, meta);
    doc.save(outPdf);

    console.log(`Wrote ${outPdf}`);
    console.log(`Wrote ${outJson}`);
    console.log(
      `Groups: ${meta.clusterCount} total, ${meta.multiVariantCount} with multiple spellings, ${meta.tenantCount} tenants`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
