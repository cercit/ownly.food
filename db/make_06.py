"""Builds db/06_delivered.sql: mark_delivered() plus get_group() from 05 with placed_at and delivered_at.

Run: python db/make_06.py
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
part = open(os.path.join(HERE, '06_parts', 'mark_delivered.sql'), encoding='utf-8').read()
src = open(os.path.join(HERE, '05_parts', 'schema_and_logic.sql'), encoding='utf-8').read()

m = re.search(r"create or replace function get_group\(.*?\nend \$\$;\n", src, re.S)
get_group = m.group(0)
old = "'id', g.id, 'share_code', g.share_code, 'status', g.status, 'cut_off_at', g.cut_off_at, 'split_rule', g.split_rule,"
assert get_group.count(old) == 1
get_group = get_group.replace(old, old + "\n    'placed_at', g.placed_at, 'delivered_at', g.delivered_at,")

out = part + '\n-- get_group now also returns placed_at and delivered_at (for the shared tracking timer)\n' + get_group
open(os.path.join(HERE, '06_delivered.sql'), 'w', encoding='utf-8', newline='\n').write(out)
print('wrote 06_delivered.sql', len(out), 'chars')
