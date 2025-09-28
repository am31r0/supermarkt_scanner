// src/lib/cache.js
// =============================================
// IndexedDB cache voor supermarkt JSON data
// =============================================

const DB_NAME = "sms_cache_db";
const STORE_NAME = "json_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 dag in ms

// Detecteer hard reload / nieuw tab
const IS_HARD_RELOAD = !sessionStorage.getItem("sms_session_loaded");
sessionStorage.setItem("sms_session_loaded", "true");

// ---------- IndexedDB Helpers ----------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToDB(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, ...value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearDB(key = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    if (key) {
      store.delete(key);
    } else {
      store.clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Publieke functies ----------

/**
 * Haal JSON op, maximaal 1x per dag uit server, anders uit cache
 * @param {string} key Unieke cache key (bv. "ah")
 * @param {string} url JSON url (bv. "/data/ah.json")
 * @param {boolean} forceRefresh Als true, altijd opnieuw fetchen
 */
export async function loadJSONOncePerDay(key, url, forceRefresh = false) {
  const cached = await getFromDB(key);

  if (!forceRefresh && cached) {
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;

    // ✅ Hard reload? -> altijd verse fetch
    if (!isExpired && !IS_HARD_RELOAD && cached.data) {
      console.log(`[CACHE] Loaded ${key} from IndexedDB`);
      return cached.data;
    }
  }

  // 🔄 Vers ophalen
  console.log(`[CACHE] Fetching fresh ${key} from ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();

  // Opslaan in cache
  await saveToDB(key, { timestamp: Date.now(), data });

  return data;
}

/**
 * Cache legen (1 key of alles)
 */
export async function clearCache(key = null) {
  await clearDB(key);
  console.log(`[CACHE] Cleared ${key || "all"} cache`);
}
