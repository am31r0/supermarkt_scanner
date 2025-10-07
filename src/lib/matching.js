// src/lib/matching.js
// =============================================
// Matching & Normalisatie Engine
// =============================================
//
// Doelen:
// 1. Normaliseer AH, Jumbo, Dirk naar hetzelfde schema
// 2. Units / hoeveelheden correct parsen
// 3. Fuzzy matching met dynamische drempel
// 4. Semantic filtering voor dubbelzinnige zoekwoorden
//
// =============================================

const DEBUG = false;

/* =======================
   CATEGORY MAPPING
   ======================= */
const CATEGORY_MAPPING = {
  AH: {
    "Groente, aardappelen": "produce",
    "Fruit, verse sappen": "produce",
    "Maaltijden, salades": "produce",
    "Borrel, chips, snacks": "snacks",
    Kaas: "dairy",
    Vlees: "meat_fish_veg",
    Vis: "meat_fish_veg",
    "Vegetarisch, vegan en plantaardig": "meat_fish_veg",
    "Zuivel, eieren": "dairy",
    "Soepen, sauzen, kruiden, olie": "pantry",
    "Ontbijtgranen, beleg": "bakery",
    Diepvries: "frozen",
    Bakkerij: "bakery",
  },
  JUMBO: {
    "Aardappelen, groente en fruit": "produce",
    "Vleeswaren, kaas en tapas": "meat_fish_veg",
    "Verse maaltijden en gemak": "produce",
    "Vlees, vis en vega": "meat_fish_veg",
    "Zuivel, eieren, boter": "dairy",
    "Conserven, soepen, sauzen, oliën": "pantry",
    "Ontbijt, broodbeleg en bakproducten": "bakery",
    Diepvries: "frozen",
    "Brood en gebak": "bakery",
  },
  DIRK: {
    "Aardappelen, groente & fruit": "produce",
    "Vlees & Vis": "meat_fish_veg",
    "Verse maaltijden": "produce",
    "Zuivel & kaas": "dairy",
    Fruitconserven: "pantry",
    "Houdbare soepen": "pantry",
    "Maaltijden, salades & tapas": "produce",
    Voorraadkast: "pantry",
    "Brood, beleg & koek": "bakery",
    Diepvries: "frozen",
  },
};

function unifyCategory(store, rawCategory) {
  const key = (store || "").toUpperCase();
  const mapping = CATEGORY_MAPPING[key] || {};
  return mapping[rawCategory] || "other";
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
  if (/,\d{1,2}$/.test(clean)) {
    return parseFloat(clean.replace(/\./g, "").replace(",", "."));
  }
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
  if (["st", "stuk", "stuks", "stuk(s)", "pieces", "piece"].includes(s))
    return "st";
  return s;
}

function toBaseAmount(value, unit) {
  const u = normUnitKey(unit);
  if (u === "kg") return { unit: "kg", amount: value };
  if (u === "g") return { unit: "kg", amount: value / 1000 };
  if (u === "L") return { unit: "L", amount: value };
  if (u === "ml") return { unit: "L", amount: value / 1000 };
  if (u === "cl") return { unit: "L", amount: value / 100 };
  if (u === "st") return { unit: "st", amount: value };
  return { unit: "st", amount: value };
}

function labelForUnit(unit) {
  if (unit === "kg") return "€/kg";
  if (unit === "L") return "€/L";
  return "€/st";
}

function addBaseAmounts(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.unit !== b.unit) return a;
  return { unit: a.unit, amount: (a.amount || 0) + (b.amount || 0) };
}

/* =======================
   Packaging / unit parser
   ======================= */
export function parseUnit(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  const countWords =
    "st|stuk|stuks|stukken|rollen|tabletten|tabs|capsules|sachets|zakjes|blikjes|flessen|pak|pakken|doos|dozen|rol|tablet|capsule|sachet|blikje|fles";

  // multipack: 6x33cl, 12 x 1.5L, etc.
  let m =
    lower.match(/(\d+)\s*[x×]\s*([\d.,]+)\s*(kg|g|l|ml|cl)\b/) ||
    lower.match(/([\d.,]+)\s*(kg|g|l|ml|cl)\s*[x×]\s*(\d+)/);
  if (m) {
    let count, amount, unit;
    if (m.length === 4 && /[x×]/.test(m[0])) {
      count = toFloatEU(m[1]);
      amount = toFloatEU(m[2]);
      unit = m[3];
    } else {
      count = toFloatEU(m[3]);
      amount = toFloatEU(m[1]);
      unit = m[2];
    }
    const base = toBaseAmount(amount, unit);
    return { unit: base.unit, amount: (count || 1) * base.amount };
  }

  // enkel gewicht/volume
  let best = null;
  const volRegex = /([\d.,]+)\s*(kg|g|l|ml|cl)\b/g;
  while ((m = volRegex.exec(lower))) {
    const val = toFloatEU(m[1]);
    const base = toBaseAmount(val, m[2]);
    best = addBaseAmounts(best, base);
  }
  if (best && best.amount) return best;

  // aantal stuks
  m = lower.match(new RegExp(`(\\d+)\\s*(?:${countWords})\\b`));
  if (m) {
    const pcs = toFloatEU(m[1]);
    return { unit: "st", amount: pcs };
  }

  return null;
}

