// =============================================
// src/pages/list.js
// =============================================

import { PRODUCTS, NAME_TO_CAT } from "../data/products.js";
import { renderCategoryGrid } from "../lib/categoryGrid.js";
import { showSearchModal } from "../lib/modal.js";
import { escHtml, uid, formatPrice, showToast } from "../lib/utils.js";
import { renderStoreSelector } from "../lib/storeSelector.js";
import { saveToHistory } from "../lib/history.js";
import { getEnabledStores } from "../lib/settings.js";
import { CATEGORY_ORDER, STORE_COLORS, STORE_LABEL } from "../lib/constants.js";
import { searchProducts } from "../lib/matching.js";
import { ensureDataLoaded, ensureEngineReady } from "../lib/dataLoader.js";

const LS_KEY = "sms_list";
const DEBUG = false;
const STORE_ORDER = ["ah", "jumbo", "dirk", "aldi", "hoogvliet"];

/* =======================
   STORE NORMALIZATION
   ======================= */
function normalizeStoreKey(s) {
  if (!s) return "other";
  const v = String(s).trim().toLowerCase();
  if (["ah", "a.h.", "albert heijn", "albertheijn", "albert-heijn"].includes(v))
    return "ah";
  if (["jumbo"].includes(v)) return "jumbo";
  if (["dirk", "dirk van den broek", "dirk v d broek"].includes(v))
    return "dirk";
  if (["aldi"].includes(v)) return "aldi";
  if (["ah", "jumbo", "dirk", "aldi", "hoogvliet"].includes(v)) return v;
  return "other";
}

function normalizeEnabledMap(map) {
  const out = {};
  for (const k of Object.keys(map || {})) {
    const nk = normalizeStoreKey(k);
    out[nk] = !!map[k];
  }
  return out;
}

/* =======================
   STORAGE
   ======================= */
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

/* =======================
   FAVORIETEN
   ======================= */
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem("sms_favorites")) ?? [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem("sms_favorites", JSON.stringify(list));
}

function toggleFavorite(item) {
  const favs = loadFavorites();
  const exists = favs.find(
    (f) =>
      f.name.toLowerCase() === item.name.toLowerCase() && f.store === item.store
  );

  if (exists) {
    favs.splice(favs.indexOf(exists), 1);
    showToast("Verwijderd uit favorieten ❤️‍🔥");
  } else {
    favs.push({
      id: uid(),
      name: item.name,
      store: item.store,
      price: item.price,
      promoPrice: item.promoPrice,
    });
    showToast("Toegevoegd aan favorieten ❤️");
  }

  saveFavorites(favs);
  window.dispatchEvent(new Event("storage"));
}

