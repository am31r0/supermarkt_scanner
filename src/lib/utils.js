// src/lib/utils.js
// =============================================
// Globale helper functies voor de hele app
// =============================================

// Unique ID generator (voor lijst items)
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Escape HTML entities (veilig in innerHTML)
export function escHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Escape HTML attribuut waarde
export function escAttr(str) {
  return escHtml(str).replaceAll('"', "&quot;");
}

// Format prijs naar €x.xx
export function formatPrice(num) {
  if (num == null || isNaN(num)) return "—";
  return `€${num.toFixed(2)}`;
}

// Parse een hoeveelheid + unit uit string
// bv. "500 g" -> { unit:"kg", amount:0.5 }
export function parseUnit(str) {
  if (!str) return null;
  const lower = str.toLowerCase().trim();

  // Gewicht
  let m = lower.match(/([\d.,]+)\s*(kg|g)/);
  if (m) {
    let value = parseFloat(m[1].replace(",", "."));
    if (m[2] === "g") value /= 1000;
    return { unit: "kg", amount: value };
  }

  // Volume
  m = lower.match(/([\d.,]+)\s*(l|ml)/);
  if (m) {
    let value = parseFloat(m[1].replace(",", "."));
    if (m[2] === "ml") value /= 1000;
    return { unit: "L", amount: value };
  }

  // Stuks
  m = lower.match(/(\d+)\s*st/);
  if (m) return { unit: "st", amount: parseInt(m[1]) };

  return null;
}

/* POPUP - TOEGEVOEGD AAN MIJN LIJST */

export function showToast(message) {
  // container maken als die nog niet bestaat
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  container.appendChild(toast);

  // trigger animatie
  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  // verwijderen na 3 sec
  setTimeout(() => {
    toast.classList.remove("visible");
    toast.addEventListener("transitionend", () => toast.remove(), {
      once: true,
    });
  }, 3000);
}

// src/lib/ui.js
// =============================================
// UI helper functies — navigatie, modals, loading, etc.
// =============================================

/**
 * Toon of verberg de hoofd-navigatiebalk.
 * @param {boolean} show - standaard true
 */
export function showNav(show = true) {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  nav.style.display = show ? "" : "none";
}

/**
 * Voeg of verwijder een 'no-scroll' toestand op <body>
 * Handig voor fullscreen modals of tutorial overlays
 */
export function toggleBodyScroll(lock = true) {
  document.body.style.overflow = lock ? "hidden" : "";
}

/**
 * Toon een tijdelijke toast melding (bijv. "Product toegevoegd")
 * @param {string} message - tekst van de melding
 * @param {number} duration - tijd in ms (standaard 2000)
 */

/**
 * Zet een eenvoudige loading overlay aan of uit
 * @param {boolean} show
 */
export function showLoading(show = true) {
  let overlay = document.querySelector(".loading-overlay");
  if (show) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "loading-overlay";
      overlay.innerHTML = `<div class="spinner"></div>`;
      document.body.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
  }
}

