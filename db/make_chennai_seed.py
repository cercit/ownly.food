"""Builds db/05_chennai_split_images.sql from db/chennai/restaurants.csv and menu_items.csv.

Run: python db/make_chennai_seed.py
The SQL adds picture columns, the host's split rule, and swaps the catalogue to Chennai.
Dishes without a photo get the most-used photo of their category, else their restaurant's photo.
"""
import csv, collections, os

HERE = os.path.dirname(os.path.abspath(__file__))
R = list(csv.DictReader(open(os.path.join(HERE, 'chennai', 'restaurants.csv'), encoding='utf-8-sig')))
M = list(csv.DictReader(open(os.path.join(HERE, 'chennai', 'menu_items.csv'), encoding='utf-8-sig')))

q = lambda s: "'" + s.replace("'", "''") + "'"
rest_img = {r['name']: r['image_url'] for r in R}
by_cat = collections.defaultdict(collections.Counter)
for m in M:
    if m['image_url']:
        by_cat[m['category']][m['image_url']] += 1
def img(m):
    if m['image_url']:
        return m['image_url']
    if by_cat[m['category']]:
        return by_cat[m['category']].most_common(1)[0][0]
    return rest_img[m['restaurant_name']]

SCHEMA = open(os.path.join(HERE, '05_parts', 'schema_and_logic.sql'), encoding='utf-8').read()

out = [SCHEMA, '\n-- ---------- 3. Chennai catalogue (15 restaurants, 150 dishes) ----------',
       '-- Old Bengaluru/Hyderabad restaurants go, with any test group orders placed on them.',
       "delete from group_orders where restaurant_id in (select id from restaurants where city <> 'Chennai');",
       "delete from restaurants where city <> 'Chennai';", '']
out.append('insert into restaurants (name, cuisine, area, city, lat, lng, veg_only, opens_at, closes_at, active, image_url)\nselect * from (values')
rows = [f"  ({q(r['name'])}, {q(r['cuisine'])}, {q(r['area'])}, {q(r['city'])}, {r['lat']}, {r['lng']}, {r['veg_only']}, "
        f"time {q(r['opens_at'])}, time {q(r['closes_at'])}, {r['active']}, {q(r['image_url'])})" for r in R]
out.append(',\n'.join(rows))
out.append(') v(name, cuisine, area, city, lat, lng, veg_only, opens_at, closes_at, active, image_url)\n'
           'where not exists (select 1 from restaurants x where x.name = v.name);\n')
out.append('insert into menu_items (restaurant_id, name, category, price, is_veg, is_available, image_url)\n'
           'select r.id, v.name, v.category, v.price, v.is_veg, v.is_available, v.image_url from (values')
rows = [f"  ({q(m['restaurant_name'])}, {q(m['name'])}, {q(m['category'])}, {m['price']}, {m['is_veg']}, {m['is_available']}, {q(img(m))})" for m in M]
out.append(',\n'.join(rows))
out.append(') v(restaurant, name, category, price, is_veg, is_available, image_url)\n'
           'join restaurants r on r.name = v.restaurant\n'
           'where not exists (select 1 from menu_items x where x.restaurant_id = r.id and x.name = v.name);\n')

dst = os.path.join(HERE, '05_chennai_split_images.sql')
open(dst, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print('wrote', dst, len(R), 'restaurants', len(M), 'dishes',
      sum(1 for m in M if not m['image_url']), 'photos filled from category/restaurant')
