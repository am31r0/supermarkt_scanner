# src/stores/ah.py
from __future__ import annotations
import orjson
import re, json, contextlib
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse, unquote

from playwright.async_api import Page

from src.core.models import Product
from src.core.utils import (
    wait_idle,
    accept_cookies_if_present,
    infinite_scroll,
    safe_text,
    safe_attr,
    first_locator,
    extract_first_money,
    parse_price_to_float,
    parse_unit_quantity,
    compute_unit_price,
    sane_unit_price,
    round2,
    soft_float,
)

# ============== Config ==============
# Kies een categorie- of zoek-URL met resultaten
START_URL = "https://www.ah.nl/zoeken"
DEBUG = False  # zet op True voor extra console-logs

# ============== Selectors (met fallbacks) ==============

SEL_CARD_CANDIDATES = [
    'article:has([data-test*="product"])',
    '[data-test*="product-card"]',
    '[data-test*="product"] [data-test*="card"]',
    'li:has([data-test*="product"])',
    'article[class*="product"], div[class*="product-card"]',
]

SEL_NAME_CANDIDATES = [
    '[data-test*="title"]',
    '[data-test*="card-title"]',
    'a[href*="/product"] h3, a[href*="/product"] h4, h3, h4',
]

SEL_PRICE_CANDIDATES = [
    '[data-test*="price"]:has-text("€")',
    '.product-price:has-text("€")',
    'span:has-text("€")',
    '[class*="price"]',
    '[data-test*="price"]',
]

SEL_OLDPRICE_CANDIDATES = [
    '[data-test*="was-price"]',
    '.was-price, .old-price, [class*="old"]',
]

SEL_UNIT_CANDIDATES = [
    '[data-test*="unit-size"]',
    '.unit-size, .uom, [class*="unit"]',
    'small:has-text("g"), small:has-text("ml"), small:has-text("l"), small:has-text("kg")',
]

SEL_LINK_CANDIDATES = [
    'a[href*="/product"]',
]

SEL_IMG_CANDIDATES = [
    'img[src*="ahstatic"], img[loading][src]',
    'img',
]

SEL_PROMO_BADGE_CANDIDATES = [
    '[data-test*="promo"], [data-test*="badge"], .badge',
    'span:has-text("Bonus"), span:has-text("%"), span:has-text("2e")',
]

SEL_CATEGORY_BREADCRUMB = [
    '[aria-label*="breadcrumb"] .active',
    'nav[aria-label*="breadcrumb"] li:last-child',
]

# Extra selector-kandidaten voor "Meer resultaten"
SEL_LOAD_MORE_CANDIDATES = [
    'button:has-text("meer resultaten")',
    'button:has-text("Meer resultaten")',
    'button:has-text("meer laden")',
    'button:has-text("Meer laden")',
    'button:has-text("toon meer")',
    'button:has-text("Toon meer")',
    'button:has-text("volgende")',
    'button:has-text("Volgende")',
    '[data-test*="load-more"]',
    '[data-testid*="load-more"]',
]

async def click_load_more_if_present(page: Page) -> bool:
    """Klik op 'Meer resultaten' als die zichtbaar/klikbaar is."""
    with contextlib.suppress(Exception):
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(400)
    for sel in SEL_LOAD_MORE_CANDIDATES:
        try:
            btn = page.locator(sel).first
            if await btn.count() == 0:
                continue
            if not await btn.is_visible():
                continue
            with contextlib.suppress(Exception):
                if await btn.is_disabled():
                    continue
            await btn.scroll_into_view_if_needed()
            await btn.click()
            with contextlib.suppress(Exception):
                await page.wait_for_load_state("networkidle", timeout=5000)
            await page.wait_for_timeout(700)
            return True
        except Exception:
            continue
    return False

# ============== Helpers: product-id / slug-naam / detailprijs ==============

