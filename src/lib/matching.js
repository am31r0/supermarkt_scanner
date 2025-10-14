// =============================================
// Matching & Normalisatie Engine (Schappie)
// =============================================

const DEBUG = false;

/* =======================
   Universele categorieën
   ======================= */
export const UNIVERSAL_CATEGORIES = [
  "produce", // Groente & Fruit
  "meat_fish_veg", // Vlees, Vis & Vega
  "dairy", // Zuivel & Kaas
  "bakery", // Brood & Ontbijt
  "pantry", // Voorraad / Conserven
  "snacks", // Snacks & Snoep
  "drinks", // Dranken
  "alcohol", // Bier & Wijn
  "frozen", // Diepvries
  "health", // Drogisterij / Gezondheid
  "baby", // Baby & Kind
  "household", // Huishouden / Non-food
  "pet", // Huisdieren
  "other", // Overig
];

/* =======================
   Label detectie (Bio / Bewust / Tijdelijk)
   ======================= */
const LABEL_PATTERNS = [
  { key: "bio", rx: /\b(bio|biologisch)\b/i },
  { key: "special", rx: /\b(speciaal assortiment)\b/i },
  { key: "conscious", rx: /\b(bewust|bewuste voeding)\b/i },
  { key: "glutenfree", rx: /\b(glutenvrij)\b/i },
  { key: "seasonal", rx: /\b(tijdelijk|feestweken|barbecue|bbq|seizoens)\b/i },
];

/* =======================
   Regex kern mapping
   ======================= */
const CORE_CATEGORY_MAP = [
  { rx: /aardappelen|groente|fruit|verse sappen/i, to: "produce" },
  { rx: /vleeswaren?|vlees\b|vis\b|vega|vegetarisch/i, to: "meat_fish_veg" },
  { rx: /zuivel|eieren|kaas|plantaardig/i, to: "dairy" },
  { rx: /\bbrood\b|ontbijt|beleg(?!.*tapas)/i, to: "bakery" },
  {
    rx: /soepen|conserven|sauzen|kruiden|olie|pasta|rijst|wereldkeuken/i,
    to: "pantry",
  },
  { rx: /chips|zoutjes|noten|koek|snoep|chocolade|zelf bakken/i, to: "snacks" },
  { rx: /frisdrank|sappen|water|koffie|thee/i, to: "drinks" },
  { rx: /bier|wijn|aperitieven|sterke drank|alcohol/i, to: "alcohol" },
  { rx: /\bdiepvries\b/i, to: "frozen" },
  { rx: /drogisterij|verzorging|gezondheid|cosmetica|sport/i, to: "health" },
  { rx: /\bbaby\b|kind\b/i, to: "baby" },
  {
    rx: /huishoud|non-?food|koken|tafelen|vrije tijd|servicebalie/i,
    to: "household",
  },
  { rx: /huisdier(en)?|dieren/i, to: "pet" },
];

/* =======================
   Composietregel "Drogisterij en baby"
   ======================= */
const BABY_HINTS =
  /\b(baby|luiers?|billendoekjes|flesvoeding|papje|potjes|zwitsal|babyvoeding)\b/i;

/* =======================
   Hoofd normalisatie
   ======================= */
export function normalizeCategoryAndLabels({ category = "", title = "" }) {
  const src = `${category} ${title}`.trim();

  // Labels extraheren
  const labels = {};
  for (const { key, rx } of LABEL_PATTERNS) labels[key] = rx.test(src);

  // "Drogisterij en baby"
  if (/\bdrogisterij.*baby|baby.*drogisterij/i.test(category)) {
    const cat = BABY_HINTS.test(title) ? "baby" : "health";
    return { category: cat, labels };
  }

  // Regex matchen
  for (const rule of CORE_CATEGORY_MAP)
    if (rule.rx.test(category)) return { category: rule.to, labels };
  for (const rule of CORE_CATEGORY_MAP)
    if (rule.rx.test(title)) return { category: rule.to, labels };

  return { category: "other", labels };
}

/* =======================
   Pre-normalisatie
   ======================= */
