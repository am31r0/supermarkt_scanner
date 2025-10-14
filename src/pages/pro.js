// src/pages/pro.js
import {
  loadHistory,
  deleteHistoryItem,
  renderHistoryModal,
  refreshItemsWithCurrentPrices,
} from "../lib/history.js";
import { showToast, formatPrice } from "../lib/utils.js";
import { STORE_LABEL, STORE_COLORS } from "../lib/constants.js";

export function renderProPage(mount) {
  console.log("🔵 renderProPage start");

  mount.innerHTML = `
    <section class="pro">
      <header class="page-header pro-gradient" style="margin-bottom: 1.6rem;">
        <h1>Schappie Pro</h1>
        <h3 style="font-size: 0.8rem; opacity: 0.7;">(betaalde functies)</h3>
      </header>

      <!-- FAVORIETEN -->
      <div class="card favorites-card-block" style="margin-bottom:1rem;">
        <div class="card-header">
          <h2>Favorieten ❤️</h2>
        </div>
        <div class="card-body">
          <div class="favorites-container"></div>
        </div>
      </div>

      <!-- GESCHIEDENIS -->
      <div class="card history-card-block">
        <div class="card-header">
          <h2>Geschiedenis ⏪</h2>
        </div>
        <div class="card-body">
          <div class="history-container"></div>
          <div class="pagination-controls" style="text-align:center; margin-top:1rem;"></div>
        </div>
      </div>
    </section>
  `;

  /* =======================
     FAVORIETEN
     ======================= */
  function loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem("sms_favorites")) ?? [];
    } catch {
      return [];
    }
  }

  function saveFavorites(list) {
    localStorage.setItem("sms_favorites", JSON.stringify(list));
  }

  function addToList(fav) {
    const list = JSON.parse(localStorage.getItem("sms_list") || "[]");
    const exists = list.find(
      (i) =>
        i.name.toLowerCase() === fav.name.toLowerCase() && i.store === fav.store
    );
    if (exists) {
      showToast("Staat al in jouw lijst 🛒");
      return;
    }
    list.push({
      id: fav.id || crypto.randomUUID(),
      name: fav.name,
      store: fav.store,
      price: fav.price,
      promoPrice: fav.promoPrice,
      qty: 1,
      done: false,
    });
    localStorage.setItem("sms_list", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
    showToast(`${fav.name} toegevoegd aan jouw lijst 🛒`);
  }

  function renderFavorites(container) {
    const favs = loadFavorites();
    container.innerHTML = "";

    if (!favs.length) {
      container.innerHTML = `<p class="empty" style="opacity:0.7;">Nog geen favorieten.</p>`;
      return;
    }

    let showAllFavs = false;
    const MAX_VISIBLE = 3;
    const MAX_SCROLL = 8;

    const listWrapper = document.createElement("div");
    listWrapper.className = "favorites-list-wrapper";
    listWrapper.style.display = "flex";
    listWrapper.style.flexDirection = "column";
    listWrapper.style.gap = "0.4rem";

    function renderList() {
      listWrapper.innerHTML = "";

      const visible = showAllFavs
        ? favs.slice(0, MAX_SCROLL)
        : favs.slice(0, MAX_VISIBLE);

      visible.forEach((f) => {
        const row = document.createElement("div");
        row.className = "fav-row";
        Object.assign(row.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-line-muted)",
          padding: "0.4rem 0",
        });

        const left = document.createElement("div");
        left.className = "fav-left";
        left.innerHTML = `
          <div style="font-size:0.9rem; font-weight:500; color:var(--ink); line-height:1.3;">
            ${f.name}
          </div>
          <div style="font-size:0.75rem; opacity:1.75; display:flex; align-items:center; gap:0.3rem; margin-top:2px;">
            <span class="list-store store-${f.store}" 
                  style="
                         color:#fff;
                         border-radius:999px;
                         padding:1px 8px;
                         font-size:0.6rem;
                         font-weight:600;">
              ${STORE_LABEL[f.store] || f.store}
            </span>
            ${
              f.promoPrice
                ? `<span class="promo-pill" style="background:#ff3b30;color:#fff;border-radius:99px;padding:0 6px;font-size:0.5rem;">KORTING</span>
                 <span style="text-decoration:line-through;opacity:0.6;">${formatPrice(
                   f.price
                 )}</span>
                 <strong class="price new">${formatPrice(
                   f.promoPrice
                 )}</strong>`
                : f.price
                ? `<span style="font-weight:600;">${formatPrice(
                    f.price
                  )}</span>`
                : ""
            }
          </div>
        `;

        const right = document.createElement("div");
        right.className = "fav-right";
        Object.assign(right.style, {
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
        });

        right.innerHTML = `
          <button class="icon-btn fav-add" title="Toevoegen aan lijst" 
            style="background:#44aaff;border:none;border-radius:50%;color:#fff;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">✚</button>
          <button class="icon-btn fav-alert" title="Prijsalert"
            style="background:var(--accent);border:none;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">🔔</button>
          <button class="icon-btn fav-del" title="Verwijderen"
            style="background:#f00;border:none;border-radius:50%;color:#fff;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">✕</button>
        `;

        right
          .querySelector(".fav-add")
          .addEventListener("click", () => addToList(f));
        right
          .querySelector(".fav-alert")
          .addEventListener("click", () =>
            showToast("Meldingen zijn nog niet actief in deze beta 🔔")
          );
        right.querySelector(".fav-del").addEventListener("click", () => {
          const updated = loadFavorites().filter((x) => x.id !== f.id);
          saveFavorites(updated);
          renderFavorites(container);
          showToast("Verwijderd uit favorieten ❤️‍🔥");
        });

        row.appendChild(left);
        row.appendChild(right);
        listWrapper.appendChild(row);
      });

      container.appendChild(listWrapper);

      // “Alles weergeven” knop
      container.querySelector(".fav-more-container")?.remove();
      const moreContainer = document.createElement("div");
      moreContainer.className = "fav-more-container";
      moreContainer.style.textAlign = "center";
      if (!showAllFavs && favs.length > MAX_VISIBLE) {
        const moreBtn = document.createElement("button");
        moreBtn.textContent = "Alles weergeven";
        moreBtn.className = "btn small";
        moreBtn.style.marginTop = "0.6rem";
        moreBtn.addEventListener("click", () => {
          showAllFavs = true;
          listWrapper.style.maxHeight = "260px";
          listWrapper.style.overflowY = "auto";
          renderList();
        });
        moreContainer.appendChild(moreBtn);
        container.appendChild(moreContainer);
      }
    }

    renderList();
  }

  const favContainer = mount.querySelector(".favorites-container");
  renderFavorites(favContainer);

  /* =======================
     GESCHIEDENIS (ongewijzigd)
     ======================= */
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

    let visibleItems = [];
    if (!showAll && history.length > 3) {
      visibleItems = history.slice(0, 3);
    } else {
      const totalPages = Math.ceil(history.length / PAGE_SIZE);
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      visibleItems = history.slice(start, end);

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

/* =======================
   GROENE BEVESTIGINGSBANNER
   ======================= */
function showTopBanner(message) {
  const banner = document.createElement("div");
  banner.textContent = message;
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