/* =======================
   PPU string parser
   ======================= */
function parsePPUString(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase().replace(",", ".");

  // patroon A: "€ 1.59 / 100 g"
  let m = s.match(
    /([\d.]+)\s*(?:€)?\s*(?:\/|\bper\b)\s*(\d+)?\s*(kg|g|l|ml|cl|st|stuk|stuks|pieces?|liter|kilo)\b/
  );
  if (m) {
    const value = parseFloat(m[1]);
    const qty = m[2] ? parseFloat(m[2]) : 1;
    let u = normUnitKey(m[3]);
    if (u === "g") return { unit: "kg", value: value / (qty / 1000) };
    if (u === "ml") return { unit: "L", value: value / (qty / 1000) };
    if (u === "cl") return { unit: "L", value: value / (qty / 100) };
    if (u === "kg") return { unit: "kg", value: value / qty };
    if (u === "L") return { unit: "L", value: value / qty };
    if (u === "st") return { unit: "st", value: value / qty };
    return { unit: "st", value };
  }

  // patroon B: "2.64 l", "0.13 pieces"
  m = s.match(/([\d.]+)\s*(kg|g|l|ml|cl|st|stuk|stuks|pieces?|liter|kilo)\b/);
  if (m) {
    const value = parseFloat(m[1]);
    let u = normUnitKey(m[2]);
    if (u === "g") return { unit: "kg", value: value * 1000 };
    if (u === "ml") return { unit: "L", value: value * 1000 };
    if (u === "cl") return { unit: "L", value: value * 100 };
    if (u === "liter") u = "L";
    if (u === "kilo") u = "kg";
    if (u === "pieces") u = "st";
    return { unit: u, value };
  }

  return null;
}

/* =======================
   Price helpers
   ======================= */
function effectivePrice(normal, promo) {
  const pv = typeof promo === "number" && promo > 0 ? promo : null;
  return pv ?? (typeof normal === "number" ? normal : null);
}

/* =======================
   Normalizers
   ======================= */
export function normalizeDirk(p) {
  const price = p.normalPrice;
  const promoPrice = p.offerPrice && p.offerPrice > 0 ? p.offerPrice : null;
  const eff = effectivePrice(price, promoPrice);

  const amt = parseUnit(p.packaging) || parseUnit(p.name) || null;
  const unit = amt?.unit || "st";
  const amount = amt?.amount || 1;
  const pricePerUnit = eff / amount;
  const ppuLabel = labelForUnit(unit);

  let image = null;
  if (p.image) {
    image = "https://d3r3h30p75xj6a.cloudfront.net/" + p.image;
    if (!image.includes("?")) image += "?width=120";
  }

  return {
    store: "dirk",
    id: p.productId,
    name: p.name,
    brand: p.brand || (p.name ? p.name.split(" ")[0] : null),
    rawCategory: p.categoryLabel,
    unifiedCategory: unifyCategory("DIRK", p.categoryLabel),
    price,
    promoPrice,
    offerEnd: p.offerEnd || null,
    unit,
    amount,
    pricePerUnit,
    ppuLabel,
    image,
    link: null,
  };
}

