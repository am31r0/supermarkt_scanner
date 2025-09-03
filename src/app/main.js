import { createRouter } from "./router.js";
import { renderHomePage } from "../pages/home.js";
import { renderListPage } from "../pages/list.js";
import { renderSettingsPage } from "../pages/settings.js";
import { initSettings } from "../lib/settings.js";

document.addEventListener("DOMContentLoaded", () => {
  // Settings (thema/accents) vóór eerste paint
  initSettings();

  const app = document.getElementById("app");

  const routes = {
    "#/home": renderHomePage,
    "#/list": renderListPage,
    "#/settings": renderSettingsPage,
  };

  const router = createRouter({ routes, mountEl: app, defaultHash: "#/home" });
  router.start();
});
