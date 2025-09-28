// src/pages/list.js
import { PRODUCTS, NAME_TO_CAT } from "../data/products.js";
import { initEngine } from "../lib/cpi.js";
import { renderCategoryGrid } from "../lib/categoryGrid.js";
import { loadJSONOncePerDay } from "../lib/cache.js";
import { normalizeAll, searchProducts } from "../lib/matching.js";
import { showSearchModal } from "../lib/modal.js";
import { escHtml, uid, formatPrice } from "../lib/utils.js";

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
// Page renderer
// -------------------------
export async function renderListPage(mount) {
  const state = loadList();

  mount.innerHTML = `
    <section class="list-page">
      <header class="list-header">
        <h1>Mijn boodschappenlijst</h1>
      </header>

      <div class="categories-section"></div>

      <div class="list-container">
        <div class="input-rows"></div>
        <ul class="list-items" aria-live="polite"></ul>
      </div>
    </section>
  `;

  const ul = mount.querySelector(".list-items");
  const inputRows = mount.querySelector(".input-rows");
  const catSection = mount.querySelector(".categories-section");

  // -------------------------
  // State mutators
  // -------------------------
  function addItem(product) {
    const item = {
      id: uid(),
      name: product.name,
      cat: product.cat || NAME_TO_CAT[product.name.toLowerCase()] || "other",
      pack: product.pack || null,
      qty: 1,
      done: false,
      store: product.store || null,
      price: product.price || null,
    };
    state.push(item);
    saveList(state);
    renderCommitted();
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
  // Render committed list
  // -------------------------
  function renderCommitted() {
    ul.innerHTML = "";
    for (const item of state) {
      const li = document.createElement("li");
      li.className = "list-item";
      if (item.done) li.classList.add("done");

      li.innerHTML = `
      <label class="item-check">
      <input type="checkbox" ${item.done ? "checked" : ""} />
      <span class="item-full-name"><span class="item-name">
        ${escHtml(item.name)}
        </span>
      <span class="item-name-store-price">
        ${
          item.store
            ? `<span class="list-store store-${item.store.toLowerCase()}">${escHtml(
                item.store
              )}</span>`
            : ""
        }
        ${
          item.price
            ? `<span class="list-price">${formatPrice(item.price)}</span>`
            : ""
        }
      </span></span>
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

      // Events
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
  }

  // -------------------------
  // Input row with autosuggest + modal search
  // -------------------------
  function createInputRow(allProducts) {
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

    function renderSuggestions(q) {
      sugBox.innerHTML = "";
      sugBox.classList.remove("open");
      if (!q) return;

      const results = searchProducts(allProducts, q).slice(0, 5);
      if (!results.length) return;

      for (const r of results) {
        const opt = document.createElement("div");
        opt.className = "suggestion";
        opt.textContent = r.name;
        opt.addEventListener("click", () => {
          input.value = r.name;
          sugBox.innerHTML = "";
          sugBox.classList.remove("open");
        });
        sugBox.appendChild(opt);
      }
      sugBox.classList.add("open");
    }

    async function handleSearch() {
      const q = input.value.trim();
      if (!q) return;

      const results = searchProducts(allProducts, q);
      if (!results.length) {
        alert("Geen resultaten gevonden");
        return;
      }

      showSearchModal(results, (chosen) => {
        addItem({
          name: chosen.name,
          cat: chosen.unifiedCategory,
          pack: chosen.unit,
          store: chosen.store,
          price: chosen.price,
        });
        input.value = "";
        sugBox.innerHTML = "";
        sugBox.classList.remove("open");
      });
    }

    commitBtn.addEventListener("click", handleSearch);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    });

    input.addEventListener("input", () => {
      renderSuggestions(input.value.trim());
    });

    input.addEventListener("focus", () => {
      row.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      const rect = row.getBoundingClientRect();
      const absoluteY = window.scrollY + rect.top;
      window.scrollTo({
        top: absoluteY - 30,
        behavior: "smooth",
      });
    });

    // 🔑 Klik buiten input/suggesties sluit de box
    document.addEventListener("click", (e) => {
      if (!row.contains(e.target)) {
        sugBox.innerHTML = "";
        sugBox.classList.remove("open");
      }
    });

    inputRows.prepend(row);

    window.triggerListSearch = (name) => {
      input.value = name;
      handleSearch();
    };
  }

  // -------------------------
  // Init CPI engine + categories
  // -------------------------
  const [ahRaw, dirkRaw, jumboRaw] = await Promise.all([
    loadJSONOncePerDay("ah", "../Data/ah.json"),
    loadJSONOncePerDay("dirk", "../Data/dirk.json"),
    loadJSONOncePerDay("jumbo", "../Data/jumbo.json"),
  ]);

  const allProducts = normalizeAll({
    ah: ahRaw,
    dirk: dirkRaw,
    jumbo: jumboRaw,
  });

  await initEngine(
    { ah: ahRaw, dirk: dirkRaw, jumbo: jumboRaw },
    { onReady: () => console.log("CPI engine ready") }
  );

  renderCategoryGrid(catSection, {
    onSelect: (product) => addItem(product),
    allProducts,
  });

  createInputRow(allProducts);
  renderCommitted();
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
