// src/pages/list.js
import { PRODUCTS, NAME_TO_CAT } from "../data/products.js";
import { initEngine } from "../lib/cpi.js";
import { renderCategoryGrid } from "../lib/categoryGrid.js";
import { loadJSONOncePerDay } from "../lib/cache.js";
import { normalizeAll, searchProducts } from "../lib/matching.js";
import { showSearchModal } from "../lib/modal.js";
import { escHtml, uid, formatPrice, showToast } from "../lib/utils.js";
import { renderStoreSelector } from "../lib/storeSelector.js";
import { saveToHistory } from "../lib/history.js";
import { getEnabledStores } from "../lib/settings.js";
import { CATEGORY_ORDER, STORE_COLORS, STORE_LABEL } from "../lib/constants.js";

const LS_KEY = "sms_list";
const DEBUG = false;

const STORE_ORDER = ["ah", "jumbo", "dirk", "other"];

// ---------- Helpers: normaliseer store keys ----------
function normalizeStoreKey(s) {
  if (!s) return "other";
  const v = String(s).trim().toLowerCase();
  if (["ah", "a.h.", "albert heijn", "albertheijn", "albert-heijn"].includes(v))
    return "ah";
  if (["jumbo"].includes(v)) return "jumbo";
  if (["dirk", "dirk van den broek", "dirk v d broek"].includes(v))
    return "dirk";
  if (["ah", "jumbo", "dirk", "other"].includes(v)) return v;
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
// Page renderer
// -------------------------
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
  if (listPage && catSection) {
    listPage.insertBefore(selectorMount, catSection);
  }

  renderStoreSelector(selectorMount);

  let allProducts = [];

  // -------------------------
  // Reactiviteit op store selector
  // -------------------------
  function setupStoreFilterReactivity() {
    const rerender = () => {
      requestAnimationFrame(renderCommitted);
    };
    selectorMount.addEventListener("change", rerender);
    selectorMount.addEventListener("input", rerender);
    document.addEventListener("stores:changed", rerender);
    window.addEventListener("storage", rerender);
  }
  setupStoreFilterReactivity();

  // -------------------------
  // State mutators
  // -------------------------
  function addItem(product) {
    const normStore = normalizeStoreKey(product?.store);
    let promo = product?.promoPrice ?? product?.offerPrice ?? null;

    if (promo == null && Array.isArray(allProducts) && normStore !== "other") {
      let match = allProducts.find(
        (p) =>
          normalizeStoreKey(p.store) === normStore &&
          String(p.name).toLowerCase() === String(product.name).toLowerCase()
      );
      if (match) {
        promo = match.promoPrice ?? match.offerPrice ?? null;
        if (product.price == null && match.price != null) {
          product.price = match.price;
        }
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

    if (DEBUG) console.log("[addItem]", item);

    state.push(item);
    saveList(state);
    renderCommitted();
    showToast(`Toegevoegd aan Mijn Lijst`);
  }

  function incItemQtyById(id, delta = 1) {
    const idx = state.findIndex((i) => i.id === id);
    if (idx === -1) return;
    state[idx].qty = Math.max(0, (state[idx].qty ?? 1) + delta);
    if (state[idx].qty === 0) state.splice(idx, 1);
    saveList(state);
    renderCommitted();
  }

  // -------------------------
  // Sort helpers
  // -------------------------
  function sortItemsForRender(items) {
    return items.slice().sort((a, b) => {
      const catA = a.cat || "other";
      const catB = b.cat || "other";
      const idxA = CATEGORY_ORDER.indexOf(catA);
      const idxB = CATEGORY_ORDER.indexOf(catB);
      if (idxA !== idxB) return idxA - idxB;
      return a.name.localeCompare(b.name, "nl", { sensitivity: "base" });
    });
  }

  // -------------------------
  // History & Rating helpers
  // -------------------------
  function clearListLocal() {
    state.length = 0;
    saveList(state);
    renderCommitted();
    showToast("Lijst is geleegd");
  }

  function renderRatingPrompt() {
    listContainer.innerHTML = `
      <div class="rating-bar">
        <h3>Hoe was je ervaring met deze lijst?</h3>
        <div class="emoji-row">
          <button class="emoji-btn" data-score="1" aria-label="Zeer slecht">😡</button>
          <button class="emoji-btn" data-score="2" aria-label="Slecht">😕</button>
          <button class="emoji-btn" data-score="3" aria-label="Gemiddeld">😐</button>
          <button class="emoji-btn" data-score="4" aria-label="Goed">🙂</button>
          <button class="emoji-btn" data-score="5" aria-label="Uitstekend">🤩</button>
        </div>
      </div>
    `;

    listContainer.querySelectorAll(".emoji-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const score = Number(btn.dataset.score);
        const history = JSON.parse(localStorage.getItem("sms_history") || "[]");
        if (history.length) {
          history[0].rating = score;
          localStorage.setItem("sms_history", JSON.stringify(history));
        }
        showToast("Bedankt voor je feedback!");
        renderCommitted();
      });
    });
  }

  function completeListFlow(itemsToSave) {
    // 1️⃣ Filter alleen de afgevinkte producten
    const doneItems = (itemsToSave || []).filter((i) => i.done === true);

    if (!doneItems.length) {
      showToast("Geen afgestreepte producten om op te slaan");
      return;
    }

    // 2️⃣ Sla alleen die items op in de geschiedenis
    saveToHistory(doneItems);

    // 3️⃣ Verwijder alleen de afgestreepte producten uit de huidige lijst
    const remaining = state.filter((i) => !i.done);
    saveList(remaining);
    state.splice(0, state.length, ...remaining); // vervang state-inhoud

    // 4️⃣ Toon de rating prompt (en laat niet-afgestreepte items zichtbaar)
    renderRatingPrompt();

    // 5️⃣ Feedback melding
    showToast(`${doneItems.length} producten opgeslagen in geschiedenis`);
  }
  
  
  
  // -------------------------
  // Render committed list
  // -------------------------
  function renderCommitted() {
    listContainer.innerHTML = "";

    const enabledRaw = getEnabledStores();
    const enabled = normalizeEnabledMap(enabledRaw);

    const grouped = {};
    const visibleItems = [];

    for (const item of state) {
      const storeKey = normalizeStoreKey(item.store);
      if (enabled[storeKey] !== true) continue;
      if (!grouped[storeKey]) grouped[storeKey] = [];
      item.store = storeKey;
      grouped[storeKey].push(item);
      visibleItems.push(item);
    }

    const keys = STORE_ORDER.filter((k) => grouped[k]?.length).concat(
      Object.keys(grouped).filter((k) => !STORE_ORDER.includes(k))
    );

    for (const storeKey of keys) {
      if (enabled[storeKey] !== true) continue;

      const wrapper = document.createElement("div");
      wrapper.className = `store-block`;
      wrapper.style.borderColor = STORE_COLORS[storeKey] || "transparent";
      wrapper.style.marginBottom = "5px";
      wrapper.style.borderRadius = "10px";
      wrapper.style.overflow = "clip";
      wrapper.style.borderWidth = "1px";
      wrapper.style.borderStyle = "solid";

      const ul = document.createElement("ul");
      ul.className = "store-list";
      wrapper.appendChild(ul);

      for (const item of sortItemsForRender(grouped[storeKey])) {
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
                <span class="list-store store-${storeKey}">${
          STORE_LABEL[storeKey] || escHtml(item.store)
        }</span>
                ${
                  hasPromo
                    ? `<span class="promo-pill">KORTING</span>
                       <span class="list-price old">${formatPrice(
                         Number(item.price)
                       )}</span>
                       <span class="list-price new">${formatPrice(
                         promoPrice
                       )}</span>`
                    : item.price != null
                    ? `<span class="list-price">${formatPrice(
                        Number(item.price)
                      )}</span>`
                    : ""
                }
              </span>
            </span>
            <div class="item-actions">
              <div class="qty-controls">
                <button class="icon-btn minus">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="icon-btn plus">+</button>
              </div>
              <button class="icon-btn trash-btn delete">
                ${trashSvg()}
              </button>
            </div>
          </label>
        `;

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

      if (ul.children.length) listContainer.appendChild(wrapper);
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

      const doneBtn = actions.querySelector(".done-btn");
      const clearBtn = actions.querySelector(".clear-btn");

      // ✅ Klaar
      doneBtn.addEventListener("click", () => {
        console.log("✅ Klaar clicked");
        completeListFlow(visibleItems);
      });

      // 🗑️ Lijst legen → toon popup
      clearBtn.addEventListener("click", () => {
        // voorkom dubbele popup
        if (document.querySelector(".confirm-clear-overlay")) return;

        const overlay = document.createElement("div");
        overlay.className = "confirm-clear-overlay";
        Object.assign(overlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "998",
          backdropFilter: "blur(5px)",
        });

        const box = document.createElement("div");
        box.className = "confirm-clear-box card";
        Object.assign(box.style, {
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "12px",
          textAlign: "center",
          boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
          maxWidth: "90%",
          width: "320px",
        });

        box.innerHTML = `
          <h3 style="margin-bottom:0.5rem;">Lijst legen</h3>
          <p style="margin-bottom:1.5rem;font-size:0.8rem;">Weet je zeker dat je jouw lijst wil legen?</p>
          <div style="display:flex;gap:0.5rem;justify-content:center;">
            <button class="btn small danger yes-btn">Ja, leegmaken</button>
            <button class="btn small cancel-btn">Annuleren</button>
          </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // acties
        box.querySelector(".yes-btn").addEventListener("click", () => {
          clearListLocal();
          overlay.remove();
        });
        box.querySelector(".cancel-btn").addEventListener("click", () => {
          overlay.remove();
        });
      });
    }

    
  }

  // -------------------------
  // Input row with autosuggest
  // -------------------------
  function createInputRow(allProductsLocal) {
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `
      <input type="text" class="item-input" placeholder="Typ hier..." />
      <button class="btn small commit">Zoeken</button>
      <div class="suggestions" role="listbox"></div>
    `;
    const input = row.querySelector(".item-input");
    const commitBtn = row.querySelector(".commit");
    const sugBox = row.querySelector(".suggestions");

    const SUG_SOURCE =
      Array.isArray(PRODUCTS) && PRODUCTS.every((x) => typeof x === "string")
        ? PRODUCTS
        : Object.keys(NAME_TO_CAT || {});

    function openSug() {
      if (!sugBox.classList.contains("open")) sugBox.classList.add("open");
    }
    function closeSug() {
      sugBox.innerHTML = "";
      sugBox.classList.remove("open");
    }

    function renderSuggestions(q) {
      closeSug();
      if (!q) return;
      const ql = q.toLowerCase();
      const prefix = [];
      const contains = [];
      for (const name of SUG_SOURCE) {
        const nl = name.toLowerCase();
        if (nl.startsWith(ql)) prefix.push(name);
        else if (nl.includes(ql)) contains.push(name);
        if (prefix.length + contains.length >= 8) break;
      }
      const results = [...prefix, ...contains].slice(0, 5);
      if (!results.length) return;

      for (const name of results) {
        const opt = document.createElement("div");
        opt.className = "suggestion";
        opt.textContent = name;
        opt.addEventListener("click", () => {
          input.value = name;
          closeSug();
          handleSearch();
          input.blur();
        });
        sugBox.appendChild(opt);
      }
      openSug();
    }

    async function handleSearch() {
      const q = input.value.trim();
      if (!q) return;

      const enabled = normalizeEnabledMap(getEnabledStores());
      const filtered = allProductsLocal.filter(
        (p) => enabled[normalizeStoreKey(p.store)] === true
      );

      const results = searchProducts(filtered, q);
      if (!results.length) {
        alert("Geen resultaten gevonden");
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
        closeSug();
      });
    }

    commitBtn.addEventListener("click", handleSearch);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
        input.blur();
      } else if (e.key === "Escape") {
        closeSug();
      }
    });

    let rafId = null;
    input.addEventListener("input", () => {
      if (rafId) cancelAnimationFrame(rafId);
      const val = input.value.trim();
      rafId = requestAnimationFrame(() => renderSuggestions(val));
    });

    input.addEventListener("focus", () => {
      if (input.value.trim()) renderSuggestions(input.value.trim());
    });

    document.addEventListener("click", (e) => {
      if (!row.contains(e.target)) closeSug();
    });

    window.triggerListSearch = (nameOrProduct) => {
      const name =
        typeof nameOrProduct === "string"
          ? nameOrProduct
          : nameOrProduct?.name ?? "";
      if (!name) return;
      input.value = name;
      handleSearch();
    };

    inputRows.prepend(row);
  }

  // -------------------------
  // Init CPI engine + categories
  // -------------------------
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

  allProducts = normalizeAll({
    ah: ahRaw,
    dirk: dirkRaw,
    jumbo: jumboRaw,
  });

  await initEngine(
    { ah: ahRaw, dirk: dirkRaw, jumbo: jumboRaw },
    { onReady: () => DEBUG && console.log("CPI engine ready") }
  );

  createInputRow(allProducts);

  renderCategoryGrid(catSection, {
    onSelect: (product) => {
      if (window.triggerListSearch) {
        window.triggerListSearch(product.name);
      } else {
        addItem(product);
      }
    },
    allProducts,
  });

  renderCommitted();
}

