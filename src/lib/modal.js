// src/lib/modal.js
import { escHtml, escAttr, formatPrice } from "./utils.js";

// Externe sluitfunctie (handig voor router of navbar)
export function closeAllModals() {
  document.querySelectorAll(".search-modal").forEach((el) => el.remove());
}

export function showSearchModal(results, onSelect) {
  // Verwijder eerdere instance
  closeAllModals();

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
      <div class="search-results">
      ${
        results.length
          ? results
              .map(
                (p) => `
          <div class="result-row" data-id="${p.id}" data-store="${p.store}">
            <img loading="lazy" src="${
              p.image
                ? p.store === "dirk" && !p.image.includes("?width=")
                  ? p.image + "?width=190"
                  : p.image
                : ""
            }" alt="${escAttr(p.name)}"/>
            <div class="info">
              <div class="name">${escHtml(p.name)}</div>
              <div class="meta">
                <span class="list-store store-${p.store}">
                  ${escHtml(p.store)}
                </span>
                <span class="price">${formatPrice(p.price)}</span>
                <span class="ppu">${p.pricePerUnit.toFixed(2)} / ${
                  p.unit
                }</span>
              </div>
            </div>
          </div>`
              )
              .join("")
          : `<div class="empty">Geen resultaten gevonden.</div>`
      }
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const panel = modal.querySelector(".search-modal-panel");
  const backdrop = modal.querySelector(".search-modal-backdrop");
  const btnClose = modal.querySelector(".search-modal-close");

  // ---------- teardown ----------
  function closeModal() {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onGlobalClick, true);
  }

  // ---------- events ----------
  function onKeyDown(e) {
    if (e.key === "Escape") closeModal();
  }

  function onGlobalClick(e) {
    // klik in panel? → niet sluiten
    if (panel.contains(e.target)) return;
    closeModal();
  }

  // Result selectie
  modal.querySelectorAll(".result-row").forEach((row) => {
    row.addEventListener("click", () => {
      const chosen = results.find(
        (r) => r.id == row.dataset.id && r.store == row.dataset.store
      );
      if (chosen) onSelect(chosen);
      closeModal();
    });
  });

  // Sluiters
  btnClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", onGlobalClick, true);
}