def extract_product_id(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    m = re.search(r"/product/([^/?#]+)", url)
    return m.group(1) if m else None

def extract_slug_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        path = urlparse(url).path.rstrip("/")
        parts = [p for p in path.split("/") if p]
        return unquote(parts[-1]) if parts else None
    except Exception:
        return None

_ACRONYMS = {"ah": "AH", "uht": "UHT", "bio": "Bio", "nl": "NL", "st": "St.", "3l": "3L", "2l": "2L", "1l": "1L"}
_SMALL_WORDS = {"de","het","een","en","of","van","voor","met","per","in","op","te","bij","als","aan","uit"}

def humanize_slug(slug: Optional[str]) -> Optional[str]:
    """'de-zaanse-hoeve-halfvolle-melk-2l' -> 'De Zaanse Hoeve Halfvolle Melk 2L'."""
    if not slug:
        return None
    s = slug.strip().lower()
    s = re.sub(r"[_]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    parts = s.split("-")
    nice = []
    for i, p in enumerate(parts):
        if not p:
            continue
        m = re.fullmatch(r"(\d+)([a-z]+)", p)
        if m:
            nice.append(f"{m.group(1)}{m.group(2).upper()}")
            continue
        if p in _ACRONYMS:
            nice.append(_ACRONYMS[p]); continue
        if p in _SMALL_WORDS and i != 0:
            nice.append(p); continue
        nice.append(p.capitalize())
    if not nice:
        return None
    if nice[0].lower() == "ah":
        nice[0] = "AH"
    out = " ".join(nice)
    out = re.sub(r"\bBio\b", "Bio", out)
    return out

async def get_price_from_detail(request, url: str) -> float | None:
    """Haal prijs uit de productdetailpagina via JSON-LD (offers.price of price)."""
    if not url:
        return None
    try:
        resp = await request.get(url)
        if not resp.ok:
            return None
        html = await resp.text()
        for m in re.finditer(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S | re.I):
            with contextlib.suppress(Exception):
                data = json.loads(m.group(1))
                objs = data if isinstance(data, list) else [data]
                for d in objs:
                    if not isinstance(d, dict):
                        continue
                    if d.get("@type") in ("Product", "ProductGroup"):
                        offers = d.get("offers")
                        if isinstance(offers, dict) and "price" in offers:
                            from src.core.utils import normalize_decimal_eu, round2
                            return round2(normalize_decimal_eu(str(offers["price"])))
                        if "price" in d:
                            from src.core.utils import normalize_decimal_eu, round2
                            return round2(normalize_decimal_eu(str(d["price"])))
        return None
    except Exception:
        return None

# ============== Scraper (met paginatie & stop-event) ==============

async def scrape_listing(
    page: Page,
    start_url: Optional[str] = None,
    target_count: int = 12000,                    # hoeveel GELDIGE items (met product_id) je wilt
    stop_event: "object | None" = None,        # asyncio.Event verwacht; run_once.py geeft die door
) -> List[Product]:
    url = start_url or START_URL
    await page.goto(url, wait_until="domcontentloaded")
    await accept_cookies_if_present(page)
    with contextlib.suppress(Exception):
        await page.wait_for_load_state("networkidle", timeout=5000)
    await wait_idle(page, 600)
    await infinite_scroll(page, max_rounds=99999)
    await wait_idle(page, 600)

    # Dynamische locator voor kaarten (blijft "live" als DOM groeit)
    cards = None
    for sel in SEL_CARD_CANDIDATES:
        cand = page.locator(sel)
        if await cand.count() >= 1:
            cards = cand
            break
    if cards is None:
        cards = page.locator(SEL_CARD_CANDIDATES[-1])

    when = datetime.utcnow()
    out: List[Product] = []
    kept = 0               # telt alleen PRODUCTEN die we echt bewaren (met product_id)
    processed_idx = 0      # hoeveel kaarten al verwerkt
    rounds = 0
    MAX_ROUNDS = 120       # vangt edge-cases af

    while True:
        # stopcondities
        if stop_event and getattr(stop_event, "is_set", lambda: False)():
            if DEBUG: print("[debug] stop-event ontvangen, afbreken…")
            break
        if kept >= target_count:
            break
        if rounds >= MAX_ROUNDS:
            if DEBUG: print("[debug] max rounds bereikt, stoppen")
            break

        total = await cards.count()
        if DEBUG: print(f"[debug] kaarten: processed={processed_idx} total={total} kept={kept}")

        # verwerk alleen NIEUWE kaarten
        while processed_idx < total:
            if stop_event and getattr(stop_event, "is_set", lambda: False)():
                break
            if kept >= target_count:
                break

            i = processed_idx
            processed_idx += 1
            card = cards.nth(i)

            try:
                # --- URL (vroeg) ---
                purl = await safe_attr(card, SEL_LINK_CANDIDATES, "href")
                if purl and purl.startswith("/"):
                    purl = f"https://www.ah.nl{purl}"

                # --- NAME (oude methode + slug override) ---
                name = await safe_text(card, SEL_NAME_CANDIDATES)
                if not name:
                    link_loc = await first_locator(card, SEL_LINK_CANDIDATES)
                    if link_loc:
                        with contextlib.suppress(Exception):
                            title_attr = await link_loc.get_attribute("title")
                            if title_attr:
                                name = title_attr.strip()
                slug = extract_slug_from_url(purl)
                pretty = humanize_slug(slug)
                if pretty:
                    name = pretty
                if not name:
                    name = pretty or "Onbekend product"

                # --- PRIJS (selectors → hele card → text_content → detail JSON-LD) ---
                price_txt = await safe_text(card, SEL_PRICE_CANDIDATES)
                if not price_txt:
                    with contextlib.suppress(Exception):
                        price_txt = await card.inner_text()
                if not price_txt:
                    with contextlib.suppress(Exception):
                        price_txt = await card.text_content()

                price = extract_first_money(price_txt or "")
                if price is None and purl:
                    price = await get_price_from_detail(page.context.request, purl)
                if price is None:
                    if DEBUG:
                        snip = (price_txt or "(geen text)")[:120].replace("\n", " ")
                        print(f"[debug] kaart #{i}: geen prijs — url={purl} — snippet: {snip}")
                    continue
                price = round2(price)

                # --- overige velden ---
                old_price_txt = await safe_text(card, SEL_OLDPRICE_CANDIDATES)
                old_price = round2(soft_float(parse_price_to_float, old_price_txt))

                unit_size = await safe_text(card, SEL_UNIT_CANDIDATES)
                promo_badge = await safe_text(card, SEL_PROMO_BADGE_CANDIDATES)

                img = await safe_attr(card, SEL_IMG_CANDIDATES, "src")
                if img and img.startswith("//"):
                    img = "https:" + img

                category = await safe_text(page, SEL_CATEGORY_BREADCRUMB)

                # --- product_id VERPLICHT; zonder id → overslaan (telt NIET mee) ---
                pid = extract_product_id(purl)
                if not pid:
                    if DEBUG: print(f"[debug] kaart #{i}: skip — geen product_id (url={purl})")
                    continue

                # --- unit price ---
                qty, base = parse_unit_quantity(unit_size or "")
                unit_price = sane_unit_price(compute_unit_price(price, unit_size), base)

                out.append(Product(
                    source="ah",
                    scraped_at=when,
                    product_id=pid,
                    name=name,
                    price_eur=round2(price),
                    old_price_eur=round2(old_price),
                    unit_size=unit_size,
                    unit_price_eur=round2(unit_price),
                    # unit_base=base,  # zet aan als je dit veld in je model hebt
                    category=category,
                    promo_badge=promo_badge,
                    url=purl,
                    img=img,
                ))
                kept += 1

            except Exception as e:
                if DEBUG: print(f"[warn] kaart #{i} overgeslagen door fout: {e}")
                continue

        # doel gehaald?
        if kept >= target_count:
            break
        if stop_event and getattr(stop_event, "is_set", lambda: False)():
            break

        # Paginate: klik "Meer resultaten"
        clicked = await click_load_more_if_present(page)
        if not clicked:
            if DEBUG: print("[debug] geen 'Meer resultaten' (meer) of niets meer te laden")
            break

        rounds += 1
        await wait_idle(page, 500)

    return out


def to_jsonl(products: List[Product]) -> bytes:
    return b"\n".join(orjson.dumps(p.model_dump()) for p in products)
