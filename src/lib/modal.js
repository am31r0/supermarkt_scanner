// src/lib/modal.js
import { escHtml, escAttr, formatPrice } from "./utils.js";

/**
 * Toont de officiële zoekmodal met echte supermarktproducten.
 * Werkt als een paneel onderin het scherm (onder input of na category-modal).
 *
 * @param {Array} results - genormaliseerde producten
 * @param {Function} onSelect - callback(product) na keuze
 */
export function showSearchModal(results, onSelect) {
  // Verwijder eerdere instance
  document.querySelectorAll(".search-modal").forEach((el) => el.remove());

  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.innerHTML = `
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true">
      <div class="search-modal-header">
        <h2>Producten</h2>
        <button class="search-modal-close" aria-label="Sluiten">✕</button>
      </div>
      <div class="search-results">
      ${
        results.length
          ? results
              .map(
                (p) => `
          <div class="result-row" data-id="${p.id}" data-store="${p.store}">
          <img src="${
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

  // Selectie
  modal.querySelectorAll(".result-row").forEach((row) => {
    row.addEventListener("click", () => {
      const chosen = results.find(
        (r) => r.id == row.dataset.id && r.store == row.dataset.store
      );
      if (chosen) onSelect(chosen);
      closeModal();
    });
  });

  // Sluiten
  modal
    .querySelector(".search-modal-close")
    .addEventListener("click", closeModal);
  modal
    .querySelector(".search-modal-backdrop")
    .addEventListener("click", closeModal);
  document.addEventListener("keydown", handleEscape);

  function handleEscape(e) {
    if (e.key === "Escape") closeModal();
  }

  function closeModal() {
    modal.remove();
    document.removeEventListener("keydown", handleEscape);
  }
}
