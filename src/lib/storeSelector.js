// src/lib/storeSelector.js
import { getEnabledStores, setEnabledStore, subscribe } from "./settings.js";

export function renderStoreSelector(mount) {
  const wrapper = document.createElement("div");
  wrapper.className = "store-select";
  wrapper.innerHTML = `
    <span class="store-select-label">Geselecteerde supermarkten:</span>
    <div class="store-select-group">
      <label class="store-option selector-img ah" title="Albert Heijn">
        <input type="checkbox" data-store="ah" />
        <img src="./public/icons/ah-logo.webp" alt="Albert Heijn" />
      </label>

      <label class="store-option selector-img dirk" title="Dirk">
        <input type="checkbox" data-store="dirk" />
        <img src="./public/icons/dirk-logo-square.webp" alt="Dirk" />
      </label>

      <label class="store-option selector-img jumbo" title="Jumbo">
        <input type="checkbox" data-store="jumbo" />
        <img src="./public/icons/jumbo-logo-yellow-square.webp" alt="Jumbo" />
      </label>

      <label class="store-option selector-img aldi" title="Aldi">
        <input type="checkbox" data-store="aldi" />
        <img src="./public/icons/aldi-logo.webp" alt="Aldi" />
      </label>

      <label class="store-option selector-img hoogvliet" title="hoogvliet">
        <input type="checkbox" data-store="hoogvliet" />
        <img src="./public/icons/hoogvliet-logo.webp" alt="hoogvliet" />
      </label>
    </div>
  `;

  mount.appendChild(wrapper);

  function syncUI() {
    const state = getEnabledStores();
    wrapper.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.checked = !!state[cb.dataset.store];
    });
  }

  wrapper.addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) {
      setEnabledStore(e.target.dataset.store, e.target.checked);
    }
  });

  syncUI();
  subscribe(syncUI);
}
