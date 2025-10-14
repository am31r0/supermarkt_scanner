// =============================================
// Tutorial Popup Logic (met cookie fallback)
// =============================================

const LS_KEY = "schappie_tutorial_seen_v1";

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

function hasSeenTutorial() {
  try {
    const localVal = localStorage.getItem(LS_KEY);
    if (localVal === "true") return true;
  } catch (e) {}

  const cookieVal = getCookieValue("tutorial_seen");
  return cookieVal === "true";
}

function markSeen() {
  try {
    localStorage.setItem(LS_KEY, "true");
  } catch (e) {}
  setCookie("tutorial_seen", "true");
}

/* -----------------------------
   Exports
----------------------------- */

// Alleen tonen als user het nog nooit gezien heeft
export function shouldShowTutorialOnce() {
  return !hasSeenTutorial();
}

// Markeer als gezien
export function markTutorialShown() {
  markSeen();
}
