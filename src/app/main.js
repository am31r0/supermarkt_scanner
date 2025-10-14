import { createRouter } from "./router.js";
import { renderHomePage } from "../pages/home.js";
import { renderListPage } from "../pages/list.js";
import { renderSettingsPage } from "../pages/settings.js";
import { initSettings } from "../lib/settings.js";
import { renderDealsPage } from "../pages/deals.js";
import { renderProPage} from "../pages/pro.js"
import { renderTutorialPage } from "../pages/tutorial.js";
import {
  shouldShowTutorialOnce,
  markTutorialShown,
} from "../lib/tutorialPopup.js";
import { registerClick } from "../lib/adSystem.js";
import { showNav } from "../lib/utils.js";



document.addEventListener("DOMContentLoaded", () => {
  // Settings (thema/accents) vóór eerste paint
  initSettings();

  const app = document.getElementById("app");

  const routes = {
    "#/home": renderHomePage,
    "#/list": renderListPage,
    "#/settings": renderSettingsPage,
    "#/deals": renderDealsPage,
    "#/tutorial": renderTutorialPage,
    "#/pro": renderProPage,
  };

  const router = createRouter({ routes, mountEl: app, defaultHash: "#/home" });
  router.start();
  registerClick();
});


// Bij opstart: toon tutorial 1x per dag


if (shouldShowTutorialOnce()) {
  renderTutorialPage();
  markTutorialShown();
}

document.addEventListener("click", (e) => {
  // Alleen tellen als het een echte user-interactie is, niet UI
  const target = e.target.closest("button, .product-card, .add-btn, a");
  if (target) {
    registerClick();
  }
});

//anti-hover voor mobile
document.addEventListener("touchend", () => {
  document.activeElement?.blur();
});