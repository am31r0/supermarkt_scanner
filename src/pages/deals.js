import { loadJSONOncePerDay } from "../lib/cache.js";
import { normalizeAll } from "../lib/matching.js";
import { escHtml, escAttr, formatPrice, uid, showToast } from "../lib/utils.js";

import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  STORE_COLORS,
  STORE_LABEL,
} from "../lib/constants.js";

const LS_KEY = "sms_list";

// -------------------------
// Storage helpers
// -------------------------
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

// -------------------------
// Add to list
// -------------------------
function addItem(product) {
  const state = loadList();

  const item = {
    id: uid(),
    name: product.name,
    cat: product.unifiedCategory || product.cat || "other",
    pack: product.unit || product.pack || null,
    qty: 1,
    done: false,
    store: product.store,
    price: product.price || null,
    promoPrice: product.promoPrice || product.offerPrice || null,
  };

  state.push(item);
  saveList(state);
  document.dispatchEvent(new Event("list:changed"));
  showToast(`Toegevoegd aan Mijn Lijst`);

}



// -------------------------
// Promo einddatum helpers
// -------------------------
const maandMap = {
  jan: 0,
  februari: 1,
  feb: 1,
  mrt: 2,
  maart: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  sep: 8,
  september: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};
function formatNLDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
function parseJumboString(s) {
  const m = s.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/i);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const maand = maandMap[m[2]] ?? null;
  if (maand === null) return null;
  const now = new Date();
  let yyyy = now.getFullYear();
  let candidate = new Date(yyyy, maand, dd);
  if (candidate < now) yyyy += 1;
  return new Date(yyyy, maand, dd);
}
function getPromoEnd(p) {
  if (p.promoEnd) return new Date(p.promoEnd); // AH
  if (p.offerEnd) return new Date(p.offerEnd); // Dirk
  if (p.promoUntil) return parseJumboString(p.promoUntil); // Jumbo
  return null;
}
function isValidPromo(p) {
  const promo = p.promoPrice || p.offerPrice;
  if (!promo) return false;
  const base = p.price || 0;
  if (promo >= base) return false;

  const end = getPromoEnd(p);
  if (!end || isNaN(end)) return false;

  const now = new Date();
  const max = new Date();
  max.setFullYear(now.getFullYear() + 2);

  if (end > max) return false;
  if (end.getFullYear() > 2100) return false;

  return true;
}

// -------------------------
// Render product card
// -------------------------
function renderProductCard(p) {
  const promoPrice = p.promoPrice || p.offerPrice || null;

  let promoEndHtml = "";
  if (isValidPromo(p)) {
    const endDate = getPromoEnd(p);
    if (endDate && !isNaN(endDate)) {
      promoEndHtml = `<div class="promo-end">Geldig t/m ${formatNLDate(
        endDate
      )}</div>`;
    } else if (p.promoEnd || p.offerEnd || p.promoUntil) {
      promoEndHtml = `<div class="promo-end">Geldig t/m ${escHtml(
        p.promoEnd || p.offerEnd || p.promoUntil
      )}</div>`;
    }
  }
    
  return `
    <div class="deal-card promo" data-id="${p.id}" data-store="${p.store}">
      <div class="meta">
        <span class="list-store store-${p.store}">${escHtml(p.store)}</span>
        <div class="price-group">
          <span class="price old">${formatPrice(p.price)}</span>
          <span class="price new">${formatPrice(promoPrice)}</span>
          <span class="ppu">${(p.pricePerUnit ?? 0).toFixed(2)} / ${
    p.unit
  }</span>
        </div>
      </div>
      <span class="promo-badge">Aanbieding</span>
      <img loading="lazy" src="${p.image || ""}" alt="${escAttr(p.name)}"/>
      <div class="info">
        <div class="name">${escHtml(p.name)}</div>
        ${promoEndHtml}
      </div>
      <button class="btn small add-btn">Toevoegen</button>
    </div>
  `;
}

