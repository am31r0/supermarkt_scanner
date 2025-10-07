// src/lib/history.js
import { formatPrice } from "./utils.js";
import { STORE_COLORS, STORE_LABEL } from "./constants.js";

export function saveToHistory(items) {
  const history = JSON.parse(localStorage.getItem("sms_history") || "[]");
  const entry = {
    id: Date.now().toString(36),
    date: new Date().toISOString(),
    items: items.map((i) => ({ ...i })), // kopie
    rating: null,
  };
  history.unshift(entry);
  localStorage.setItem("sms_history", JSON.stringify(history));
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("sms_history")) || [];
  } catch {
    return [];
  }
}

export function deleteHistoryItem(id) {
  const all = loadHistory();
  const next = all.filter((h) => String(h.id) !== String(id));
  localStorage.setItem("sms_history", JSON.stringify(next));
}

export function renderHistoryModal(entry) {
  const modal = document.createElement("div");
  modal.className = "history-modal";

  const dateStr = new Date(entry.date).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const total = entry.items.reduce((sum, i) => {
    const unit = Number(i.promoPrice) || Number(i.price) || 0;
    const qty = i.qty ?? 1;
    return sum + unit * qty;
  }, 0);

  modal.innerHTML = `
    <div class="modal-inner card">
      <button class="close-btn" aria-label="Sluiten">&times;</button>
      <h3>Boodschappenlijst van ${dateStr}</h3>
      <ul class="history-items">
        ${entry.items
          .map((i) => {
            const storeKey = i.store || "other";
            const color = STORE_COLORS[storeKey] || "#ddd";
            const storeLabel = STORE_LABEL[storeKey] || storeKey;
            const unitPrice = Number(i.promoPrice) || Number(i.price) || 0;
            const showPrice = unitPrice ? formatPrice(unitPrice) : "-";
            return `
              <li>
                <span class="store-label" style="background:${color}">${storeLabel}</span>
                <span class="name">${i.name}</span>
                <span class="price">${showPrice}</span>
              </li>
            `;
          })
          .join("")}
      </ul>
      <div class="total-line"><strong>Totaal:</strong> €${total.toFixed(
        2
      )}</div>
    </div>
  `;

  modal
    .querySelector(".close-btn")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}
