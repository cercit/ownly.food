-- Ownly Together 07 (24 Oct 2026): automatic charges, phone pattern, "Done" status, activity with names
-- Run once in the Supabase SQL editor, after 06. Safe to re-run.
-- Built by db/make_07.py (get_group is copied from 06 and extended).

-- ---------- settings (rates live here, not in code) ----------
create table if not exists app_settings (
  key   text primary key,
  value numeric not null,
  note  text
);
insert into app_settings (key, value, note) values
  ('delivery_per_km', 20,   'Delivery: rupees per km, restaurant to delivery address (Sameer, 24 Oct 2026)'),
  ('gst_rate',        0.05, 'Taxes: GST on the food total (Sameer, 24 Oct 2026)')
on conflict (key) do nothing;
alter table app_settings enable row level security;
drop policy if exists settings_read on app_settings;
create policy settings_read on app_settings for select using (true);
revoke all on app_settings from anon, authenticated;
grant select on app_settings to anon, authenticated;

create or replace function setting(k text) returns numeric
language sql stable security definer set search_path = public, extensions as $$
  select value from app_settings where key = k
$$;

-- ---------- packaging per restaurant ----------
-- Rs 15 per dish for low-end restaurants, Rs 30 for higher-end (average menu price Rs 250 or more)
alter table restaurants add column if not exists packaging_per_item numeric(6,2) not null default 15;
update restaurants r set packaging_per_item = case
  when (select avg(price) from menu_items m where m.restaurant_id = r.id) >= 250 then 30 else 15 end;

-- ---------- distance and charges ----------
create or replace function km_between(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) returns numeric
language sql immutable as $$
  select (2 * 6371 * asin(sqrt(
           power(sin(radians((lat2 - lat1)::float8) / 2), 2) +
           cos(radians(lat1::float8)) * cos(radians(lat2::float8)) * power(sin(radians((lng2 - lng1)::float8) / 2), 2))))::numeric
$$;

-- Charges for a group order, worked out by the database (the host can't edit them).
-- An address without a map pin uses the middle of its area (average position of the restaurants there).
create or replace function charges_for(g uuid) returns json
language plpgsql stable security definer set search_path = public, extensions as $$
declare o group_orders; r restaurants; a addresses; alat numeric; alng numeric; km numeric; dishes int; food numeric;
        delivery numeric; packaging numeric; taxes numeric;
begin
  select * into o from group_orders where id = g;
  select * into r from restaurants where id = o.restaurant_id;
  select * into a from addresses where id = o.delivery_address_id;
  alat := a.lat; alng := a.lng;
  if alat is null or alng is null then
    select avg(lat), avg(lng) into alat, alng from restaurants where lower(area) = lower(a.area) and lower(city) = lower(a.city);
  end if;
  if alat is null or alng is null then
    select avg(lat), avg(lng) into alat, alng from restaurants where lower(city) = lower(a.city);
  end if;
  km := case when alat is null or r.lat is null then 0 else round(km_between(r.lat, r.lng, alat, alng), 1) end;
  select coalesce(sum(qty), 0), coalesce(sum(qty * unit_price), 0) into dishes, food from order_items where group_order_id = g;
  delivery  := round(km * setting('delivery_per_km'));
  packaging := dishes * r.packaging_per_item;
  taxes     := round(food * setting('gst_rate'), 2);
  return json_build_object('distance_km', km, 'pinned', a.lat is not null, 'dishes', dishes,
    'delivery', delivery, 'packaging', packaging, 'taxes', taxes, 'total', delivery + packaging + taxes,
    'per_km', setting('delivery_per_km'), 'packaging_per_item', r.packaging_per_item, 'gst_rate', setting('gst_rate'));
end $$;
revoke execute on function charges_for(uuid) from public, anon, authenticated;

-- ---------- place the order: charges are worked out here ----------
drop function if exists place_group(uuid, numeric, numeric, numeric);
create or replace function place_group(p_group uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
-- Split rule is the host's choice (group_orders.split_rule):
--   itemised: own dishes at full price; shared dishes and charges split equally across everyone
--   equal:    food total and charges both split equally across everyone
-- Charges (delivery, packaging, taxes) come from charges_for(), never from the browser.
declare g group_orders; c json; food_total numeric; shared_total numeric; n int; charges numeric; m record; sh numeric; ch numeric; host_mem uuid;
begin
  select * into g from group_orders where id = p_group;
  if g.host_id is distinct from me() then raise exception 'Only the host can place the order'; end if;
  if g.status not in ('open', 'locked') then raise exception 'This order is already %', g.status; end if;
  food_total := group_value(p_group);
  if food_total = 0 then raise exception 'The cart is empty'; end if;
  c := charges_for(p_group);
  update group_orders set status = 'placed', placed_at = now(), delivery_fee = (c->>'delivery')::numeric,
         packaging_fee = (c->>'packaging')::numeric, taxes = (c->>'taxes')::numeric where id = p_group;

  select count(*) into n from group_members where group_order_id = p_group and status = 'joined';
  select coalesce(sum(qty * unit_price), 0) into shared_total from order_items where group_order_id = p_group and is_shared;
  charges := (c->>'total')::numeric;
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
revoke execute on function place_group(uuid) from public, anon;
grant execute on function place_group(uuid) to authenticated;

-- ---------- phone: 10-digit Indian mobile, checked by pattern (no OTP) ----------
update profiles set phone = right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) where phone is not null;
update profiles set phone = null where phone is not null and phone !~ '^[6-9][0-9]{9}$';
alter table profiles drop constraint if exists profiles_phone_check;
alter table profiles add constraint profiles_phone_check check (phone is null or phone ~ '^[6-9][0-9]{9}$');

-- ---------- "Done" status per person ----------
alter table group_members add column if not exists done_at timestamptz;

create or replace function set_done(p_group uuid, p_done boolean default true)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if (select status from group_orders where id = p_group) <> 'open' then raise exception 'This group order is locked'; end if;
  update group_members set done_at = case when p_done then now() end
   where group_order_id = p_group and user_id = me() and status = 'joined';
  if not found then raise exception 'Join this group order first'; end if;
end $$;
revoke execute on function set_done(uuid, boolean) from public, anon;
grant execute on function set_done(uuid, boolean) to authenticated;

-- adding or removing a dish switches that person back to "Adding items"
create or replace function reset_done() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  update group_members set done_at = null where id = coalesce(new.member_id, old.member_id) and done_at is not null;
  return null;
end $$;
revoke execute on function reset_done() from public, anon, authenticated;
drop trigger if exists order_items_reset_done on order_items;
create trigger order_items_reset_done after insert or delete on order_items
  for each row execute function reset_done();

-- ---------- group activity with names (members only) ----------
create or replace function group_activity(p_group uuid)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not is_member(p_group) then raise exception 'Join this group order first'; end if;
  return (select coalesce(json_agg(json_build_object('at', a.at, 'who', coalesce(p.full_name, 'Ownly'), 'is_me', a.actor_id = me(),
            'table_name', a.table_name, 'action', a.action, 'changes', a.changes) order by a.id), '[]')
          from audit_log a left join profiles p on p.id = a.actor_id
         where a.group_order_id = p_group);
end $$;
revoke execute on function group_activity(uuid) from public, anon;
grant execute on function group_activity(uuid) to authenticated;
