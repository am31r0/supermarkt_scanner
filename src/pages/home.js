// src/pages/home.js
import { NAME_TO_CAT, PRODUCTS } from "../data/products.js";

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
  if (product.promoPrice != null) return coercePrice(product.promoPrice);
  return coercePrice(product.price);
}

function getProductName(p) {
  return (p?.title ?? p?.name ?? "").toString();
}

/* ---------------- Units ---------------- */
function parseUnit(text) {
  if (!text) return null;
  const regex = /(\d+(?:[.,]\d+)?)(\s?)(g|kg|ml|l|stuks?|stuk|pack|doos)\b/i;
  const match = text.toLowerCase().match(regex);
  if (match) {
    let value = parseFloat(match[1].replace(",", "."));
    let unit = match[3];
    if (unit === "kg") {
      value *= 1000;
      unit = "g";
    }
    if (unit === "l") {
      value *= 1000;
      unit = "ml";
    }
    if (unit.startsWith("stuk")) unit = "stuk";
    if (unit === "stuks") unit = "stuk";
    return { value, unit };
  }
  return null;
}

function ppuUnitLabel(unitInfo) {
  if (!unitInfo) return "";
  if (unitInfo.unit === "g") return "€/kg";
  if (unitInfo.unit === "ml") return "€/L";
  if (unitInfo.unit === "stuk") return "€/stuk";
  return "€/unit";
}

function calculatePPU(price, unitInfo) {
  if (price == null || !unitInfo) return null;
  if (unitInfo.unit === "g") return (price / unitInfo.value) * 1000;
  if (unitInfo.unit === "ml") return (price / unitInfo.value) * 1000;
  if (unitInfo.unit === "stuk") return price / unitInfo.value;
  return null;
}

/* ---------------- Category guessing ---------------- */
function guessCategoryFromListItem(query) {
  const q = query.toLowerCase();
  if (NAME_TO_CAT[q]) return NAME_TO_CAT[q];

  // fuzzy fallback in PRODUCTS
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
  if (shopName === "Dirk") return n.startsWith("dirk ");
  return false;
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

  // sort: best score > lowest price > house brand
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
      const pName = getProductName(product);
      const pUnit = parseUnit(pName);
      const ppu = calculatePPU(price, pUnit);

      details.push({
        name: item.name,
        qty: item.qty,
        match: pName || null,
        image: product?.image ?? null,
        price,
        ppu,
        unitInfo: pUnit,
      });
    }
    totals[shopName] = { details };
  }
  return totals;
}

/* ---------------- Shop loader ---------------- */
async function loadShopData() {
  const ahRes = await fetch(
    "https://am31r0.github.io/supermarkt_scanner/dev/Data/ah.json"
  );
  const jumboRes = await fetch(
    "https://am31r0.github.io/supermarkt_scanner/dev/Data/jumbo.json"
  );
  // Dirk kan later toegevoegd worden als dataset beschikbaar is

  const ah = ahRes.ok ? await ahRes.json() : [];
  const jumbo = jumboRes.ok ? await jumboRes.json() : [];

  return { AH: ah, Jumbo: jumbo }; // Dirk later bijvoegen
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
      // verzamel resultaten per shop voor dit item
      let results = [];
      for (const [shop, data] of Object.entries(totals)) {
        const det = data.details.find((d) => d.name === item.name);
        if (det?.price != null) results.push({ shop, ...det });
      }
      if (!results.length) continue;

      // sorteer goedkoopste eerst
      results.sort((a, b) => a.price - b.price);
      const cheapest = results[0];
      const others = results.slice(1, 3); // max 2 alternatieven

      html += `
        <div class="product-row">
          <!-- Winner / left -->
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
              <p class="name" title="${cheapest.match}">${cheapest.match}</p>
              <p class="price">€${cheapest.price.toFixed(2)}</p>
              <p class="ppu">${
                cheapest.ppu != null
                  ? cheapest.ppu.toFixed(2) +
                    " " +
                    ppuUnitLabel(cheapest.unitInfo)
                  : ""
              }</p>
            </div>
          </div>

          <!-- Alternatives / right (two columns) -->
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
                  <p class="price">€${o.price.toFixed(2)}</p>
                  <p class="ppu">${
                    o.ppu != null
                      ? o.ppu.toFixed(2) + " " + ppuUnitLabel(o.unitInfo)
                      : ""
                  }</p>
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
