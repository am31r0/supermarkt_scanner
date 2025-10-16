import requests
import json
import time
from pathlib import Path

# ============== CONFIG ==============
PROFILE_KEY = "ilz5NyBRAhbjN0i5ZUtWNDtbL8ESWaFCRqB4JOytYCzlRw=="
CLIENT_ID = "999999-100"  # vaste prefix + hoofdcategorie-id
NAV_ID = "ed681b01"
BASE = "https://navigator-group1.tweakwise.com/navigation"
ORIGIN = "https://www.hoogvliet.com"
PAGE_SIZE = 48
THROTTLE = 0.25
MAX_RETRIES = 3
INTERSHOP_ENDPOINT = "https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ProcessTWProducts-GetTWProductsBySkus"

# Nieuwe outputlocatie
OUT_DIR = Path("dev/store_database")
OUT_DIR.mkdir(parents=True, exist_ok=True)
FINAL_PATH = OUT_DIR / "hoogvliet.json"

# ============== HTTP HELPERS ==============
def _post(url, attempt=1):
    headers = {"Origin": ORIGIN, "Referer": ORIGIN + "/", "Accept": "*/*"}
    try:
        r = requests.post(url, headers=headers, timeout=25)
        if r.status_code != 200:
            raise Exception(f"HTTP {r.status_code}")
        return r.json()
    except Exception as e:
        if attempt < MAX_RETRIES:
            time.sleep(attempt)
            return _post(url, attempt + 1)
        print(f"[!] Fout bij {url}: {e}")
        return None

def _get(url, attempt=1):
    try:
        r = requests.get(url, timeout=25)
        if r.status_code != 200:
            raise Exception(f"HTTP {r.status_code}")
        return r.json()
    except Exception as e:
        if attempt < MAX_RETRIES:
            time.sleep(attempt)
            return _get(url, attempt + 1)
        print(f"[!] GET fout: {e} → {url}")
        return None

def safe_float(v):
    try:
        return float(str(v).replace(",", "."))
    except Exception:
        return None

# ============== CORE LOGIC ==============
def discover_categories():
    """
    Lees alle hoofdcategorieën uit de 'Categorie'-facet (te vinden in elke categorie-response).
    We halen ze op via een bekende categorie (100 = AGF), want daarin zit de volledige facetlijst.
    """
    url = (f"{BASE}/{NAV_ID}?tn_q=&tn_p=1&tn_ps=1&tn_sort=Relevantie"
           f"&tn_profilekey={PROFILE_KEY}"
           f"&tn_cid={CLIENT_ID}"
           f"&CatalogPermalink=producten"
           f"&format=json"
           f"&tn_parameters=ae-productorrecipe=product")
    data = _post(url)
    cats = []
    for facet in (data or {}).get("facets", []):
        title = facet.get("facetsettings", {}).get("title")
        if (title or "").lower() == "categorie":
            for a in facet.get("attributes", []):
                u = a.get("url") or ""
                if "999999-" in u:
                    cat_id = u.split("999999-")[-1]
                    cats.append({"id": cat_id, "name": a.get("title")})
    seen = set()
    unique = []
    for c in cats:
        if c["id"] not in seen:
            seen.add(c["id"])
            unique.append(c)
    print(f"✅ {len(unique)} hoofdcategorieën gevonden.")
    for c in unique:
        print(f" - {c['id']:>6} → {c['name']}")
    return unique

def choose_prices(raw):
    list_price = safe_float(raw.get("listPrice") or raw.get("listprice"))
    discounted = safe_float(raw.get("discountedPrice") or raw.get("discountprice"))
    price_field = safe_float(raw.get("price"))

    promo = None
    base = None

    if discounted is not None:
        promo = discounted

    if list_price is not None:
        base = list_price
    elif price_field is not None:
        if promo is not None and price_field > promo:
            base = price_field
        else:
            base = price_field

    if base is not None and promo is not None and abs(base - promo) < 1e-6:
        promo = None

    return base, promo

