// src/pages/pro.js
import {
  loadHistory,
  deleteHistoryItem,
  renderHistoryModal,
  refreshItemsWithCurrentPrices,
} from "../lib/history.js";
import { showToast } from "../lib/utils.js";

export function renderProPage(mount) {
  console.log("🔵 renderProPage start");

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
          <div class="pagination-controls" style="text-align:center; margin-top:1rem;"></div>
        </div>
      </div>
    </section>
  `;

  const container = mount.querySelector(".history-container");
  const pagination = mount.querySelector(".pagination-controls");

  let showAll = false;
  let currentPage = 1;
  const PAGE_SIZE = 8;

  function renderList() {
    const history = loadHistory();
    container.innerHTML = "";
    pagination.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {
      container.innerHTML = `
        <p class="empty" style="opacity:0.7;">
          Nog geen opgeslagen lijsten.<br>
          <small>Ga naar <strong>Mijn Lijst</strong> en klik op “Klaar ✓”.</small>
        </p>`;
      return;
    }

    // ------------- PAGINATION LOGICA -------------
    let visibleItems = [];
    if (!showAll && history.length > 3) {
      visibleItems = history.slice(0, 3);
    } else {
      const totalPages = Math.ceil(history.length / PAGE_SIZE);
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      visibleItems = history.slice(start, end);

      // pagination knoppen (alleen als >8)
      if (totalPages > 1) {
        const prevBtn = document.createElement("button");
        const nextBtn = document.createElement("button");
        prevBtn.textContent = "← Vorige";
        nextBtn.textContent = "Volgende →";
        [prevBtn, nextBtn].forEach((b) => {
          b.className = "btn small";
          b.style.margin = "0 0.5rem";
        });

        if (currentPage > 1) {
          prevBtn.onclick = () => {
            currentPage--;
            renderList();
          };
          pagination.appendChild(prevBtn);
        }

        pagination.appendChild(
          Object.assign(document.createElement("span"), {
            textContent: `Pagina ${currentPage} van ${totalPages}`,
            style: "margin:0 0.5rem; opacity:0.7;",
          })
        );

        if (currentPage < totalPages) {
          nextBtn.onclick = () => {
            currentPage++;
            renderList();
          };
          pagination.appendChild(nextBtn);
        }
      }
    }

    // ------------- ITEM RENDERING -------------
    visibleItems.forEach((entry) => {
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

      row.querySelector(".view-btn").addEventListener("click", () => {
        document.querySelector(".history-modal")?.remove();
        renderHistoryModal(entry);
      });

      row.querySelector(".del-btn").addEventListener("click", () => {
        deleteHistoryItem(String(entry.id));
        renderList();
      });

      container.appendChild(row);
    });

    // ------------- “MEER WEERGEVEN” KNOP -------------
    if (!showAll && history.length > 3) {
      const moreBtn = document.createElement("button");
      moreBtn.textContent = "Meer weergeven";
      moreBtn.className = "btn small";
      moreBtn.style.marginTop = "1rem";
      moreBtn.onclick = () => {
        showAll = true;
        currentPage = 1;
        renderList();
      };
      pagination.appendChild(moreBtn);
    }
  }

  renderList();
}

// -------------------------
// Groene bevestigingsbanner
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
