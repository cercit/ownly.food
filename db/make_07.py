"""Builds db/07_fine_tune_1.sql: 07_parts/fine_tune_1.sql plus get_group() from 06 with charges and Done status.

Run: python db/make_07.py
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
part = open(os.path.join(HERE, '07_parts', 'fine_tune_1.sql'), encoding='utf-8').read()
src = open(os.path.join(HERE, '06_delivered.sql'), encoding='utf-8').read()
get_group = re.search(r"create or replace function get_group\(.*?\nend \$\$;\n", src, re.S).group(0)

def swap(old, new):
    global get_group
    assert get_group.count(old) == 1, old
    get_group = get_group.replace(old, new)

# live charges while the cart is open or locked; the stored ones once placed
swap("'delivery_fee', g.delivery_fee, 'packaging_fee', g.packaging_fee, 'taxes', g.taxes,",
     "'delivery_fee', g.delivery_fee, 'packaging_fee', g.packaging_fee, 'taxes', g.taxes,\n"
     "    'charges', case when g.status in ('open', 'locked') then charges_for(g.id)\n"
     "                    else json_build_object('delivery', g.delivery_fee, 'packaging', g.packaging_fee, 'taxes', g.taxes,\n"
     "                                           'total', coalesce(g.delivery_fee, 0) + coalesce(g.packaging_fee, 0) + coalesce(g.taxes, 0),\n"
     "                                           'distance_km', (charges_for(g.id) ->> 'distance_km')::numeric) end,")
swap("'is_me', gm.user_id = me(),", "'is_me', gm.user_id = me(), 'done', gm.done_at is not null,")
# map pins for tracking: the restaurant, and the middle of the delivery AREA (never the exact address, per the PRD privacy rule)
swap("'restaurant', (select json_build_object('id', id, 'name', name, 'cuisine', cuisine, 'area', area, 'image_url', image_url)",
     "'restaurant', (select json_build_object('id', id, 'name', name, 'cuisine', cuisine, 'area', area, 'image_url', image_url, 'lat', lat, 'lng', lng)")
swap("'deliver_to', (select json_build_object('label', label, 'label_name', label_name, 'area', area, 'city', city)",
     "'deliver_to', (select json_build_object('label', label, 'label_name', label_name, 'area', area, 'city', city,\n"
     "                 'lat', coalesce((select round(avg(r2.lat), 3) from restaurants r2 where lower(r2.area) = lower(addresses.area)),\n                                 (select round(avg(r3.lat), 3) from restaurants r3 where lower(r3.city) = lower(addresses.city))),\n"
     "                 'lng', coalesce((select round(avg(r2.lng), 3) from restaurants r2 where lower(r2.area) = lower(addresses.area)),\n                                 (select round(avg(r3.lng), 3) from restaurants r3 where lower(r3.city) = lower(addresses.city))))")

out = part + '\n-- get_group: adds live charges, Done status and map positions (delivery shown as the middle of its area, never the exact address)\n' + get_group
open(os.path.join(HERE, '07_fine_tune_1.sql'), 'w', encoding='utf-8', newline='\n').write(out)
print('wrote 07_fine_tune_1.sql', len(out), 'chars')