def normalize_item(raw, category_name, cat_id):
    base, promo = choose_prices(raw)
    link = raw.get("url") or ""
    if link and not link.startswith("http"):
        link = f"https://www.hoogvliet.com{link}"

    return {
        "id": str(raw.get("itemno") or raw.get("sku") or ""),
        "sku": str(raw.get("sku") or raw.get("itemno") or ""),
        "title": raw.get("title") or raw.get("name") or "",
        "category": category_name,
        "categoryHierarchy": raw.get("categoryHierarchy") or category_name,
        "price": base,
        "promoPrice": promo,
        "unit": raw.get("baseUnit"),
        "price_per_unit": None,
        "image": raw.get("image") or raw.get("imageurl"),
        "beschikbaar": bool(raw.get("availability", True)),
        "promoEnd": None,
        "link": link,
        "tn_cid": cat_id,
    }

def scrape_category(cat):
    cat_id = cat["id"]
    cat_name = cat["name"]
    results = []
    page = 1
    empty_pages = 0

    while True:
        url = (f"{BASE}/{NAV_ID}?tn_q=&tn_p={page}&tn_ps={PAGE_SIZE}&tn_sort=Relevantie"
               f"&tn_profilekey={PROFILE_KEY}"
               f"&tn_cid=999999-{cat_id}"
               f"&CatalogPermalink=producten"
               f"&format=json"
               f"&tn_parameters=ae-productorrecipe=product")
        time.sleep(THROTTLE)
        data = _post(url)
        if not data:
            print(f"[!] Geen data bij pagina {page} voor {cat_name}")
            break

        items = data.get("items", [])
        props = data.get("properties", {})
        total_pages = int(props.get("nrofpages") or 0)

        if not items:
            empty_pages += 1
            if empty_pages >= 3:
                break
        else:
            empty_pages = 0
            for it in items:
                results.append(normalize_item(it, cat_name, cat_id))
            print(f"  ↳ {cat_name} p{page}: +{len(items)} (totaal {len(results)})")

        if total_pages and page >= total_pages:
            break
        page += 1

    return results

# ============== ENRICHMENT VIA INTERSHOP ==============
def enrich_with_intershop(items):
    sku_to_idx = {}
    skus = []
    for i, it in enumerate(items):
        sku = it.get("sku") or it.get("id")
        if sku and sku not in sku_to_idx:
            sku_to_idx[sku] = []
            skus.append(sku)
        if sku:
            sku_to_idx[sku].append(i)

    BATCH = 40
    for start in range(0, len(skus), BATCH):
        chunk = skus[start:start + BATCH]
        url = f"{INTERSHOP_ENDPOINT}?products={','.join(chunk)}"
        data = _get(url)
        if not isinstance(data, list):
            continue

        for prod in data:
            sku = str(prod.get("sku") or "")
            if not sku or sku not in sku_to_idx:
                continue

            list_price = safe_float(prod.get("listPrice") or prod.get("listprice"))
            discounted = safe_float(prod.get("discountedPrice") or prod.get("discountprice"))

            # ✅ Promotiedata ophalen
            promo_start = None
            promo_end = None
            promos = prod.get("promotions") or []
            if promos:
                promo_start = promos[0].get("validFrom") or promos[0].get("startDate")
                promo_end = promos[0].get("validTo") or promos[0].get("endDate")

            for idx in sku_to_idx[sku]:
                # prijzen actualiseren
                if list_price is not None:
                    items[idx]["price"] = list_price
                if discounted is not None:
                    items[idx]["promoPrice"] = discounted
                if (
                    items[idx]["price"] is not None
                    and items[idx]["promoPrice"] is not None
                    and abs(items[idx]["price"] - items[idx]["promoPrice"]) < 1e-6
                ):
                    items[idx]["promoPrice"] = None

                # ✅ promoStart / promoEnd toevoegen
                if promo_start:
                    items[idx]["promoStart"] = promo_start
                if promo_end:
                    items[idx]["promoEnd"] = promo_end

    return items

# ============== MAIN ==============
def main():
    print("⏳ Categorieën ophalen...")
    cats = discover_categories()

    all_items = []
    seen_ids = set()

    for cat in cats:
        print(f"\n📦 Scrapen categorie: {cat['name']}")
        batch = scrape_category(cat)
        for it in batch:
            iid = it.get("id")
            if iid and iid in seen_ids:
                continue
            seen_ids.add(iid)
            all_items.append(it)

    print("\n🔄 Verrijken met Intershop (discountedPrice/listPrice/promotions)...")
    all_items = enrich_with_intershop(all_items)

    # Finale output naar juiste map
    with open(FINAL_PATH, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)

    print(f"\n🏁 {len(all_items)} unieke producten opgeslagen in {FINAL_PATH}")

if __name__ == "__main__":
    main()
