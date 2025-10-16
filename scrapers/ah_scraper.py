import requests
import json
import time
import random
import datetime
from tqdm import tqdm
import msvcrt  # Windows only
import os
import glob

# === CATEGORIEËN (id + slug + naam) ===
CATEGORIES = [
    {"id": 6401, "slug": "groente-aardappelen", "name": "Groente, aardappelen"},
    {"id": 20885, "slug": "fruit-verse-sappen", "name": "Fruit, verse sappen"},
    {"id": 1301, "slug": "maaltijden-salades", "name": "Maaltijden, salades"},
    {"id": 9344, "slug": "vlees", "name": "Vlees"},
    {"id": 1651, "slug": "vis", "name": "Vis"},
    {"id": 20128, "slug": "vegetarisch-vegan-en-plantaardig", "name": "Vegetarisch, vegan en plantaardig"},
    {"id": 5481, "slug": "vleeswaren", "name": "Vleeswaren"},
    {"id": 1192, "slug": "kaas", "name": "Kaas"},
    {"id": 1730, "slug": "zuivel-eieren", "name": "Zuivel, eieren"},
    {"id": 1355, "slug": "bakkerij", "name": "Bakkerij"},
    {"id": 4246, "slug": "glutenvrij", "name": "Glutenvrij"},
    {"id": 20824, "slug": "borrel-chips-snacks", "name": "Borrel, chips, snacks"},
    {"id": 1796, "slug": "pasta-rijst-wereldkeuken", "name": "Pasta, rijst, wereldkeuken"},
    {"id": 6409, "slug": "soepen-sauzen-kruiden-olie", "name": "Soepen, sauzen, kruiden, olie"},
    {"id": 20129, "slug": "koek-snoep-chocolade", "name": "Koek, snoep, chocolade"},
    {"id": 6405, "slug": "ontbijtgranen-beleg", "name": "Ontbijtgranen, beleg"},
    {"id": 2457, "slug": "tussendoortjes", "name": "Tussendoortjes"},
    {"id": 5881, "slug": "diepvries", "name": "Diepvries"},
    {"id": 1043, "slug": "koffie-thee", "name": "Koffie, thee"},
    {"id": 20130, "slug": "frisdrank-sappen-water", "name": "Frisdrank, sappen, water"},
    {"id": 6406, "slug": "bier-wijn-aperitieven", "name": "Bier, wijn, aperitieven"},
    {"id": 1045, "slug": "drogisterij", "name": "Drogisterij"},
    {"id": 11717, "slug": "gezondheid-en-sport", "name": "Gezondheid en sport"},
    {"id": 1165, "slug": "huishouden", "name": "Huishouden"},
    {"id": 18521, "slug": "baby-en-kind", "name": "Baby en kind"},
    {"id": 18519, "slug": "huisdier", "name": "Huisdier"},
    {"id": 1057, "slug": "koken-tafelen-vrije-tijd", "name": "Koken, tafelen, vrije tijd"},
    {"id": 20670, "slug": "wonen-koken-en-huishouden", "name": "Wonen, koken en huishouden"},
    {"id": 20668, "slug": "uitjes-en-verblijf", "name": "Uitjes en verblijf"},
    {"id": 20671, "slug": "sport-spel-en-bewegen", "name": "Sport, spel en bewegen"},
    {"id": 20672, "slug": "kids-en-baby", "name": "Kids en baby"},
    {"id": 20673, "slug": "onderweg-en-reizen", "name": "Onderweg en reizen"},
    {"id": 20674, "slug": "buiten-en-tuin", "name": "Buiten en tuin"},
]

BASE_URL = "https://www.ah.nl/zoeken/api/products/search"
REFRESH_URL = "https://www.ah.nl/producten"

# === Session met automatische cookie opslag ===
session = requests.Session()
session.headers.update({
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36",
    "accept": "application/json",
    "referer": "https://www.ah.nl/producten",
})

last_refresh = 0  # laatste cookie refresh

def timestamp():
    return datetime.datetime.now().strftime("%H:%M:%S")

