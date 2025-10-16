import { showNav, formatPrice, uid, showToast } from "../lib/utils.js";
import { loadJSONOncePerDay } from "../lib/cache.js";
import { STORE_COLORS, STORE_LABEL } from "../lib/constants.js";
import { normalizeAH, normalizeJumbo, normalizeDirk } from "../lib/matching.js";

/* ---------------- Storage helpers ---------------- */
const LS_KEY = "sms_list";

function loadList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveList(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

/* ---------------- Renderer ---------------- */
export async function renderHomePage(mount) {
  showNav(true);

  mount.innerHTML = `
    <div class="page-header header-logo">
      <h1 class="logo">Schappie</h1>
      <h3 style="font-size:0.6rem;">Beta 0.4.251016.1 (hotfix)</h3>
    </div>

    <div class="hero">
      <section class="hero__content">
        <h1>Vind altijd de beste prijs</h1>
        <p>Vergelijk supermarkten en bespaar geld op je boodschappenlijst.</p>
        <a href="#/list" class="btn btn--primary">Start zoeken</a>
      </section>
    </div>

    <section class="home-deals">
      <div class="home-deals-header">
        <h3 class="home-deals-title" style="text-align:center">Populaire aanbiedingen</h3>
        <button class="home-refresh btn small" style="display:none;">↻ Herlaad</button>
      </div>
      <div class="home-deals-grid"></div>
      <div class="home-deals-empty" style="display:none;">Geen deals gevonden 😕</div>
    </section>

    <section class="home-wist-je">
    <p>Wist je dat je gemiddeld<p class="price new">€14,80</p>per week bespaart met Schappie?<p>
    </section>

    <div role="figure" aria-label="Review van Steve over Schappie" style="max-width:min(500px,95%);margin:0px auto 0.8rem;padding:16px 18px;border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:0 6px 24px rgba(0,0,0,.1);font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;line-height:1.45;border:1px solid var(--mini-surface)">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div style="width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;letter-spacing:.3px; background:var(--accent)" class="")>S</div>
      <div>
        <div style="font-size:14px;opacity:.9">Steve</div>
        <div style="font-size:18px;font-weight:700;margin-top:2px;color:#df4e7f;">★★★★★
          <span style="font-size:12px;font-weight:500;opacity:.7;margin-left:6px">(5/5)</span>
        </div>
      </div>
      <div style="margin-left:auto;font-size:12px;opacity:.65">Gebruiker</div>
    </div>
  
    <p style="margin:10px 0 0;font-size:15px;color:var(--ink)">
      “Snel prijzen vergelijken, duidelijke categorieën en mijn lijstje blijft gewoon bewaard. Scheelt me echt geld bij elke boodschap.”
    </p>
  </div>

  <div class="schappie-pro-card pro-gradient">
  <div class="pro-content">
    <h2 class="pro-title">💎 Schappie Pro</h2>
    <p class="pro-subtitle">
      Ontvang direct een pushmelding zodra jouw favoriete producten in de aanbieding zijn. 
      Nooit meer te laat voor een deal!
    </p>
    <button class="pro-btn">Bekijk alle voordelen →</button>
  </div>
</div>

  

    <footer class="footer">
      <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
    </footer>
  `;

  const grid = mount.querySelector(".home-deals-grid");
  const emptyState = mount.querySelector(".home-deals-empty");

  let retryCount = 0;
  const MAX_RETRIES = 40; // 40 * 0.5s = 20 seconden max

  async function loadDeals() {
    grid.innerHTML = `<p style="opacity:0.6;text-align:center;">Laden...</p>`;
    emptyState.style.display = "none";

    const stores = ["ah", "jumbo", "dirk"];

    const results = await Promise.all(
      stores.map(async (store) => {
        try {
          const raw = await loadJSONOncePerDay(
            store,
            `/dev/store_database/${store}.json`
          );

          const arr = Array.isArray(raw) ? raw : raw.data || raw.products || [];
          let normalized = [];
          if (store === "ah") normalized = arr.map(normalizeAH);
          if (store === "jumbo") normalized = arr.map(normalizeJumbo);
          if (store === "dirk") normalized = arr.map(normalizeDirk);

          return { store, data: normalized };
        } catch (err) {
          console.warn(`⚠️ ${store} kon niet geladen worden:`, err);
          return { store, data: [] };
        }
      })
    );

    const popularDeals = results
      .map(({ store, data }) => {
        if (!data.length) return null;

        const promos = data.filter((p) => p.promoPrice && p.price > p.promoPrice);
        let best;
        if (promos.length) {
          best = promos.sort(
            (a, b) =>
              (b.price - b.promoPrice) / b.price -
              (a.price - a.promoPrice) / a.price
          )[0];
        } else {
          best = data[Math.floor(Math.random() * data.length)];
        }

        return {
          store,
          name: best.name,
          oldPrice: best.price,
          newPrice: best.promoPrice || best.price,
          image: best.image,
        };
      })
      .filter(Boolean);

    // ✅ check of er producten zijn
    if (!popularDeals.length && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`🔁 Geen deals gevonden (poging ${retryCount}) — opnieuw proberen...`);
      setTimeout(loadDeals, 500);
      return;
    }

    if (!popularDeals.length) {
      console.warn("❌ Na meerdere pogingen geen deals gevonden.");
      emptyState.style.display = "block";
      grid.innerHTML = "";
      return;
    }

    renderDeals(popularDeals);
  }

  function renderDeals(deals) {
    grid.innerHTML = deals
      .map((deal) => {
        const color = STORE_COLORS[deal.store] || "#ccc";
        const label = STORE_LABEL[deal.store] || deal.store.toUpperCase();

        return `
          <div class="home-deal-card deal-card home-${deal.store}" 
               data-store="${deal.store}" 
               data-name="${deal.name}" 
               data-price="${deal.newPrice}" 
               style="background:var(--surface)">
            <div class="home-deal-header">
              <span class="list-store" style="background:${color}; color:#fff;">${label}</span>
            </div>
            <img src="${deal.image}" alt="${deal.name}">
            <div class="info">
              <p class="home-deal-name name">${deal.name}</p>
            </div>
            <div class="home-deal-prices">
              ${
                deal.oldPrice !== deal.newPrice
                  ? `<span class="price old">${formatPrice(
                      deal.oldPrice
                    )}</span>`
                  : ""
              }
              <span class="price new">${formatPrice(deal.newPrice)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    // ✅ Klik = toevoegen aan lijst
    grid.querySelectorAll(".home-deal-card").forEach((card) => {
      card.addEventListener("click", () => {
        const store = card.dataset.store;
        const name = card.dataset.name;
        const price = parseFloat(card.dataset.price || 0);

        const item = {
          id: uid(),
          name,
          cat: "other", // we hebben hier geen categorie-info
          pack: null,
          qty: 1,
          done: false,
          store,
          price,
          promoPrice: null,
        };

        const list = loadList();
        list.push(item);
        saveList(list);
        document.dispatchEvent(new Event("list:changed"));
        showToast("✅ Toegevoegd aan Mijn Lijst");
      });
    });
  }

  await loadDeals();
}
