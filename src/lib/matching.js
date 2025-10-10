// src/lib/matching.js
// =============================================
// Matching & Normalisatie Engine
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
  ALDI: {
    "Groente en Fruit": "produce",
    "Zuivel, Eieren en Kaas": "dairy",
    "Vlees, Vis en Vega": "meat_fish_veg",
    "Brood en Ontbijt": "bakery",
    Diepvries: "frozen",
    "Snacks en Chips": "snacks",
    "Soepen, Sauzen, Kruiden en Olie": "pantry",
    "Pasta, Rijst en Wereldkeuken": "pantry",
    Dranken: "pantry",
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
  if (["st", "stuk", "stuks", "stukken", "piece", "pieces"].includes(s))
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
    const parts = p.pricePerUnit.split("/");
    if (parts.length === 2) {
      const val = toFloatEU(parts[0]);
      const u = normUnitKey(parts[1]);
      unit = u;
      pricePerUnit = val;
      ppuLabel = labelForUnit(u);
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

export function normalizeDirk(p) {
  const price = p.normalPrice;
  const promoPrice = p.offerPrice && p.offerPrice > 0 ? p.offerPrice : null;
  const eff = effectivePrice(price, promoPrice);

  const unit = "st";
  const amount = 1;
  const pricePerUnit = eff;
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
    brand: p.brand || p.name.split(" ")[0],
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

export function normalizeAldi(p) {
  const price = p.price;
  const promoPrice = typeof p.promoPrice === "number" ? p.promoPrice : null;
  const eff = effectivePrice(price, promoPrice);

  const unit = p.unit ? normUnitKey(p.unit) : "st";
  const amount = 1;
  const pricePerUnit = eff;
  const ppuLabel = labelForUnit(unit);

  return {
    store: "aldi",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("ALDI", p.category),
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

/* =======================
   Normalize all
   ======================= */
export function normalizeAll({ ah = [], dirk = [], jumbo = [], aldi = [] }) {
  return [
    ...ah.map(normalizeAH),
    ...dirk.map(normalizeDirk),
    ...jumbo.map(normalizeJumbo),
    ...aldi.map(normalizeAldi),
  ];
}

/* =======================
   Search & Matching
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
        return { score: 1.0 };
      } else {
        return { score: 0.8 };
      }
    }
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
  if (qWords.length === 0 || nWords.length === 0) return 0.0;

  const perWord = qWords.map((qw) => bestWordScore(qw, nWords));
  for (let i = 0; i < qWords.length; i++) {
    const need = dynThresh(qWords[i].length);
    if (perWord[i].score < need) return 0.0;
  }

  let avg =
    perWord.reduce((acc, x) => acc + x.score, 0) / Math.max(1, perWord.length);
  if (n.includes(q)) avg = Math.min(1, avg + 0.05);
  return avg;
}

function semanticFilter(query, product) {
  const q = query.toLowerCase();
  const cat = (
    product.rawCategory ||
    product.unifiedCategory ||
    ""
  ).toLowerCase();

  // voorbeeld: vermijd "tandpasta" bij "pasta"
  if (q === "pasta" && product.name.toLowerCase().includes("tandpasta"))
    return 0;
  if (q === "chips" && product.name.toLowerCase().includes("microchip"))
    return 0;
  if (q === "olie" && product.name.toLowerCase().includes("massage")) return 0;

  // kleine boost voor juiste categorie
  if (cat.includes(q)) return 1.1;
  return 1;
}

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
      if (sem > 0) results.push({ ...p, score: sc * sem });
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
