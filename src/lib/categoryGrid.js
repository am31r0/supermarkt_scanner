// src/lib/categoryGrid.js
import { CATEGORIES } from "../data/products.js";
import { searchProducts } from "./matching.js";
import { showSearchModal } from "./modal.js";

/**
 * Render categorie-grid
 * @param {HTMLElement} mount - wrapper element
 * @param {Object} opts - options
 * @param {Function} opts.onSelect - callback(product)
 * @param {Array} opts.allProducts - genormaliseerde supermarktproducten
 */
export function renderCategoryGrid(mount, { onSelect, allProducts }) {
  mount.innerHTML = `
    <div class="categories-grid-wrapper">
      <div class="categories-grid" aria-label="Categorieën"></div>
    </div>
    <button class="categories-more-btn">Meer tonen</button>
  `;

  const grid = mount.querySelector(".categories-grid");
  const wrapper = mount.querySelector(".categories-grid-wrapper");
  const moreBtn = mount.querySelector(".categories-more-btn");

  // === Grid render ===
  grid.innerHTML = CATEGORIES.map(
    (c) => `
      <button class="category-card" data-cat="${c.id}">
        <span class="emoji">${c.icon}</span>
        <span class="label">${c.label}</span>
      </button>`
  ).join("");

  grid.querySelectorAll(".category-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catId = btn.dataset.cat;
      const catLabel = CATEGORIES.find((c) => c.id === catId)?.label || "";

      // Zoek alle producten uit echte supermarkt-jsons in deze categorie
      const results = searchProducts(allProducts, "", catId);

      if (!results.length) {
        alert(`Geen producten gevonden in ${catLabel}`);
        return;
      }

      // Open modal met resultaten
      showSearchModal(results, (chosen) => {
        if (onSelect) onSelect(chosen);
      });
    });
  });

  // Dynamisch max-height = 2.5 rijen
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