function heartSvg(item) {
  const favs = loadFavorites();
  const isFav = favs.some(
    (f) =>
      f.name.toLowerCase() === item.name.toLowerCase() && f.store === item.store
  );

  return isFav
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" class="bi bi-suit-heart-fill" viewBox="0 0 16 16">
         <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="rgba(255, 0, 0, 0.25)" class="bi bi-suit-heart-fill" viewBox="0 0 16 16">
         <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1"/>
       </svg>`;
}

/* =======================
   MAIN PAGE
   ======================= */
export async function renderListPage(mount) {
  const state = loadList();

  mount.innerHTML = `
    <section class="list-page">
      <header class="page-header">
        <h1>Mijn boodschappenlijst</h1>
      </header>

      <div class="categories-section"></div>

      <div class="list-container">
        <div class="input-rows"></div>
        <div class="list-items" aria-live="polite"></div>
      </div>
    </section>
  `;

  const listPage = mount.querySelector(".list-page");
  const listContainer = mount.querySelector(".list-items");
  const inputRows = mount.querySelector(".input-rows");
  const catSection = mount.querySelector(".categories-section");

  const selectorMount = document.createElement("div");
  if (listPage && catSection) listPage.insertBefore(selectorMount, catSection);
  renderStoreSelector(selectorMount);

  await ensureEngineReady();
  const { allProducts } = await ensureDataLoaded();

  /* ---------- STORE FILTER REACTIVITY ---------- */
  const rerender = () => requestAnimationFrame(renderCommitted);
  selectorMount.addEventListener("change", rerender);
  selectorMount.addEventListener("input", rerender);
  document.addEventListener("stores:changed", rerender);
  window.addEventListener("storage", rerender);

  /* ---------- STATE MUTATIONS ---------- */
  function addItem(product) {
    const normStore = normalizeStoreKey(product?.store);
    let promo = product?.promoPrice ?? product?.offerPrice ?? null;

    if (!promo && Array.isArray(allProducts)) {
      const match = allProducts.find(
        (p) =>
          normalizeStoreKey(p.store) === normStore &&
          String(p.name).toLowerCase() === String(product.name).toLowerCase()
      );
      if (match) {
        promo = match.promoPrice ?? match.offerPrice ?? null;
        if (product.price == null && match.price != null)
          product.price = match.price;
      }
    }

    const item = {
      id: uid(),
      name: product.name,
      cat: product.cat || NAME_TO_CAT[product.name.toLowerCase()] || "other",
      pack: product.pack || null,
      qty: 1,
      done: false,
      store: normStore,
      price: product.price || null,
      promoPrice: promo,
    };

    state.push(item);
    saveList(state);
    renderCommitted();
    showToast("Toegevoegd aan lijst");
  }

  function incItemQtyById(id, delta = 1) {
    const idx = state.findIndex((i) => i.id === id);
    if (idx === -1) return;
    state[idx].qty = Math.max(0, (state[idx].qty ?? 1) + delta);
    if (state[idx].qty === 0) state.splice(idx, 1);
    saveList(state);
    renderCommitted();
  }

  function clearListLocal() {
    state.length = 0;
    saveList(state);
    renderCommitted();
    showToast("Lijst is geleegd");
  }

  function completeListFlow(itemsToSave) {
    const doneItems = (itemsToSave || []).filter((i) => i.done === true);
    if (!doneItems.length) {
      showToast("Geen afgestreepte producten om op te slaan");
      return;
    }
    saveToHistory(doneItems);
    state.forEach((item) => (item.done = false));
    saveList(state);
    renderCommitted();
    showToast(`${doneItems.length} producten opgeslagen in geschiedenis`);
  }

  /* =======================
     RENDER LIST
     ======================= */
  function renderCommitted() {
    listContainer.innerHTML = "";

    const enabled = normalizeEnabledMap(getEnabledStores());
    const grouped = {};
    const visibleItems = [];

    for (const item of state) {
      const storeKey = normalizeStoreKey(item.store);
      if (!enabled[storeKey]) continue;
      if (!grouped[storeKey]) grouped[storeKey] = [];
      item.store = storeKey;
      grouped[storeKey].push(item);
      visibleItems.push(item);
    }

    const keys = STORE_ORDER.filter((k) => grouped[k]?.length).concat(
      Object.keys(grouped).filter((k) => !STORE_ORDER.includes(k))
    );

    for (const storeKey of keys) {
      if (!enabled[storeKey]) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "store-block";
      wrapper.style.borderColor = STORE_COLORS[storeKey] || "transparent";
      wrapper.style.borderWidth = "1px";
      wrapper.style.borderStyle = "solid";
      wrapper.style.borderRadius = "10px";
      wrapper.style.marginBottom = "5px";
      wrapper.style.overflow = "clip";

      const ul = document.createElement("ul");
      ul.className = "store-list";
      wrapper.appendChild(ul);

      for (const item of grouped[storeKey]) {
        const li = document.createElement("li");
        li.className = "list-item";
        if (item.done) li.classList.add("done");

        const hasPromo =
          Number(item.promoPrice) > 0 &&
          Number(item.price) > 0 &&
          Number(item.promoPrice) < Number(item.price);
        const promoPrice = hasPromo ? Number(item.promoPrice) : null;

        li.innerHTML = `
          <label class="item-check">
            <input type="checkbox" ${item.done ? "checked" : ""} />
            <span class="item-full-name">
              <span class="item-name">${escHtml(item.name)}</span>
              <span class="item-name-store-price">
                <span class="list-store store-${storeKey}">
                  ${STORE_LABEL[storeKey] || escHtml(item.store)}
                </span>
                ${
                  hasPromo
                    ? `<span class="promo-pill" style="margin-left:0.2rem">KORTING</span>
                       <span class="list-price old">${formatPrice(
                         item.price
                       )}</span>
                       <span class="list-price new">${formatPrice(
                         promoPrice
                       )}</span>`
                    : item.price
                    ? `<span class="list-price">${formatPrice(
                        item.price
                      )}</span>`
                    : ""
                }
              </span>
            </span>
            <div class="item-actions">
              <div class="qty-controls">
                <button class="fav-btn">${heartSvg(item)}</button>
                <button class="icon-btn minus">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="icon-btn plus">+</button>
              </div>
              <button class="icon-btn trash-btn delete">${trashSvg()}</button>
            </div>
          </label>
        `;

        li.querySelector(".fav-btn").addEventListener("click", () =>
          toggleFavorite(item)
        );
        li.querySelector("input[type=checkbox]").addEventListener(
          "change",
          (e) => {
            item.done = e.target.checked;
            saveList(state);
            renderCommitted();
          }
        );
        li.querySelector(".plus").addEventListener("click", () =>
          incItemQtyById(item.id, 1)
        );
        li.querySelector(".minus").addEventListener("click", () =>
          incItemQtyById(item.id, -1)
        );
        li.querySelector(".delete").addEventListener("click", () => {
          const idx = state.findIndex((i) => i.id === item.id);
          if (idx > -1) state.splice(idx, 1);
          saveList(state);
          renderCommitted();
        });

        ul.appendChild(li);
      }

      listContainer.appendChild(wrapper);
    }

    if (visibleItems.length) {
      renderTotals(listContainer, visibleItems);
      const actions = document.createElement("div");
      actions.className = "list-actions";
      actions.innerHTML = `
        <button class="btn small danger clear-btn">Lijst legen</button>
        <button class="btn small success done-btn pro-gradient">Klaar ✓ (Pro-functie)</button>
      `;
      listContainer.appendChild(actions);

      actions
        .querySelector(".done-btn")
        .addEventListener("click", () => completeListFlow(visibleItems));
      actions
        .querySelector(".clear-btn")
        .addEventListener("click", clearListLocal);
    }
  }

  /* =======================
     SEARCH / INPUT
     ======================= */
     function createInputRow() {
       const row = document.createElement("div");
       row.className = "input-row";
       row.innerHTML = `
        <input type="text" class="item-input" placeholder="Typ hier..." autocomplete="off" />
        <button class="btn small commit">Zoeken</button>
        <div class="suggestions"></div>
      `;

       const input = row.querySelector(".item-input");
       const commitBtn = row.querySelector(".commit");
       const sugBox = row.querySelector(".suggestions");
       let sugTimeout = null;

       // ---------- Cataloguslijst uit products.js ----------
       const CATALOG_NAMES = (() => {
         if (Array.isArray(PRODUCTS)) {
           return Array.from(
             new Set(
               PRODUCTS.map((p) =>
                 typeof p === "string" ? p : p?.name
               ).filter(Boolean)
             )
           );
         }
         if (PRODUCTS && typeof PRODUCTS === "object") {
           const names = [];
           for (const key of Object.keys(PRODUCTS)) {
             const val = PRODUCTS[key];
             if (Array.isArray(val)) {
               for (const item of val) {
                 if (typeof item === "string") names.push(item);
                 else if (item && typeof item === "object" && item.name)
                   names.push(item.name);
               }
             }
           }
           return Array.from(new Set(names.filter(Boolean)));
         }
         return [];
       })();

       // ---------- Echte zoekactie ----------
       async function handleSearch(q) {
         const query = q || input.value.trim();
         if (!query) return;

         const results = searchProducts(allProducts, query);
         if (!results.length) {
           showToast("Geen resultaten gevonden");
           sugBox.classList.remove("open");
           return;
         }

         showSearchModal(results, (chosen) => {
           addItem({
             id: chosen.id,
             name: chosen.name,
             cat: chosen.unifiedCategory,
             pack: chosen.unit,
             store: normalizeStoreKey(chosen.store),
             price: chosen.price,
             promoPrice: chosen.promoPrice ?? chosen.offerPrice ?? null,
           });
           input.value = "";
           sugBox.classList.remove("open");
         });
       }

       // ---------- Suggesties vanuit products.js ----------
       function openSug(query) {
         const q = String(query || "")
           .toLowerCase()
           .trim();

         if (q.length < 3) {
           sugBox.classList.remove("open");
           sugBox.innerHTML = "";
           return;
         }

         const results = CATALOG_NAMES.filter((name) =>
           name.toLowerCase().includes(q)
         ).slice(0, 10);
         if (!results.length) {
           sugBox.classList.remove("open");
           sugBox.innerHTML = "";
           return;
         }

         // vul de HTML exact volgens jouw oude structure
         sugBox.innerHTML = results
           .map(
             (name) => `
              <button class="suggestion" data-name="${escHtml(name)}">
                ${escHtml(name)}
              </button>
            `
           )
           .join("");

         sugBox.classList.add("open");

         sugBox.querySelectorAll(".suggestion").forEach((btn) => {
           btn.addEventListener("click", () => {
             input.value = btn.dataset.name;
             sugBox.classList.remove("open");
             handleSearch();
           });
         });
       }

       // ---------- Event listeners ----------
       commitBtn.addEventListener("click", () => handleSearch());
       input.addEventListener("keydown", (e) => {
         if (e.key === "Enter") {
           e.preventDefault();
           handleSearch();
         }
       });

       input.addEventListener("input", (e) => {
         clearTimeout(sugTimeout);
         const val = e.target.value.trim();
         if (val.length < 3) {
           sugBox.classList.remove("open");
           sugBox.innerHTML = "";
           return;
         }
         sugTimeout = setTimeout(() => openSug(val), 200);
       });

       // trigger vanuit categorie-grid
       window.triggerListSearch = (nameOrProduct) => {
         const q =
           typeof nameOrProduct === "string"
             ? nameOrProduct
             : nameOrProduct?.name ?? "";
         if (!q) return;
         input.value = q;
         handleSearch();
       };

       inputRows.appendChild(row);
     }
    
    

  createInputRow();
  renderCategoryGrid(catSection, {
    onSelect: (product) => window.triggerListSearch(product),
    allProducts,
  });
  renderCommitted();
}

/* =======================
   TOTALS
   ======================= */
function calculateTotals(items) {
  let totalNormal = 0;
  let totalOffer = 0;
  for (const i of items) {
    const base = Number(i.price) || 0;
    const promo = Number(i.promoPrice) || 0;
    const qty = i.qty ?? 1;
    const usePrice = promo > 0 && promo < base ? promo : base;
    totalOffer += usePrice * qty;
    totalNormal += base * qty;
  }
  return { total: totalOffer, discount: totalNormal - totalOffer };
}

function renderTotals(container, items) {
  const { total, discount } = calculateTotals(items);
  const el = document.createElement("div");
  el.className = "totals-bar";
  el.innerHTML = `
    <div class="totals-line"><span>Totaal:</span><strong>€${total.toFixed(
      2
    )}</strong></div>
    ${
      discount > 0.001
        ? `<div class="totals-line discount"><span>Je bespaart:</span><strong>€${discount.toFixed(
            2
          )}</strong></div>`
        : ""
    }
  `;
  container.appendChild(el);
}

/* =======================
   ICONS
   ======================= */
function trashSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
      fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1
      A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5
      0 0 0 0 1h.538l.853 10.66A2 2 0 0 0
      4.885 16h6.23a2 2 0 0 0 1.994-1.84
      l.853-10.66h.538a.5.5 0 0 0
      0-1z"/>
    </svg>
  `;
}