def refresh_cookies():
    """Forceer cookie refresh door hoofdpagina te bezoeken"""
    global last_refresh
    try:
        r = session.get(REFRESH_URL, timeout=30)
        if r.status_code == 200:
            print(f"[{timestamp()}] 🔄 Cookies vernieuwd")
        else:
            print(f"[{timestamp()}] ⚠️ Refresh gaf status {r.status_code}")
    except Exception as e:
        print(f"[{timestamp()}] ⚠️ Refresh error: {e}")
    last_refresh = time.time()

def get_with_auto_refresh(url):
    global last_refresh
    if time.time() - last_refresh > 480:  # elke 8 min
        refresh_cookies()
    return session.get(url, timeout=30)

# === Bestandnamen met datum + tijd ===
timestamp_full = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

results_by_id = {}
batch = []
checkpoint_index = 1

bruto_count = netto_count = voordeelshop_count = no_price_count = 0

STATE_FILE = "ah_state.json"

# Resume
start_cat_index = 0
start_page = 0

def merge_old_checkpoints():
    global results_by_id
    files = sorted(glob.glob(f"ah_scrape_{timestamp_full}_*.json"))
    merged = {}
    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            for prod in data:
                merged[prod["id"]] = prod
        except Exception:
            pass
    if merged:
        print(f"🔄 {len(merged)} producten ingeladen uit bestaande checkpoints")
        results_by_id.update(merged)

if os.path.exists(STATE_FILE):
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        state = json.load(f)
    start_cat_index = state.get("cat_index", 0)
    start_page = state.get("page", 0)
    bruto_count = state.get("bruto_count", 0)
    netto_count = state.get("netto_count", 0)
    voordeelshop_count = state.get("voordeelshop_count", 0)
    no_price_count = state.get("no_price_count", 0)
    if start_cat_index < len(CATEGORIES):
        print(f"🔄 Hervatten vanaf categorie {start_cat_index} ({CATEGORIES[start_cat_index]['name']}), pagina {start_page+1}")
    else:
        print("⚠️ State verwijst naar ongeldige categorie, begin opnieuw.")
        start_cat_index, start_page = 0, 0
    merge_old_checkpoints()
else:
    print("🚀 Nieuwe scrape gestart")

pbar = tqdm(desc="Scraping AH producten", unit="prod", initial=netto_count)

def save_state(cat_index=None, page=None):
    state = {
        "cat_index": cat_index if cat_index is not None else start_cat_index,
        "page": page if page is not None else start_page,
        "bruto_count": bruto_count,
        "netto_count": netto_count,
        "voordeelshop_count": voordeelshop_count,
        "no_price_count": no_price_count,
    }
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
    print(f"[{timestamp()}] 💾 State opgeslagen")

def save_checkpoint():
    global checkpoint_index, batch
    if not batch:
        return
    fname = f"ah_scrape_{timestamp_full}_{checkpoint_index:02d}.json"
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(batch, f, ensure_ascii=False, indent=2)
    print(f"[{timestamp()}] 💾 Checkpoint opgeslagen: {fname}")
    checkpoint_index += 1
    batch = []
    save_state()

def check_stop():
    if msvcrt.kbhit():
        key = msvcrt.getch()
        if key.lower() == b"n":
            raise KeyboardInterrupt

def build_product(p, cat_name):
    price_data = p.get("price") or {}
    now_price = price_data.get("now")
    was_price = price_data.get("was")

    if isinstance(now_price, (int, float)) and isinstance(was_price, (int, float)) and now_price < was_price:
        price = was_price
        promo_price = now_price
    else:
        price = now_price
        promo_price = None

    discount = p.get("discount") or {}
    promo_start = discount.get("startDate")
    promo_end = discount.get("endDate")

    return {
        "id": p.get("id"),
        "title": p.get("title"),
        "category": cat_name,
        "price": price,
        "promoPrice": promo_price,
        "price_per_unit": (price_data.get("unitInfo") or {}).get("price"),
        "unit": (price_data.get("unitInfo") or {}).get("description"),
        "image": (p.get("images") or [{}])[0].get("url"),
        "beschikbaar": p.get("availableOnline"),
        "promoStart": promo_start,
        "promoEnd": promo_end,
        "link": "https://www.ah.nl" + str(p.get("link")),
    }


