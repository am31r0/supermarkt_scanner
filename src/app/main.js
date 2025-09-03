// src/app/main.js
import { createRouter } from "./router.js";
import { renderListPage } from "../pages/list.js";
import { renderHomePage } from "../pages/home.js";
import { initSettings } from "../lib/settings.js"; // <-- pad gefixed
import { renderSettingsPage } from "../pages/settings.js"; // <-- pad gefixed

document.addEventListener("DOMContentLoaded", () => {
  // 1) Theme/instellingen eerst, zodat de eerste render meteen juiste CSS vars heeft
  initSettings();

  const app = document.getElementById("app");

  const routes = {
    "#/home": renderHomePage,
    "#/list": renderListPage,
    "#/settings": renderSettingsPage,
    // "#/search": renderSearchPage,
    // "#/deals": renderDealsPage,
  };

  // 2) Router één keer maken (niet nog een keer eronder)
  const router = createRouter({ routes, mountEl: app });

  // 3) Default route zetten als er geen hash is
  if (!location.hash) {
    router.navigate("#/home");
  }
  // Geen handmatige hashchange dispatch nodig; navigate() zet zelf de hash.
});
