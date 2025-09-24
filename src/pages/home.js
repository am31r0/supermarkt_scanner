// src/pages/home.js

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

/* ---------------- Units ---------------- */
function parseUnit(text) {
  if (!text) return null;
  const regex = /(\d+(?:[.,]\d+)?)(\s?)(g|kg|ml|l|stuks?|stuk|pack|doos)/i;
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

/* ---------------- Matcher ---------------- */
function findBestProduct(shopData, query) {
  const q = (query ?? "").toLowerCase();
  const qUnit = parseUnit(q);
  const qWords = q.split(/\s+/).filter(Boolean);

  let best = null;
  let bestScore = -1;

  for (const p of shopData) {
    const name = (p?.name ?? "").toLowerCase();
    if (!name) continue;

    const pUnit = parseUnit(name);

    const pWords = name.split(/\s+/);
    const overlap = qWords.filter((w) => pWords.includes(w)).length;
    let score = qWords.length ? overlap / qWords.length : 0;

    if (q && name.includes(q)) score += 0.5;

    if (qUnit && pUnit && qUnit.unit === pUnit.unit) {
      const diff = Math.abs(qUnit.value - pUnit.value);
      score += Math.max(0, 1 - diff / qUnit.value);
    }

    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }

  return best;
}

/* ---------------- Totals ---------------- */
function calculateTotals(list, shops) {
  const totals = {};
  for (const [shopName, shopData] of Object.entries(shops)) {
    let total = 0;
    const details = [];

    for (const item of list) {
      const product = findBestProduct(shopData, item.name);
      const price = extractPrice(product);
      const pUnit = parseUnit(product?.name ?? "");
      const ppu = calculatePPU(price, pUnit);

      const itemTotal = price != null ? price * item.qty : null;
      if (itemTotal != null) total += itemTotal;

      details.push({
        name: item.name,
        qty: item.qty,
        match: product?.name ?? null,
        price,
        ppu,
        unitInfo: pUnit,
        total: itemTotal,
      });
    }

    totals[shopName] = { total, details };
  }
  return totals;
}

/* ---------------- Shop loader (no caching) ---------------- */
async function loadShopData() {
  const ahRes = await fetch(
    "https://am31r0.github.io/supermarkt_scanner/dev/Data/ah.json"
  );
  const jumboRes = await fetch(
    "https://am31r0.github.io/supermarkt_scanner/dev/Data/jumbo.json"
  );

  const ah = ahRes.ok ? await ahRes.json() : [];
  const jumbo = jumboRes.ok ? await jumboRes.json() : [];

  return { AH: ah, Jumbo: jumbo };
}

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

    <section class="features">
      <article class="card"><h2>🔎 Slim zoeken</h2><p>Zoek producten en merken met actuele prijzen.</p></article>
      <article class="card"><h2>💰 Prijsvergelijking</h2><p>Bekijk per supermarkt of gecombineerde mandjes.</p></article>
      <article class="card"><h2>🔥 Aanbiedingen</h2><p>Ontdek actuele acties en kortingen in één oogopslag.</p></article>
    </section>

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

    const cheapest = Object.entries(totals).reduce((a, b) =>
      (a[1].total || Infinity) < (b[1].total || Infinity) ? a : b
    );

    let html = `
      <h2>Goedkoopste winkel</h2>
      <div class="shop cheapest">
        <h3>${cheapest[0]}</h3>
        <p class="price">€${cheapest[1].total.toFixed(2)}</p>
      </div>

      <h2>Andere winkels</h2>
      <div class="other-shops">
    `;

    for (const [shop, data] of Object.entries(totals)) {
      if (shop === cheapest[0]) continue;
      html += `
        <div class="shop">
          <h3>${shop}</h3>
          <p class="price">${data.total ? "€" + data.total.toFixed(2) : "-"}</p>
        </div>`;
    }
    html += `</div>`;

    html += `<h2>Productvergelijking</h2><table class="compare-table">
      <thead><tr><th>Product</th><th>Winkel</th><th>Match</th><th>Prijs</th><th>Prijs per eenheid</th></tr></thead><tbody>`;

    list.forEach((item) => {
      for (const [shop, data] of Object.entries(totals)) {
        const det = data.details.find((d) => d.name === item.name);
        html += `<tr>
          <td>${item.qty}× ${item.name}</td>
          <td>${shop}</td>
          <td>${det?.match ?? "—"}</td>
          <td>${det?.price != null ? "€" + det.price.toFixed(2) : "—"}</td>
          <td>${
            det?.ppu != null
              ? det.ppu.toFixed(2) + " " + ppuUnitLabel(det.unitInfo)
              : "—"
          }</td>
        </tr>`;
      }
    });

    html += `</tbody></table>`;
    comparisonEl.innerHTML = html;
  } catch (err) {
    console.error("Data load error:", err);
    comparisonEl.innerHTML = `<p>Kon supermarkt-data niet laden.</p>`;
  }
}
