// src/lib/constants.js

// -------------------------
// Categorie volgorde
// -------------------------
export const CATEGORY_ORDER = [
  "produce",
  "dairy",
  "meat_fish_veg",
  "bakery",
  "frozen",
  "snacks",
  "pantry",
  "other",
];

// -------------------------
// Labels voor categorieën
// -------------------------
export const CATEGORY_LABELS = {
  produce: "Groente & fruit",
  dairy: "Zuivel",
  meat_fish_veg: "Vlees / Vis / Vega",
  bakery: "Bakkerij",
  frozen: "Diepvries",
  snacks: "Snacks",
  pantry: "Voorraad / Conserven",
  other: "Overig",
};

// -------------------------
// Kleuren per supermarkt
// -------------------------
export const STORE_COLORS = {
  ah: "#2d9ee1",
  jumbo: "#e7bb33",
  dirk: "#e92a2a",
  aldi: "#1b3a94", // iets helderder blauw dan #262977, beter zichtbaar op lichte UI
  hoogvliet: "#4ec5fc",
  other: "#777777",
};

// -------------------------
// Labels per supermarkt
// -------------------------
export const STORE_LABEL = {
  ah: "AH",
  jumbo: "Jumbo",
  dirk: "Dirk",
  aldi: "Aldi",
  hoogvliet: "Hoogvliet",
  other: "Overig",
};

// -------------------------
// Stores in vaste volgorde
// -------------------------
export const STORE_ORDER = ["ah", "jumbo", "dirk", "aldi", "hoogvliet", "other"];