export function preNormalizeStoreCategory(raw) {
  if (!raw) return "";
  let c = raw.trim();

  if (/^verse maaltijden(,|\s) salades$/i.test(c)) c = "Maaltijden, salades";
  if (/vlees, vis, vega(etarisch)?/i.test(c)) c = "Vlees, vis, vegetarisch";
  if (/frisdrank(,|\s) sappen(,|\s) water/i.test(c)) c = "Frisdrank en sappen";
  return c;
}

/* =======================
   unifyCategory – hoofdfunctie
   ======================= */
export function unifyCategory(storeKey, rawCategory, title = "") {
  const pre = preNormalizeStoreCategory(rawCategory);
  const { category } = normalizeCategoryAndLabels({ category: pre, title });
  return UNIVERSAL_CATEGORIES.includes(category) ? category : "other";
}

/* =======================
   Helpers: numbers & units
   ======================= */
function toFloatEU(s) {
  if (typeof s === "number") return s;
  if (!s) return NaN;
  const clean = String(s)
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (/,\d{1,2}$/.test(clean))
    return parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return parseFloat(clean.replace(/,/g, ""));
}

function normUnitKey(u) {
  if (!u) return null;
  const s = String(u).toLowerCase().trim();
  if (["kg", "kilo", "kilogram"].includes(s)) return "kg";
  if (["g", "gram", "grams"].includes(s)) return "g";
  if (["l", "lt", "liter", "litre", "liters"].includes(s)) return "L";
  if (["ml", "milliliter"].includes(s)) return "ml";
  if (["cl", "centiliter"].includes(s)) return "cl";
  if (["st", "stuk", "stuks", "stukken", "piece", "pieces"].includes(s))
    return "st";
  return s;
}

function labelForUnit(unit) {
  if (unit === "kg") return "€/kg";
  if (unit === "L") return "€/L";
  return "€/st";
}

function effectivePrice(normal, promo) {
  return promo && promo > 0 ? promo : normal;
}

/* =======================
   Normalizers per supermarkt
   ======================= */
export function normalizeAH(p) {
  const price = p.price;
  const promoPrice = typeof p.promoPrice === "number" ? p.promoPrice : null;
  const eff = effectivePrice(price, promoPrice);

  let unit = "st";
  let pricePerUnit = eff;
  let ppuLabel = "€/st";

  if (p.price_per_unit && p.unit) {
    const val = toFloatEU(p.price_per_unit);
    const u = normUnitKey(p.unit);
    if (u === "g") {
      unit = "kg";
      pricePerUnit = val * 1000;
    } else if (u === "ml") {
      unit = "L";
      pricePerUnit = val * 1000;
    } else if (u === "cl") {
      unit = "L";
      pricePerUnit = val * 100;
    } else {
      unit = u;
      pricePerUnit = val;
    }
    ppuLabel = labelForUnit(unit);
  }

  return {
    store: "ah",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("AH", p.category, p.title),
    price,
    promoPrice,
    promoEnd: p.promoEnd || null,
    unit,
    pricePerUnit,
    ppuLabel,
    image: p.image,
    link: p.link,
  };
}

