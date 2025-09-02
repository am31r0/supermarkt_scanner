// src/pages/list.js
import { PRODUCTS } from "../data/products.js";

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

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function filterProducts(q, limit = 8) {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const results = [];
  for (const p of PRODUCTS) {
    if (p.toLowerCase().includes(s)) {
      results.push(p);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function renderListPage(mount) {
  const state = loadList();

  mount.innerHTML = `
    <section class="list-page">
      <header class="list-header">
        <h1>Mijn boodschappenlijst</h1>
        <button class="btn btn--primary add-row" title="Nieuwe regel">+ Nieuw</button>
      </header>

      <div class="list-container">
        <ul class="list-items" aria-live="polite"></ul>

        <div class="input-rows"></div>

        <div class="help-text">Tip: typ minimaal 2 letters voor suggesties. Druk op <kbd>Enter</kbd> om toe te voegen.</div>
      </div>
    </section>
  `;

  const ul = mount.querySelector(".list-items");
  const inputRows = mount.querySelector(".input-rows");
  const addRowBtn = mount.querySelector(".add-row");

  // Render bestaande vaste items
  function renderCommitted() {
    ul.innerHTML = "";
    state.forEach((item) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <label class="item-check">
          <input type="checkbox" ${item.done ? "checked" : ""} />
          <span class="item-name">${item.name}</span>
        </label>
        <div class="item-actions">
          <button class="icon-btn delete" title="Verwijderen" aria-label="Verwijderen">✕</button>
        </div>
      `;

      const checkbox = li.querySelector("input[type=checkbox]");
      checkbox.addEventListener("change", () => {
        item.done = checkbox.checked;
        saveList(state);
      });

      li.querySelector(".delete").addEventListener("click", () => {
        const idx = state.findIndex((i) => i.id === item.id);
        if (idx > -1) {
          state.splice(idx, 1);
          saveList(state);
          renderCommitted();
        }
      });

      ul.appendChild(li);
    });
  }

  // Input-regel met suggesties
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
          (p, i) =>
            `<button role="option" class="sug-item" data-name="${p}">${p}</button>`
        )
        .join("");
      sug.classList.add("open");
      sug.querySelectorAll(".sug-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          input.value = btn.dataset.name;
          sug.classList.remove("open");
          commit();
        });
      });
    }

    function commit() {
      const name = input.value.trim();
      if (!name) return;
      // bestaat al?
      if (!state.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
        state.push({ id: uid(), name, done: false });
        saveList(state);
        renderCommitted();
      }
      // reset voor volgende item
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

  // Init render
  renderCommitted();
  // Eerste input staat standaard klaar
  createInputRow();

  // Plus-knop voegt extra invoerregel toe
  addRowBtn.addEventListener("click", () => {
    createInputRow();
  });
}
