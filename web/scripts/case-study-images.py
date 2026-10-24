"""Copies the portfolio images into web/public/case-study/img as web-sized WebP files.
Run from the repo root: python web/scripts/case-study-images.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'web' / 'public' / 'case-study' / 'img'
OUT.mkdir(parents=True, exist_ok=True)
STITCH = ROOT / 'stitch' / 'stitch_ownly_together_group_ordering'

IMAGES = {
    'problem.webp': ROOT / 'docs/00-problem/Ownly_Chennai_Group_Ordering_Problem.png',
    'concept.webp': ROOT / 'docs/00-concept/Ownly_Together_Chennai_Group_Ordering_Concept.png',
    'one-pager.webp': ROOT / 'docs/00-concept/Ownly_Together_Executive_Product_One_Pager_Chennai.png',
    'rules.webp': ROOT / 'docs/07-product-rules/Ownly_Together_Product_Rules.png',
    'market.webp': ROOT / 'docs/01-market/Chennai_Group_Food_Ordering_Opportunity.png',
    'competitors.webp': ROOT / 'docs/01-market/Ownly_Together_Chennai_Competitor_Analysis.png',
    'research.webp': ROOT / 'docs/02-user-research/Ownly_Together_User_Research_Plan.webp',
    'personas.webp': ROOT / 'docs/03-personas/Ownly_Together_Chennai_User_Personas.png',
    'story-office.webp': ROOT / 'docs/03-personas/Chennai_Smarter_Office_Lunch_Together.png',
    'story-food.webp': ROOT / 'docs/03-personas/Ownly_Together_Chennai_Food_Stories.png',
    'journey.webp': ROOT / 'docs/04-customer-journey/Ownly_Together_Journey_Map.png',
    'roadmap.webp': ROOT / 'docs/05-roadmap/Ownly_Chennai_12_Week_Product_Roadmap.png',
    'gtm.webp': ROOT / 'docs/06-go-to-market/Ownly_Together_Chennai_Launch_GTM.png',
    'stitch-menu.webp': STITCH / '03_restaurant_menu/screen.png',
    'stitch-start.webp': STITCH / '04_start_group_order/screen.png',
    'stitch-cart.webp': STITCH / '06_shared_cart/screen.png',
    'stitch-checkout.webp': STITCH / '07_host_checkout/screen.png',
}

for name, src in IMAGES.items():
    im = Image.open(src).convert('RGB')
    width = 900 if name.startswith('stitch-') else 1800
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / name, 'WEBP', quality=82, method=6)
    print(f'{name:22} {im.width}x{im.height}  {(OUT / name).stat().st_size // 1024} KB  <- {src.stat().st_size // 1024} KB')
