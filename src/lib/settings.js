// src/lib/settings.js
const LS_KEY = "sms_settings";

export const ACCENTS = [
  "#3f7540", // groen (default)
  "#0070f3", // blauw
  "#ff4d4f", // rood
  "#ff8c00", // oranje
  "#8a2be2", // paars
  "#00b894", // teal
  "#ff2d55", // pink
];

const DEFAULTS = {
  theme: "dark", // "dark" | "light" | "system"
  accent: ACCENTS[0],
  fontSizeFactor: 1, // 1 of 1.3
  accessibilityFont: "default", // "default" | "dyslexic"
};

let state = null;

/* -------------------- helpers -------------------- */
function load() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(LS_KEY)) || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function prefers() {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}
function updateThemeColorMeta() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  const bg =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--bg")
      .trim() || "#121212";
  meta.setAttribute("content", bg);
}

/* -------------------- appliers -------------------- */
function applyTheme(theme) {
  const resolved = theme === "system" ? prefers() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  updateThemeColorMeta();
}
function applyAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
}
function applyFontSizeFactor(factor) {
  // factor als string zetten i.v.m. calc()
  document.documentElement.style.setProperty(
    "--font-size-factor",
    String(factor)
  );
}
function ensureDyslexicLink() {
  if (document.querySelector('link[data-font="open-dyslexic"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.cdnfonts.com/css/open-dyslexic";
  link.setAttribute("data-font", "open-dyslexic");
  document.head.appendChild(link);
}
function applyAccessibilityFont(mode) {
  if (mode === "dyslexic") {
    ensureDyslexicLink();
    document.documentElement.style.setProperty(
      "--font-family-accessibility",
      "Open-Dyslexic"
    );
  } else {
    document.documentElement.style.setProperty(
      "--font-family-accessibility",
      "Inter, sans-serif"
    );
  }
}

/* -------------------- lifecycle -------------------- */
export function initSettings() {
  state = load();
  applyTheme(state.theme);
  applyAccent(state.accent);
  applyFontSizeFactor(state.fontSizeFactor);
  applyAccessibilityFont(state.accessibilityFont);
  updateThemeColorMeta();

  const mq = window.matchMedia?.("(prefers-color-scheme: light)");
  mq?.addEventListener?.("change", () => {
    if (state.theme === "system") applyTheme("system");
  });
}

/* -------------------- API -------------------- */
export function getSettings() {
  return { ...state };
}

export function setTheme(next) {
  state.theme = next;
  applyTheme(state.theme);
  save();
  broadcast();
}

export function setAccent(color) {
  state.accent = color;
  applyAccent(state.accent);
  save();
  broadcast();
}

export function setFontSizeFactor(factor) {
  state.fontSizeFactor = factor; // 1 of 1.3
  applyFontSizeFactor(state.fontSizeFactor);
  save();
  broadcast();
}

export function setAccessibilityFont(mode) {
  state.accessibilityFont = mode; // "default" | "dyslexic"
  applyAccessibilityFont(state.accessibilityFont);
  save();
  broadcast();
}

/* -------------------- pub/sub -------------------- */
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function broadcast() {
  for (const fn of listeners) fn(getSettings());
}
