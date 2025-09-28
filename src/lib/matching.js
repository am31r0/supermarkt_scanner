// src/lib/matching.js
// =============================================
// Matching & Normalisatie Engine
// =============================================
//
// Doelen:
//  1. Alle supermarkt-jsons normaliseren naar 1 standaard formaat
//  2. Units / hoeveelheden slim herkennen (ook uit titels)
//  3. Price-per-unit berekenen of afleiden waar nodig
//  4. Fuzzy matching zodat gebruikersinput tolerant matched
//  5. Unified categorieën koppelen (products.js)
//  6. Search engine die ALLE producten teruggeeft (voor modal)
// =============================================

// =======================
// CATEGORY MAPPING
// =======================
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
  Jumbo: {
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
  Dirk: {
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

// =======================
// Helper: unifyCategory
// =======================
function unifyCategory(store, rawCategory) {
  const mapping = CATEGORY_MAPPING[store.toUpperCase()] || {};
  return mapping[rawCategory] || "other";
}

// =======================
// Helper: parseUnit()
// =======================
export function parseUnit(str) {
  if (!str) return null;
  const lower = str.toLowerCase().trim();

  // Gewicht
  let m = lower.match(/([\d.,]+)\s*(kg|g)/);
  if (m) {
    let value = parseFloat(m[1].replace(",", "."));
    if (m[2] === "g") value /= 1000;
    return { unit: "kg", amount: value };
  }

  // Volume
  m = lower.match(/([\d.,]+)\s*(l|ml)/);
  if (m) {
    let value = parseFloat(m[1].replace(",", "."));
    if (m[2] === "ml") value /= 1000;
    return { unit: "L", amount: value };
  }

  // Stuks
  m = lower.match(/(\d+)\s*st/);
  if (m) return { unit: "st", amount: parseInt(m[1]) };

  return null;
}

// =======================
// Normalizers per winkel
// =======================
export function normalizeDirk(p) {
  const unitInfo = parseUnit(p.packaging);
  const price = p.normalPrice;
  const amount = unitInfo?.amount || 1;
  const base = "https://d3r3h30p75xj6a.cloudfront.net/";
  const postfix = "?width=190";

  let image = null;
  if (p.image) {
    image = base + p.image;
    // als er nog geen querystring inzit → plak ?width=190
    if (!image.includes("?")) {
      image += postfix;
    }
  }

  return {
    store: "dirk",
    id: p.productId,
    name: p.name,
    brand: p.brand,
    rawCategory: p.categoryLabel,
    unifiedCategory: unifyCategory("Dirk", p.categoryLabel),
    price,
    promoPrice: p.offerPrice || null,
    unit: unitInfo?.unit || "st",
    amount,
    pricePerUnit: amount ? price / amount : price,
    image,
    link: null,
  };
}

export function normalizeAH(p) {
  const price = p.price;
  const unit = p.unit ? p.unit.toLowerCase() : "st";
  let amount = null;

  if (p.price && p.price_per_unit) {
    amount = price / p.price_per_unit;
  }

  return {
    store: "ah",
    id: p.id,
    name: p.title,
    brand: p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("AH", p.category),
    price,
    promoPrice: p.promoPrice,
    unit,
    amount: amount || 1,
    pricePerUnit: p.price_per_unit || (amount ? price / amount : price),
    image: p.image,
    link: p.link,
  };
}

export function normalizeJumbo(p) {
  let unit = null,
    amount = null,
    ppu = null;

  const unitInfo = parseUnit(p.title);
  if (unitInfo) {
    unit = unitInfo.unit;
    amount = unitInfo.amount;
    ppu = amount > 0 ? p.price / amount : null;
  }

  if (!ppu && p.pricePerUnit) {
    const parts = p.pricePerUnit.split(" ");
    if (parts.length === 2) {
      const val = parseFloat(parts[0].replace(",", "."));
      unit = parts[1].toLowerCase();
      ppu = val;
      if (val > 0) {
        amount = p.price / val;
      }
    }
  }

  if (!ppu) {
    unit = unit || "st";
    amount = amount || 1;
    ppu = p.price / amount;
  }

  return {
    store: "jumbo",
    id: p.id,
    name: p.title,
    brand: p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("Jumbo", p.category),
    price: p.price,
    promoPrice: p.promoPrice,
    unit,
    amount,
    pricePerUnit: ppu,
    image,
    link: null,
  };
}

// =======================
// All-in normalizer
// =======================
export function normalizeAll({ ah = [], dirk = [], jumbo = [] }) {
  return [
    ...ah.map(normalizeAH),
    ...dirk.map(normalizeDirk),
    ...jumbo.map(normalizeJumbo),
  ];
}

// =======================
// Matching helpers
// =======================
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
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

function scoreMatch(query, productName) {
  const q = query.toLowerCase();
  const n = productName.toLowerCase();

  if (!q) return 1.0; // lege query = full match
  if (n.includes(q)) return 1.0;

  const dist = levenshtein(q, n);
  const maxLen = Math.max(q.length, n.length);
  return 1 - dist / maxLen;
}

// =======================
// Search engine
// =======================
// Input: genormaliseerde producten, zoekterm, optioneel categorie
// Output: matches, gesorteerd op prijsPerUnit -> score
export function searchProducts(
  normalizedProducts,
  query = "",
  chosenCategory = null
) {
  if (!Array.isArray(normalizedProducts)) return [];

  const results = [];

  for (const p of normalizedProducts) {
    if (chosenCategory && p.unifiedCategory !== chosenCategory) continue;

    const sc = scoreMatch(query, p.name);

    // bij query filteren op threshold, bij lege query altijd includen
    if (!query || sc >= 0.4) {
      results.push({ ...p, score: sc });
    }
  }

  return results.sort((a, b) => {
    if (a.pricePerUnit !== b.pricePerUnit) {
      return a.pricePerUnit - b.pricePerUnit;
    }
    return b.score - a.score;
  });
}