export function normalizeJumbo(p) {
  const price = p.price;
  const promoPrice = typeof p.promoPrice === "number" ? p.promoPrice : null;
  const eff = effectivePrice(price, promoPrice);

  let unit = "st";
  let pricePerUnit = eff;
  let ppuLabel = "€/st";

  if (typeof p.pricePerUnit === "string") {
    const parts = p.pricePerUnit.split("/");
    if (parts.length === 2) {
      const val = toFloatEU(parts[0]);
      const u = normUnitKey(parts[1]);
      unit = u;
      pricePerUnit = val;
      ppuLabel = labelForUnit(u);
    }
  }

  let image = p.image
    ? p.image.replace(/fit-in\/\d+x\d+\//, "fit-in/120x120/")
    : null;

  return {
    store: "jumbo",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("JUMBO", p.category, p.title),
    price,
    promoPrice,
    unit,
    pricePerUnit,
    ppuLabel,
    image,
  };
}

export function normalizeDirk(p) {
  const price = p.normalPrice;
  const promoPrice = p.offerPrice && p.offerPrice > 0 ? p.offerPrice : null;
  const eff = effectivePrice(price, promoPrice);

  const unit = "st";
  const pricePerUnit = eff;
  const ppuLabel = labelForUnit(unit);

  let image = p.image
    ? "https://d3r3h30p75xj6a.cloudfront.net/" + p.image
    : null;
  if (image && !image.includes("?")) image += "?width=120";

  return {
    store: "dirk",
    id: p.productId,
    name: p.name,
    brand: p.brand || p.name.split(" ")[0],
    rawCategory: p.categoryLabel,
    unifiedCategory: unifyCategory("DIRK", p.categoryLabel, p.name),
    price,
    promoPrice,
    unit,
    pricePerUnit,
    ppuLabel,
    image,
  };
}

export function normalizeAldi(p) {
  const price = p.price;
  const promoPrice = typeof p.promoPrice === "number" ? p.promoPrice : null;
  const eff = effectivePrice(price, promoPrice);

  const unit = p.unit ? normUnitKey(p.unit) : "st";
  const pricePerUnit = eff;
  const ppuLabel = labelForUnit(unit);

  return {
    store: "aldi",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("ALDI", p.category, p.title),
    price,
    promoPrice,
    unit,
    pricePerUnit,
    ppuLabel,
    image: p.image,
    link: p.link,
  };
}

export function normalizeHoogvliet(p) {
  const price = toFloatEU(p.listPrice || p.price);
  const promoPrice = toFloatEU(p.promoPrice || p.discountedPrice || null);
  const eff = effectivePrice(price, promoPrice);

  const unit = p.baseUnit ? normUnitKey(p.baseUnit) : "st";
  const pricePerUnit = eff;
  const ppuLabel = labelForUnit(unit);

  let promoEnd = p.promoEnd || null;
  if (!promoEnd && Array.isArray(p.promotions) && p.promotions.length > 0) {
    const promo = p.promotions.find((pr) => pr.validUntil);
    if (promo) promoEnd = promo.validUntil;
  }

  return {
    store: "hoogvliet",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.categoryHierarchy || p.category,
    unifiedCategory: unifyCategory(
      "HOOGVLIET",
      p.categoryHierarchy || p.category,
      p.title
    ),
    price,
    promoPrice,
    promoEnd,
    unit,
    pricePerUnit,
    ppuLabel,
    image: p.image,
    link: p.link,
  };
}

/* =======================
   Alles combineren
   ======================= */
export function normalizeAll({
  ah = [],
  dirk = [],
  jumbo = [],
  aldi = [],
  hoogvliet = [],
}) {
  return [
    ...ah.map(normalizeAH),
    ...dirk.map(normalizeDirk),
    ...jumbo.map(normalizeJumbo),
    ...aldi.map(normalizeAldi),
    ...hoogvliet.map(normalizeHoogvliet),
  ];
}

/* =======================
   Matching Engine (identiek aan jouw oude)
   ======================= */

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }
  return matrix[b.length][a.length];
}

