import requests
import json
import time
import random
import os
from datetime import datetime

URL = "https://www.jumbo.com/api/graphql"

# Query met promotie-info (start/end met dag, datum, maand)
QUERY = """
query SearchProducts($input: ProductSearchInput!) {
  searchProducts(input: $input) {
    products {
      id: sku
      title
      category: rootCategory
      image
      prices: price {
        price
        promoPrice
        pricePerUnit {
          price
          unit
        }
      }
      availability {
        isAvailable
      }
      promotions {
        start { dayShort date monthShort }
        end { dayShort date monthShort }
      }
    }
  }
}
"""

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Origin": "https://www.jumbo.com",
    "Referer": "https://www.jumbo.com/"
}

# Config
TOTAL_PRODUCTS = 17403
PAGE_SIZE = 24
TOTAL_PAGES = (TOTAL_PRODUCTS + PAGE_SIZE - 1) // PAGE_SIZE
BATCH_SIZE = 1000
RESUME_FILE = "resume.txt"

OUTPUT_DIR = "dev/store_database"
os.makedirs(OUTPUT_DIR, exist_ok=True)
FINAL_PATH = os.path.join(OUTPUT_DIR, "jumbo.json")


# ---------- Helpers ----------

def format_price(value):
    """Converteer int centen (bv. 1399) naar euro-decimaal (13.99)."""
    if value is None:
        return None
    s = str(value)
    if len(s) <= 2:
        return float("0." + s.zfill(2))
    return float(f"{s[:-2]}.{s[-2:]}")


def extract_promo_dates(promotions):
    """Extraheer leesbare promoStart/promoEnd uit Jumbo's promotions[] veld."""
    if not promotions or not isinstance(promotions, list):
        return None, None
    first = promotions[0]
    if not first:
        return None, None

    start = first.get("start") or {}
    end = first.get("end") or {}

    promo_start = " ".join(filter(None, [start.get("dayShort"), start.get("date"), start.get("monthShort")]))
    promo_end = " ".join(filter(None, [end.get("dayShort"), end.get("date"), end.get("monthShort")]))
    return promo_start or None, promo_end or None


def fetch_page(offset, max_retries=3):
    """Haal één pagina op met retries en kleine backoff."""
    variables = {
        "input": {
            "searchType": "category",
            "searchTerms": "producten",
            "friendlyUrl": "",
            "offSet": offset,
            "currentUrl": "/producten/",
            "previousUrl": "",
            "bloomreachCookieId": ""
        }
    }
    payload = {"query": QUERY, "variables": variables}

    for attempt in range(1, max_retries + 1):
        try:
            res = requests.post(URL, json=payload, headers=HEADERS, timeout=30)
            if res.status_code != 200:
                print(f"❌ HTTP {res.status_code}: {res.text[:200]}")
                time.sleep(random.uniform(1, 2) * attempt)
                continue
            data = res.json()
            if "errors" in data:
                print("❌ GraphQL error:", json.dumps(data["errors"], indent=2))
                time.sleep(random.uniform(1, 2) * attempt)
                continue
            return data["data"]["searchProducts"]["products"] or []
        except requests.RequestException as e:
            print(f"❌ Request exception: {e}")
            time.sleep(random.uniform(1, 2) * attempt)
    return []


def save_batch(batch_number, products):
    """Schrijf batchbestand weg."""
    filename = os.path.join(OUTPUT_DIR, f"jumbo_batch_{batch_number:02d}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(products)} products to {filename}")
    return filename


def save_full(products):
    """Schrijf eindbestand."""
    filename = FINAL_PATH
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    print(f"🏁 Full export saved: {filename} ({len(products)} products)")
    return filename


# ---------- Main ----------

def scrape_all():
    full_products = []
    batch_buffer = []
    batch_number = 1

    start_page = 0
    if os.path.exists(RESUME_FILE):
        try:
            with open(RESUME_FILE, "r") as f:
                start_page = int(f.read().strip())
            print(f"🔄 Resuming from page {start_page + 1}/{TOTAL_PAGES}")
        except Exception:
            start_page = 0

    total_scraped = 0

    for page in range(start_page, TOTAL_PAGES):
        offset = page * PAGE_SIZE
        print(f"📦 Fetching page {page + 1}/{TOTAL_PAGES} (offset {offset})...")

        products = fetch_page(offset)
        if not products:
            print("⚠️ Page returned 0 products. Continuing...")
        else:
            for p in products:
                promo_start, promo_end = extract_promo_dates(p.get("promotions"))
                prices = p.get("prices") or {}

                item = {
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "category": p.get("category"),
                    "price": format_price(prices.get("price")),
                    "promoPrice": format_price(prices.get("promoPrice")),
                    "price_per_unit": (
                        prices["pricePerUnit"]["price"] / 100
                        if prices.get("pricePerUnit") and prices["pricePerUnit"].get("price") is not None
                        else None
                    ),
                    "unit": (
                        prices["pricePerUnit"]["unit"]
                        if prices.get("pricePerUnit")
                        else None
                    ),
                    "image": p.get("image"),
                    "beschikbaar": p.get("availability", {}).get("isAvailable"),
                    "promoStart": promo_start,
                    "promoEnd": promo_end,
                    "link": f"https://www.jumbo.com/producten/{p.get('id')}"
                }

                full_products.append(item)
                batch_buffer.append(item)
                total_scraped += 1

        print(f"✅ Page {page + 1} → {len(products)} producten | totaal: {total_scraped}")

        if len(batch_buffer) >= BATCH_SIZE:
            save_batch(batch_number, batch_buffer)
            batch_buffer = []
            batch_number += 1

        with open(RESUME_FILE, "w") as f:
            f.write(str(page))

        time.sleep(random.uniform(3, 5))

    if batch_buffer:
        save_batch(batch_number, batch_buffer)

    save_full(full_products)
    print("🎉 Done scraping all products!")


if __name__ == "__main__":
    scrape_all()
