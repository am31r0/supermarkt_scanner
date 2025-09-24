import re
import json
import math
import contextlib
from typing import Optional, Tuple
from playwright.async_api import Page

# ============== Algemene Playwright helpers ==============

async def wait_idle(page: Page, ms: int = 1000):
    await page.wait_for_timeout(ms)

async def accept_cookies_if_present(page: Page) -> bool:
    """
    Klikt meest voorkomende NL cookie-accept varianten weg en wacht kort op stabiliteit.
    """
    selectors = [
        'button:has-text("Accepteer")',
        'button:has-text("Akkoord")',
        'button:has-text("Alles accepteren")',
        'button:has-text("Alle cookies")',
        '[aria-label*="cookies"][role="button"]',
    ]
    for sel in selectors:
        try:
            btn = page.locator(sel)
            if await btn.first.is_visible():
                await btn.first.click()
                with contextlib.suppress(Exception):
                    await page.wait_for_load_state("networkidle", timeout=5000)
                await page.wait_for_timeout(600)
                return True
        except Exception:
            pass

    # Fallback via role/regex
    try:
        cand = page.get_by_role("button", name=re.compile("cookies|accepteer|akkoord", re.I))
        if await cand.first.is_visible():
            await cand.first.click()
            with contextlib.suppress(Exception):
                await page.wait_for_load_state("networkidle", timeout=5000)
            await page.wait_for_timeout(600)
            return True
    except Exception:
        pass
    return False


async def infinite_scroll(page: Page, max_rounds: int = 20, pause_ms: int = 1200):
    """
    Navigation-safe infinite scroll:
    - leest hoogte met evaluate (gevangen in try/except)
    - scrolt in stappen tot geen groei meer
    """
    last_height = 0
    same_count = 0
    for _ in range(max_rounds):
        # Hoogte lezen
        try:
            height = await page.evaluate(
                "() => (document.scrollingElement || document.body).scrollHeight"
            )
        except Exception:
            with contextlib.suppress(Exception):
                await page.wait_for_load_state("domcontentloaded", timeout=3000)
            await page.wait_for_timeout(500)
            continue

        if height == last_height:
            same_count += 1
            if same_count >= 2:
                break
        else:
            same_count = 0

        # Scrollen
        try:
            await page.evaluate(
                "() => window.scrollTo(0, (document.scrollingElement || document.body).scrollHeight)"
            )
        except Exception:
            with contextlib.suppress(Exception):
                await page.wait_for_load_state("domcontentloaded", timeout=3000)
            await page.wait_for_timeout(500)
            continue

        await page.wait_for_timeout(pause_ms)
        with contextlib.suppress(Exception):
            await page.wait_for_load_state("networkidle", timeout=3000)

        last_height = height


# ============== Veilige locator helpers (fouttolerant) ==============

async def safe_text(root, selectors: list[str]) -> Optional[str]:
    for sel in selectors:
        with contextlib.suppress(Exception):
            loc = root.locator(sel)
            if await loc.count() > 0:
                txt = (await loc.first.inner_text()).strip()
                if txt:
                    return txt
    return None

async def safe_attr(root, selectors: list[str], attr: str) -> Optional[str]:
    for sel in selectors:
        with contextlib.suppress(Exception):
            loc = root.locator(sel)
            if await loc.count() > 0:
                val = await loc.first.get_attribute(attr)
                if val:
                    return val.strip()
    return None

async def first_locator(root, selectors: list[str]):
    for sel in selectors:
        with contextlib.suppress(Exception):
            loc = root.locator(sel)
            if await loc.count() > 0:
                return loc.first
    return None


# ============== Prijs-parsers & afronding (EU notatie) ==============

_MONEY_RE = re.compile(r"(€\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]?\d*)")

def normalize_decimal_eu(num_str: str) -> float:
    """
    Converteer EU getalstring naar float.
    - Zowel '.' als ',' aanwezig: '.' = duizend, ',' = decimaal
    - Alleen ',': ',' = decimaal
    - Alleen '.': '.' = decimaal
    """
    s = num_str.strip().replace("\u00A0", " ")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    return float(s)

