// src/lib/dataLoader.js
// =============================================
// Centrale datalaag: laadt supermarktdata + init engine
// =============================================

import { loadJSONOncePerDay } from "./cache.js";
import { normalizeAll } from "./matching.js";
import { initEngine } from "./cpi.js";

let loadedData = null;
let engineInitialized = false;

/**
 * Haalt alle supermarktdata (AH, Jumbo, Dirk, Aldi) op en normaliseert deze.
 * Gebruikt IndexedDB via loadJSONOncePerDay.
 * Wordt slechts één keer uitgevoerd per sessie.
 */
export async function ensureDataLoaded() {
  // Als we al data hebben, gebruik die direct
  if (loadedData) return loadedData;

  console.log("[DATA] Laden supermarktdata...");

  const [ahRaw, dirkRaw, jumboRaw, aldiRaw, hoogvlietRaw] = await Promise.all([
    loadJSONOncePerDay(
      "ah",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/ah.json"
    ),
    loadJSONOncePerDay(
      "dirk",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/dirk.json"
    ),
    loadJSONOncePerDay(
      "jumbo",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/jumbo.json"
    ),
    loadJSONOncePerDay(
      "aldi",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/aldi.json"
    ),
    loadJSONOncePerDay(
      "hoogvliet",
      "https://am31r0.github.io/supermarkt_scanner/dev/store_database/hoogvliet.json"
    )
  ]);

  const allProducts = normalizeAll({
    ah: ahRaw,
    dirk: dirkRaw,
    jumbo: jumboRaw,
    aldi: aldiRaw,
    hoogvliet: hoogvlietRaw,
  });

  loadedData = { ahRaw, dirkRaw, jumboRaw, aldiRaw, hoogvlietRaw, allProducts };

  console.log(`[DATA] ${allProducts.length} producten geladen`);
  return loadedData;
}

/**
 * Initialiseert de CPI-engine, slechts één keer per sessie.
 */
export async function ensureEngineReady() {
  if (engineInitialized) return;

  const { ahRaw, dirkRaw, jumboRaw, aldiRaw, hoogvlietRaw } = await ensureDataLoaded();
  await initEngine({
    ah: ahRaw,
    dirk: dirkRaw,
    jumbo: jumboRaw,
    aldi: aldiRaw,
    hoogvliet: hoogvlietRaw,
  });

  engineInitialized = true;
  console.log("[CPI] Engine geïnitialiseerd");
}

/**
 * Haalt direct alle producten op die al zijn geladen.
 * Handig voor componenten die geen async willen gebruiken.
 */
export function getAllProductsSync() {
  return loadedData?.allProducts || [];
}
