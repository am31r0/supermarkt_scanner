// src/lib/cpi.js
let DB = { AH: [], DIRK: [], JUMBO: [] };
let READY = false;

/**
 * Init engine met JSON van supermarkten
 */
export async function initEngine({ ah, dirk, jumbo }, { onReady } = {}) {
  DB.AH = ah;
  DB.DIRK = dirk;
  DB.JUMBO = jumbo;
  READY = true;
  if (onReady) onReady();
}

/**
 * Heel simpele query → intent + disambiguation
 */
export function matchQuery(query) {
  const q = query.trim().toLowerCase();
  let needsDisambiguation = false;
  let intent = { entity: q };

  // voorbeeldregels
  let suggestions = [];
  if (q.includes("aardbei")) {
    needsDisambiguation = true;
    suggestions = [
      { label: "Vers", mutate: { preparation: "vers", category: "fruit" } },
      {
        label: "Diepvries",
        mutate: { preparation: "diepvries", category: "fruit" },
      },
      {
        label: "Yoghurt",
        mutate: { preparation: "yoghurt", category: "zuivel" },
      },
    ];
  }
  if (q.includes("banaan")) {
    needsDisambiguation = true;
    suggestions = [
      {
        label: "Losse banaan",
        mutate: { preparation: "vers", category: "fruit" },
      },
      { label: "Tros", mutate: { preparation: "tros", category: "fruit" } },
      {
        label: "Milkshake",
        mutate: { preparation: "drank", category: "zuivel" },
      },
    ];
  }

  return { intent, suggestions, needsDisambiguation };
}

/**
 * Zoek per supermarkt de beste match voor intent
 */
export function resolveBest(intent) {
  if (!READY) throw new Error("Engine not ready.");
  const chains = ["AH", "JUMBO", "DIRK"];
  const out = {};
  for (const chain of chains) {
    const pool = DB[chain];
    out[chain] =
      pool.find(
        (p) =>
          p.name.toLowerCase().includes(intent.entity) &&
          (!intent.preparation ||
            p.name.toLowerCase().includes(intent.preparation))
      ) || null;
  }
  return out;
}