def scrape_category(cat, ci):
    global bruto_count, netto_count, voordeelshop_count, no_price_count, batch

    cat_id = cat["id"]
    slug = cat["slug"]
    cat_name = cat["name"]

    print(f"\n📂 Start categorie: {cat_name}")

    cat_bruto = cat_netto = cat_voordeel = cat_noprice = 0
    page = start_page if ci == start_cat_index else 0
    empty_streak = 0

    while True:
        check_stop()
        url = f"{BASE_URL}?taxonomy={cat_id}&taxonomySlug={slug}&size=36&page={page}"
        print(f"📡 [{timestamp()}] {cat_name} – page {page+1} – {url}")

        try:
            r = get_with_auto_refresh(url)
        except requests.RequestException as e:
            print(f"⚠️ Request error: {e}")
            break

        print(f"➡️ Status: {r.status_code}")

        if r.status_code in [400, 403]:
            print(f"⛔ Gestopt op {r.status_code} → klaar met {cat_name}")
            break

        if r.status_code != 200:
            print(f"⚠️ Error: {r.status_code}")
            break

        data = r.json()
        cards = data.get("cards") or []
        if not cards:
            empty_streak += 1
            print(f"⚠️ Lege pagina (streak {empty_streak}/3)")
            if empty_streak >= 3:
                print(f"✅ {cat_name}: 3 lege pagina’s → categorie afgerond")
                break
        else:
            empty_streak = 0

        added_in_page = 0
        for card in cards:
            for p in card.get("products") or []:
                bruto_count += 1
                cat_bruto += 1

                if (p.get("control") or {}).get("type") == "voordeelshop":
                    voordeelshop_count += 1
                    cat_voordeel += 1
                    continue

                price_data = p.get("price")
                if not price_data or "now" not in price_data:
                    no_price_count += 1
                    cat_noprice += 1
                    print(f"⚠️ Geen prijs: {p.get('title')} (https://www.ah.nl{p.get('link')})")
                    continue

                prod_id = p.get("id")
                if prod_id in results_by_id:
                    continue

                prod = build_product(p, cat_name)
                results_by_id[prod_id] = prod
                batch.append(prod)

                netto_count += 1
                cat_netto += 1
                added_in_page += 1
                pbar.update(1)

                if netto_count % 1000 == 0:
                    save_checkpoint()

        print(f"✅ {cat_name} page {page+1}: +{added_in_page} producten")
        save_state(cat_index=ci, page=page)

        wait = random.uniform(2, 5)
        print(f"⏳ Wachten {wait:.2f}s...")
        for _ in range(int(wait * 10)):
            time.sleep(0.1)
            check_stop()

        page += 1

    print(f"📊 {cat_name} samenvatting:")
    print(f"   Bruto: {cat_bruto}, Netto: {cat_netto}, Voordeelshop: {cat_voordeel}, Geen prijs: {cat_noprice}")
    save_state(cat_index=ci + 1, page=0)

# === MAIN ===
try:
    for ci, cat in enumerate(CATEGORIES[start_cat_index:], start=start_cat_index):
        scrape_category(cat, ci)
except KeyboardInterrupt:
    print("\n🛑 Gestopt door gebruiker ('n').")
    save_checkpoint()

pbar.close()
save_checkpoint()

# === EINDSCHRIFT NAAR JUISTE MAP ===
OUTPUT_DIR = "dev/store_database"
os.makedirs(OUTPUT_DIR, exist_ok=True)
final_file = os.path.join(OUTPUT_DIR, "ah.json")

merged = {}
files = sorted(glob.glob(f"ah_scrape_{timestamp_full}_*.json"))
for fpath in files:
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        for prod in data:
            merged[prod["id"]] = prod
    except Exception:
        pass

for pid, prod in results_by_id.items():
    merged[pid] = prod

with open(final_file, "w", encoding="utf-8") as f:
    json.dump(list(merged.values()), f, ensure_ascii=False, indent=2)

print(f"\n[{timestamp()}] 💾 Eindbestand gemaakt in: {final_file}")
print("\n=== TOTAAL RESULTATEN ===")
print(f"Bruto items: {bruto_count}")
print(f"Netto unieke producten: {netto_count}")
print(f"➡️ Voordeelshop overgeslagen: {voordeelshop_count}")
print(f"➡️ Geen prijs overgeslagen: {no_price_count}")
