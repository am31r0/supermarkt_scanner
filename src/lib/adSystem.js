// src/lib/adSystem.js

import { showNav } from "./utils.js"; // <-- belangrijk: zelfde als in tutorial.js

const MIN_CLICKS = 6; // aantal interacties voordat advertentie mogelijk is
const MIN_INTERVAL = 1 * 60 * 1000; // 3 minuten
const AD_DISPLAY_TIME = 5000; // 5 seconden zichtbaar
const DEV_MODE = true; // zet op false in productie

function getClicks() {
  return parseInt(localStorage.getItem("ad_clicks") || "0", 10);
}
function setClicks(val) {
  localStorage.setItem("ad_clicks", val);
}

function getLastAdTime() {
  return parseInt(localStorage.getItem("lastAdTime") || "0", 10);
}
function setLastAdTime(time) {
  localStorage.setItem("lastAdTime", time);
}

export function registerClick() {
  let clicks = getClicks() + 1;
  setClicks(clicks);

  const now = Date.now();
  const sinceLast = now - getLastAdTime();

  // Toon advertentie alleen als beide voorwaarden voldaan zijn
  if (clicks >= MIN_CLICKS && sinceLast >= MIN_INTERVAL) {
    showAdOverlay();
    setLastAdTime(now);
    setClicks(0);
  }
}

export function showAdOverlay() {
  if (document.querySelector(".ad-overlay")) return;

  // Nav verbergen
  showNav(false);

  const overlay = document.createElement("div");
  overlay.className = "ad-overlay";
  overlay.innerHTML = `
    <div class="ad-box">
      <h2>Hier komt een advertentie</h2>
      <p>Zo kunnen we onze basisfuncties gratis houden voor iedereen!</p>
      <button class="ad-close" disabled>&times;</button>
         </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector(".ad-close");

  // Activeer sluitknop na 5 seconden
  const timer = setTimeout(() => {
    closeBtn.disabled = false;
    closeBtn.classList.add("active");
  }, AD_DISPLAY_TIME);

  // Developer shortcut
  function handleKey(e) {
    if (DEV_MODE && (e.key.toLowerCase() === "x" || e.key === "Escape")) {
      cleanup();
    }
  }

  document.addEventListener("keydown", handleKey);
  closeBtn.addEventListener("click", cleanup);

  // Cleanup (sluiten + nav herstellen)
  function cleanup() {
    overlay.remove();
    clearTimeout(timer);
    document.removeEventListener("keydown", handleKey);
    showNav(true); // nav weer tonen
  }
}
