import asyncio
from playwright.async_api import async_playwright
import json
from pathlib import Path

OUTPUT_PATH = Path(
    r"D:\Users\AMEIRO\MusicProduction\Projects_2025\Websites\Supermarkt_Scanner\all_products.jsonl"
)

PAGE_SIZE = 36
RPS = 2
DELAY = 1.0 / RPS

async def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/115.0 Safari/537.36"
        )
        page = await context.new_page()

        all_items = []
        total_pages, total_results = None, None
        counter = 0

        async def handle_response(response):
            nonlocal total_pages, total_results, counter, all_items
            if "/zoeken/api/products/search" in response.url and response.status == 200:
                try:
                    data = await response.json()
                except:
                    return
                if not data or "products" not in data:
                    return

                # pagination info
                if total_pages is None:
                    meta = data.get("pagination", {})
                    total_pages = meta.get("totalPages", 0)
                    total_results = meta.get("totalResults", 0)
                    print(f"🔍 Totaal gevonden producten: {total_results}, paginas: {total_pages}")

                for product in data.get("products", []):
                    counter += 1
                    item = {
                        "id": product.get("id"),
                        "title": product.get("title"),
                        "price_current": product.get("price"),
                        "price_previous": product.get("priceBeforeBonus"),
                        "is_discounted": bool(product.get("priceBeforeBonus")),
                        "categories": product.get("categories") or product.get("category"),
                    }
                    all_items.append(item)

                    if counter % 100 == 0 or counter == total_results:
                        print(f"✅ {counter}/{total_results} producten verwerkt")

        # response-listener aanzetten
        page.on("response", handle_response)

        # loop door alle paginas
        page_num = 1
        while True:
            url = f"https://www.ah.nl/zoeken?query=&page={page_num}&size={PAGE_SIZE}"
            print(f"🌐 Pagina {page_num} openen...")
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(DELAY)

            if total_pages and page_num >= total_pages:
                break
            page_num += 1

        # opslaan naar bestand
        with OUTPUT_PATH.open("w", encoding="utf-8") as f_out:
            for item in all_items:
                f_out.write(json.dumps(item, ensure_ascii=False) + "\n")

        await browser.close()

    print(f"🎉 {len(all_items)} producten opgeslagen in {OUTPUT_PATH}")

if __name__ == "__main__":
    asyncio.run(main())
