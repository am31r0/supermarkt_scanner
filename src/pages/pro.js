// src/pages/pro.js
import {
  loadHistory,
  deleteHistoryItem,
  renderHistoryModal,
  refreshItemsWithCurrentPrices, // exporteren we vanuit history.js
} from "../lib/history.js";
import { showToast } from "../lib/utils.js";

export function renderProPage(mount) {
  console.log("🔵 renderProPage start");

  // Bouw basispagina
  mount.innerHTML = `
    <section class="pro">
      <header class="page-header pro-gradient" style="margin-bottom: 1.6rem;">
        <h1>Schappie Pro</h1>
        <h3 style="font-size: 0.8rem; opacity: 0.7;">(betaalde functies)</h3>
      </header>

      <div class="card history-card-block">
        <div class="card-header">
          <h2>Geschiedenis</h2>
        </div>
        <div class="card-body">
          <div class="history-container"></div>
        </div>
      </div>
    </section>
  `;

  const container = mount.querySelector(".history-container");

  // -------------
  // Herbruikbare renderfunctie
  // -------------
  function renderList() {
    console.log("🟣 renderList() called");

    const history = loadHistory();
    console.log("📦 Loaded history:", history);

    container.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {
      container.innerHTML = `
        <p class="empty" style="opacity:0.7;">
          Nog geen opgeslagen lijsten.<br>
          <small>Ga naar <strong>Mijn Lijst</strong> en klik op “Klaar ✓”.</small>
        </p>
      `;
      return;
    }

    history.forEach((entry) => {
      const dateStr = new Date(entry.date).toLocaleDateString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML = `
        <div class="history-row-main">
          <strong>${dateStr}</strong>
          <span class="muted"> • ${entry.items?.length ?? 0} producten</span>
        </div>
        <div class="history-row-actions">
          <button class="btn small reuse-btn" style="background:#44aaff" >Hergebruiken</button>
          <button class="btn small view-btn">Bekijken</button>
          <button class="btn small danger del-btn">Verwijderen</button>
        </div>
      `;

      // --- hergebruiken-knop
      row.querySelector(".reuse-btn").addEventListener("click", async () => {
        try {
          const fresh = await refreshItemsWithCurrentPrices(entry.items);
          localStorage.setItem("sms_list", JSON.stringify(fresh));
          showTopBanner("✅ Lijst hergebruikt met actuele prijzen");
          window.dispatchEvent(new Event("storage"));
        } catch (err) {
          console.error("❌ Fout bij hergebruiken:", err);
          showToast("Kon prijzen niet vernieuwen");
        }
      });

      // --- bekijkknop
      row.querySelector(".view-btn").addEventListener("click", () => {
        const existing = document.querySelector(".history-modal");
        if (existing) existing.remove();
        renderHistoryModal(entry);
      });

      // --- verwijderknop
      row.querySelector(".del-btn").addEventListener("click", () => {
        console.log("🗑️ Delete clicked for:", entry.id);
        try {
          deleteHistoryItem(String(entry.id));
          const updated = loadHistory();
          console.log("📦 Na verwijderen:", updated);
          renderList();
        } catch (err) {
          console.error("❌ Fout bij verwijderen:", err);
        }
      });

      container.appendChild(row);
    });
  }

  // Eerste render
  renderList();
}

// -------------------------
// Groene bevestigingsbanner bovenaan
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
