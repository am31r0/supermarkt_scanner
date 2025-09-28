// src/pages/list.js
import { PRODUCTS, NAME_TO_CAT } from "../data/products.js";
import { initEngine } from "/src/lib/cpi.js";
import { renderCategoryGrid } from "/src/lib/categoryGrid.js";
import { loadJSONOncePerDay } from "/src/lib/cache.js"; // pad even checken

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
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// -------------------------
// Escaping helpers
// -------------------------
function escHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escAttr(str) {
  return escHtml(str).replaceAll('"', "&quot;");
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
          <input type="checkbox" ${
            item.done ? "checked" : ""
          } aria-label="Afvinken ${escAttr(item.name)}" />
          <span class="item-name">
            ${escHtml(item.name)}
            ${
              item.pack
                ? `<span class="list-pack-badge">${escHtml(item.pack)}</span>`
                : ""
            }
          </span>
        </label>

        <div class="item-actions">
          <span class="qty-badge">×${item.qty}</span>
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
  // Input row with suggestions
  // -------------------------
  function createInputRow() {
    const row = document.createElement("div");
    row.className = "input-row";
    row.innerHTML = `
      <input type="text" class="item-input" placeholder="Typ hier..." />
      <button class="btn small commit">Toevoegen</button>
      <div class="suggestions"></div>
    `;
    const input = row.querySelector(".item-input");
    const commitBtn = row.querySelector(".commit");
    const sug = row.querySelector(".suggestions");

    function showSuggestions(list) {
      if (!list.length) {
        sug.innerHTML = "";
        sug.classList.remove("open");
        return;
      }
      sug.innerHTML = list
        .map(
          (p) => `
          <button role="option" class="sug-item" data-name="${escAttr(p.name)}">
            <span class="sug-name">${escHtml(p.name)}</span>
            ${
              p.packs?.length
                ? `<span class="sug-pack">${p.packs.join(", ")}</span>`
                : ""
            }
          </button>`
        )
        .join("");
      sug.classList.add("open");

      sug.querySelectorAll(".sug-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const product = PRODUCTS.find(
            (pp) => pp.name.toLowerCase() === btn.dataset.name.toLowerCase()
          );
          if (!product) return;

          if (product.packs?.length > 1) {
            sug.innerHTML = product.packs
              .map(
                (pack) => `
                <button class="chip" data-name="${escAttr(
                  product.name
                )}" data-pack="${escAttr(pack)}">
                  + ${pack}
                </button>`
              )
              .join("");
            sug.querySelectorAll(".chip").forEach((chip) => {
              chip.addEventListener("click", () => {
                addItem({ ...product, pack: chip.dataset.pack });
                input.value = "";
                sug.innerHTML = "";
              });
            });
          } else {
            addItem(product);
            input.value = "";
            sug.innerHTML = "";
          }
          input.focus();
        });
      });
    }

    function handleCommit() {
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const matches = PRODUCTS.filter((p) =>
        p.name.toLowerCase().includes(q)
      ).slice(0, 8);
      showSuggestions(matches);
    }

    input.addEventListener("input", handleCommit);
    commitBtn.addEventListener("click", handleCommit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      }
    });

    inputRows.prepend(row);
  }

  // -------------------------
  // Init CPI engine + categories
  // -------------------------
  await initEngine(
    {
      ah: await (await loadJSONOncePerDay("/dev/Data/AH.json")).json(),
      dirk: await (await loadJSONOncePerDay("/dev/Data/Dirk.json")).json(),
      jumbo: await (await loadJSONOncePerDay("/dev/Data/Jumbo.json")).json(),
    },
    { onReady: () => console.log("CPI engine ready") }
  );

  renderCategoryGrid(catSection, {
    onSelect: (product) => {
      addItem(product);
    },
  });

  createInputRow();
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
