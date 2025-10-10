import requests, json, time
from datetime import datetime

# ---------- CONFIG ----------
APP_ID = "2HU29PF6BH"
API_KEY = "686cf0c8ddcf740223d420d1115c94c1"
ALGOLIA_URL = f"https://{APP_ID.lower()}-dsn.algolia.net/1/indexes/*/queries"
OUTPUT_FILE = "aldi_all.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/141.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://www.aldi.nl",
    "Referer": "https://www.aldi.nl/",
    "x-algolia-application-id": APP_ID,
    "x-algolia-api-key": API_KEY,
}

# ---------- CATEGORY NORMALIZATION ----------
CATEGORY_MAP = {
    "aardappelen": "Groente, aardappelen",
    "groente": "Groente, aardappelen",
    "fruit": "Groente, aardappelen",
    "agf": "Groente, aardappelen",
    "vlees": "Vlees, vis, vega",
    "vis": "Vlees, vis, vega",
    "vega": "Vlees, vis, vega",
    "vegetarisch": "Vlees, vis, vega",
    "brood": "Brood, ontbijtgranen",
    "bakkerij": "Brood, ontbijtgranen",
    "ontbijt": "Brood, ontbijtgranen",
    "ontbijtgranen": "Brood, ontbijtgranen",
    "zuivel": "Zuivel, eieren",
    "yoghurt": "Zuivel, eieren",
    "kaas": "Zuivel, eieren",
    "melk": "Zuivel, eieren",
    "boter": "Zuivel, eieren",
    "eieren": "Zuivel, eieren",
    "sappen-frisdrank": "Frisdrank, sappen",
    "frisdrank": "Frisdrank, sappen",
    "sap": "Frisdrank, sappen",
    "dranken": "Frisdrank, sappen",
    "bier": "Bier, wijn, sterke drank",
    "wijn": "Bier, wijn, sterke drank",
    "alcohol": "Bier, wijn, sterke drank",
    "koffie": "Koffie, thee",
    "thee": "Koffie, thee",
    "thee-koffie": "Koffie, thee",
    "snoep": "Snoep, koek, chips",
    "chips": "Snoep, koek, chips",
    "snacks": "Snoep, koek, chips",
    "koeken": "Snoep, koek, chips",
    "diepvries": "Diepvries",
    "maaltijden": "Maaltijden, salades",
    "salades": "Maaltijden, salades",
    "soepen": "Maaltijden, salades",
    "pasta": "Maaltijden, salades",
    "baby": "Baby, verzorging",
    "verzorging": "Baby, verzorging",
    "drogisterij": "Verzorging, gezondheid",
    "gezondheid": "Verzorging, gezondheid",
    "huishouden": "Huishouden",
    "schoonmaak": "Huishouden",
    "nonfood": "Huishouden",
    "huisdieren": "Huisdieren",
    "dieren": "Huisdieren",
    "dierenvoer": "Huisdieren",
    "tuin": "Huis, tuin en seizoen",
    "seizoen": "Huis, tuin en seizoen",
    "feest": "Huis, tuin en seizoen",
    "biologisch": "Biologisch assortiment",
    "speciaal": "Speciaal assortiment",
}

def normalize(s):
    return s.lower().replace("_", "-").replace("&", "en").strip()

def map_category(hit):
    candidates = []
    if hit.get("mainCategoryID"):
        candidates.append(hit["mainCategoryID"])
    candidates.extend(hit.get("categoryIDs", []))
    for level in ("lvl1", "lvl0"):
        for lbl in hit.get("hierarchicalCategories", {}).get(level, []) or []:
            candidates.append(lbl)
    for c in candidates:
        c_norm = normalize(c)
        for key, val in CATEGORY_MAP.items():
            if key in c_norm:
                return val
    # heuristische fallback op productnaam
    name = hit.get("name", "").lower()
    if any(x in name for x in ["melk", "kaas", "yoghurt", "boter"]):
        return "Zuivel, eieren"
    if any(x in name for x in ["appel", "banaan", "groente", "aardappel"]):
        return "Groente, aardappelen"
    if any(x in name for x in ["vis", "kip", "gehakt", "worst"]):
        return "Vlees, vis, vega"
    if any(x in name for x in ["koek", "chips", "snoep", "reep"]):
        return "Snoep, koek, chips"
    if any(x in name for x in ["bier", "wijn", "cola", "fanta", "sap"]):
        return "Frisdrank, sappen"
    if any(x in name for x in ["koffie", "thee"]):
        return "Koffie, thee"
    if any(x in name for x in ["wasmiddel", "doekjes", "toilet"]):
        return "Huishouden"
    return "Speciaal assortiment"

