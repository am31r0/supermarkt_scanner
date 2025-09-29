// src/pages/home.js
import { NAME_TO_CAT, PRODUCTS } from "../data/products.js";
import { loadJSONOncePerDay } from "../lib/cache.js";

/* ---------------- CSS Loader ---------------- */
function ensureCSS(href) {
  if (!document.querySelector(`link[data-dynamic="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-dynamic", href);
    document.head.appendChild(link);
  }
}

const LS_KEY = "sms_list";
const DEBUG = false; // zet op true om console-debug te zien

/* ---------------- Utils ---------------- */
function loadList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function coercePrice(p) {
  if (p == null) return null;
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    let n = Number(p.replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractPrice(product) {
  if (!product) return null;
  if (product.promoPrice != null && product.promoPrice > 0) {
    return coercePrice(product.promoPrice);
  }
  return coercePrice(product.price);
}

function getProductName(p) {
  return (p?.title ?? p?.name ?? "").toString();
}

/* ---------------- Units helpers ---------------- */
/** normaliseert unit-codes naar 'g' | 'ml' | 'stuk' | null */
function normUnit(u) {
  if (!u) return null;
  const s = String(u).toLowerCase();
  if (s === "kg") return "g";
  if (s === "g") return "g";
  if (s === "l") return "ml";
  if (s === "ml") return "ml";
  if (s === "st" || s.startsWith("stuk") || s === "stuks") return "stuk";
  return null;
}

/** parse "500 g", "1 kg", "2L", "6 st" uit willekeurige tekst */
function parseUnitAny(text) {
  if (!text) return null;
  const re = /(\d+(?:[.,]\d+)?)[\s]*?(kg|g|l|ml|stuks?|stuk)\b/i;
  const m = String(text).toLowerCase().match(re);
  if (!m) return null;
  let value = parseFloat(m[1].replace(",", "."));
  let u = m[2];
  if (u === "kg") {
    value *= 1000;
    u = "g";
  }
  if (u === "l") {
    value *= 1000;
    u = "ml";
  }
  if (u === "stuks") u = "stuk";
  if (u.startsWith("stuk")) u = "stuk";
  return { value, unit: u }; // g/ml/stuk
}

/** label voor PPU */
function ppuUnitLabel(unit) {
  if (unit === "g") return "€/kg";
  if (unit === "ml") return "€/L";
  if (unit === "stuk") return "€/stuk";
  return "€/unit";
}

/** strip hoeveelheid uit een titel voor nette weergave */
function stripQtyFromTitle(name) {
  if (!name) return "";
  // verwijder patronen als " 225 g", "1L", "500 ml", "(225 g)", "+ 225 g" etc.
  let s = name.replace(
    /\s*\(?\+?\s*\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|stuks?|stuk)\)?/gi,
    ""
  );
  // verklein dubbele spaties en trim
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

/* ---------------- Category guessing ---------------- */
function guessCategoryFromListItem(query) {
  const q = query.toLowerCase();
  if (NAME_TO_CAT[q]) return NAME_TO_CAT[q];

  let best = null,
    bestScore = -1;
  for (const p of PRODUCTS) {
    const name = p.name.toLowerCase();
    let score = 0;
    q.split(/\s+/).forEach((w) => {
      if (name.includes(w)) score++;
    });
    if (name.includes(q)) score += 2;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best?.cat ?? null;
}

/* ---------------- House brand detection ---------------- */
function isHouseBrand(shopName, productName) {
  const n = productName.toLowerCase();
  if (shopName === "AH")
    return n.startsWith("ah ") || n.includes("albert heijn");
  if (shopName === "Jumbo") return n.startsWith("jumbo ");
  if (shopName === "Dirk")
    return n.startsWith("dirk ") || n.includes("1 de beste");
  return false;
}

/* ---------------- Shop-specific metrics (amount/ppu/displayName) ---------------- */
/**
 * Geeft { unitInfo: {value, unit}, ppu, displayName, source }
 * - unitInfo.value in g/ml/stuk
 * - displayName is naam zonder hoeveelheid als die in titel zat (Jumbo)
 * - source is string voor debug ("ah:ppu", "dirk:packaging", etc)
 */
function deriveMetricsForShop(shopName, product) {
  const price = extractPrice(product);
  const rawName = getProductName(product);
  let unitInfo = null;
  let ppu = null;
  let displayName = rawName;
  let source = "fallback:stuk";

  if (shopName === "Jumbo") {
    // 1) eerst uit titel
    const fromTitle = parseUnitAny(rawName);
    if (fromTitle) {
      unitInfo = fromTitle; // g/ml/stuk
      displayName = stripQtyFromTitle(rawName);
      ppu = price != null && unitInfo.value > 0 ? price / unitInfo.value : null;
      source = "jumbo:title";
    }
    // 2) anders uit pricePerUnit
    if (!ppu && product.pricePerUnit) {
      const parts = String(product.pricePerUnit).split(/\s+/);
      if (parts.length === 2) {
        const val = parseFloat(parts[0].replace(",", "."));
        const u = normUnit(parts[1]);
        if (Number.isFinite(val) && u) {
          ppu = val; // al €/L of €/kg of €/stuk
          // hoeveelheid = prijs / ppu (in basis-unit)
          const amountBase = price / val;
          unitInfo = { value: amountBase, unit: u };
          displayName = stripQtyFromTitle(rawName);
          source = "jumbo:ppuField";
        }
      }
    }
  } else if (shopName === "AH") {
    // AH heeft price_per_unit (getal) + unit (KG/L/ST)
    const unitCode = normUnit(product.unit);
    if (Number.isFinite(product.price_per_unit) && unitCode && price != null) {
      ppu = product.price_per_unit; // €/kg of €/L of €/stuk
      const amountBase = price / ppu; // in kg/L/stuk -> wij willen g/ml/stuk
      if (unitCode === "g") unitInfo = { value: amountBase * 1000, unit: "g" };
      else if (unitCode === "ml")
        unitInfo = { value: amountBase * 1000, unit: "ml" };
      else unitInfo = { value: amountBase, unit: "stuk" };
      displayName = rawName; // AH titel laat meestal geen hoeveelheid zien
      source = "ah:ppu+unit";
    } else {
      // Fallback: soms staat hoeveelheid in titel
      const fromTitle = parseUnitAny(rawName);
      if (fromTitle) {
        unitInfo = fromTitle;
        ppu =
          price != null && unitInfo.value > 0 ? price / unitInfo.value : null;
        source = "ah:title";
      }
    }
  } else if (shopName === "Dirk") {
    // Dirk: packaging bevat altijd hoeveelheid
    if (product.packaging) {
      const fromPack = parseUnitAny(product.packaging);
      if (fromPack) {
        unitInfo = fromPack;
        ppu =
          price != null && unitInfo.value > 0 ? price / unitInfo.value : null;
        source = "dirk:packaging";
      }
    }
    // fallback via titel als packaging leeg
    if (!unitInfo) {
      const fromTitle = parseUnitAny(rawName);
      if (fromTitle) {
        unitInfo = fromTitle;
        ppu =
          price != null && unitInfo.value > 0 ? price / unitInfo.value : null;
        source = "dirk:title";
      }
    }
  }

  // absolute fallback: per stuk
  if (!unitInfo) unitInfo = { value: 1, unit: "stuk" };
  if (!ppu && price != null) {
    ppu = price / (unitInfo.value || 1);
    source += " -> fallback ppu";
  }

  if (DEBUG) {
    console.log(`[DEBUG][${shopName}]`, {
      name: rawName,
      displayName,
      price,
      unitInfo,
      ppu,
      source,
      raw: product,
    });
  }

  return { unitInfo, ppu, displayName };
}

/* ---------------- Matcher ---------------- */
function findBestProduct(shopData, query, shopName) {
  const q = (query ?? "").toLowerCase().trim();
  if (!q) return null;

  const forcedCat = guessCategoryFromListItem(query);
  let candidates = [];

  for (const p of shopData) {
    const name = getProductName(p).toLowerCase();
    if (!name) continue;

    let score = 0;
    q.split(/\s+/).forEach((w) => {
      if (name.includes(w)) score++;
    });
    if (name.includes(q)) score += 2;

    if (forcedCat) {
      const cat = (p.category ?? "").toLowerCase();
      if (forcedCat === "bakery" && cat.includes("brood")) score += 6;
      if (
        forcedCat === "dairy" &&
        (cat.includes("zuivel") || cat.includes("melk"))
      )
        score += 6;
      if (
        forcedCat === "produce" &&
        (cat.includes("fruit") || cat.includes("groente"))
      )
        score += 6;
      if (
        forcedCat === "snacks" &&
        (cat.includes("chips") ||
          cat.includes("choco") ||
          cat.includes("snoep"))
      )
        score += 6;
    }

    const price = extractPrice(p);
    if (price != null) {
      candidates.push({
        product: p,
        score,
        price,
        house: isHouseBrand(shopName, name),
      });
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.price !== b.price) return a.price - b.price;
    if (a.house !== b.house) return b.house - a.house;
    return 0;
  });

  return candidates[0].product;
}

/* ---------------- Totals ---------------- */
function calculateTotals(list, shops) {
  const totals = {};
  for (const [shopName, shopData] of Object.entries(shops)) {
    const details = [];
    for (const item of list) {
      const product = findBestProduct(shopData, item.name, shopName);
      const price = extractPrice(product);
      if (!product || price == null) {
        details.push({
          name: item.name,
          qty: item.qty,
          match: null,
          image: null,
          price: null,
          ppu: null,
          unitInfo: null,
          displayName: null,
        });
        continue;
      }

      const metrics = deriveMetricsForShop(shopName, product);

      details.push({
        name: item.name,
        qty: item.qty,
        match: getProductName(product),
        image: product?.image ?? null,
        price,
        ppu: metrics.ppu,
        unitInfo: metrics.unitInfo,
        displayName: metrics.displayName,
      });
    }
    totals[shopName] = { details };
  }
  return totals;
}

/* ---------------- Normalizers ---------------- */
function normalizeDirkData(raw) {
  const base = "https://d3r3h30p75xj6a.cloudfront.net/";
  return raw.map((p) => ({
    id: p.productId,
    name: p.name,
    category: p.categoryLabel ?? p.department ?? "",
    price: p.normalPrice,
    promoPrice: p.offerPrice && p.offerPrice > 0 ? p.offerPrice : null,
    image: p.image ? base + p.image : null,
    packaging: p.packaging ?? null, // <-- BELANGRIJK: behoud packaging!
  }));
}

/* ---------------- Shop loader ---------------- */
/* ---------------- Shop loader ---------------- */
async function loadShopData() {
  // via cache.js, max 1x per dag ophalen
  const ah = await loadJSONOncePerDay(
    "ah",
    "https://am31r0.github.io/supermarkt_scanner/dev/store_database/ah.json"
  );
  const jumbo = await loadJSONOncePerDay(
    "jumbo",
    "https://am31r0.github.io/supermarkt_scanner/dev/store_database/jumbo.json"
  );
  let dirk = await loadJSONOncePerDay(
    "dirk",
    "https://am31r0.github.io/supermarkt_scanner/dev/store_database/dirk.json"
  );

  // normaliseer Dirk-data zodat packaging en prijs kloppen
  dirk = normalizeDirkData(dirk);

  return { AH: ah, Jumbo: jumbo, Dirk: dirk };
}

/* ---------------- UI helpers ---------------- */
const shopClass = (s) => s.toLowerCase();
const logoPath = (s) => {
  if (s === "AH") return "public/icons/ah-logo.webp";
  if (s === "Jumbo") return "public/icons/jumbo-logo.webp";
  if (s === "Dirk") return "public/icons/dirk-logo.webp";
  return "";
};

/* ---------------- Renderer ---------------- */
export async function renderHomePage(mount) {
  ensureCSS("src/styles/home.css");

  mount.innerHTML = `
    <main class="hero">
      <section class="hero__content">
        <h1>Vind altijd de beste prijs</h1>
        <p>Vergelijk supermarkten en bespaar geld op je boodschappenlijst.</p>
        <a href="#/search" class="btn btn--primary">Start zoeken</a>
      </section>
    </main>

    <section class="comparison" id="comparison"><div>Prijzen laden…</div></section>

    <footer class="footer">
      <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
    </footer>
  `;

  const comparisonEl = mount.querySelector("#comparison");
  const list = loadList();

  if (!list.length) {
    comparisonEl.innerHTML = `<p>Je boodschappenlijst is leeg.</p>`;
    return;
  }

  try {
    const shops = await loadShopData();
    const totals = calculateTotals(list, shops);

    let html = `<h2>Prijsvergelijking per product</h2>`;

    for (const item of list) {
      let results = [];
      for (const [shop, data] of Object.entries(totals)) {
        const det = data.details.find((d) => d.name === item.name);
        if (det?.price != null) results.push({ shop, ...det });
      }
      if (!results.length) continue;

      results.sort((a, b) => a.price - b.price);
      const cheapest = results[0];
      const others = results.slice(1, 3);

      html += `
        <div class="product-row">
          <div class="winner-card shop-card ${shopClass(cheapest.shop)}">
            <div class="shop-header">
              <img class="logo" src="${logoPath(cheapest.shop)}" alt="${
        cheapest.shop
      } logo" />
              <h3 class="shop-name">${cheapest.shop}</h3>
              <span class="badge">Goedkoopst</span>
            </div>
            ${
              cheapest.image
                ? `<img class="product-img" src="${cheapest.image}" alt="${cheapest.match}" />`
                : ""
            }
            <div class="product-info">
              <p class="name" title="${cheapest.match}">
                ${cheapest.displayName || cheapest.match}
                ${
                  cheapest.unitInfo
                    ? `<span class="pack-badge">${cheapest.unitInfo.value} ${cheapest.unitInfo.unit}</span>`
                    : ""
                }
              </p>
              <p class="price">€${cheapest.price.toFixed(2)}</p>
              <p class="ppu">
                ${
                  cheapest.ppu != null
                    ? `${cheapest.ppu.toFixed(2)} ${ppuUnitLabel(
                        cheapest.unitInfo?.unit
                      )}`
                    : ""
                }
              </p>
            </div>
          </div>

          <div class="alts-grid">
            ${others
              .map(
                (o) => `
              <div class="alt-card shop-card ${shopClass(o.shop)}">
                <div class="shop-header">
                  <img class="logo" src="${logoPath(o.shop)}" alt="${
                  o.shop
                } logo" />
                  <h4 class="shop-name">${o.shop}</h4>
                </div>
                ${
                  o.image
                    ? `<img class="product-img tiny" src="${o.image}" alt="${o.match}" />`
                    : ""
                }
                <p class="alt-name">
                  ${o.displayName || o.match}
                  ${
                    o.unitInfo
                      ? `<span class="pack-badge">${o.unitInfo.value} ${o.unitInfo.unit}</span>`
                      : ""
                  }
                </p>
                <p class="price">€${o.price.toFixed(2)}</p>
                <p class="ppu">
                  ${
                    o.ppu != null
                      ? `${o.ppu.toFixed(2)} ${ppuUnitLabel(o.unitInfo?.unit)}`
                      : ""
                  }
                </p>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    comparisonEl.innerHTML = html;
  } catch (err) {
    console.error("Data load error:", err);
    comparisonEl.innerHTML = `<p>Kon supermarkt-data niet laden.</p>`;
  }
}
