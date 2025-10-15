// src/lib/categoryGrid.js
import { CATEGORIES, PRODUCTS } from "../data/products.js";

/**
 * Render categorie-grid
 * @param {HTMLElement} mount - wrapper element
 * @param {Object} opts - options
 * @param {Function} opts.onSelect - callback(product)
 * @param {Array} opts.allProducts - genormaliseerde supermarktproducten
 */
export function renderCategoryGrid(mount, { onSelect }) {
  mount.innerHTML = `
    <div class="categories-grid-wrapper">
      <div class="categories-grid" aria-label="Categorieën"></div>
    </div>
    <button class="categories-more-btn">Meer tonen</button>

    <div class="category-modal" hidden>
      <div class="modal-backdrop"></div>
      <div class="modal-content" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">Categorie</h2>
          <button class="icon-btn modal-close" aria-label="Sluiten">✕</button>
        </div>
        <div class="modal-list"></div>
      </div>
    </div>
  `;

  const grid = mount.querySelector(".categories-grid");
  const wrapper = mount.querySelector(".categories-grid-wrapper");
  const moreBtn = mount.querySelector(".categories-more-btn");
  const modal = mount.querySelector(".category-modal");
  const modalClose = modal.querySelector(".modal-close");
  const modalBackdrop = modal.querySelector(".modal-backdrop");
  const modalTitle = modal.querySelector(".modal-title");
  const modalList = modal.querySelector(".modal-list");

  // === Grid render ===
  grid.innerHTML = CATEGORIES.map(
    (c) => `
      <button class="category-card" data-cat="${c.id}">
        <img class="emoji" src="${c.icon}">
        <span class="label">${c.label}</span>
      </button>`
  ).join("");

  // === Modal logic ===
  let currentCat = null;

  function openModal(catId) {
    currentCat = catId;
    modalTitle.textContent =
      CATEGORIES.find((c) => c.id === catId)?.label || "Categorie";

    const list = PRODUCTS.filter((p) => p.cat === catId);

    if (!list.length) {
      modalList.innerHTML = `<div class="modal-empty">Geen producten gevonden.</div>`;
    } else {
      modalList.innerHTML = list
        .map(
          (p) => `
        <div class="modal-item-row">
          <span class="modal-item-name">${p.name}</span>
          <button class="btn small modal-item-add" data-name="${p.name}">Kies</button>
        </div>`
        )
        .join("");

      modalList.querySelectorAll(".modal-item-add").forEach((btn) => {
        btn.addEventListener("click", () => {
          const chosenName = btn.dataset.name;

          // Trigger via list.js input flow
          if (window.triggerListSearch) {
            window.triggerListSearch(chosenName);
          } else {
            console.warn("Geen triggerListSearch gevonden");
          }

          closeModal();
        });
      });
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    currentCat = null;
  }

  grid.querySelectorAll(".category-card").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.cat));
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // === Dynamisch max-height = 2.5 rijen
  const firstCard = grid.querySelector(".category-card");
  if (firstCard) {
    const cardHeight = firstCard.offsetHeight + 8;
    wrapper.style.maxHeight = `${cardHeight * 2.9}px`;
  }

  // === Meer/minder knop ===
  moreBtn.addEventListener("click", () => {
    const expanded = wrapper.classList.toggle("expanded");
    if (expanded) {
      wrapper.style.maxHeight = "2000px";
      moreBtn.textContent = "Minder tonen";
    } else {
      const cardHeight = firstCard.offsetHeight + 8;
      wrapper.style.maxHeight = `${cardHeight * 2.9}px`;
      moreBtn.textContent = "Meer tonen";
    }
  });
}
