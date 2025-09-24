import orjson
from datetime import datetime
from typing import List
from playwright.async_api import Page
from src.core.models import Product
from src.core.utils import infinite_scroll, wait_idle, accept_cookies_if_present, parse_price_to_float

# TODO: vervang met echte URL van een categorie of zoekpagina
START_URL = "https://example.com/supermarkt/categorie/zuivel"

# TODO: pas selectors aan op de gekozen winkel:
SEL_CARD      = "article.product-card"           # kaart container
SEL_NAME      = ".product-title"                 # productnaam
SEL_PRICE     = ".product-price"                 # actuele prijs
SEL_OLDPRICE  = ".product-price--old"            # oude prijs (als promo)
SEL_UNIT      = ".product-unit"                  # bv "500 g" of "1 l"
SEL_IMG       = "img.product-image"
SEL_LINK      = "a.product-link"
SEL_CATEGORY  = ".breadcrumb .active"            # of hardcode op basis van pagina

async def scrape_listing(page: Page) -> List[Product]:
    await page.goto(START_URL, wait_until="domcontentloaded")
    await accept_cookies_if_present(page)
    await infinite_scroll(page, max_rounds=15)
    await wait_idle(page, 1000)

    cards = page.locator(SEL_CARD)
    count = await cards.count()
    products: List[Product] = []
    when = datetime.utcnow()

    for i in range(count):
        card = cards.nth(i)
        try:
            name = (await card.locator(SEL_NAME).inner_text()).strip()
        except:
            continue
        price_txt = (await card.locator(SEL_PRICE).inner_text()).strip()
        price = parse_price_to_float(price_txt) if price_txt else None

        old_price = None
        if await card.locator(SEL_OLDPRICE).count():
            old_txt = (await card.locator(SEL_OLDPRICE).inner_text()).strip()
            try:
                old_price = parse_price_to_float(old_txt)
            except:
                old_price = None

        unit_size = None
        if await card.locator(SEL_UNIT).count():
            unit_size = (await card.locator(SEL_UNIT).inner_text()).strip() or None

        url = None
        if await card.locator(SEL_LINK).count():
            url = await card.locator(SEL_LINK).first.get_attribute("href")

        img = None
        if await card.locator(SEL_IMG).count():
            img = await card.locator(SEL_IMG).first.get_attribute("src")

        cat = None
        if await page.locator(SEL_CATEGORY).count():
            try:
                cat = (await page.locator(SEL_CATEGORY).inner_text()).strip()
            except:
                pass

        if not price:
            continue

        products.append(Product(
            source="demo",
            scraped_at=when,
            name=name,
            price_eur=price,
            old_price_eur=old_price,
            unit_size=unit_size,
            unit_price_eur=None,  # kun je later normaliseren
            category=cat,
            url=url,
            img=img
        ))
    return products

def to_jsonl(products: List[Product]) -> bytes:
    return b"\n".join([orjson.dumps(p.model_dump()) for p in products])
