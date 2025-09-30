// src/lib/matching.js
// =============================================
// Matching & Normalisatie Engine
// =============================================

// --- zet op true om console-debug te zien ---
const DEBUG = false;

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
  const postfix = "?width=120";

  let image = null;
  if (p.image) {
    image = base + p.image;
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

  let image = null;
  if (p.image) {
    image = p.image.replace(/fit-in\/\d+x\d+\//, "fit-in/120x120/");
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

// Dynamische drempel per woordlengte (tolerant voor korte woorden)
function dynThresh(len) {
  if (len <= 2) return 0.0; // praktisch geen fuzzy op 1–2 chars
  if (len === 3) return 0.68;
  if (len <= 5) return 0.74;
  if (len <= 7) return 0.77;
  return 0.8; // ≥8
}

function bestWordScore(qw, nameWords) {
  // Exacte prefix: alleen sterk als lengteverschil klein is
  for (const w of nameWords) {
    if (w.startsWith(qw)) {
      if (Math.abs(w.length - qw.length) <= 2) {
        return { score: 1.0, why: `prefix-strict:${qw}->${w}` };
      } else {
        return { score: 0.8, why: `prefix-loose:${qw}->${w}` };
      }
    }
  }

  // Vereis minimaal gedeelde prefix van 3 om fuzzy te doen
  const p3 = qw.slice(0, 3);
  if (!nameWords.some((w) => w.startsWith(p3))) {
    return { score: 0.0, why: `no-prefix3:${qw}` };
  }

  // Fuzzy berekenen
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


/**
 * scoreMatch:
 * - splitst query in woorden
 * - elk query-woord moet “voldoende” op een woord in de productnaam lijken
 * - gecombineerde score = gemiddelde, met kleine boosts voor frase/prefix
 * - GEEN infix-only logic (voorkomt cola->chocola)
 */
function scoreMatch(query, productName) {
  const q = query.toLowerCase().trim();
  const n = productName.toLowerCase().trim();
  if (!q) return 0.0;

  const qWords = tokenize(q);
  const nWords = tokenize(n);

  if (qWords.length === 0 || nWords.length === 0) return 0.0;

  // Per-woord scores
  const perWord = qWords.map((qw) => bestWordScore(qw, nWords));

  // Gate: elk query-woord moet minimaal zijn eigen drempel halen
  for (let i = 0; i < qWords.length; i++) {
    const need = dynThresh(qWords[i].length);
    if (perWord[i].score < need) {
      if (DEBUG)
        console.log(
          `[MISS] "${q}" vs "${n}" — word "${qWords[i]}" failed (${perWord[
            i
          ].score.toFixed(3)} < ${need}) [${perWord[i].why}]`
        );
      return 0.0;
    }
  }

  // Basis: gemiddelde van per-woord scores
  let avg =
    perWord.reduce((acc, x) => acc + x.score, 0) / Math.max(1, perWord.length);

  // Boosts:
  // - frase-boost als query als geheel voorkomt (maar niet verplicht)
  if (n.includes(q)) avg = Math.min(1, avg + 0.05);
  // - als minstens één hard prefix was, lichte boost
  if (perWord.some((x) => x.why.startsWith("prefix:"))) {
    avg = Math.min(1, avg + 0.03);
  }

  if (DEBUG)
    console.log(
      `[HIT] "${q}" vs "${n}" — avg=${avg.toFixed(3)} parts=${perWord
        .map((x) => `${x.score.toFixed(3)}{${x.why}}`)
        .join(", ")}`
    );

  return avg;
}

// =======================
// Search engine
// =======================
export function searchProducts(
  normalizedProducts,
  query = "",
  chosenCategory = null,
  sortBy = "ppu" // default: prijs per eenheid
) {
  if (!Array.isArray(normalizedProducts)) return [];
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const results = [];
  const THRESHOLD = 0.7;

  for (const p of normalizedProducts) {
    if (chosenCategory && p.unifiedCategory !== chosenCategory) continue;
    const sc = scoreMatch(q, p.name);
    if (sc >= THRESHOLD) results.push({ ...p, score: sc });
  }

  // --- Sorteren ---
  return results.sort((a, b) => {
    if (sortBy === "ppu") {
      if (a.pricePerUnit !== b.pricePerUnit)
        return a.pricePerUnit - b.pricePerUnit;
    } else if (sortBy === "price") {
      if (a.price !== b.price) return a.price - b.price;
    } else if (sortBy === "alpha") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "promo") {
      // zet promo items bovenaan
      if ((a.promoPrice ? 1 : 0) !== (b.promoPrice ? 1 : 0)) {
        return b.promoPrice ? 1 : -1;
      }
    }
    // fallback op score
    return b.score - a.score;
  });
}