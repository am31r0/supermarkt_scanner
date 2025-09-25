#!/usr/bin/env python3
"""
dirk_full_scraper.py

Scraper voor Dirk.nl producten via GraphQL API.
- Loopt webGroupId 1..150 af
- Haalt alle producten per webGroupId (geen paginatie nodig)
- Neemt alle gevraagde details mee, incl. categoryLabel (webgroup uit de API)
- Kan met 'n' tijdens runtime stoppen en data netjes opslaan
"""

import requests
import json
import os
import time
import random
import threading
from datetime import datetime
from tqdm import tqdm

# ===== CONFIG =====
URL = "https://web-dirk-gateway.detailresult.nl/graphql"
HEADERS = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}

STORE_ID = 66
MAX_RETRIES = 3
MIN_DELAY = 2.0
MAX_DELAY = 5.0

BATCH_SIZE = 1000
OUT_DIR = "dirk_data"
os.makedirs(OUT_DIR, exist_ok=True)

RANGE_START = 1
RANGE_END = 150
# ==================

QUERY_TEMPLATE = """
query {
  listWebGroupProducts(webGroupId: %d) {
    productAssortment(storeId: %d) {
      productId
      normalPrice
      offerPrice
      productOffer {
        textPriceSign
        endDate
        startDate
      }
      productInformation {
        headerText
        packaging
        brand
        image
        department
        webgroup
      }
    }
  }
}
"""

STOP_REQUESTED = False

def listen_for_stop():
    """Thread die 'n' checkt en het proces kan stoppen."""
    global STOP_REQUESTED
    while True:
        key = input().strip().lower()
        if key == "n":
            STOP_REQUESTED = True
            print("\n[INFO] Stop-signaal ontvangen. Afronden...")

def fetch_webgroup(wgid):
    """Haal producten van één webGroupId op."""
    query = QUERY_TEMPLATE % (wgid, STORE_ID)
    payload = {"query": query, "variables": {}}
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(URL, headers=HEADERS, json=payload, timeout=30)
            r.raise_for_status()
            data = r.json()
            assortment = data.get("data", {}) \
                            .get("listWebGroupProducts", {}) \
                            .get("productAssortment", [])
            return [p for p in assortment if p]
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                print(f"[ERROR] webGroupId={wgid} -> {e}")
                return []
            time.sleep(1.5 * (attempt + 1))
    return []

def scrape_webgroup(wgid):
    """Scrape alle producten uit een webGroupId."""
    products = []
    group_data = fetch_webgroup(wgid)
    for p in group_data:
        info = p.get("productInformation", {}) or {}
        offer = p.get("productOffer") or {}
        products.append({
            "productId": p.get("productId"),
            "name": info.get("headerText"),
            "packaging": info.get("packaging"),
            "brand": info.get("brand"),
            "image": info.get("image"),
            "department": info.get("department"),
            "webgroupId": wgid,
            "categoryLabel": info.get("webgroup"),  # label vanuit API
            "normalPrice": p.get("normalPrice"),
            "offerPrice": p.get("offerPrice"),
            "priceLabel": offer.get("textPriceSign"),
            "offerStart": offer.get("startDate"),
            "offerEnd": offer.get("endDate")
        })
    return products

def save_batch(products, batch_num, run_id):
    outfile = os.path.join(OUT_DIR, f"dirk_products_{run_id}_batch{batch_num:02d}.json")
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"[SAVED] Batch {batch_num} -> {len(products)} producten")

def main():
    global STOP_REQUESTED
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    all_products = []
    batch_num = 1

    threading.Thread(target=listen_for_stop, daemon=True).start()

    print("=== Dirk.nl Product Scraper ===")
    for wgid in tqdm(range(RANGE_START, RANGE_END + 1), desc="Scraping webGroups", unit="group"):
        if STOP_REQUESTED:
            break
        group_products = scrape_webgroup(wgid)
        if group_products:
            print(f"[FOUND] webGroupId={wgid} -> {len(group_products)} producten "
                  f"(voorbeeld: {group_products[0].get('name')})")
            all_products.extend(group_products)
            if len(all_products) >= batch_num * BATCH_SIZE:
                save_batch(all_products, batch_num, run_id)
                batch_num += 1
        time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))

    outfile = os.path.join(OUT_DIR, f"dirk_products_full_{run_id}.json")
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)

    print(f"\n=== DONE ===")
    print(f"Totaal gevonden producten: {len(all_products)}")
    print(f"Full dataset opgeslagen in: {outfile}")

if __name__ == "__main__":
    main()
