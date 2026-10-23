-- Ownly Together 05: Chennai catalogue, food photos, and the host's split rule (24 Oct 2026)
-- Run once in the Supabase SQL editor, after 01-04. Safe to re-run.
-- Built by db/make_chennai_seed.py from db/chennai/*.csv. Don't edit by hand; edit the CSVs or 05_parts and rebuild.

-- ---------- 1. photos ----------
alter table restaurants add column if not exists image_url text;
alter table menu_items  add column if not exists image_url text;

-- ---------- 2. the host's split rule ----------
--   itemised (default): own dishes at full price + equal share of shared dishes + equal share of Rapido charges
--   equal:              the whole bill (food + charges) split equally across everyone in the group
do $$ begin
  if not exists (select 1 from pg_type where typname = 'split_rule') then
    create type split_rule as enum ('itemised', 'equal');
  end if;
end $$;
alter table group_orders add column if not exists split_rule split_rule not null default 'itemised';

drop function if exists create_group_order(uuid, uuid, timestamptz);
create or replace function create_group_order(p_restaurant uuid, p_address uuid, p_cut_off timestamptz,
                                              p_split split_rule default 'itemised')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := me(); r restaurants; g group_orders; existing group_orders;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  select * into r from restaurants where id = p_restaurant;
  if r.id is null or not r.active then raise exception 'This restaurant is not taking orders right now'; end if;
  if p_cut_off <= now() then raise exception 'The cut-off time has to be in the future'; end if;
  if not exists (select 1 from addresses where id = p_address and user_id = uid) then
    raise exception 'Pick one of your saved addresses';
  end if;
  select * into existing from group_orders
   where host_id = uid and restaurant_id = p_restaurant and status = 'open' order by created_at desc limit 1;
  if existing.id is not null then
    return json_build_object('id', existing.id, 'share_code', existing.share_code, 'split_rule', existing.split_rule, 'existing', true);
  end if;
  insert into group_orders (share_code, host_id, restaurant_id, delivery_address_id, cut_off_at, split_rule)
  values (new_share_code(), uid, p_restaurant, p_address, p_cut_off, coalesce(p_split, 'itemised')) returning * into g;
  insert into group_members (group_order_id, user_id, role) values (g.id, uid, 'host');
  return json_build_object('id', g.id, 'share_code', g.share_code, 'split_rule', g.split_rule, 'existing', false);
end $$;
revoke execute on function create_group_order(uuid, uuid, timestamptz, split_rule) from public, anon;
grant execute on function create_group_order(uuid, uuid, timestamptz, split_rule) to authenticated;

create or replace function place_group(p_group uuid, p_delivery numeric, p_packaging numeric default 0, p_taxes numeric default 0)
returns void language plpgsql security definer set search_path = public, extensions as $$
-- Split rule is the host's choice (group_orders.split_rule):
--   itemised: own dishes at full price; shared dishes and Rapido charges split equally across everyone
--   equal:    food total and Rapido charges both split equally across everyone
-- Everyone, including the host, pays their share on the (demo) payment screen.
declare g group_orders; food_total numeric; shared_total numeric; n int; charges numeric; m record; sh numeric; ch numeric; host_mem uuid;
begin
  select * into g from group_orders where id = p_group;
  if g.host_id is distinct from me() then raise exception 'Only the host can place the order'; end if;
  if g.status not in ('open', 'locked') then raise exception 'This order is already %', g.status; end if;
  food_total := group_value(p_group);
  if food_total = 0 then raise exception 'The cart is empty'; end if;
  update group_orders set status = 'placed', placed_at = now(), delivery_fee = p_delivery,
         packaging_fee = p_packaging, taxes = p_taxes where id = p_group;

  select count(*) into n from group_members where group_order_id = p_group and status = 'joined';
  select coalesce(sum(qty * unit_price), 0) into shared_total from order_items where group_order_id = p_group and is_shared;
  charges := p_delivery + p_packaging + p_taxes;
  sh := round(shared_total / n, 2);
  ch := round(charges / n, 2);
  for m in
    select gm.id, coalesce(sum(oi.qty * oi.unit_price) filter (where not oi.is_shared), 0) as own
      from group_members gm left join order_items oi on oi.member_id = gm.id
     where gm.group_order_id = p_group and gm.status = 'joined' group by gm.id
  loop
    if g.split_rule = 'equal' then
      insert into payments (group_order_id, member_id, food_amount, shared_share, delivery_share, tax_share, total, payee, status)
      values (p_group, m.id, round(food_total / n, 2), 0, ch, 0, round(food_total / n, 2) + ch, 'host', 'pending');
    else
      insert into payments (group_order_id, member_id, food_amount, shared_share, delivery_share, tax_share, total, payee, status)
      values (p_group, m.id, m.own, sh, ch, 0, m.own + sh + ch, 'host', 'pending');
    end if;
  end loop;

  -- rounding paise go to the host so the shares add up exactly to the bill
  select id into host_mem from group_members where group_order_id = p_group and role = 'host';
  update payments set total = total + ((food_total + charges) - (select sum(total) from payments where group_order_id = p_group)),
                      delivery_share = delivery_share + ((food_total + charges) - (select sum(total) from payments where group_order_id = p_group))
   where group_order_id = p_group and member_id = host_mem;
  update payments set payee = 'restaurant' where group_order_id = p_group and member_id = host_mem;
end $$;

-- get_group now also returns the split rule and photos
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
    'delivery_fee', g.delivery_fee, 'packaging_fee', g.packaging_fee, 'taxes', g.taxes,
    'max_members', g.max_members, 'food_total', group_value(g.id), 'is_member', true,
    'is_host', g.host_id = me(),
    'restaurant', (select json_build_object('id', id, 'name', name, 'cuisine', cuisine, 'area', area, 'image_url', image_url) from restaurants where id = g.restaurant_id),
    'deliver_to', (select json_build_object('label', label, 'label_name', label_name, 'area', area, 'city', city) from addresses where id = g.delivery_address_id),
    'members', (select coalesce(json_agg(json_build_object('member_id', gm.id, 'name', p.full_name, 'role', gm.role,
                  'is_me', gm.user_id = me(),
                  'items', (select coalesce(json_agg(json_build_object('id', oi.id, 'dish', mi.name, 'qty', oi.qty,
                              'unit_price', oi.unit_price, 'notes', oi.notes, 'is_veg', mi.is_veg, 'is_shared', oi.is_shared,
                              'image_url', mi.image_url) order by oi.created_at), '[]')
                            from order_items oi join menu_items mi on mi.id = oi.menu_item_id where oi.member_id = gm.id),
                  'payment', (select json_build_object('food', food_amount, 'shared_share', shared_share, 'charges_share', delivery_share, 'tax_share', tax_share,
                              'total', total, 'status', status, 'method', method_type, 'reference', gateway_payment_id, 'paid_at', paid_at)
                            from payments where member_id = gm.id)) order by gm.role, gm.joined_at), '[]')
                from group_members gm join profiles p on p.id = gm.user_id
               where gm.group_order_id = g.id and gm.status = 'joined'));
end $$;
