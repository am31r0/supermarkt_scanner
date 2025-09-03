// src/pages/list.js
import { CATEGORIES, PRODUCTS, NAME_TO_CAT } from "../data/products.js";

const LS_KEY = "sms_list";
const CATEGORY_ORDER = CATEGORIES.map((c) => c.id);
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

// --- Storage ---
function loadList() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
    // migrate: zorg voor qty (min 1) en done-flag
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

// --- Utils / Escapers ---
function escHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escAttr(str) {
  return escHtml(str).replaceAll('"', "&quot;");
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
  function getEntryByName(name) {
    const n = name.toLowerCase();
    return state.find((i) => i.name.toLowerCase() === n) || null;
  }
  function isInList(name) {
    return !!getEntryByName(name);
  }
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
    if (state[idx].qty === 0) {
      state.splice(idx, 1);
    }
    saveList(state);
    renderCommitted();
    return true;
  }
  function removeItemByName(name) {
    const idx = state.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (idx > -1) {
      state.splice(idx, 1);
      saveList(state);
      renderCommitted();
      return true;
    }
    return false;
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
      <button class="category-card" data-cat="${c.id}" aria-label="${escAttr(
        c.label
      )}">
        <span class="emoji">${c.icon}</span>
        <span class="label">${escHtml(c.label)}</span>
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
      .map((p) => {
        const entry = getEntryByName(p.name);
        const inList = !!entry;
        const qty = entry?.qty ?? 1;

        // Actie kolom:
        // - Niet in lijst: 1 knop "Toevoegen"
        // - Wel in lijst: 2 knoppen: "+1" en "verwijderen (trash)"
        const actions = !inList
          ? `
            <button
              type="button"
              class="btn small modal-item-add"
              data-name="${escAttr(p.name)}"
              aria-label="${escAttr(`Voeg ${p.name} toe`)}"
            >Toevoegen</button>
          `
          : `
            <div class="modal-actions">
              <button
                type="button"
                class="btn small modal-item-plus"
                data-name="${escAttr(p.name)}"
                aria-label="${escAttr(`Voeg 1 toe aan ${p.name}`)}"
              >Toevoegen</button>
              <button
                type="button"
                class="icon-btn trash-btn modal-item-remove"
                title="Verwijderen"
                aria-label="${escAttr(`Verwijder ${p.name} uit lijst`)}"
                data-name="${escAttr(p.name)}"
              >
                ${trashSvg()}
              </button>
            </div>
          `;

        return `
          <div class="modal-item-row${inList ? " in-list" : ""}">
            <span class="modal-item-name">
              ${escHtml(p.name)}
              ${
                inList
                  ? `<span class="qty-badge" aria-label="Aantal">×${qty}</span>`
                  : ""
              }
            </span>
            <div class="modal-item-act">
              ${actions}
            </div>
          </div>
        `;
      })
      .join("");

    // Listeners
    // Add
    modalList.querySelectorAll(".modal-item-add").forEach((btn) => {
      btn.addEventListener("click", () => {
        addItem(btn.dataset.name);
        renderModalList(modalSearch.value); // refresh modal
        refocusModalButton(
          btn.dataset.name,
          ".modal-item-plus, .modal-item-add, .modal-item-remove"
        );
      });
    });
    // Plus
    modalList.querySelectorAll(".modal-item-plus").forEach((btn) => {
      btn.addEventListener("click", () => {
        incItemQtyByName(btn.dataset.name, 1);
        renderModalList(modalSearch.value);
        refocusModalButton(btn.dataset.name, ".modal-item-plus");
      });
    });
    // Remove
    modalList.querySelectorAll(".modal-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeItemByName(btn.dataset.name);
        renderModalList(modalSearch.value);
        // na verwijderen bestaat er alleen nog "Toevoegen" → focus daarop
        refocusModalButton(btn.dataset.name, ".modal-item-add");
      });
    });
  }

  function refocusModalButton(name, selector) {
    const el = modalList.querySelector(
      `${selector}[data-name="${CSS.escape(name)}"]`
    );
    if (el) el.focus();
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
      const idx = state.findIndex((i) => i.id === item.id);
      if (idx > -1) state.splice(idx, 1);
    }
    saveList(state);
    renderCommitted();
  }

  // --- Render lijst (gegroepeerd op categorie) ---
  function renderCommitted() {
    state.forEach((it) => {
      ensureItemCategory(it);
      if (!Number.isFinite(it.qty) || it.qty < 1) it.qty = 1;
    });

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

      const head = document.createElement("li");
      head.className = "category-header";
      head.textContent = CAT_LABEL[catId] || "Overig";
      frag.appendChild(head);

      items.sort((a, b) => a.name.localeCompare(b.name, "nl"));
      for (const item of items) {
        const li = document.createElement("li");
        li.className = "list-item";
        if (item.done) li.classList.add("done");

        li.innerHTML = `
          <label class="item-check">
            <input type="checkbox" ${
              item.done ? "checked" : ""
            } aria-label="Afvinken ${escAttr(item.name)}" />
            <span class="item-name">
              ${escHtml(item.name)}
              <span class="qty-badge" aria-label="Aantal">×${item.qty}</span>
            </span>
          </label>

          <div class="item-actions">
            <div class="qty-controls" aria-label="Aantal aanpassen">
              <button class="icon-btn minus" title="Minder" aria-label="Minder">−</button>
              <span class="qty-num" aria-live="polite">${item.qty}</span>
              <button class="icon-btn plus" title="Meer" aria-label="Meer">+</button>
            </div>
            <button class="icon-btn trash-btn delete" title="Verwijderen" aria-label="Verwijderen">
              ${trashSvg()}
            </button>
          </div>
        `;

        const checkbox = li.querySelector("input[type=checkbox]");
        checkbox.addEventListener("change", () => {
          item.done = checkbox.checked;
          li.classList.toggle("done", item.done);
          saveList(state);
        });

        li.querySelector(".plus").addEventListener("click", () =>
          updateQty(item, +1)
        );
        li.querySelector(".minus").addEventListener("click", () =>
          updateQty(item, -1)
        );

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
      <input type="text" class="item-input" placeholder="Typ hier..." value="${escAttr(
        initial
      )}" />
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
            <button role="option" class="sug-item" data-name="${escAttr(
              p.name
            )}">
              <span class="sug-name">${escHtml(p.name)}</span>
              <span class="sug-cat">${escHtml(CAT_LABEL[p.cat] || "")}</span>
            </button>`
        )
        .join("");
      sug.classList.add("open");

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
      addItem(name);
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

// Kleine inline SVG voor trash-icoon
function trashSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
</svg>
  `;
}
