// =============================================
// Schappie Beta User Info Prompt (met cookie fallback)
// =============================================
import { showNav, showToast } from "../lib/utils.js";

const LS_KEY_USER_INFO = "schappie_user_info_v1";

/* -----------------------------
   Opslaghelpers
----------------------------- */
function getCookieValue(name) {
  const cookie = document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

function setCookie(name, value, days = 365) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; max-age=${maxAge}; path=/`;
}

function getUserInfo() {
  try {
    const data = localStorage.getItem(LS_KEY_USER_INFO);
    if (data) return JSON.parse(data);
  } catch (e) {}

  // fallback naar cookie
  const cookieData = getCookieValue("user_info");
  if (cookieData) {
    try {
      return JSON.parse(cookieData);
    } catch (e) {}
  }
  return null;
}

function saveUserInfo(data) {
  const json = JSON.stringify(data);
  try {
    localStorage.setItem(LS_KEY_USER_INFO, json);
  } catch (e) {}
  setCookie("user_info", json);
}

/* -----------------------------
   Exports
----------------------------- */
export function shouldAskUserInfo() {
  return !getUserInfo();
}

export function showUserInfoPrompt() {
  showNav(false);

  const modal = document.createElement("div");
  modal.className = "user-info-modal";
  modal.innerHTML = `
    <div class="user-info-backdrop"></div>
    <div class="user-info-panel">
      <h2>Welkom bij Schappie 👋</h2>
      <p>We zitten in de beta fase. Vul even je gegevens in zodat we feedback kunnen verzamelen.</p>

      <input id="beta-name" type="text" placeholder="Naam" required />
      <input id="beta-age" type="number" placeholder="Leeftijd" required />
      <input id="beta-city" type="text" placeholder="Woonplaats" required />

      <div class="gender-group">
        <label><input type="radio" name="gender" value="man" required /> Man</label>
        <label><input type="radio" name="gender" value="vrouw" required /> Vrouw</label>
      </div>

      <button id="beta-submit">Verder</button>
    </div>
  `;
  document.body.appendChild(modal);

  // ===============================
  // STIJL
  // ===============================
  const style = document.createElement("style");
  style.textContent = `
    .user-info-modal {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif;
    }
    .user-info-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.6);
    }
    .user-info-panel {
      position: relative;
      background: #fff;
      border-radius: 1rem;
      padding: 1.4rem;
      z-index: 1;
      width: 90%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .user-info-panel h2 {
      margin-bottom: 0.5rem;
      font-size:1.3rem;
    }
    .user-info-panel p {
      font-size: 0.8rem;
      color: #444;
      margin-bottom: 1rem;
    }
    .user-info-panel input {
      width: 100%;
      margin: 0.4rem 0;
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #ddd;
      font-size: 0.8rem;
      outline: none;
      transition: border 0.2s;
    }
    .user-info-panel input:focus {
      border-color: var(--accent, #2ecc71);
    }
    .gender-group {
      display: flex;
      justify-content: center;
      gap: 1.2rem;
      margin: 0.7rem 0 1rem;
      font-size: 0.85rem;
    }
    .user-info-panel button {
      background: var(--accent, #2ecc71);
      color: #fff;
      border: none;
      padding: 0.6rem 1.4rem;
      border-radius: 99px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.2s, transform 0.2s;
    }
  `;
  document.head.appendChild(style);

  // ===============================
  // SUBMIT EVENT
  // ===============================
  document.getElementById("beta-submit").addEventListener("click", async () => {
    const name = document.getElementById("beta-name").value.trim();
    const age = document.getElementById("beta-age").value.trim();
    const city = document.getElementById("beta-city").value.trim();
    const gender = document.querySelector(
      'input[name="gender"]:checked'
    )?.value;

    if (!name || !age || !city || !gender) {
      showToast("Vul alle velden in aub!");
      return;
    }

    const info = { name, age, city, gender, date: new Date().toISOString() };

    try {
      await fetch("/api/saveUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });

      // ✅ Bewaar data in localStorage + cookie
      saveUserInfo(info);

      modal.remove();
      showNav(true);

      showToast(
        "Bedankt voor je deelname aan de Schappie Beta! We wensen je veel bespaarplezier 🛒"
      );
    } catch (err) {
      showToast("Er ging iets mis bij het opslaan. Probeer opnieuw.");
      console.error(err);
    }
  });
  // Developer hack: druk op "Z" om de modal direct te sluiten
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "z") {
      const modal = document.querySelector(".user-info-modal");
      if (modal) {
        console.warn("🧪 [DEV] Modal gesloten via toets 'Z'");
        modal.remove();
        showNav(true);
      }
    }
  });
}