// -------------------------
// Totals
// -------------------------
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

  const discount = totalNormal - totalOffer;
  return { total: totalOffer, discount };
}

function renderTotals(container, items) {
  const { total, discount } = calculateTotals(items);

  const el = document.createElement("div");
  el.className = "totals-bar";

  let html = `
    <div class="totals-line">
      <span>Totaal:</span>
      <strong>€${total.toFixed(2)}</strong>
    </div>
  `;
  if (discount > 0.001) {
    html += `
      <div class="totals-line discount">
        <span>Je bespaart:</span>
        <strong>€${discount.toFixed(2)}</strong>
      </div>
    `;
  }
  el.innerHTML = html;
  container.appendChild(el);
}

// -------------------------
// Trash SVG
// -------------------------
function trashSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
      fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1
      a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5
      0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5
      a.5.5 0 0 0 0 1h.538l.853 10.66A2 2
      0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84
      l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958
      1-.846 10.58a1 1 0 0 1-.997.92h-6.23
      a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487
      1a.5.5 0 0 1 .528.47l.5 8.5a.5.5
      0 0 1-.998.06L5 5.03a.5.5 0 0
      1 .47-.53Zm5.058 0a.5.5 0 0
      1 .47.53l-.5 8.5a.5.5 0 1
      1-.998-.06l.5-8.5a.5.5 0
      0 1 .528-.47M8 4.5a.5.5
      0 0 1 .5.5v8.5a.5.5
      0 0 1-1 0V5a.5.5 0
      1 1 .5-.5"/>
    </svg>
  `;
}