// -------------------------
// Deals modal
// -------------------------
function showDealsModal(store, products) {
  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.innerHTML = `
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true">
      <div class="search-modal-header">
        <h2>${
          store === "ah"
            ? "Albert Heijn"
            : store === "dirk"
            ? "Dirk van den Broek"
            : "Jumbo"
        } aanbiedingen</h2>
        <button class="search-modal-close" aria-label="Sluiten">✕</button> 
      </div>
      <div class="category-nav"></div>
      <div class="search-results-deals"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const panel = modal.querySelector(".search-modal-panel");
  const backdrop = modal.querySelector(".search-modal-backdrop");
  const btnClose = modal.querySelector(".search-modal-close");
  const resultsBox = modal.querySelector(".search-results-deals");
  const navBox = modal.querySelector(".category-nav");

  resultsBox.style.display = "block";
  resultsBox.style.flexWrap = "unset";

  // --- groepeer per categorie ---
  const grouped = {};
  for (const p of products) {
    const cat = p.unifiedCategory || p.rawCategory || "other";
    (grouped[cat] ||= []).push(p);
  }

  // --- maak de navigatieknoppen ---
  let navHtml = "";
  for (const cat of CATEGORY_ORDER) {
    if (!grouped[cat]) continue;
    const label = CATEGORY_LABELS[cat] || cat;
    navHtml += `<button class="cat-nav-btn filter-btn" data-target="cat-${cat}">${label}</button>`;
  }
  navBox.innerHTML = `<div class="cat-nav-inner">${navHtml}</div>`;

  // --- render categorieblokken ---
  let html = "";
  for (const cat of CATEGORY_ORDER) {
    const list = grouped[cat];
    if (!list) continue;

    html += `
      <div class="category-block" id="cat-${cat}">
        <h3 class="category-header">${CATEGORY_LABELS[cat] || cat}</h3>
        <div class="category-grid">
          ${list
            .map((p) => {
              const img = p.image
                ? p.store === "dirk" && !p.image.includes("?width=")
                  ? `${p.image}?width=190`
                  : p.image
                : "";
              const cardHtml = renderProductCard({ ...p, image: img });
              return cardHtml;
            })
            .join("")}
        </div>
      </div>
    `;
  }
  resultsBox.innerHTML = html;

  // --- click events op add-buttons ---
  resultsBox.querySelectorAll(".deal-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".add-btn")) return;
      const id = card.dataset.id;
      const store = card.dataset.store;
      const chosen = products.find(
        (r) => String(r.id) === id && String(r.store) === store
      );
      if (chosen) addItem(chosen);
    });
    card.querySelector(".add-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const id = card.dataset.id;
      const store = card.dataset.store;
      const chosen = products.find(
        (r) => String(r.id) === id && String(r.store) === store
      );
      if (chosen) addItem(chosen);
    });
  });

  // --- smooth scroll functionaliteit ---
  navBox.querySelectorAll(".cat-nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetId = e.target.dataset.target;
      const targetEl = resultsBox.querySelector(`#${targetId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // --- sluitlogica ---
  function closeModal() {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
  }
  function onKeyDown(e) {
    if (e.key === "Escape") closeModal();
  }
  function onDocPointerDown(e) {
    if (panel.contains(e.target)) return;
    closeModal();
  }

  btnClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", onDocPointerDown, true);
}



// -------------------------
// Main render
// -------------------------
export async function renderDealsPage(mount) {
  mount.innerHTML = `
    <section class="deals-page">
      <header class="page-header"><h1>Aanbiedingen</h1></header>
      <div class="deals-container"></div>
    </section>
  `;

  const container = mount.querySelector(".deals-container");

  const [ahRaw, dirkRaw, jumboRaw] = await Promise.all([
    loadJSONOncePerDay(
      "ah",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/ah.json"
    ),
    loadJSONOncePerDay(
      "dirk",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/dirk.json"
    ),
    loadJSONOncePerDay(
      "jumbo",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/jumbo.json"
    ),
  ]);

  const all = normalizeAll({ ah: ahRaw, dirk: dirkRaw, jumbo: jumboRaw });

  const stores = ["ah", "jumbo", "dirk"];
  for (const store of stores) {
    const products = all.filter((p) => p.store === store && isValidPromo(p));
    if (!products.length) continue;

    const section = document.createElement("section");
    section.className = "store-deals";
    section.innerHTML = `
    <h1 class="store-header" style="background:${STORE_COLORS[store]}">
    ${
      store === "ah"
        ? "Albert Heijn"
        : store === "dirk"
        ? "Dirk van den Broek"
        : "Jumbo"
    }
  </h1>
  <div class="deal-grid" style="border:1px solid ${STORE_COLORS[store]}">
    ${products
      .slice(0, 4)
      .map((p) => renderProductCard(p))
      .join("")}
        <button class="btn show-all">Alles weergeven</button>
  </div>
  
`;
    container.appendChild(section);

    section.querySelectorAll(".deal-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".add-btn")) return;
        const id = card.dataset.id;
        const chosen = products.find((r) => String(r.id) === id);
        if (chosen) addItem(chosen);
      });
      card.querySelector(".add-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const id = card.dataset.id;
        const chosen = products.find((r) => String(r.id) === id);
        if (chosen) addItem(chosen);
      });
    });

    section.querySelector(".show-all").addEventListener("click", () => {
      showDealsModal(store, products);
    });
  }
}