def format_price_per_unit(hit):
    base = (hit.get("currentPrice") or {}).get("basePrice") or []
    if base and isinstance(base, list):
        bp = base[0]
        val = bp.get("basePriceValue")
        scale = bp.get("basePriceScale", "").upper()
        if val and scale:
            try:
                return round(float(val), 2), scale
            except Exception:
                return None, None
    return None, None

def convert_hit(hit):
    price = (hit.get("currentPrice") or {}).get("priceValue")
    promo_price = None
    promo_until = None

    promo = hit.get("promotionPrices")
    if promo and isinstance(promo, list) and len(promo) > 0:
        p = promo[0]
        promo_price = p.get("priceValue")
        ts = p.get("validUntil")
        if ts:
            try:
                promo_until = datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m-%d")
            except Exception:
                promo_until = None

    image_url = None
    for asset in hit.get("assets", []) or []:
        if asset.get("type") == "primary" and asset.get("url"):
            image_url = asset["url"]
            break
    if not image_url and hit.get("assets"):
        image_url = hit["assets"][0].get("url")

    brand = hit.get("brandName")
    name = hit.get("name", "Onbekend product")
    unit = hit.get("salesUnit", "")
    title = f"{brand} {name}".strip() if brand else name
    price_per_unit, unit_scale = format_price_per_unit(hit)

    return {
        "id": hit.get("objectID"),
        "title": f"{title} {unit}".strip(),
        "category": map_category(hit),
        "price": price,
        "promoPrice": promo_price,
        "price_per_unit": price_per_unit,
        "unit": unit_scale,
        "image": image_url,
        "beschikbaar": hit.get("isAvailable", True),
        "promoEnd": promo_until,
        "link": f"https://www.aldi.nl/{hit.get('productSlug')}.html" if hit.get("productSlug") else None,
    }

def fetch_page(page, hits_per_page=500):
    payload = {
        "requests": [
            {
                "indexName": "an_prd_nl_nl_products2",
                "params": f"hitsPerPage={hits_per_page}&page={page}&query="
            }
        ]
    }
    for attempt in range(3):
        try:
            resp = requests.post(ALGOLIA_URL, headers=HEADERS, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json().get("results", [{}])[0]
                return data.get("hits", [])
            else:
                print(f"⚠️ Page {page}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"⚠️ Page {page}: {e}")
        time.sleep(1)
    return []

def fetch_all():
    all_products = []
    page = 0
    empty_streak = 0
    while True:
        hits = fetch_page(page)
        if not hits:
            empty_streak += 1
            print(f"⚠️ Page {page} returned 0 results ({empty_streak}/3)")
            if empty_streak >= 3:
                print("🛑 Stopping after 3 consecutive empty pages.")
                break
        else:
            empty_streak = 0
            converted = [convert_hit(h) for h in hits]
            all_products.extend(converted)
            print(f"✅ Page {page}: {len(converted)} products added (total {len(all_products)})")
        page += 1
        time.sleep(0.5)
    return all_products

if __name__ == "__main__":
    print("🚀 Starting Aldi full scraper...")
    products = fetch_all()
    print(f"✨ Finished. Total collected: {len(products)} products.")
    if products:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        print(f"💾 Saved to {OUTPUT_FILE}")
    else:
        print("⚠️ No products collected!")
