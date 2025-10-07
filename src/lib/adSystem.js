// src/lib/adSystem.js
import { showNav } from "./utils.js"; // zelfde als in tutorial.js

const MIN_CLICKS = 7; // aantal interacties voordat advertentie mogelijk is
const MIN_INTERVAL = 1 * 60 * 1000; // 1 minuut
const AD_DISPLAY_TIME = 4500; // 5 seconden zichtbaar
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

  if (clicks >= MIN_CLICKS && sinceLast >= MIN_INTERVAL) {
    showAdOverlay();
    setLastAdTime(now);
    setClicks(0);
  }
}

export function showAdOverlay() {
  if (document.querySelector(".ad-overlay")) return;

  showNav(false);

  const overlay = document.createElement("div");
  overlay.className = "ad-overlay";
  overlay.innerHTML = `
    <div class="ad-box">
      <h2>Hier komt een advertentie</h2>
      <p>Zo kunnen we onze basisfuncties gratis houden voor iedereen!</p>
      <div class="ad-countdown">5</div>
      <button class="ad-close" disabled style="display:none;">&times;</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector(".ad-close");
  const countdownEl = overlay.querySelector(".ad-countdown");

  // Countdown van 5 naar 0
  let remaining = 5;
  countdownEl.textContent = remaining;

  const interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      countdownEl.textContent = remaining;
    } else {
      clearInterval(interval);
      countdownEl.remove();
      closeBtn.style.display = "block";
      closeBtn.disabled = false;
      closeBtn.classList.add("active");
    }
  }, 1000);

  // Developer shortcut
  function handleKey(e) {
    if (DEV_MODE && (e.key.toLowerCase() === "x" || e.key === "Escape")) {
      cleanup();
    }
  }

  document.addEventListener("keydown", handleKey);
  closeBtn.addEventListener("click", cleanup);

  function cleanup() {
    overlay.remove();
    clearInterval(interval);
    document.removeEventListener("keydown", handleKey);
    showNav(true);
  }
}
