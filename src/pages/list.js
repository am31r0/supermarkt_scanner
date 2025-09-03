// src/pages/list.js
import { CATEGORIES, PRODUCTS, NAME_TO_CAT } from "../data/products.js";

const LS_KEY = "sms_list";
const CATEGORY_ORDER = CATEGORIES.map((c) => c.id);
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

// --- Storage ---
function loadList() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
    // migrate: zorg voor qty
    return arr.map((i) => ({
      qty: 1,
      done: false,
      ...i,
      qty: Math.max(1, i.qty ?? 1),
    }));
  } catch {
    return [];
  }
}
function saveList(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// --- Search ---
function filterProducts(q, limit = 8) {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const out = [];
  for (const p of PRODUCTS) {
    if (p.name.toLowerCase().includes(s)) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function renderListPage(mount) {
  const state = loadList(); // [{id,name,cat,done,qty}]

  mount.innerHTML = `
    <section class="list-page">
      <header class="list-header">
        <h1>Mijn boodschappenlijst</h1>
      </header>

      <div class="categories-grid" aria-label="Categorieën"></div>

      <div class="list-container">
        <ul class="list-items" aria-live="polite"></ul>
        <div class="input-rows"></div>
      </div>
    </section>

    <div class="category-modal" hidden>
      <div class="modal-backdrop"></div>
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title"></h2>
          <button class="icon-btn modal-close" aria-label="Sluiten">✕</button>
        </div>
        <input type="text" class="modal-search" placeholder="Zoek in categorie..." />
        <div class="modal-list"></div>
      </div>
    </div>
  `;

  const ul = mount.querySelector(".list-items");
  const inputRows = mount.querySelector(".input-rows");
  const catGrid = mount.querySelector(".categories-grid");
  const modal = mount.querySelector(".category-modal");
  const modalClose = modal.querySelector(".modal-close");
  const modalBackdrop = modal.querySelector(".modal-backdrop");
  const modalTitle = modal.querySelector(".modal-title");
  const modalSearch = modal.querySelector(".modal-search");
  const modalList = modal.querySelector(".modal-list");

  // --- Helpers ---
  function ensureItemCategory(item) {
    if (!item.cat) {
      const key = item.name.toLowerCase();
      item.cat = NAME_TO_CAT[key] || "other";
    }
    return item.cat;
  }

  function incItemQtyByName(name, delta = 1) {
    const idx = state.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (idx === -1) return false;
    state[idx].qty = Math.max(0, (state[idx].qty ?? 1) + delta);
    // als qty op 0 komt: verwijderen
    if (state[idx].qty === 0) {
      state.splice(idx, 1);
    }
    saveList(state);
    renderCommitted();
    return true;
  }

  function addItem(name) {
    const clean = name.trim();
    if (!clean) return;
    // als al bestaat: aantal ophogen
    if (incItemQtyByName(clean, 1)) return;

    const cat = NAME_TO_CAT[clean.toLowerCase()] || "other";
    state.push({ id: uid(), name: clean, cat, done: false, qty: 1 });
    saveList(state);
    renderCommitted();
  }

  // --- Categorie tegels ---
  function renderCategoryCards() {
    catGrid.innerHTML = CATEGORIES.map(
      (c) => `
      <button class="category-card" data-cat="${c.id}" aria-label="${c.label}">
        <span class="emoji">${c.icon}</span>
        <span class="label">${c.label}</span>
      </button>`
    ).join("");

    catGrid.querySelectorAll(".category-card").forEach((btn) => {
      btn.addEventListener("click", () => openCategoryModal(btn.dataset.cat));
    });
  }

  // --- Modal ---
  let currentModalCat = null;
  function openCategoryModal(catId) {
    currentModalCat = catId;
    modalTitle.textContent = CAT_LABEL[catId] || "Categorie";
    modalSearch.value = "";
    renderModalList("");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modalSearch.focus();
  }
  function closeCategoryModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    currentModalCat = null;
  }
  function renderModalList(filterText) {
    const f = (filterText || "").trim().toLowerCase();
    const list = PRODUCTS.filter(
      (p) =>
        p.cat === currentModalCat && (!f || p.name.toLowerCase().includes(f))
    );
    if (!list.length) {
      modalList.innerHTML = `<div class="modal-empty">Geen producten gevonden.</div>`;
      return;
    }
    modalList.innerHTML = list
      .sort((a, b) => a.name.localeCompare(b.name, "nl"))
      .map(
        (p) => `<button class="modal-item" data-name="${p.name}">
          <span class="modal-item-name">${p.name}</span>
          <span class="modal-item-act"></span>
        </button>`
      )
      .join("");

    // meerdere keren klikken op dezelfde knop = qty ophogen
    modalList.querySelectorAll(".modal-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        addItem(btn.dataset.name);
        // modal open laten voor snel meerdere keuzes
      });
    });
  }
  modalClose.addEventListener("click", closeCategoryModal);
  modalBackdrop.addEventListener("click", closeCategoryModal);
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCategoryModal();
  });
  modalSearch.addEventListener("input", () =>
    renderModalList(modalSearch.value)
  );

  // --- Qty helpers ---
  function updateQty(item, delta) {
    item.qty = Math.max(0, (item.qty ?? 1) + delta);
    if (item.qty === 0) {
      // verwijderen als 0
      const idx = state.findIndex((i) => i.id === item.id);
      if (idx > -1) state.splice(idx, 1);
    }
    saveList(state);
    renderCommitted();
  }

  // --- Render lijst (gegroepeerd op categorie) ---
  function renderCommitted() {
    // zorg dat elk item cat & qty heeft
    state.forEach((it) => {
      ensureItemCategory(it);
      if (!Number.isFinite(it.qty) || it.qty < 1) it.qty = 1;
    });

    // groepeer
    const grouped = new Map(CATEGORY_ORDER.map((id) => [id, []]));
    for (const item of state) {
      if (!grouped.has(item.cat)) grouped.set(item.cat, []);
      grouped.get(item.cat).push(item);
    }

    ul.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (const catId of CATEGORY_ORDER) {
      const items = grouped.get(catId) || [];
      if (!items.length) continue;

      // categorie kop
      const head = document.createElement("li");
      head.className = "category-header";
      head.textContent = CAT_LABEL[catId] || "Overig";
      frag.appendChild(head);

      // items alfabetisch
      items.sort((a, b) => a.name.localeCompare(b.name, "nl"));
      for (const item of items) {
        const li = document.createElement("li");
        li.className = "list-item";
        if (item.done) li.classList.add("done"); // voor grijs/donkerder state

        li.innerHTML = `
          <label class="item-check">
            <input type="checkbox" ${
              item.done ? "checked" : ""
            } aria-label="Afvinken ${item.name}" />
            <span class="item-name">
              ${item.name}
              <span class="qty-badge" aria-label="Aantal">×${item.qty}</span>
            </span>
          </label>

          <div class="item-actions">
            <div class="qty-controls" aria-label="Aantal aanpassen">
              <button class="icon-btn minus" title="Minder" aria-label="Minder">−</button>
              <span class="qty-num" aria-live="polite">${item.qty}</span>
              <button class="icon-btn plus" title="Meer" aria-label="Meer">+</button>
            </div>
            <button class="icon-btn delete" title="Verwijderen" aria-label="Verwijderen">✕</button>
          </div>
        `;

        // checkbox (done)
        const checkbox = li.querySelector("input[type=checkbox]");
        checkbox.addEventListener("change", () => {
          item.done = checkbox.checked;
          li.classList.toggle("done", item.done);
          saveList(state);
        });

        // qty +/−
        li.querySelector(".plus").addEventListener("click", () =>
          updateQty(item, +1)
        );
        li.querySelector(".minus").addEventListener("click", () =>
          updateQty(item, -1)
        );

        // delete
        li.querySelector(".delete").addEventListener("click", () => {
          const idx = state.findIndex((i) => i.id === item.id);
          if (idx > -1) {
            state.splice(idx, 1);
            saveList(state);
            renderCommitted();
          }
        });

        frag.appendChild(li);
      }
    }

    ul.appendChild(frag);
  }

  // --- Input-rij met suggesties (autocomplete) ---
  function createInputRow(initial = "") {
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `
      <input type="text" class="item-input" placeholder="Typ hier..." value="${initial}" />
      <button class="btn small commit" title="Toevoegen">Toevoegen</button>
      <div class="suggestions" role="listbox"></div>
    `;
    const input = row.querySelector(".item-input");
    const commitBtn = row.querySelector(".commit");
    const sug = row.querySelector(".suggestions");

    let lastQuery = "";
    let debounceTimer;

    function showSuggestions(list) {
      if (!list.length) {
        sug.innerHTML = "";
        sug.classList.remove("open");
        return;
      }
      sug.innerHTML = list
        .map(
          (p) => `
            <button role="option" class="sug-item" data-name="${p.name}">
              <span class="sug-name">${p.name}</span>
              <span class="sug-cat">${CAT_LABEL[p.cat] || ""}</span>
            </button>`
        )
        .join("");
      sug.classList.add("open");

      // klikken op dezelfde suggestie herhaaldelijk = qty ophogen
      sug.querySelectorAll(".sug-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          addItem(btn.dataset.name);
          input.value = "";
          showSuggestions([]);
          input.focus();
        });
      });
    }

    function commit() {
      const name = input.value.trim();
      if (!name) return;
      addItem(name); // als bestaat -> qty++
      input.value = "";
      showSuggestions([]);
      input.focus();
    }

    input.addEventListener("input", () => {
      const q = input.value;
      if (q === lastQuery) return;
      lastQuery = q;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        showSuggestions(filterProducts(q));
      }, 120);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        showSuggestions([]);
      }
    });

    commitBtn.addEventListener("click", commit);

    inputRows.appendChild(row);
    input.focus();
    return row;
  }

  // --- Init ---
  renderCategoryCards();
  renderCommitted();
  createInputRow();
}
