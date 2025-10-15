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
TOTAL_PAGES = (TOTAL_PRODUCTS + PAGE_SIZE - 1) // PAGE_SIZE  # => 726
BATCH_SIZE = 1000
TODAY = datetime.now().date().isoformat()
RESUME_FILE = "resume.txt"

# Nieuwe outputlocatie
OUTPUT_DIR = "dev/store_database"
os.makedirs(OUTPUT_DIR, exist_ok=True)
FINAL_PATH = os.path.join(OUTPUT_DIR, "jumbo.json")

# ---------- Helpers ----------

def format_price(value: int | None) -> float | None:
    """Converteer int centen (bv. 1399) naar euro-decimaal (13.99)."""
    if value is None:
        return None
    s = str(value)
    if len(s) <= 2:
        return float("0." + s.zfill(2))
    return float(f"{s[:-2]}.{s[-2:]}")

def compose_promo_until(promotions: list | None) -> str | None:
    """Bouw een leesbare einddatum op basis van promotions[0].end (dayShort/date/monthShort)."""
    if not promotions:
        return None
    end = promotions[0].get("end") if promotions[0] else None
    if not end:
        return None
    parts = [end.get("dayShort"), end.get("date"), end.get("monthShort")]
    parts = [p for p in parts if p]
    return " ".join(map(str, parts)) if parts else None

def fetch_page(offset: int, max_retries: int = 3) -> list:
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

    attempt = 0
    while True:
        attempt += 1
        try:
            res = requests.post(URL, json=payload, headers=HEADERS, timeout=30)
            if res.status_code != 200:
                print(f"❌ HTTP {res.status_code}: {res.text[:500]}")
                if attempt >= max_retries:
                    return []
                time.sleep(random.uniform(1.0, 2.0) * attempt)
                continue

            data = res.json()
            if "errors" in data:
                print("❌ GraphQL error:", json.dumps(data["errors"], indent=2))
                if attempt >= max_retries:
                    return []
                time.sleep(random.uniform(1.0, 2.0) * attempt)
                continue

            return data["data"]["searchProducts"]["products"] or []
        except requests.RequestException as e:
            print(f"❌ Request exception: {e}")
            if attempt >= max_retries:
                return []
            time.sleep(random.uniform(1.0, 2.0) * attempt)

def save_batch(batch_number: int, products: list) -> str:
    """Schrijf een batchbestand weg en return de bestandsnaam."""
    filename = os.path.join(OUTPUT_DIR, "jumbo.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(products)} products to {filename}")
    return filename

def save_full(products: list) -> str:
    """Schrijf 1 full bestand met ALLE producten."""
    filename = os.path.join(OUTPUT_DIR, "jumbo.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    print(f"🏁 Full export saved: {filename} ({len(products)} products)")
    return filename

# ---------- Main ----------

def scrape_all():
    full_products: list[dict] = []
    batch_buffer: list[dict] = []
    batch_number = 1
    saved_checkpoints: list[str] = []

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
        page_count = len(products)
        if page_count == 0:
            print("⚠️ Page returned 0 products. Continuing...")
        else:
            for p in products:
                item = {
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "category": p.get("category"),
                    "price": format_price(p["prices"]["price"] if p.get("prices") else None),
                    "promoPrice": format_price(p["prices"]["promoPrice"] if p.get("prices") else None),
                    "pricePerUnit": (
                        f"{format_price(p['prices']['pricePerUnit']['price'])} {p['prices']['pricePerUnit']['unit']}"
                        if p.get("prices") and p["prices"].get("pricePerUnit") else None
                    ),
                    "image": p.get("image"),
                    "available": p["availability"]["isAvailable"] if p.get("availability") else None,
                    "promoUntil": compose_promo_until(p.get("promotions")) if (p.get("prices") and p["prices"].get("promoPrice")) else None
                }
                full_products.append(item)
                batch_buffer.append(item)
                total_scraped += 1

        print(f"✅ Page {page + 1} returned {page_count} products. Total so far: {total_scraped}")

        if len(batch_buffer) >= BATCH_SIZE:
            saved_checkpoints.append(save_batch(batch_number, batch_buffer))
            batch_number += 1
            batch_buffer = []

        with open(RESUME_FILE, "w") as f:
            f.write(str(page))

        delay = random.uniform(3, 5)
        print(f"⏳ Waiting {delay:.2f} seconds...\n")
        time.sleep(delay)

    if batch_buffer:
        saved_checkpoints.append(save_batch(batch_number, batch_buffer))
        batch_buffer = []

    save_full(full_products)
    print("🎉 Done scraping all products!")

if __name__ == "__main__":
    scrape_all()
