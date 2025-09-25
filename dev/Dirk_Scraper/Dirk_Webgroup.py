#!/usr/bin/env python3
"""
dirk_discover_webgroups.py

Brute-force discovery van geldige webGroupId's voor Dirk GraphQL gateway.
Probeer een range van webGroupId's en bewaar welke IDs producten teruggeven.

Usage:
    python dirk_discover_webgroups.py

Config:
    - RANGE_START / RANGE_END: pas aan naar behoefte (bijv. 1..300)
    - STORE_ID: meestal 66 (online store)
    - PAGE_TEST: page to test (0)
    - SIZE_TEST: aantal slots returned (24 or 100)
"""

import requests
import json
import os
import time
import random
from datetime import datetime
from tqdm import tqdm

# ====== CONFIG ======
URL = "https://web-dirk-gateway.detailresult.nl/graphql"
HEADERS = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}

# Range of webGroupId to probe
RANGE_START = 1
RANGE_END = 100

STORE_ID = 66
PAGE_TEST = 0      # page to request when probing
SIZE_TEST = 24     # number of slots per response (Dirk uses 24 per page sometimes)
MAX_RETRIES = 3
MIN_DELAY = 0.8
MAX_DELAY = 2.0

OUT_DIR = "dirk_discovery"
os.makedirs(OUT_DIR, exist_ok=True)
# =====================

# Query template using inline webGroupId and storeId
QUERY_TEMPLATE = """
query {
  listWebGroupProducts(webGroupId: %d) {
    productAssortment(storeId: %d) {
      productId
      normalPrice
      offerPrice
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

def probe_webgroup(wgid):
    """Try one webGroupId, return list of non-null products (or raise on HTTP error)."""
    query = QUERY_TEMPLATE % (wgid, STORE_ID)
    payload = {"query": query, "variables": {}}
    backoff = 1.0
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.post(URL, headers=HEADERS, json=payload, timeout=25)
            # handle 400s etc. by raising to caller (we catch below)
            r.raise_for_status()
            data = r.json()
            assortment = data.get("data", {}) \
                            .get("listWebGroupProducts", {}) \
                            .get("productAssortment", [])
            # filter nulls
            real = [p for p in assortment if p]
            return real
        except requests.HTTPError as e:
            # If it's a 400 for all requests, likely invalid query format; raise
            status = getattr(e.response, "status_code", None)
            # print minimal debug but don't spam
            print(f"[WARN] webGroupId={wgid} attempt {attempt} -> HTTP {status}")
            if attempt == MAX_RETRIES:
                raise
        except Exception as e:
            print(f"[ERR] webGroupId={wgid} attempt {attempt} -> {e}")
            if attempt == MAX_RETRIES:
                raise
        time.sleep(backoff)
        backoff *= 1.8
    return []

def main():
    run_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    out_file = os.path.join(OUT_DIR, f"dirk_webgroup_discovery_{run_id}.json")

    discovered = []  # list of dicts {webGroupId, count, sample_name, sample_productId}
    total_checked = 0

    print("Starting discovery: webGroupId range", RANGE_START, "to", RANGE_END)
    try:
        for wgid in tqdm(range(RANGE_START, RANGE_END + 1), desc="probing wgid", unit="id"):
            total_checked += 1
            try:
                products = probe_webgroup(wgid)
            except Exception as e:
                # persistent error for this id: record and continue (optionally you may break)
                print(f"[ERROR] persistent error probing {wgid}: {e}")
                products = []

            count = len(products)
            if count > 0:
                # pick a representative sample
                sample = products[0]
                info = sample.get("productInformation", {}) if isinstance(sample, dict) else {}
                sample_name = info.get("headerText") or ""
                sample_pid = sample.get("productId")
                discovered.append({
                    "webGroupId": wgid,
                    "count": count,
                    "sample_productId": sample_pid,
                    "sample_name": sample_name
                })
                # quick feedback
                print(f"[FOUND] webGroupId={wgid} -> {count} products (example: {sample_name})")
            # polite delay (randomized)
            time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))
    except KeyboardInterrupt:
        print("\nInterrupted by user, will save progress...")

    # save results
    summary = {
        "run_id": run_id,
        "range_checked": [RANGE_START, RANGE_END],
        "checked": total_checked,
        "discovered_count": len(discovered),
        "discovered": discovered,
        "timestamp": datetime.now().isoformat()
    }
    with open(out_file, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)
    print(f"\nSaved discovery results to: {out_file}")
    print(f"Found {len(discovered)} webGroupIds with products out of {RANGE_END - RANGE_START + 1} checked.")

if __name__ == "__main__":
    main()
