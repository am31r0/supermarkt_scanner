from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Product(BaseModel):
    source: str                     # 'ah' | 'jumbo' | 'dirk' | ...
    scraped_at: datetime
    product_id: Optional[str] = None
    name: str
    price_eur: float                # actuele prijs
    unit_size: Optional[str] = None # bv "500 g", "1 l"
    unit_price_eur: Optional[float] = None  # prijs per kg/l waar mogelijk
    category: Optional[str] = None
    promo_badge: Optional[str] = None       # bv "-20%", "Bonus", etc.
    old_price_eur: Optional[float] = None   # referentie bij korting
    url: Optional[str] = None
    img: Optional[str] = None
    unit_base: Optional[str] = None  # 'kg' of 'l' wanneer unit_price_eur is berekend
