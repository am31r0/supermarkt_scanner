import asyncio, os, json
from pathlib import Path
from playwright.async_api import async_playwright

STATE_DIR = Path("data/state")
STATE_DIR.mkdir(parents=True, exist_ok=True)

async def make_browser_context(store_slug: str, headless: bool = False):
    state_file = STATE_DIR / f"{store_slug}.json"
    p = await async_playwright().start()
    browser = await p.chromium.launch(headless=headless, args=[
        "--disable-blink-features=AutomationControlled",
    ])
    # Laad bestaande cookies/sessies als die er zijn
    storage_state = str(state_file) if state_file.exists() else None

    context = await browser.new_context(
        locale="nl-NL",
        timezone_id="Europe/Amsterdam",
        geolocation={"latitude": 52.3702, "longitude": 4.8952},
        permissions=["geolocation"],
        user_agent=None,              # laat Playwright een realistische UA zetten
        storage_state=storage_state,
        viewport={"width": 1366, "height": 768}
    )
    page = await context.new_page()
    # Kleine "menselijke" think time
    page.set_default_timeout(25_000)
    return p, browser, context, page, state_file

async def save_state(context, state_file):
    state = await context.storage_state()
    state_file.write_text(json.dumps(state, ensure_ascii=False))
