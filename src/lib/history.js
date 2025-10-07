// src/lib/history.js
import { formatPrice, showToast } from "./utils.js";
import { STORE_COLORS, STORE_LABEL } from "./constants.js";

// -------------------------
// Opslaan in geschiedenis
// -------------------------
export function saveToHistory(items) {
  const history = JSON.parse(localStorage.getItem("sms_history") || "[]");
  const entry = {
    id: Date.now().toString(36),
    date: new Date().toISOString(),
    items: items.map((i) => ({ ...i })), // kopie van lijstitems
  };
  history.unshift(entry);
  localStorage.setItem("sms_history", JSON.stringify(history));
}

// -------------------------
// Laden / verwijderen
// -------------------------
export function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem("sms_history")) || [];
    // Oude "rating"-velden verwijderen
    return raw.map(({ rating, ...rest }) => rest);
  } catch {
    return [];
  }
}

export function deleteHistoryItem(id) {
  const all = loadHistory();
  const next = all.filter((h) => String(h.id) !== String(id));
  localStorage.setItem("sms_history", JSON.stringify(next));
  showToast("Geschiedenis verwijderd");
}

// -------------------------
// Modalweergave van één geschiedenis-entry
// -------------------------
export function renderHistoryModal(entry) {
  const modal = document.createElement("div");
  modal.className = "history-modal";

  const dateStr = new Date(entry.date).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ---- Totaal en besparing berekenen ----
  let totalNormal = 0;
  let totalOffer = 0;

  entry.items.forEach((i) => {
    const base = Number(i.price) || 0;
    const promo = Number(i.promoPrice) || 0;
    const qty = i.qty ?? 1;
    const usePrice = promo > 0 && promo < base ? promo : base;
    totalOffer += usePrice * qty;
    totalNormal += base * qty;
  });

  const discount = totalNormal - totalOffer;

  // ---- Modal HTML ----
  modal.innerHTML = `
    <div class="modal-inner card">
      <button class="close-btn" aria-label="Sluiten">&times;</button>
      <h3>Boodschappenlijst van<br>${dateStr}</h3>

      <ul class="history-items">
        ${entry.items
          .map((i) => {
            const storeKey = i.store || "other";
            const color = STORE_COLORS[storeKey] || "#ddd";
            const storeLabel = STORE_LABEL[storeKey] || storeKey;
            const base = Number(i.price) || 0;
            const promo = Number(i.promoPrice) || 0;
            const qty = i.qty ?? 1;
            const hasPromo = promo > 0 && promo < base;
            const displayPrice = hasPromo ? promo : base;

            return `
              <li>
                <span class="list-store" 
                      style="background:${color}; color:#fff; margin-right:0.8rem;">
                      ${storeLabel}</span>
                <span class="name">${i.name} ${
              qty > 1 ? `<span class="qty">×${qty}</span>` : ""
            }</span>
                <span class="price">
                  ${
                    hasPromo
                      ? `<span class="price old">${formatPrice(base)}</span>
                         <span class="price new">${formatPrice(promo)}</span>`
                      : formatPrice(displayPrice)
                  }
                </span>
              </li>
            `;
          })
          .join("")}
      </ul>

      <div class="total-line">
        <strong>Totaal:</strong> €${totalOffer.toFixed(2)}
      </div>
      ${
        discount > 0.01
          ? `<div class="total-line discount price new">
              <strong>Je bespaarde:</strong> €${discount.toFixed(2)}
             </div>`
          : ""
      }

      <div class="actions" style="margin-top:1rem; display:flex; gap:0.5rem;">
        <button class="btn small secondary reuse-btn">♻ Lijst hergebruiken</button>
        <button class="btn small close-btn-2">Sluiten</button>
      </div>
    </div>
  `;

  // ---- Eventlisteners ----
  modal
    .querySelectorAll(".close-btn, .close-btn-2")
    .forEach((b) => b.addEventListener("click", () => modal.remove()));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // ✅ Lijst hergebruiken — overschrijft sms_list met deze items
  modal.querySelector(".reuse-btn").addEventListener("click", async () => {
    try {
      const fresh = await refreshItemsWithCurrentPrices(entry.items);
      localStorage.setItem("sms_list", JSON.stringify(fresh));
      modal.remove();
      showTopBanner("✅ Lijst hergebruikt met actuele prijzen");
      window.dispatchEvent(new Event("storage")); // hertekenen in list.js
    } catch (err) {
      console.error("reuse error", err);
      showToast("Kon prijzen niet vernieuwen");
    }
  });

  document.body.appendChild(modal);
}

// -------------------------
// Helper: actuele prijzen laden
// -------------------------
async function refreshItemsWithCurrentPrices(oldItems) {
  const sources = {
    ah: "https://am31r0.github.io/supermarkt_scanner/dev/store_database/ah.json",
    jumbo:
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/jumbo.json",
    dirk: "https://am31r0.github.io/supermarkt_scanner/dev/store_database/dirk.json",
  };

  // alle data tegelijk fetchen
  const [ah, jumbo, dirk] = await Promise.all(
    Object.values(sources).map((url) => fetch(url).then((r) => r.json()))
  );

  const all = [...ah, ...jumbo, ...dirk];
  const updated = [];

  for (const old of oldItems) {
    const match = all.find(
      (p) => p.name?.toLowerCase() === old.name?.toLowerCase()
    );
    updated.push({
      ...old,
      price: match?.price ?? old.price,
      promoPrice: match?.promoPrice ?? match?.offerPrice ?? null,
      done: false, // reset naar niet-afgevinkt
    });
  }

  return updated;
}

// -------------------------
// Visuele bevestiging bovenaan scherm
// -------------------------
function showTopBanner(message) {
  const banner = document.createElement("div");
  banner.textContent = message;
  banner.className = "top-banner";
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    background: "#2ecc71",
    color: "#fff",
    padding: "10px",
    textAlign: "center",
    fontWeight: "600",
    zIndex: "9999",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    transition: "transform 0.3s ease",
  });

  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.transform = "translateY(-100%)";
    setTimeout(() => banner.remove(), 300);
  }, 3000);
}

export { refreshItemsWithCurrentPrices };
