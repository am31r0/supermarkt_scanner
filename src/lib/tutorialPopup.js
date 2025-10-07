// src/lib/tutorialPopup.js
// =============================================
// Tutorial Popup Logic
// =============================================

const LS_KEY = "sms_tutorial_last_shown";

export function shouldShowTutorialToday() {
  const last = localStorage.getItem(LS_KEY);
  if (!last) return true;
  const today = new Date().toDateString();
  return last !== today;
}

export function markTutorialShown() {
  const today = new Date().toDateString();
  localStorage.setItem(LS_KEY, today);
}
