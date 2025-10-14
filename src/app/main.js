// =============================================
// Schappie - Main Entrypoint
// =============================================

import { createRouter } from "./router.js";
import { renderHomePage } from "../pages/home.js";
import { renderListPage } from "../pages/list.js";
import { renderSettingsPage } from "../pages/settings.js";
import { renderDealsPage } from "../pages/deals.js";
import { renderProPage } from "../pages/pro.js";
import { renderTutorialPage } from "../pages/tutorial.js";
import { initSettings } from "../lib/settings.js";
import {
  shouldShowTutorialOnce,
  markTutorialShown,
} from "../lib/tutorialPopup.js";
import {
  shouldAskUserInfo,
  showUserInfoPrompt,
} from "../lib/userInfoPrompt.js";
import { registerClick } from "../lib/adSystem.js";
import { showNav } from "../lib/utils.js";

// =============================================
// App Init
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  // 1️⃣ Thema & instellingen vóór eerste paint
  initSettings();

  // 2️⃣ Mount-element ophalen
  const app = document.getElementById("app");

  // 3️⃣ Router-configuratie
  const routes = {
    "#/home": renderHomePage,
    "#/list": renderListPage,
    "#/settings": renderSettingsPage,
    "#/deals": renderDealsPage,
    "#/tutorial": renderTutorialPage,
    "#/pro": renderProPage,
  };

  // 4️⃣ Router starten
  const router = createRouter({
    routes,
    mountEl: app,
    defaultHash: "#/home",
  });
  router.start();

  // 5️⃣ Advertentie-click tracking activeren
  registerClick();

  // 6️⃣ Tutorial tonen (éénmalig per dag)
  try {
    if (shouldShowTutorialOnce()) {
      renderTutorialPage(app);
      markTutorialShown();
    }
  } catch (err) {
    console.warn("Kon tutorial niet tonen:", err);
  }

  // 7️⃣ Beta-prompt tonen (eenmalig per user)
  try {
    if (shouldAskUserInfo()) {
      showUserInfoPrompt();
    }
  } catch (err) {
    console.warn("Kon user info prompt niet tonen:", err);
  }

  // 8️⃣ Click tracking voor interacties
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, .product-card, .add-btn, a");
    if (target) registerClick();
  });

  // 9️⃣ Anti-hover voor mobiele apparaten
  document.addEventListener("touchend", () => {
    document.activeElement?.blur();
  });

  // 10️⃣ Navigatie tonen
  //showNav(true);
});
