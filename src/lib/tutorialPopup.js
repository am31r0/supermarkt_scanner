// src/lib/tutorialPopup.js
// =============================================
// Tutorial Popup Logic
// =============================================

const LS_KEY = "sms_tutorial_seen";

export function shouldShowTutorialOnce() {
  // Toon alleen als de flag nog niet bestaat
  return !localStorage.getItem(LS_KEY);
}

export function markTutorialShown() {
  // Flag zetten zodat het nooit meer getoond wordt
  localStorage.setItem(LS_KEY, "true");
}

// Show the tutorial popup if it should be shown