function sim(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

function tokenize(str) {
  return str.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

const WORD_VARIANTS = {
  banaan: ["bananen"],
  appel: ["appels"],
  ei: ["eieren"],
  tomaat: ["tomaten"],
  aardappel: ["aardappelen"],
  wortel: ["wortels"],
  vis: ["vissen"],
  kip: ["kippen"],
  boon: ["bonen"],
  ui: ["uien"],
  kaas: ["kazen"],
  brood: ["broden"],
  fles: ["flessen"],
  bloem: ["bloemen"],
  druif: ["druiven"],
  peer: ["peren"],
  citroen: ["citroenen"],
  sinaasappel: ["sinaasappels"],
  noot: ["noten"],
  koek: ["koeken"],
  worst: ["worsten"],
  ijs: ["ijsjes"],
};

const SEMANTIC_BLOCKLIST = {
  water: [
    "waterdicht",
    "waterproof",
    "waterfles",
    "waterkoker",
    "waterverf",
    "waterijsjes",
  ],
  melk: ["melkchocolade", "melkzeep", "melkpoeder", "melkopschuimer"],
  kaas: ["kaasschaaf", "kaasstengel", "kaasplank", "kaasbroodje"],
  ei: ["eierwekker", "eiersnijder", "eierdop"],
  pasta: ["tandpasta", "verfpasta", "pleisterpasta"],
  chips: ["microchip", "chipkaart", "computerchip"],
  olie: ["massageolie", "etherische", "gezichtsolie", "haarolie"],
  boter: ["bodybutter", "handboter"],
  suiker: ["suikervrij", "suikerklontjeshouder"],
  zout: ["zoutlamp", "zoutsteen", "badzout"],
  koffie: ["koffiemok", "koffiezetapparaat", "koffiepad"],
  thee: ["theemok", "theepot", "theedoek"],
  wijn: ["wijnrek", "wijnkoeler", "wijnflesopener"],
  bier: ["bierglas", "bieropener", "bierkrat"],
  cola: ["chocola"],
  banaan: [
    "bananenboom",
    "bananenchips",
    "maanden",
    "knijpfruit",
    "milkshake",
    "puffs",
    "protein",
  ],
};

function semanticFilter(query, product) {
  const q = query.toLowerCase().trim();
  const name = product.name.toLowerCase();
  if (SEMANTIC_BLOCKLIST[q])
    for (const bad of SEMANTIC_BLOCKLIST[q]) if (name.includes(bad)) return 0;
  const cat = (
    product.rawCategory ||
    product.unifiedCategory ||
    ""
  ).toLowerCase();
  if (cat.includes(q)) return 1.1;
  return 1;
}

/* =======================
   Search Products
   ======================= */
export function searchProducts(
  products,
  query = "",
  chosenCategory = null,
  sortBy = "ppu"
) {
  if (!Array.isArray(products)) return [];
  const q = (query || "").trim().toLowerCase();
  if (q.length < 2) return [];

  const results = [];
  const THRESHOLD = 0.6;
  let queries = [q];
  if (WORD_VARIANTS[q]) queries.push(...WORD_VARIANTS[q]);

  for (const p of products) {
    if (chosenCategory && p.unifiedCategory !== chosenCategory) continue;

    let sc = 0;
    for (const variant of queries)
      sc = Math.max(sc, scoreMatch(variant, p.name));

    if (sc >= THRESHOLD) {
      const sem = semanticFilter(q, p);
      if (sem > 0) results.push({ ...p, score: sc * sem });
    }
  }

  return results.sort((a, b) => {
    if (sortBy === "ppu" && a.pricePerUnit !== b.pricePerUnit)
      return a.pricePerUnit - b.pricePerUnit;
    if (sortBy === "price" && a.price !== b.price) return a.price - b.price;
    if (sortBy === "alpha") return a.name.localeCompare(b.name);
    if (sortBy === "promo" && !!b.promoPrice !== !!a.promoPrice)
      return b.promoPrice ? 1 : -1;
    return b.score - a.score;
  });
}

/* =======================
   Score Matching
   ======================= */
function dynThresh(len) {
  if (len <= 2) return 0.0;
  if (len === 3) return 0.68;
  if (len <= 5) return 0.74;
  if (len <= 7) return 0.77;
  return 0.8;
}

function bestWordScore(qw, nameWords) {
  for (const w of nameWords) {
    if (w.startsWith(qw))
      return { score: Math.abs(w.length - qw.length) <= 2 ? 1.0 : 0.8 };
  }
  let best = 0;
  for (const w of nameWords) best = Math.max(best, sim(qw, w));
  return { score: best };
}

function scoreMatch(query, productName) {
  const q = query.toLowerCase().trim();
  const n = productName.toLowerCase().trim();
  if (!q) return 0.0;
  const qWords = tokenize(q);
  const nWords = tokenize(n);
  if (!qWords.length || !nWords.length) return 0.0;
  const perWord = qWords.map((qw) => bestWordScore(qw, nWords));
  for (let i = 0; i < qWords.length; i++)
    if (perWord[i].score < dynThresh(qWords[i].length)) return 0.0;
  let avg = perWord.reduce((a, x) => a + x.score, 0) / qWords.length;
  if (n.includes(q)) avg = Math.min(1, avg + 0.05);
  return avg;
}
