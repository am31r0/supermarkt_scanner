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
import { loadLearnedBoosts } from "../lib/matching.js";

// =============================================
// App Init
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  // 1️⃣ Thema & instellingen vóór eerste paint
  initSettings();
  loadLearnedBoosts();

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

  // 4️⃣ Router aanmaken
  const router = createRouter({
    routes,
    mountEl: app,
    defaultHash: "#/home",
  });

  // 5️⃣ User info prompt vóór router tonen
  try {
    if (shouldAskUserInfo()) {
      showUserInfoPrompt();

      // ✅ Router pas starten zodra modal verdwenen is
      const observer = new MutationObserver(() => {
        if (!document.querySelector(".user-info-modal")) {
          observer.disconnect();
          router.start();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      router.start();
    }
  } catch (err) {
    console.warn("Kon user info prompt niet tonen:", err);
    router.start();
  }

  // 6️⃣ Advertentie-click tracking activeren
  registerClick();

  // 7️⃣ Tutorial pas ná router (eenmalig)
  try {
    if (shouldShowTutorialOnce()) {
      renderTutorialPage(app);
      markTutorialShown();
    }
  } catch (err) {
    console.warn("Kon tutorial niet tonen:", err);
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

  // 10️⃣ Navigatie tonen (optioneel)
  // showNav(true);
});
