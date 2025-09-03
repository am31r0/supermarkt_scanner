// src/pages/settings.js
import { getSettings, setTheme, setAccent, ACCENTS } from "../lib/settings.js";

export function renderSettingsPage(mount) {
  const s = getSettings();

  mount.innerHTML = `
    <section class="settings">
      <div class="card">
        <h2>App-thema</h2>
        <div class="row">
          <label class="row" style="gap:.5rem;align-items:center;">
            <span>Dark</span>
            <label class="switch">
              <input id="theme-toggle" type="checkbox" ${
                resolveChecked(s.theme) ? "checked" : ""
              } />
              <span class="slider"></span>
            </label>
            <span>Light</span>
          </label>
          <button class="btn btn--primary" id="system-mode" title="Volg systeemvoorkeur">Systeem</button>
        </div>
      </div>

      <div class="card">
        <h2>Accentkleur</h2>
        <div class="swatches" id="accent-swatches" role="radiogroup" aria-label="Accent kleur">
          ${ACCENTS.map(
            (c) => `
            <button class="swatch" role="radio" aria-checked="${
              s.accent === c
            }" data-color="${c}" style="background:${c}" title="${c}"></button>
          `
          ).join("")}
        </div>
      </div>

      <div class="card">
        <h2>Overige</h2>
        <div class="row">
          <span class="badge--accent">Rondingen: ${getComputedStyle(
            document.documentElement
          )
            .getPropertyValue("--radius")
            .trim()}</span>
          <span class="badge--accent">Transities: ${getComputedStyle(
            document.documentElement
          )
            .getPropertyValue("--transition")
            .trim()}</span>
        </div>
        <p class="muted">Later kun je hier bijvoorbeeld “compacte layout”, “reduced motion”, “taal” enz. toevoegen.</p>
      </div>
    </section>
  `;

  // Theme toggle
  const toggle = mount.querySelector("#theme-toggle");
  toggle?.addEventListener("change", (e) => {
    const next = e.target.checked ? "light" : "dark";
    setTheme(next);
  });

  // System mode
  mount.querySelector("#system-mode")?.addEventListener("click", () => {
    setTheme("system");
    // UI state syncen
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    toggle.checked = prefersLight;
  });

  // Accent swatches
  const group = mount.querySelector("#accent-swatches");
  group?.addEventListener("click", (e) => {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    const color = btn.dataset.color;
    setAccent(color);
    // aria-checked bijwerken
    group
      .querySelectorAll(".swatch")
      .forEach((w) => w.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
  });
}

function resolveChecked(theme) {
  if (theme === "system") {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    );
  }
  return theme === "light";
}
