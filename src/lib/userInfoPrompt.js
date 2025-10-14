// =============================================
// Schappie Beta User Info Prompt
// =============================================
import { showNav, showToast } from "../lib/utils.js";

const LS_KEY_USER_INFO = "sms_user_info";

export function shouldAskUserInfo() {
  return !localStorage.getItem(LS_KEY_USER_INFO);
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

  // ===== CSS styling =====
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
      padding: 2rem;
      z-index: 1;
      width: 90%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .user-info-panel h2 {
      margin-bottom: 0.5rem;
      font-size: 1.3rem;
    }
    .user-info-panel p {
      font-size: 0.8rem;
      color: #444;
      margin-bottom: 1rem;
    }
    .user-info-panel input[type="text"],
    .user-info-panel input[type="number"] {
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
      border-color: var(--accent, green);
    }
    .gender-group {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin: 0.8rem 0 0.5rem;
      font-size: 0.85rem;
    }
    .gender-group label {
      cursor: pointer;
    }
    .user-info-panel button {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 0.6rem 1.4rem;
      border-radius: 99px;
      margin-top: 0.6rem;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.2s;
    }
    .user-info-panel button:hover {
      filter: brightness(1.1);
    }
  `;
  document.head.appendChild(style);

  // ===== Submit event =====
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

      localStorage.setItem(LS_KEY_USER_INFO, JSON.stringify(info));
      modal.remove();
      showNav(true);

      // ✨ Mooi Schappie-bericht
      showToast(
        "Bedankt voor je deelname aan de Schappie Beta! We wensen je veel bespaarplezier 🛒"
      );
    } catch (err) {
      showToast("Er ging iets mis bij het opslaan. Probeer opnieuw.");
      console.error(err);
    }
  });
}
