import ahData from "../data/ah.json";
import jumboData from "../data/jumbo.json";

const LS_KEY = "sms_list";

const SHOPS = {
  AH: ahData,
  Jumbo: jumboData,
  // later meer toevoegen
};

// ------------------ utils ------------------ //
function loadList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const matches = aWords.filter((w) => bWords.includes(w)).length;
  return matches / Math.max(aWords.length, bWords.length);
}

function findBestProduct(shopData, query) {
  let best = null;
  let bestScore = 0;
  for (const p of shopData) {
    const score = similarity(query, p.name);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

function calculateTotals(list) {
  const totals = {};
  for (const [shopName, shopData] of Object.entries(SHOPS)) {
    let total = 0;
    const details = [];
    list.forEach((item) => {
      const product = findBestProduct(shopData, item.name);
      if (product) {
        const unitPrice = product.price;
        const itemTotal = unitPrice * item.qty;
        total += itemTotal;
        details.push({
          ...item,
          match: product.name,
          price: unitPrice,
          total: itemTotal,
        });
      } else {
        details.push({ ...item, match: null, price: null, total: null });
      }
    });
    totals[shopName] = { total, details };
  }
  return totals;
}

// ------------------ render ------------------ //
export function renderHomePage(mount) {
  // zet de basis HTML
  mount.innerHTML = `
    <!-- Hero Section -->
    <main class="hero">
      <section class="hero__content">
        <h1>Vind altijd de beste prijs</h1>
        <p>Vergelijk supermarkten en bespaar geld op je boodschappenlijst.</p>
        <a href="#/search" class="btn btn--primary">Start zoeken</a>
      </section>
    </main>

    <!-- Feature Cards -->
    <section class="features">
      <article class="card">
        <h2>🔎 Slim zoeken</h2>
        <p>Zoek producten en merken met actuele prijzen.</p>
      </article>
      <article class="card">
        <h2>💰 Prijsvergelijking</h2>
        <p>Bekijk per supermarkt of gecombineerde mandjes.</p>
      </article>
      <article class="card">
        <h2>🔥 Aanbiedingen</h2>
        <p>Ontdek actuele acties en kortingen in één oogopslag.</p>
      </article>
    </section>

    <!-- Vergelijking -->
    <section class="comparison" id="comparison"></section>

    <!-- Footer -->
    <footer class="footer">
      <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
    </footer>
  `;

  // bereken en render de vergelijking
  const list = loadList();
  const comparisonEl = mount.querySelector("#comparison");

  if (list.length === 0) {
    comparisonEl.innerHTML = `<p>Je boodschappenlijst is leeg.</p>`;
    return;
  }

  const totals = calculateTotals(list);
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

  comparisonEl.innerHTML = html;
}