def parse_price_to_float(txt: str) -> float:
    """
    Simpel prijsparser (laat staan voor backward-compat), gebruik liever extract_first_money.
    """
    s = re.sub(r"[^\d,\.]", "", txt).strip()
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    m = re.search(r"\d+(?:\.\d+)?", s)
    if not m:
        raise ValueError(f"Kon geen prijs vinden in: {txt!r}")
    return float(m.group(0))

def extract_first_money(text: str) -> Optional[float]:
    """
    Haal de eerste 'echte' prijs uit de tekst (negeert unit-regels zoals '1,5 l').
    """
    if not text:
        return None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.search(r"\b(\d+[.,]?\d*)\s*(kg|g|l|ml|cl|dl)\b", line, re.I):
            continue
        m = _MONEY_RE.search(line)
        if m:
            try:
                return normalize_decimal_eu(m.group(2))
            except Exception:
                continue
    # fallback: hele blok
    m = _MONEY_RE.search(text)
    if m:
        with contextlib.suppress(Exception):
            return normalize_decimal_eu(m.group(2))
    return None

def round2(x: Optional[float]) -> Optional[float]:
    if x is None:
        return None
    return float(f"{x:.2f}")

def soft_float(parse_fn, txt: Optional[str]) -> Optional[float]:
    if not txt:
        return None
    with contextlib.suppress(Exception):
        return parse_fn(txt)
    return None


# ============== Unit-helpers (€/kg en €/l) ==============

def _to_float_eu(s: str) -> float:
    s = s.strip().replace("\u00A0", " ")
    s = re.sub(r"[^\d,\.]", "", s)
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    return float(s)

def _convert_to_base(val: float, unit: str) -> Tuple[float, str]:
    """
    Converteer naar basiseenheid: kg of l.
    """
    u = unit.lower()
    if u in ("kg", "g"):
        return (val if u == "kg" else val / 1000.0, "kg")
    if u in ("l", "ml", "cl", "dl"):
        if u == "l":
            return (val, "l")
        if u == "ml":
            return (val / 1000.0, "l")
        if u == "cl":
            return (val / 100.0, "l")
        if u == "dl":
            return (val / 10.0, "l")
    raise ValueError(f"Onbekende unit: {unit}")

def parse_unit_quantity(unit_text: Optional[str]) -> Tuple[Optional[float], Optional[str]]:
    """
    Parse strings als:
      - '500 g', '1 kg', '1,5 l', '750 ml'
      - '2 x 500 ml', '3x400 g', '4 × 1 l'
    Return: (totaal_in_basiseenheid, 'kg'|'l') of (None, None)
    """
    if not unit_text:
        return (None, None)
    t = unit_text.lower().replace("\u00a0", " ").strip()

    m = re.search(r"(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl|dl)\b", t, re.I)
    if m:
        count = int(m.group(1))
        val = _to_float_eu(m.group(2))
        unit = m.group(3)
        each_base, base = _convert_to_base(val, unit)
        return (count * each_base, base)

    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl|dl)\b", t, re.I)
    if m:
        val = _to_float_eu(m.group(1))
        unit = m.group(2)
        base_val, base = _convert_to_base(val, unit)
        return (base_val, base)

    return (None, None)

def compute_unit_price(price_eur: Optional[float], unit_text: Optional[str]) -> Optional[float]:
    if price_eur is None or not unit_text:
        return None
    qty, _base = parse_unit_quantity(unit_text)
    if not qty or qty <= 0:
        return None
    return round2(price_eur / qty)

def sane_unit_price(value: Optional[float], base: Optional[str]) -> Optional[float]:
    if value is None or base is None:
        return value
    if base == "kg" and (value <= 0 or value > 200):
        return None
    if base == "l" and (value <= 0 or value > 200):
        return None
    return round2(value)
