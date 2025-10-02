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

function unifyCategory(store, rawCategory) {
  const mapping = CATEGORY_MAPPING[store.toUpperCase()] || {};
  return mapping[rawCategory] || "other";
}

/* =======================
   Unit parser
   ======================= */
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

/* =======================
   Normalizers
   ======================= */
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
       offerEnd: p.offerEnd || null, // ✅ einddatum Dirk
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
       promoEnd: p.promoEnd || null, // ✅ einddatum AH
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
       promoUntil: p.promoUntil || null, // ✅ einddatum Jumbo
       unit,
       amount,
       pricePerUnit: ppu,
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
   Fuzzy helpers
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
  if (perWord.some((x) => x.why.startsWith("prefix:"))) {
    avg = Math.min(1, avg + 0.03);
  }

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
    bannedWords: ["poeder", "tablet", "groente", "rijst", "brood", "brioches" , "biscuits" , "reep" ,"chocolade", "wafel"],
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
  boter: { bannedWords: ["boterhamzak","worst"], mustCats: ["dairy"] },
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

  if (rules.mustCats.some((c) => cat.includes(c))) {
    return 1.1;
  } else {
    return 0.7;
  }
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
