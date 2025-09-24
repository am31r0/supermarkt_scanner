# src/run_once.py
import asyncio
import contextlib
from pathlib import Path
from datetime import datetime

from src.core.browser import make_browser_context, save_state
from src.stores.ah import scrape_listing, to_jsonl

OUT_DIR = Path("data/products")
OUT_DIR.mkdir(parents=True, exist_ok=True)

async def watch_for_f(stop_event: asyncio.Event):
    """
    Windows: druk 'f' in de terminal om vroegtijdig te stoppen.
    Op niet-Windows systemen doet deze watcher niets.
    """
    try:
        import msvcrt  # Windows only
    except ImportError:
        return
    print("Druk 'f' in de terminal om vroegtijdig te stoppen…")
    while not stop_event.is_set():
        await asyncio.sleep(0.1)
        if msvcrt.kbhit():
            ch = msvcrt.getwch()
            if ch and ch.lower() == "f":
                print("\n[info] Stop-signal ontvangen (f). Afmaken van huidig item en stoppen…")
                stop_event.set()
                break

async def main():
    store = "ah"
    p = browser = context = page = state_file = None
    watcher = None
    stop_event = asyncio.Event()

    try:
        # start browser/context
        p, browser, context, page, state_file = await make_browser_context(
            store_slug=store, headless=False
        )

        # start key-watcher
        watcher = asyncio.create_task(watch_for_f(stop_event))

        # scrape: VRAAG 10 GELDIGE items (items zonder product_id tellen NIET mee)
        products = await scrape_listing(page, target_count=12000, stop_event=stop_event)

        # save
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        out = OUT_DIR / f"{store}_{ts}.jsonl"
        out.write_bytes(to_jsonl(products))
        print(f"✅ Saved {len(products)} products to {out}")

        # state bewaren
        await save_state(context, state_file)

    finally:
        # watcher netjes stoppen (alleen als hij bestaat)
        if watcher is not None:
            watcher.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await watcher

        # playwright netjes sluiten
        if context is not None:
            with contextlib.suppress(Exception):
                await context.close()
        if browser is not None:
            with contextlib.suppress(Exception):
                await browser.close()
        if p is not None:
            with contextlib.suppress(Exception):
                await p.stop()

if __name__ == "__main__":
    asyncio.run(main())