export function normalizeAH(p) {
  const price = p.price;
  const promoPrice = typeof p.promoPrice === "number" ? p.promoPrice : null;
  const eff = effectivePrice(price, promoPrice);

  let unit = "st";
  let amount = 1;
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
    } else if (u === "kg") {
      unit = "kg";
      pricePerUnit = val;
    } else if (u === "L") {
      unit = "L";
      pricePerUnit = val;
    } else {
      unit = "st";
      pricePerUnit = val;
    }
    ppuLabel = labelForUnit(unit);
  } else {
    const amt = parseUnit(p.packaging) || parseUnit(p.title);
    if (amt) {
      unit = amt.unit;
      amount = amt.amount;
      pricePerUnit = eff / amount;
      ppuLabel = labelForUnit(unit);
    }
  }

  return {
    store: "ah",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("AH", p.category),
    price,
    promoPrice,
    promoEnd: p.promoEnd || null,
    unit,
    amount,
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
  let amount = 1;
  let pricePerUnit = eff;
  let ppuLabel = "€/st";

  if (typeof p.pricePerUnit === "string") {
    const parsed = parsePPUString(p.pricePerUnit);
    if (parsed) {
      unit = parsed.unit;
      pricePerUnit = parsed.value;
      ppuLabel = labelForUnit(unit);
    }
  } else {
    const amt = parseUnit(p.packaging) || parseUnit(p.title);
    if (amt) {
      unit = amt.unit;
      amount = amt.amount;
      pricePerUnit = eff / amount;
      ppuLabel = labelForUnit(unit);
    }
  }

  let image = null;
  if (p.image) image = p.image.replace(/fit-in\/\d+x\d+\//, "fit-in/120x120/");

  return {
    store: "jumbo",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("JUMBO", p.category),
    price,
    promoPrice,
    promoUntil: p.promoUntil || null,
    unit,
    amount,
    pricePerUnit,
    ppuLabel,
    image,
    link: null,
  };
}

export function normalizeAll({ ah = [], dirk = [], jumbo = [] }) {
  return [
    ...ah.map(normalizeAH),
    ...dirk.map(normalizeDirk),
    ...jumbo.map(normalizeJumbo),
  ];
}

/* =======================
   Fuzzy matching
   ======================= */
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
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

function dynThresh(len) {
  if (len <= 2) return 0.0;
  if (len === 3) return 0.68;
  if (len <= 5) return 0.74;
  if (len <= 7) return 0.77;
  return 0.8;
}

function bestWordScore(qw, nameWords) {
  for (const w of nameWords) {
    if (w.startsWith(qw)) {
      if (Math.abs(w.length - qw.length) <= 2) {
        return { score: 1.0, why: `prefix-strict:${qw}->${w}` };
      } else {
        return { score: 0.8, why: `prefix-loose:${qw}->${w}` };
      }
    }
  }
  const p3 = qw.slice(0, 3);
  if (!nameWords.some((w) => w.startsWith(p3))) {
    return { score: 0.0, why: `no-prefix3:${qw}` };
  }
  let best = 0;
  let bestW = null;
  for (const w of nameWords) {
    const s = sim(qw, w);
    if (s > best) {
      best = s;
      bestW = w;
    }
  }
  return { score: best, why: `fuzzy:${qw}->${bestW}` };
}

function scoreMatch(query, productName) {
  const q = query.toLowerCase().trim();
  const n = productName.toLowerCase().trim();
  if (!q) return 0.0;

  const qWords = tokenize(q);
  const nWords = tokenize(n);
  if (qWords.length === 0 || nWords.length === 0) return 0.0;

  const perWord = qWords.map((qw) => bestWordScore(qw, nWords));
  for (let i = 0; i < qWords.length; i++) {
    const need = dynThresh(qWords[i].length);
    if (perWord[i].score < need) return 0.0;
  }

  let avg =
    perWord.reduce((acc, x) => acc + x.score, 0) / Math.max(1, perWord.length);
  if (n.includes(q)) avg = Math.min(1, avg + 0.05);
  if (perWord.some((x) => x.why.startsWith("prefix")))
    avg = Math.min(1, avg + 0.03);
  return avg;
}

/* =======================
   Semantic filters
   ======================= */
const QUERY_FILTERS = {
  water: {
    bannedWords: [
      "pleister",
      "ijs",
      "ballon",
      "filter",
      "verf",
      "doekjes",
      "meloen",
      "elastic",
      "drop",
      "lelie",
      "katoen",
      "tonijn",
    ],
    mustCats: ["drank", "frisdrank", "water"],
  },
  cola: {
    bannedWords: ["chocola", "ijsjes", "strips", "pure", "infuse"],
    mustCats: ["frisdrank"],
  },
  melk: {
    bannedWords: [
      "poeder",
      "tablet",
      "groente",
      "rijst",
      "brood",
      "brioches",
      "biscuits",
      "reep",
      "chocolade",
      "wafel",
    ],
    mustCats: ["zuivel", "melk", "dairy"],
  },
  kaas: { bannedWords: ["schaaf", "rasp"], mustCats: ["zuivel", "kaas"] },
  chips: { bannedWords: ["chipolata", "microchip"], mustCats: ["snacks"] },
  brood: { bannedWords: ["broodbeleg"], mustCats: ["bakery"] },
  rijst: { bannedWords: ["rijsttafel"], mustCats: ["pantry"] },
  pasta: { bannedWords: ["tandpasta"], mustCats: ["pantry"] },
  olie: { bannedWords: ["lampolie", "massage", "haar"], mustCats: ["pantry"] },
  soep: { bannedWords: ["zeep"], mustCats: ["pantry"] },
  ijs: { bannedWords: ["pleister"], mustCats: ["frozen"] },
  yoghurt: { bannedWords: ["masker"], mustCats: ["dairy"] },
  suiker: { bannedWords: ["suikerziekte"], mustCats: ["pantry"] },
  zout: { bannedWords: ["zoutsteen"], mustCats: ["pantry"] },
  bier: { bannedWords: ["bierglas"], mustCats: ["drank"] },
  wijn: { bannedWords: ["azijn"], mustCats: ["drank"] },
  kip: { bannedWords: ["kips"], mustCats: ["meat_fish_veg"] },
  vis: { bannedWords: ["vissenkom"], mustCats: ["meat_fish_veg"] },
  vlees: { bannedWords: ["vleesvervanger"], mustCats: ["meat_fish_veg"] },
  appel: { bannedWords: ["appeltaart"], mustCats: ["produce"] },
  banaan: { bannedWords: ["bananenchips"], mustCats: ["produce"] },
  druif: { bannedWords: ["druivenpitolie"], mustCats: ["produce"] },
  aardappel: { bannedWords: ["aardappelmes"], mustCats: ["produce"] },
  tomaat: { bannedWords: ["tomatenmes"], mustCats: ["produce"] },
  ui: { bannedWords: ["uiensoepmix"], mustCats: ["produce"] },
  knoflook: { bannedWords: ["knoflookpers"], mustCats: ["produce"] },
  paprika: { bannedWords: ["paprikapoeder"], mustCats: ["produce"] },
  sla: { bannedWords: ["slasaus"], mustCats: ["produce"] },
  wortel: { bannedWords: ["worteltaart"], mustCats: ["produce"] },
  kaasstengel: { bannedWords: [], mustCats: ["bakery"] },
  chocola: { bannedWords: [], mustCats: ["snacks"] },
  koek: { bannedWords: ["kook"], mustCats: ["bakery"] },
  koekjes: { bannedWords: ["kook"], mustCats: ["bakery"] },
  cake: { bannedWords: ["cakevorm"], mustCats: ["bakery"] },
  taart: { bannedWords: ["taartvorm"], mustCats: ["bakery"] },
  koffie: { bannedWords: ["koffiemok"], mustCats: ["pantry"] },
  thee: { bannedWords: ["theedoek"], mustCats: ["pantry"] },
  boter: { bannedWords: ["boterhamzak", "worst"], mustCats: ["dairy"] },
  margarine: { bannedWords: [], mustCats: ["dairy"] },
  ei: { bannedWords: ["eivorm"], mustCats: ["dairy"] },
  saus: { bannedWords: ["schoensaus"], mustCats: ["pantry"] },
  mayonaise: { bannedWords: ["verf"], mustCats: ["pantry"] },
  ketchup: { bannedWords: [], mustCats: ["pantry"] },
  honing: { bannedWords: ["honingraat"], mustCats: ["pantry"] },
  jam: { bannedWords: ["jampot"], mustCats: ["pantry"] },
};

function semanticFilter(query, product) {
  const q = query.toLowerCase();
  const rules = QUERY_FILTERS[q];
  if (!rules) return 1;
  const name = product.name.toLowerCase();
  const cat = (
    product.rawCategory ||
    product.unifiedCategory ||
    ""
  ).toLowerCase();
  for (const bad of rules.bannedWords) {
    if (name.includes(bad)) return 0;
  }
  if (rules.mustCats.some((c) => cat.includes(c))) return 1.1;
  return 0.7;
}

/* =======================
   Search
   ======================= */
export function searchProducts(
  normalizedProducts,
  query = "",
  chosenCategory = null,
  sortBy = "ppu"
) {
  if (!Array.isArray(normalizedProducts)) return [];
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const results = [];
  const THRESHOLD = 0.7;

  for (const p of normalizedProducts) {
    if (chosenCategory && p.unifiedCategory !== chosenCategory) continue;
    const sc = scoreMatch(q, p.name);
    if (sc >= THRESHOLD) {
      const sem = semanticFilter(q, p);
      if (sem > 0) {
        results.push({ ...p, score: sc * sem });
      }
    }
  }

  return results.sort((a, b) => {
    if (sortBy === "ppu") {
      if (a.pricePerUnit !== b.pricePerUnit)
        return a.pricePerUnit - b.pricePerUnit;
    } else if (sortBy === "price") {
      if (a.price !== b.price) return a.price - b.price;
    } else if (sortBy === "alpha") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "promo") {
      if ((a.promoPrice ? 1 : 0) !== (b.promoPrice ? 1 : 0)) {
        return b.promoPrice ? 1 : -1;
      }
    }
    return b.score - a.score;
  });
}
