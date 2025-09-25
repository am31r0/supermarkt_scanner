#!/usr/bin/env python3
"""
dirk_full_scraper.py
Scraper voor Dirk.nl GraphQL API.
Haalt alle producten van storeId=66 (hele webshop).
"""

import requests, json, os, time, random
from datetime import datetime
from tqdm import tqdm  # pip install tqdm

URL = "https://web-dirk-gateway.detailresult.nl/graphql"
HEADERS = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}

QUERY = """
query listAllProducts($storeId: Int!, $size: Int!, $page: Int!) {
  listWebGroupProducts {
    productAssortment(storeId: $storeId, size: $size, page: $page) {
      productId
      normalPrice
      offerPrice
      startDate
      endDate
      productOffer {
        textPriceSign
        endDate
      }
      productInformation {
        headerText
        subText
        packaging
        image
        department
        webgroup
        brand
      }
    }
  }
}
"""

OUT_DIR = "dirk_output"
os.makedirs(OUT_DIR, exist_ok=True)

STORE_ID = 66
PAGE_SIZE = 100   # aantal producten per pagina
BATCH_SIZE = 1000
STOP_EMPTY = 3    # stop na 3 lege pagina's
MIN_DELAY, MAX_DELAY = 2, 5  # random delay in seconden


def fetch_page(page):
    payload = {
        "operationName": "listAllProducts",
        "variables": {"storeId": STORE_ID, "size": PAGE_SIZE, "page": page},
        "query": QUERY,
    }
    r = requests.post(URL, headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    assortment = data["data"]["listWebGroupProducts"]["productAssortment"]
    return [p for p in assortment if p]


def normalize_product(p):
    info = p.get("productInformation") or {}
    offer = p.get("productOffer") or {}

    # Afbeelding aanvullen naar volledige URL
    img = info.get("image")
    if img and not img.startswith("http"):
        img = "https://d3r3h30p75xj6a.cloudfront.net/" + img

    return {
        "id": p.get("productId"),
        "title": info.get("headerText"),
        "brand": info.get("brand"),
        "packaging": info.get("packaging"),
        "department": info.get("department"),
        "webgroup": info.get("webgroup"),
        "price_normal": p.get("normalPrice"),
        "price_offer": p.get("offerPrice"),
        "price_unit": offer.get("textPriceSign") or info.get("subText"),
        "offer_end": offer.get("endDate") or p.get("endDate"),
        "image": img,
    }


def save_batch(products, batch_num, run_id):
    filename = os.path.join(OUT_DIR, f"dirk_scrape_{run_id}_{batch_num:02d}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"[Batch {batch_num}] {len(products)} producten opgeslagen -> {filename}")


def main():
    print("=== Dirk.nl Product Scraper ===")
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    all_products, batch, batch_num = [], [], 0
    empty_count, page, total = 0, 0, 0

    with tqdm(desc="Scrapen", unit="page") as pbar:
        while empty_count < STOP_EMPTY:
            products_raw = fetch_page(page)
            if not products_raw:
                empty_count += 1
                print(f"Page {page}: leeg ({empty_count}/{STOP_EMPTY})")
            else:
                empty_count = 0
                prods = [normalize_product(p) for p in products_raw]
                batch.extend(prods)
                all_products.extend(prods)
                total += len(prods)

                print(f"Page {page}: {len(prods)} producten (totaal {total})")

                if len(batch) >= BATCH_SIZE:
                    batch_num += 1
                    save_batch(batch, batch_num, run_id)
                    batch = []

            page += 1
            pbar.update(1)
            time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))

    # save laatste batch
    if batch:
        batch_num += 1
        save_batch(batch, batch_num, run_id)

    # save alles
    fullfile = os.path.join(OUT_DIR, f"dirk_scrape_{run_id}_FULL.json")
    with open(fullfile, "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)

    print(f"\nTotaal {total} producten opgeslagen in {fullfile}")


if __name__ == "__main__":
    main()
