"""Builds db/08_cash_handover.sql: 08_parts/cash_handover.sql plus get_group() from 07 with cash hand-over fields.

Run: python db/make_08.py
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
part = open(os.path.join(HERE, '08_parts', 'cash_handover.sql'), encoding='utf-8').read()
src = open(os.path.join(HERE, '07_fine_tune_1.sql'), encoding='utf-8').read()
get_group = re.search(r"create or replace function get_group\(.*?\nend \$\$;\n", src, re.S).group(0)

def swap(old, new):
    global get_group
    assert get_group.count(old) == 1, old
    get_group = get_group.replace(old, new)

# each share says whether cash paid to the host has been passed on
swap("'total', total, 'status', status, 'method', method_type, 'reference', gateway_payment_id, 'paid_at', paid_at)",
     "'total', total, 'status', status, 'method', method_type, 'reference', gateway_payment_id, 'paid_at', paid_at,\n"
     "                              'cash_passed_on', cash_passed_on_at is not null, 'cash_passed_on_ref', cash_passed_on_ref)")
# the group says how much cash the host still has to pass on
swap("'is_host', g.host_id = me(),",
     "'is_host', g.host_id = me(),\n"
     "    'cash_to_pass_on', (select coalesce(sum(total), 0) from payments where group_order_id = g.id and method_type = 'cash'\n"
     "                          and status = 'paid' and cash_passed_on_at is null),")

out = part + '\n-- get_group: adds cash hand-over status per share and the amount the host still holds\n' + get_group
open(os.path.join(HERE, '08_cash_handover.sql'), 'w', encoding='utf-8', newline='\n').write(out)
print('wrote 08_cash_handover.sql', len(out), 'chars')
