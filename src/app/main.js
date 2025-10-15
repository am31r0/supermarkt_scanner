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

  const app = document.getElementById("app");

  // 2️⃣ Router-configuratie
  const routes = {
    "#/home": renderHomePage,
    "#/list": renderListPage,
    "#/settings": renderSettingsPage,
    "#/deals": renderDealsPage,
    "#/tutorial": renderTutorialPage,
    "#/pro": renderProPage,
  };

  const router = createRouter({
    routes,
    mountEl: app,
    defaultHash: "#/home",
  });

  // =============================================
  // 👋 Flow: userprompt → router → tutorial
  // =============================================
  function startRouterAndMaybeTutorial() {
    router.start();

    // Tutorial pas na userprompt (en slechts 1x)
    try {
      if (shouldShowTutorialOnce()) {
        // Korte vertraging zodat router eerst rendert
        setTimeout(() => {
          renderTutorialPage(app);
          markTutorialShown();
        }, 600);
      }
    } catch (err) {
      console.warn("Kon tutorial niet tonen:", err);
    }
  }

  try {
    if (shouldAskUserInfo()) {
      // Eerst user info prompt
      showUserInfoPrompt();

      // Router starten zodra prompt verdwijnt
      const observer = new MutationObserver(() => {
        if (!document.querySelector(".user-info-modal")) {
          observer.disconnect();
          startRouterAndMaybeTutorial();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      // Geen prompt nodig → direct router + evt tutorial
      startRouterAndMaybeTutorial();
    }
  } catch (err) {
    console.warn("Kon user info prompt of tutorial niet tonen:", err);
    startRouterAndMaybeTutorial();
  }

  // =============================================
  // Overige events
  // =============================================

  // Advertentie-click tracking activeren
  registerClick();

  // Click tracking voor interacties
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, .product-card, .add-btn, a");
    if (target) registerClick();
  });

  // Anti-hover voor mobiele apparaten
  document.addEventListener("touchend", () => {
    document.activeElement?.blur();
  });

  // showNav(true); // optioneel
});
