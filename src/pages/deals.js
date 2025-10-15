// src/pages/deals.js
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
// Promo helpers
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
  const m = s?.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/i);
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
  if (p.promoEnd) return new Date(p.promoEnd);
  if (p.offerEnd) return new Date(p.offerEnd);
  if (p.promoUntil) return parseJumboString(p.promoUntil);
  return null;
}
function isValidPromo(p) {
  const promo =
    p.promoPrice || p.offerPrice || p.discountedPrice || p.discountPrice;
  if (!promo) return false;
  const base = p.price || 0;
  if (promo >= base || base === 0) return false;

  const now = new Date();
  const end = getPromoEnd(p);
  if (end && !isNaN(end)) {
    const max = new Date();
    max.setFullYear(now.getFullYear() + 2);
    if (end > max) return false;
    if (end.getFullYear() > 2100) return false;
  }
  return true;
}

// -------------------------
// Lijstweergave (hoofdpagina)
// -------------------------
function renderProductCardList(p) {
  const promoPrice = p.promoPrice || p.offerPrice || p.discountedPrice || null;
  const endDate = getPromoEnd(p);
  const promoEndHtml =
    endDate && !isNaN(endDate)
      ? `<div class="promo-end">Geldig t/m ${formatNLDate(endDate)}</div>`
      : "";

  return `
    <div class="deal-row" data-id="${p.id}" data-store="${p.store}">
      <img class="deal-thumb" src="${escAttr(p.image || "")}" alt="${escAttr(
    p.name
  )}">
      <div class="deal-info">
        <div class="deal-name">${escHtml(p.name)}</div>
        <div class="deal-prices">
          <span class="old">${formatPrice(p.price)}</span>
          <span class="new">${formatPrice(promoPrice)}</span>
        </div>
        ${promoEndHtml}
      </div>
      <button class="btn small add-btn">+</button>
    </div>
  `;
}

// -------------------------
// 🔥 Originele modal teruggezet
// -------------------------
function renderProductCard(p) {
  const promoPrice = p.promoPrice || p.offerPrice || p.discountedPrice || null;

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
            : store === "jumbo"
            ? "Jumbo"
            : store === "aldi"
            ? "Aldi"
            : "Hoogvliet"
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

  // --- nav knoppen ---
  let navHtml = "";
  for (const cat of CATEGORY_ORDER) {
    if (!grouped[cat]) continue;
    const label = CATEGORY_LABELS[cat] || cat;
    navHtml += `<button class="cat-nav-btn filter-btn" data-target="cat-${cat}">${label}</button>`;
  }
  navBox.innerHTML = `<div class="cat-nav-inner">${navHtml}</div>`;

  // --- categorieblokken renderen ---
  let html = "";
  for (const cat of CATEGORY_ORDER) {
    const list = grouped[cat];
    if (!list) continue;
    html += `
      <div class="category-block" id="cat-${cat}">
        <h3 class="category-header sticky">${CATEGORY_LABELS[cat] || cat}</h3>
        <div class="category-grid">
          ${list.map((p) => renderProductCard(p)).join("")}
        </div>
      </div>
    `;
  }
  resultsBox.innerHTML = html;

  // --- smooth scroll ---
  navBox.querySelectorAll(".cat-nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetId = e.target.dataset.target;
      const targetEl = resultsBox.querySelector(`#${targetId}`);
      if (targetEl)
        targetEl.scrollIntoView({ behavior: "auto", block: "start" });
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

  const [ahRaw, dirkRaw, jumboRaw, aldiRaw, hoogvlietRaw] = await Promise.all([
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
    loadJSONOncePerDay(
      "aldi",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/aldi.json"
    ),
    loadJSONOncePerDay(
      "hoogvliet",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/hoogvliet.json"
    ),
  ]);

  const all = normalizeAll({
    ah: ahRaw,
    dirk: dirkRaw,
    jumbo: jumboRaw,
    aldi: aldiRaw,
    hoogvliet: hoogvlietRaw,
  });
  const stores = ["ah", "jumbo", "dirk", "aldi", "hoogvliet"];

  for (const store of stores) {
    let products = all.filter((p) => p.store === store && isValidPromo(p));
    if (!products.length) continue;

    // Sorteer op grootste korting
    products = products
      .map((p) => ({
        ...p,
        discountPct:
          ((p.price -
            (p.promoPrice || p.offerPrice || p.discountedPrice || p.price)) /
            p.price) *
          100,
      }))
      .sort((a, b) => b.discountPct - a.discountPct);

    const logoSrc =
      store === "ah"
        ? "./public/icons/ah-logo.webp"
        : store === "jumbo"
        ? "./public/icons/jumbo-logo-transparent.webp"
        : store === "dirk"
        ? "./public/icons/dirk-logo-square.webp"
        : store === "aldi"
        ? "./public/icons/aldi-logo.webp"
        : "./public/icons/hoogvliet-logo.webp";

    const section = document.createElement("section");
    section.className = "store-deals-list";
    section.innerHTML = `
      <div class="store-header-row" style="border-left: 5px solid ${
        STORE_COLORS[store]
      }">
        <img src="${logoSrc}" class="store-logo" alt="${store}">
        <h2>${STORE_LABEL[store] || store}</h2>
      </div>
      <div class="deal-list">
        ${products.slice(0, 3).map(renderProductCardList).join("")}
      </div>
      <button class="btn show-all">Bekijk folder</button>
    `;
    container.appendChild(section);

    section.querySelectorAll(".deal-row").forEach((row) => {
      row.querySelector(".add-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const id = row.dataset.id;
        const chosen = products.find((r) => String(r.id) === id);
        if (chosen) addItem(chosen);
      });
    });

    section.querySelector(".show-all").addEventListener("click", () => {
      showDealsModal(store, products);
    });
  }
}
