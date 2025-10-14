import json, glob, collections

# pad naar jouw lokale map, bv. dev/store_database/*.json
files = glob.glob("./dev/store_database/*.json")

categories_by_store = {}
for file in files:
    store_name = file.split("/")[-1].replace(".json", "").upper()
    with open(file, encoding="utf-8") as f:
        data = json.load(f)
        cats = [item.get("category", "").strip() for item in data if item.get("category")]
        categories_by_store[store_name] = collections.Counter(cats)

from difflib import SequenceMatcher

# lijst met alle unieke categorieën over alle stores
all_cats = {cat for store in categories_by_store.values() for cat in store.keys()}

# eenvoudige vergelijkingsmatrix (optioneel printen of exporteren naar CSV)
def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

for a in sorted(all_cats):
    for b in sorted(all_cats):
        if a != b and similarity(a, b) > 0.65:
            print(f"{a}  ≈  {b}")

groups = []
for cat in all_cats:
    found = False
    for g in groups:
        if any(similarity(cat, x) > 0.65 for x in g):
            g.append(cat)
            found = True
            break
    if not found:
        groups.append([cat])

for i, g in enumerate(groups, 1):
    print(f"Group {i}: {g}")
