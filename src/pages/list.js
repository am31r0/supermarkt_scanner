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

      <div class="categories-grid-wrapper">
        <div class="categories-grid" aria-label="Categorieën"></div>
      </div>
      <button class="categories-more-btn">Meer tonen</button>

      <div class="list-container">
        <ul class="list-items" aria-live="polite"></ul>
        <div class="input-rows"></div>
      </div>
    </section>

    <div class="category-modal" hidden>
      <div class="modal-backdrop"></div>
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title" role="button" tabindex="0" title="Sluiten">Categorie</h2>
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
  const catWrapper = mount.querySelector(".categories-grid-wrapper");
  const moreBtn = mount.querySelector(".categories-more-btn");
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

    // Dynamisch max-height = 2.5 rijen
    const firstCard = catGrid.querySelector(".category-card");
    if (firstCard) {
      const cardHeight = firstCard.offsetHeight + 8; // marge meenemen
      catWrapper.style.maxHeight = `${cardHeight * 2.9}px`;
    }
  }

  // --- Meer/minder knop ---
  moreBtn.addEventListener("click", () => {
    const expanded = catWrapper.classList.toggle("expanded");
    if (expanded) {
      catWrapper.style.maxHeight = "2000px"; // groot genoeg voor alle rijen
      moreBtn.textContent = "Minder tonen";
    } else {
      const firstCard = catGrid.querySelector(".category-card");
      if (firstCard) {
        const cardHeight = firstCard.offsetHeight + 8;
        catWrapper.style.maxHeight = `${cardHeight * 2.9}px`;
      }
      moreBtn.textContent = "Meer tonen";
    }
  });

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
    modalList.querySelectorAll(".modal-item-add").forEach((btn) => {
      btn.addEventListener("click", () => {
        addItem(btn.dataset.name);
        renderModalList(modalSearch.value);
        refocusModalButton(
          btn.dataset.name,
          ".modal-item-plus, .modal-item-add, .modal-item-remove"
        );
      });
    });
    modalList.querySelectorAll(".modal-item-plus").forEach((btn) => {
      btn.addEventListener("click", () => {
        incItemQtyByName(btn.dataset.name, 1);
        renderModalList(modalSearch.value);
        refocusModalButton(btn.dataset.name, ".modal-item-plus");
      });
    });
    modalList.querySelectorAll(".modal-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeItemByName(btn.dataset.name);
        renderModalList(modalSearch.value);
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

  // Close hooks
  modalClose.addEventListener("click", closeCategoryModal);
  modalBackdrop.addEventListener("click", closeCategoryModal);

  // ✨ NEW: klik/keyboard op de titel sluit ook
  modalTitle.addEventListener("click", closeCategoryModal);
  modalTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      closeCategoryModal();
    }
  });

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
    // ⚡ Geen auto-focus meer, zodat mobiel toetsenbord niet opent
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
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
  <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
</svg>
  `;
}
