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
      <h3 style="font-size:0.6rem;">Alpha Build 0.3.251008.6</h3>
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
        <h3 class="home-deals-title">Populaire aanbiedingen</h3>
        <button class="home-refresh btn small" style="display:none;">↻ Herlaad</button>
      </div>
      <div class="home-deals-grid"></div>
      <div class="home-deals-empty" style="display:none;">Geen deals gevonden 😕</div>
    </section>

    <footer class="footer">
      <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
    </footer>
  `;

  const grid = mount.querySelector(".home-deals-grid");
  const emptyState = mount.querySelector(".home-deals-empty");
  const refreshBtn = mount.querySelector(".home-refresh");

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

          console.log(
            `✅ ${store.toUpperCase()}: ${normalized.length} producten geladen`
          );
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

        const promos = data.filter(
          (p) => p.promoPrice && p.price > p.promoPrice
        );
        console.log(`🟡 ${store}: ${promos.length} promo’s gevonden`);

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

    renderDeals(popularDeals);
  }

  function renderDeals(deals) {
    if (!deals.length) {
      grid.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    grid.innerHTML = deals
      .map((deal) => {
        const color = STORE_COLORS[deal.store] || "#ccc";
        const label = STORE_LABEL[deal.store] || deal.store.toUpperCase();

        return `
          <div class="home-deal-card deal-card home-${deal.store}" 
               data-store="${deal.store}" 
               data-name="${deal.name}" 
               data-price="${deal.newPrice}" style="background:var(--surface)">
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
        const item = {
          id: uid(),
          name: card.dataset.name,
          cat: card.dataset.store,
          pack: null,
        };
        const list = loadList();
        list.push(item);
        saveList(list);
        showToast("Product toegevoegd aan Mijn Lijst");
      });
    });
  }

  refreshBtn.addEventListener("click", loadDeals);
  await loadDeals();
}
