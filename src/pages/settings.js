// src/pages/settings.js
import {
  getSettings,
  setTheme,
  setAccent,
  ACCENTS,
  setFontSizeFactor,
  setAccessibilityFont,
} from "../lib/settings.js";

export function renderSettingsPage(mount) {
  const s = getSettings();

  mount.innerHTML = `
    <section class="settings">
      <div class="card">
        <h2>App-thema</h2>
        <div class="row">
          <span>Dark</span>
          <label class="switch">
            <input id="theme-toggle" type="checkbox" ${
              resolveChecked(s.theme) ? "checked" : ""
            } />
            <span class="slider"></span>
          </label>
          <span>Light</span>
          <button class="btn" id="system-mode" title="Volg systeemvoorkeur">Systeem</button>
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
        <h2>Tekstgrootte</h2>
        <div class="row" id="font-size-group" role="radiogroup" aria-label="Tekstgrootte">
          <button class="btn" data-f="1" aria-checked="${
            s.fontSizeFactor === 1
          }">Standaard (aanbevolen)</button>
          <button class="btn" data-f="1.3" aria-checked="${
            s.fontSizeFactor === 1.3
          }">Groot</button>
        </div>
        
      </div>

      <div class="card">
        <h2>Lettertype</h2>
        <div class="row" id="a11y-font-group" role="radiogroup" aria-label="Lettertype">
          <button class="btn" data-font="default" aria-checked="${
            s.accessibilityFont !== "dyslexic"
          }">Standaard (aanbevolen)</button>
          <button style="font-family: 'Open-Dyslexic';" class="btn" data-font="dyslexic" aria-checked="${
            s.accessibilityFont === "dyslexic"
          }">Dyslexic</button>
        </div>
      </div>
    </section>
  `;

  // Thema
  const toggle = mount.querySelector("#theme-toggle");
  toggle?.addEventListener("change", (e) => {
    setTheme(e.target.checked ? "light" : "dark");
  });
  mount.querySelector("#system-mode")?.addEventListener("click", () => {
    setTheme("system");
    const prefersLight = window.matchMedia?.(
      "(prefers-color-scheme: light)"
    )?.matches;
    if (toggle) toggle.checked = !!prefersLight;
  });

  // Accent
  const groupAccent = mount.querySelector("#accent-swatches");
  groupAccent?.addEventListener("click", (e) => {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    const color = btn.dataset.color;
    setAccent(color);
    groupAccent
      .querySelectorAll(".swatch")
      .forEach((w) => w.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
  });

  // Tekstgrootte
  const groupSize = mount.querySelector("#font-size-group");
  groupSize?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-f]");
    if (!btn) return;
    const factor = parseFloat(btn.dataset.f);
    setFontSizeFactor(factor);
    groupSize
      .querySelectorAll("button[data-f]")
      .forEach((b) => b.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
  });

  // Leesbaar lettertype
  const groupA11y = mount.querySelector("#a11y-font-group");
  groupA11y?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-font]");
    if (!btn) return;
    const mode = btn.dataset.font; // "default" | "dyslexic"
    setAccessibilityFont(mode);
    groupA11y
      .querySelectorAll("button[data-font]")
      .forEach((b) => b.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
  });
}

function resolveChecked(theme) {
  if (theme === "system") {
    return window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  }
  return theme === "light";
}
