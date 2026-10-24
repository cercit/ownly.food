-- Ownly Together 08 (24 Oct 2026): cash collected by the host is passed on to the restaurant
-- When a member pays the host in cash, the money is with the host, not the restaurant.
-- The host then pays that cash on (UPI, card or netbanking) and the group sees it settled.
-- Run once in the Supabase SQL editor, after 07. Safe to re-run. Built by db/make_08.py.

alter table payments add column if not exists cash_passed_on_at timestamptz;
alter table payments add column if not exists cash_passed_on_method pay_method;
alter table payments add column if not exists cash_passed_on_ref text;

-- pay my share: same as before, except the host cannot "pay the host in cash" for their own share
create or replace function pay_share(p_group uuid, p_method pay_method)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare p payments; is_host boolean;
begin
  select pay.* into p from payments pay join group_members gm on gm.id = pay.member_id
   where pay.group_order_id = p_group and gm.user_id = me();
  if p.id is null then raise exception 'You have nothing to pay on this order'; end if;
  select role = 'host' into is_host from group_members where id = p.member_id;
  if p.status = 'paid' then
    return json_build_object('status', 'paid', 'reference', p.gateway_payment_id, 'already', true);
  end if;
  if is_host and p_method = 'cash' then raise exception 'As the host, pay your share online (UPI, card or netbanking)'; end if;
  update payments set status = 'paid', method_type = p_method, paid_at = now(),
         gateway_payment_id = case when p_method = 'cash' then 'CASH-TO-HOST'
                                   else 'pay_TEST_' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)) end
   where id = p.id returning * into p;
  return json_build_object('status', 'paid', 'reference', p.gateway_payment_id, 'already', false);
end $$;

-- host passes on all the cash they have collected in this group order, in one payment
create or replace function pass_on_cash(p_group uuid, p_method pay_method)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare g group_orders; amount numeric; n int; ref text;
begin
  select * into g from group_orders where id = p_group;
  if g.host_id is distinct from me() then raise exception 'Only the host can pass on cash'; end if;
  if p_method = 'cash' then raise exception 'Pass the cash on online: UPI, card or netbanking'; end if;
  select coalesce(sum(total), 0), count(*) into amount, n from payments
   where group_order_id = p_group and method_type = 'cash' and status = 'paid' and cash_passed_on_at is null;
  if n = 0 then raise exception 'There is no cash to pass on'; end if;
  ref := 'pay_TEST_' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
  update payments set cash_passed_on_at = now(), cash_passed_on_method = p_method, cash_passed_on_ref = ref
   where group_order_id = p_group and method_type = 'cash' and status = 'paid' and cash_passed_on_at is null;
  return json_build_object('amount', amount, 'shares', n, 'reference', ref);
end $$;
revoke execute on function pass_on_cash(uuid, pay_method) from public, anon;
grant execute on function pass_on_cash(uuid, pay_method) to authenticated;

-- get_group: adds cash hand-over status per share and the amount the host still holds
create or replace function get_group(p_group uuid default null, p_code text default null)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare g group_orders;
begin
  select * into g from group_orders
   where (p_group is not null and id = p_group) or (p_code is not null and share_code = upper(trim(p_code)));
  if g.id is null then raise exception 'Group order not found'; end if;
  if not is_member(g.id) then
    -- a non-member holding the code sees only enough to decide whether to join
    return (select json_build_object('id', g.id, 'share_code', g.share_code, 'status', g.status, 'cut_off_at', g.cut_off_at,
             'restaurant', r.name, 'area', r.area, 'image_url', r.image_url, 'host', p.full_name, 'split_rule', g.split_rule,
             'members', (select count(*) from group_members where group_order_id = g.id and status = 'joined'),
             'is_member', false)
            from restaurants r, profiles p where r.id = g.restaurant_id and p.id = g.host_id);
  end if;
  return json_build_object(
    'id', g.id, 'share_code', g.share_code, 'status', g.status, 'cut_off_at', g.cut_off_at, 'split_rule', g.split_rule,
    'placed_at', g.placed_at, 'delivered_at', g.delivered_at,
    'delivery_fee', g.delivery_fee, 'packaging_fee', g.packaging_fee, 'taxes', g.taxes,
    'charges', case when g.status in ('open', 'locked') then charges_for(g.id)
                    else json_build_object('delivery', g.delivery_fee, 'packaging', g.packaging_fee, 'taxes', g.taxes,
                                           'total', coalesce(g.delivery_fee, 0) + coalesce(g.packaging_fee, 0) + coalesce(g.taxes, 0),
                                           'distance_km', (charges_for(g.id) ->> 'distance_km')::numeric) end,
    'max_members', g.max_members, 'food_total', group_value(g.id), 'is_member', true,
    'is_host', g.host_id = me(),
    'cash_to_pass_on', (select coalesce(sum(total), 0) from payments where group_order_id = g.id and method_type = 'cash'
                          and status = 'paid' and cash_passed_on_at is null),
    'restaurant', (select json_build_object('id', id, 'name', name, 'cuisine', cuisine, 'area', area, 'image_url', image_url, 'lat', lat, 'lng', lng) from restaurants where id = g.restaurant_id),
    'deliver_to', (select json_build_object('label', label, 'label_name', label_name, 'area', area, 'city', city,
                 'lat', coalesce((select round(avg(r2.lat), 3) from restaurants r2 where lower(r2.area) = lower(addresses.area)),
                                 (select round(avg(r3.lat), 3) from restaurants r3 where lower(r3.city) = lower(addresses.city))),
                 'lng', coalesce((select round(avg(r2.lng), 3) from restaurants r2 where lower(r2.area) = lower(addresses.area)),
                                 (select round(avg(r3.lng), 3) from restaurants r3 where lower(r3.city) = lower(addresses.city)))) from addresses where id = g.delivery_address_id),
    'members', (select coalesce(json_agg(json_build_object('member_id', gm.id, 'name', p.full_name, 'role', gm.role,
                  'is_me', gm.user_id = me(), 'done', gm.done_at is not null,
                  'items', (select coalesce(json_agg(json_build_object('id', oi.id, 'dish', mi.name, 'qty', oi.qty,
                              'unit_price', oi.unit_price, 'notes', oi.notes, 'is_veg', mi.is_veg, 'is_shared', oi.is_shared,
                              'image_url', mi.image_url) order by oi.created_at), '[]')
                            from order_items oi join menu_items mi on mi.id = oi.menu_item_id where oi.member_id = gm.id),
                  'payment', (select json_build_object('food', food_amount, 'shared_share', shared_share, 'charges_share', delivery_share, 'tax_share', tax_share,
                              'total', total, 'status', status, 'method', method_type, 'reference', gateway_payment_id, 'paid_at', paid_at,
                              'cash_passed_on', cash_passed_on_at is not null, 'cash_passed_on_ref', cash_passed_on_ref)
                            from payments where member_id = gm.id)) order by gm.role, gm.joined_at), '[]')
                from group_members gm join profiles p on p.id = gm.user_id
               where gm.group_order_id = g.id and gm.status = 'joined'));
end $$;
