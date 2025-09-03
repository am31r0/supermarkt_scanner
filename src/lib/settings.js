// src/lib/settings.js
const LS_KEY = "sms_settings";

// Vooraf gekozen accentkleuren (voel je vrij om aan te vullen)
export const ACCENTS = [
  "#3f7540", // groen (jouw huidige)
  "#0070f3", // blauw
  "#ff4d4f", // rood
  "#ff8c00", // oranje
  "#8a2be2", // paars
  "#00b894", // teal
  "#ff2d55", // pink
];

const DEFAULTS = {
  theme: "dark", // "dark" | "light" | "system" (optioneel)
  accent: ACCENTS[0],
};

let state = load();
apply(state);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function applyTheme(theme) {
  const html = document.documentElement;
  const resolved = theme === "system" ? prefers() : theme;
  html.setAttribute("data-theme", resolved);
  updateThemeColorMeta();
}
function applyAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
  // optioneel: contrastkleur tunen als je lichte accenten kiest
}

function prefers() {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function updateThemeColorMeta() {
  // Zorgt dat browser UI (adresbalk) matcht
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();
  meta.setAttribute("content", bg || "#000000");
}

// Public API
export function getSettings() {
  return { ...state };
}

export function setTheme(nextTheme) {
  state.theme = nextTheme; // "dark" | "light" | "system"
  applyTheme(state.theme);
  save();
  broadcast();
}

export function setAccent(nextAccent) {
  state.accent = nextAccent;
  applyAccent(state.accent);
  save();
  broadcast();
}

// Re-apply on page load (in case this module loads before DOM ready)
export function initSettings() {
  apply(state);
  // System changes live volgen (alleen als "system" gebruikt wordt)
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", () => {
      if (state.theme === "system") applyTheme("system");
    });
  }
}

function apply(s) {
  applyTheme(s.theme);
  applyAccent(s.accent);
  updateThemeColorMeta();
}

// Simple pub/sub voor UI updates
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function broadcast() {
  for (const fn of listeners) fn(getSettings());
}
