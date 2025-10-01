// src/lib/modal.js
import { escHtml, escAttr, formatPrice } from "./utils.js";

export function closeAllModals() {
  document.querySelectorAll(".search-modal").forEach((el) => el.remove());
}

export function showSearchModal(results, onSelect) {
  closeAllModals();

  const baseResults = Array.isArray(results) ? results.slice() : [];

  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.innerHTML = `
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true">
      <div class="search-modal-header">
        <h2>Producten</h2>
        <button class="search-modal-close" aria-label="Sluiten">✕</button> 
      </div>

      <div class="result-filters">
        <select id="sort-select">
          <option value="ppu">Prijs kg/liter</option>
          <option value="price">Laagste prijs</option>
          <option value="promo">Aanbiedingen</option>
          <option value="alpha">Alfabetisch</option>
        </select>
        <select id="category-filter">
          <option value="">Alle categorieën</option>
          <option value="produce">Groente & fruit</option>
          <option value="dairy">Zuivel</option>
          <option value="meat_fish_veg">Vlees/Vis/Vega</option>
          <option value="bakery">Bakkerij</option>
          <option value="frozen">Diepvries</option>
          <option value="snacks">Snacks</option>
          <option value="pantry">Voorraad/Conserven</option>
        </select>
      </div>

      <div class="extra-filters">
        <button class="filter-btn" data-filter="promoFirst">Aanbieding eerst</button>
        <button class="filter-btn" data-filter="huismerk">Huismerk</button>
        <button class="filter-btn" data-filter="amerk">A-merk</button>
        <button class="filter-btn" data-filter="bio">Bio</button>
      </div>

      <div class="search-results"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const panel = modal.querySelector(".search-modal-panel");
  const backdrop = modal.querySelector(".search-modal-backdrop");
  const btnClose = modal.querySelector(".search-modal-close");
  const resultsBox = modal.querySelector(".search-results");
  const sortSelect = modal.querySelector("#sort-select");
  const catSelect = modal.querySelector("#category-filter");
  const extraBtns = modal.querySelectorAll(".extra-filters .filter-btn");

  let currentSort = "ppu";
  let currentCat = "";
  let promoOnly = false;
  let filterMode = ""; // "", "promoFirst", "huismerk", "amerk", "bio"

  function getFilteredSorted() {
    let arr = baseResults;

    // category filter
    if (currentCat) {
      arr = arr.filter(
        (p) => (p.unifiedCategory || p.rawCategory) === currentCat
      );
    }

    // promoOnly (via select)
    if (promoOnly) {
      arr = arr.filter((p) => !!(p.promoPrice || p.offerPrice));
    }

    // extra filter modes
    if (filterMode === "huismerk") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return (
          name.includes("1 de beste") ||
          name.includes("dirk") ||
          name.includes("ah ") ||
          name.includes("basic") ||
          name.includes("jumbo")
        );
      });
    } else if (filterMode === "amerk") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return !(
          name.includes("1 de beste") ||
          name.includes("dirk") ||
          name.includes("ah ") ||
          name.includes("basic") ||
          name.includes("jumbo")
        );
      });
    } else if (filterMode === "bio") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return (
          name.includes(" bio") ||
          name.includes("biologisch") ||
          name.includes("biologische") ||
          name.includes("organic")
        );
      });
    }

    const sorted = arr.slice();

    if (filterMode === "promoFirst") {
      // promoties eerst, daarna ppu sort
      sorted.sort((a, b) => {
        const aPromo = !!(a.promoPrice || a.offerPrice);
        const bPromo = !!(b.promoPrice || b.offerPrice);
        if (aPromo !== bPromo) return aPromo ? -1 : 1;
        return (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity);
      });
      return sorted;
    }

    // default sorters
    if (currentSort === "price") {
      sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (currentSort === "alpha") {
      sorted.sort((a, b) =>
        a.name.localeCompare(b.name, "nl", { sensitivity: "base" })
      );
    } else {
      sorted.sort(
        (a, b) => (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity)
      );
    }
    return sorted;
  }

  function renderResults() {
    const data = getFilteredSorted();

    resultsBox.innerHTML = data.length
      ? data
          .map((p) => {
            const hasPromo = !!(p.promoPrice || p.offerPrice);
            const promoPrice = p.promoPrice || p.offerPrice || null;

            return `
              <div class="result-row ${hasPromo ? "promo" : ""}" data-id="${
              p.id
            }" data-store="${p.store}">
              <div class="meta">
              <span class="list-store store-${(p.store || "").toLowerCase()}">
                ${escHtml(p.store || "")}
              </span>
              <div class="price-group">${
                hasPromo
                  ? `<span class="price old">${formatPrice(p.price)}</span>
                     <span class="price new">${formatPrice(promoPrice)}</span>`
                  : `<span class="price">${formatPrice(p.price)}</span>`
              }
              <span class="ppu">${(p.pricePerUnit ?? 0).toFixed(2)} / ${
              p.unit
            }</span></div>
            </div>
                ${hasPromo ? `<span class="promo-badge">Aanbieding</span>` : ""}
                <img loading="lazy" src="${
                  p.image
                    ? p.store === "dirk" && !p.image.includes("?width=")
                      ? p.image + "?width=190"
                      : p.image
                    : ""
                }" alt="${escAttr(p.name)}"/>
                <div class="info">
                  <div class="name">${escHtml(p.name)}</div>
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="empty">Geen resultaten gevonden.</div>`;

    resultsBox.querySelectorAll(".result-row").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        const store = row.dataset.store;
        const chosen = data.find(
          (r) => String(r.id) === id && String(r.store) === store
        );
        if (chosen) onSelect(chosen);
        closeModal();
      });
    });
  }

  renderResults();

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

  sortSelect.addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "promo") {
      promoOnly = true;
      currentSort = "ppu";
    } else {
      promoOnly = false;
      currentSort = v;
    }
    filterMode = "";
    extraBtns.forEach((b) => b.classList.remove("active"));
    renderResults();
  });

  catSelect.addEventListener("change", (e) => {
    currentCat = e.target.value || "";
    renderResults();
  });

  extraBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (filterMode === btn.dataset.filter) {
        filterMode = "";
        btn.classList.remove("active");
      } else {
        filterMode = btn.dataset.filter;
        extraBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
      renderResults();
    });
  });
}
