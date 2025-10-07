// src/pages/pro.js
import {
  loadHistory,
  deleteHistoryItem,
  renderHistoryModal,
} from "../lib/history.js";

export function renderProPage(mount) {
  console.log("🔵 renderProPage start"); // ← check dat dit logt in console

  // Bouw basispagina
  mount.innerHTML = `
    <section class="pro">
      <header class="page-header" style="margin-bottom: 1.6rem;">
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
          <small>Ga naar <strong>Mijn Lijst</strong> en klik op “✅ Klaar”.</small>
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
      const rating = Number(entry.rating) || 0;
      const ratingHtml = rating
        ? `<span class="rating">${"⭐".repeat(rating)}</span>`
        : `<span class="no-rating" style="opacity:0.6;">–</span>`;

      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML = `
        <div class="history-row-main">
          <strong>${dateStr}</strong>
          <span class="muted"> • ${entry.items?.length ?? 0} producten</span>
          ${ratingHtml}
        </div>
        <div class="history-row-actions">
          <button class="btn small view-btn">Bekijken</button>
          <button class="btn small danger del-btn">Verwijderen</button>
        </div>
      `;

      // --- bekijkknop
      row.querySelector(".view-btn").addEventListener("click", () => {
        const existing = document.querySelector(".history-modal");
        if (existing) existing.remove();
        renderHistoryModal(entry);
      });

      // --- verwijderknop
      // verwijder-knop (met directe refresh)
      row.querySelector(".del-btn").addEventListener("click", () => {
        console.log("🗑️ Delete clicked for:", entry.id);


        try {
          deleteHistoryItem(String(entry.id)); // forceer string-id
          const updated = loadHistory(); // opnieuw laden
          console.log("📦 Na verwijderen:", updated);
          renderList(); // hertekenen
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
