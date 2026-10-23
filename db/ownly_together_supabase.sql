-- ============================================================
-- Ownly Together: complete Supabase SQL (tables, privacy rules, functions, restaurant catalogue)
-- Run ONCE on a fresh Supabase project: SQL Editor > New query > paste > Run.
-- Anyone can sign up with email OTP. Group orders up to 12 people.
-- Concept prototype by Sameer Mittimani. Not an official Rapido product. Payments are demo only.
-- ============================================================

-- Ownly Together: tables. Run 01, 02, 03 in order in the Supabase SQL editor.
-- Concept prototype by Sameer Mittimani. Demo data only.

create extension if not exists pgcrypto;

create type address_label   as enum ('home', 'office', 'friend', 'other');
create type location_source as enum ('gps', 'manual');
create type order_status    as enum ('open', 'locked', 'placed', 'delivered', 'cancelled');
create type member_role     as enum ('host', 'member');
create type member_status   as enum ('joined', 'left');
create type pay_method      as enum ('upi', 'card', 'netbanking', 'cash');
create type pay_status      as enum ('pending', 'paid', 'failed', 'refunded');
create type payee_type      as enum ('host', 'restaurant');

-- A profile exists for every person. auth_user_id is filled when that person logs in with email OTP,
-- so seeded demo people can exist before they ever sign in.
create table profiles (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid unique,
  full_name           text not null,
  email               text not null unique,
  phone               text,
  default_address_id  uuid,
  consent_location_at timestamptz,
  created_at          timestamptz not null default now()
);

create table addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  label          address_label not null,
  label_name     text not null,
  line1          text not null,
  line2          text,
  landmark       text,
  area           text not null,
  city           text not null,
  pincode        text not null check (pincode ~ '^[0-9]{6}$'),
  lat            numeric(9,6) check (lat between -90 and 90),
  lng            numeric(9,6) check (lng between -180 and 180),
  gps_accuracy_m int check (gps_accuracy_m >= 0),
  source         location_source not null default 'manual',
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);
create unique index one_default_address on addresses (user_id) where is_default;

alter table profiles add constraint profiles_default_address_fk
  foreign key (default_address_id) references addresses(id) on delete set null;

create table restaurants (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  cuisine   text not null,
  area      text not null,
  city      text not null,
  lat       numeric(9,6),
  lng       numeric(9,6),
  veg_only  boolean not null default false,
  opens_at  time not null,
  closes_at time not null,
  active    boolean not null default true
);

create table menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  category      text not null,
  price         numeric(8,2) not null check (price > 0),
  is_veg        boolean not null,
  is_available  boolean not null default true
);

create table group_orders (
  id                  uuid primary key default gen_random_uuid(),
  share_code          text not null unique check (share_code ~ '^[A-Z0-9]{6}$'),
  host_id             uuid not null references profiles(id),
  restaurant_id       uuid not null references restaurants(id),
  delivery_address_id uuid not null references addresses(id),
  cut_off_at          timestamptz not null,
  status              order_status not null default 'open',
  delivery_fee        numeric(8,2) not null default 0 check (delivery_fee >= 0),
  packaging_fee       numeric(8,2) not null default 0 check (packaging_fee >= 0),
  taxes               numeric(8,2) not null default 0 check (taxes >= 0),
  max_members         int not null default 12 check (max_members between 2 and 12),
  created_at          timestamptz not null default now(),
  placed_at           timestamptz,
  delivered_at        timestamptz
);

create table group_members (
  id             uuid primary key default gen_random_uuid(),
  group_order_id uuid not null references group_orders(id) on delete cascade,
  user_id        uuid not null references profiles(id),
  role           member_role not null default 'member',
  status         member_status not null default 'joined',
  joined_at      timestamptz not null default now(),
  unique (group_order_id, user_id)
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  group_order_id uuid not null references group_orders(id) on delete cascade,
  member_id      uuid not null references group_members(id) on delete cascade,
  menu_item_id   uuid not null references menu_items(id),
  qty            int not null check (qty between 1 and 20),
  unit_price     numeric(8,2) not null check (unit_price > 0),
  notes          text,
  is_shared      boolean not null default false,  -- shared dish: cost split across everyone in the group
  created_at     timestamptz not null default now()
);

-- Saved methods hold masked labels and gateway tokens only. Never card numbers, CVVs or UPI PINs.
create table payment_methods (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  type          pay_method not null,
  display_label text not null check (display_label !~ '[0-9]{8,}'),
  gateway_token text,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  group_order_id     uuid not null references group_orders(id) on delete cascade,
  member_id          uuid not null references group_members(id) on delete cascade,
  food_amount        numeric(8,2) not null default 0,
  shared_share       numeric(8,2) not null default 0,  -- my part of shared dishes
  delivery_share     numeric(8,2) not null default 0,  -- Rapido charges / people
  tax_share          numeric(8,2) not null default 0,
  total              numeric(8,2) not null default 0,
  payee              payee_type not null default 'host',
  method_type        pay_method,
  status             pay_status not null default 'pending',
  gateway_payment_id text,
  paid_at            timestamptz,
  unique (group_order_id, member_id)
);

create index on addresses (user_id);
create index on menu_items (restaurant_id);
create index on group_members (user_id);
create index on order_items (group_order_id);
create index on payments (group_order_id);

-- Ownly Together: login link-up, privacy rules (RLS) and the group-order functions the app calls.

-- ---------- who am I ----------
create or replace function me() returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select id from profiles where auth_user_id = auth.uid()
$$;

create or replace function is_member(g uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from group_members where group_order_id = g and user_id = me() and status = 'joined')
$$;

-- ---------- email OTP sign-up: link to an existing demo profile by email, or create one ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  update profiles set auth_user_id = new.id
   where lower(email) = lower(new.email) and auth_user_id is null;
  if not found then
    insert into profiles (auth_user_id, full_name, email)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            lower(new.email))
    on conflict (email) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- privacy rules ----------
alter table profiles        enable row level security;
alter table addresses       enable row level security;
alter table restaurants     enable row level security;
alter table menu_items      enable row level security;
alter table group_orders    enable row level security;
alter table group_members   enable row level security;
alter table order_items     enable row level security;
alter table payment_methods enable row level security;
alter table payments        enable row level security;

-- own profile only (other people's names reach the app through get_group, never their email or phone)
create policy profile_read   on profiles for select using (id = me());
create policy profile_update on profiles for update using (id = me()) with check (id = me());

-- own addresses and payment methods only
create policy address_all on addresses       for all using (user_id = me()) with check (user_id = me());
create policy method_all  on payment_methods for all using (user_id = me()) with check (user_id = me());

-- anyone can browse restaurants and menus
create policy restaurant_read on restaurants for select using (true);
create policy menu_read       on menu_items  for select using (true);

-- group data: members can read; all writes go through the functions below
create policy group_read   on group_orders  for select using (is_member(id));
create policy member_read  on group_members for select using (is_member(group_order_id));
create policy item_read    on order_items   for select using (is_member(group_order_id));
create policy payment_read on payments      for select using (is_member(group_order_id));

grant usage on schema public to anon, authenticated;
grant select on restaurants, menu_items to anon, authenticated;
grant select, update on profiles to authenticated;
grant select, insert, update, delete on addresses, payment_methods to authenticated;
grant select on group_orders, group_members, order_items, payments to authenticated;

-- ---------- helpers ----------
create or replace function new_share_code() returns text
language plpgsql set search_path = public, extensions as $$
declare c text;
begin
  loop
    c := upper(substr(translate(encode(gen_random_bytes(8), 'base64'), '/+=0O1I', ''), 1, 6));
    exit when length(c) = 6 and not exists (select 1 from group_orders where share_code = c);
  end loop;
  return c;
end $$;

create or replace function group_value(g uuid) returns numeric
language sql stable as $$
  select coalesce(sum(qty * unit_price), 0) from order_items where group_order_id = g
$$;

-- ---------- S1: start a group order ----------
create or replace function create_group_order(p_restaurant uuid, p_address uuid, p_cut_off timestamptz)
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
    return json_build_object('id', existing.id, 'share_code', existing.share_code, 'existing', true);
  end if;
  insert into group_orders (share_code, host_id, restaurant_id, delivery_address_id, cut_off_at)
  values (new_share_code(), uid, p_restaurant, p_address, p_cut_off) returning * into g;
  insert into group_members (group_order_id, user_id, role) values (g.id, uid, 'host');
  return json_build_object('id', g.id, 'share_code', g.share_code, 'existing', false);
end $$;

-- ---------- S2: join with a code, add and remove items ----------
create or replace function join_group(p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := me(); g group_orders; m group_members;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  select * into g from group_orders where share_code = upper(trim(p_code));
  if g.id is null then raise exception 'No group order with that code'; end if;
  select * into m from group_members where group_order_id = g.id and user_id = uid;
  if m.id is not null and m.status = 'joined' then
    return json_build_object('group_order_id', g.id, 'member_id', m.id, 'already', true);
  end if;
  if g.status <> 'open' or g.cut_off_at <= now() then raise exception 'This group order is closed'; end if;
  if (select count(*) from group_members where group_order_id = g.id and status = 'joined') >= g.max_members then
    raise exception 'This group is full (% people)', g.max_members;
  end if;
  if m.id is not null then
    update group_members set status = 'joined', joined_at = now() where id = m.id returning * into m;
  else
    insert into group_members (group_order_id, user_id) values (g.id, uid) returning * into m;
  end if;
  return json_build_object('group_order_id', g.id, 'member_id', m.id, 'already', false);
end $$;

create or replace function add_item(p_group uuid, p_menu_item uuid, p_qty int default 1, p_notes text default null, p_shared boolean default false)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare g group_orders; mi menu_items; mem uuid; new_id uuid;
begin
  select * into g from group_orders where id = p_group;
  select id into mem from group_members where group_order_id = p_group and user_id = me() and status = 'joined';
  if mem is null then raise exception 'Join this group order first'; end if;
  if g.status <> 'open' or g.cut_off_at <= now() then raise exception 'This group order is locked'; end if;
  select * into mi from menu_items where id = p_menu_item;
  if mi.id is null or mi.restaurant_id <> g.restaurant_id then raise exception 'That dish is not on this restaurant''s menu'; end if;
  if not mi.is_available then raise exception '% is not available right now', mi.name; end if;
  insert into order_items (group_order_id, member_id, menu_item_id, qty, unit_price, notes, is_shared)
  values (p_group, mem, p_menu_item, p_qty, mi.price, p_notes, coalesce(p_shared, false)) returning id into new_id;
  return new_id;
end $$;

create or replace function remove_item(p_item uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare it order_items; g group_orders;
begin
  select * into it from order_items where id = p_item;
  if it.id is null then return; end if;
  if not exists (select 1 from group_members where id = it.member_id and user_id = me()) then
    raise exception 'You can only remove your own items';
  end if;
  select * into g from group_orders where id = it.group_order_id;
  if g.status <> 'open' then raise exception 'This group order is locked'; end if;
  delete from order_items where id = p_item;
end $$;

create or replace function leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare m group_members;
begin
  select * into m from group_members where group_order_id = p_group and user_id = me();
  if m.id is null then return; end if;
  if m.role = 'host' then raise exception 'The host cannot leave. Cancel the order instead.'; end if;
  if (select status from group_orders where id = p_group) <> 'open' then raise exception 'This group order is locked'; end if;
  delete from order_items where member_id = m.id;
  update group_members set status = 'left' where id = m.id;
end $$;

-- ---------- host: lock, place (creates everyone's share), cancel ----------
create or replace function lock_group(p_group uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update group_orders set status = 'locked' where id = p_group and host_id = me() and status = 'open';
  if not found then raise exception 'Only the host can lock an open group order'; end if;
end $$;

create or replace function place_group(p_group uuid, p_delivery numeric, p_packaging numeric default 0, p_taxes numeric default 0)
returns void language plpgsql security definer set search_path = public, extensions as $$
-- Split rule (Sameer, 23 Oct 2026):
--   your own dishes        -> you pay their full price
--   dishes marked shared   -> split equally across everyone in the group
--   Rapido charges (delivery + packaging + taxes) -> split equally across everyone in the group
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
    insert into payments (group_order_id, member_id, food_amount, shared_share, delivery_share, tax_share, total, payee, status)
    values (p_group, m.id, m.own, sh, ch, 0, m.own + sh + ch, 'host', 'pending');
  end loop;

  -- rounding paise go to the host so the shares add up exactly to the bill
  select id into host_mem from group_members where group_order_id = p_group and role = 'host';
  update payments set total = total + ((food_total + charges) - (select sum(total) from payments where group_order_id = p_group)),
                      delivery_share = delivery_share + ((food_total + charges) - (select sum(total) from payments where group_order_id = p_group))
   where group_order_id = p_group and member_id = host_mem;
  update payments set payee = 'restaurant' where group_order_id = p_group and member_id = host_mem;
end $$;

create or replace function cancel_group(p_group uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update group_orders set status = 'cancelled' where id = p_group and host_id = me() and status in ('open', 'locked');
  if not found then raise exception 'Only the host can cancel, and only before the order is placed'; end if;
end $$;

-- ---------- S3: pay my share (test mode) ----------
create or replace function pay_share(p_group uuid, p_method pay_method)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare p payments;
begin
  select pay.* into p from payments pay join group_members gm on gm.id = pay.member_id
   where pay.group_order_id = p_group and gm.user_id = me();
  if p.id is null then raise exception 'You have nothing to pay on this order'; end if;
  if p.status = 'paid' then
    return json_build_object('status', 'paid', 'reference', p.gateway_payment_id, 'already', true);
  end if;
  update payments set status = 'paid', method_type = p_method, paid_at = now(),
         gateway_payment_id = case when p_method = 'cash' then 'CASH-TO-HOST'
                                   else 'pay_TEST_' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)) end
   where id = p.id returning * into p;
  return json_build_object('status', 'paid', 'reference', p.gateway_payment_id, 'already', false);
end $$;

-- ---------- one call for the shared-cart and split screens ----------
-- Returns names only for other people. Never their email, phone or saved addresses.
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
             'restaurant', r.name, 'area', r.area, 'host', p.full_name,
             'members', (select count(*) from group_members where group_order_id = g.id and status = 'joined'),
             'is_member', false)
            from restaurants r, profiles p where r.id = g.restaurant_id and p.id = g.host_id);
  end if;
  return json_build_object(
    'id', g.id, 'share_code', g.share_code, 'status', g.status, 'cut_off_at', g.cut_off_at,
    'delivery_fee', g.delivery_fee, 'packaging_fee', g.packaging_fee, 'taxes', g.taxes,
    'max_members', g.max_members, 'food_total', group_value(g.id), 'is_member', true,
    'is_host', g.host_id = me(),
    'restaurant', (select json_build_object('id', id, 'name', name, 'cuisine', cuisine, 'area', area) from restaurants where id = g.restaurant_id),
    'deliver_to', (select json_build_object('label', label, 'label_name', label_name, 'area', area, 'city', city) from addresses where id = g.delivery_address_id),
    'members', (select coalesce(json_agg(json_build_object('member_id', gm.id, 'name', p.full_name, 'role', gm.role,
                  'is_me', gm.user_id = me(),
                  'items', (select coalesce(json_agg(json_build_object('id', oi.id, 'dish', mi.name, 'qty', oi.qty,
                              'unit_price', oi.unit_price, 'notes', oi.notes, 'is_veg', mi.is_veg, 'is_shared', oi.is_shared) order by oi.created_at), '[]')
                            from order_items oi join menu_items mi on mi.id = oi.menu_item_id where oi.member_id = gm.id),
                  'payment', (select json_build_object('food', food_amount, 'shared_share', shared_share, 'charges_share', delivery_share, 'tax_share', tax_share,
                              'total', total, 'status', status, 'method', method_type, 'reference', gateway_payment_id, 'paid_at', paid_at)
                            from payments where member_id = gm.id)) order by gm.role, gm.joined_at), '[]')
                from group_members gm join profiles p on p.id = gm.user_id
               where gm.group_order_id = g.id and gm.status = 'joined'));
end $$;

-- my group orders for the history screen
create or replace function my_group_orders()
returns json language sql stable security definer set search_path = public, extensions as $$
  select coalesce(json_agg(json_build_object('id', g.id, 'share_code', g.share_code, 'status', g.status,
           'restaurant', r.name, 'created_at', g.created_at, 'placed_at', g.placed_at, 'role', gm.role,
           'members', (select count(*) from group_members x where x.group_order_id = g.id and x.status = 'joined'),
           'my_total', (select total from payments where member_id = gm.id),
           'my_payment_status', (select status from payments where member_id = gm.id)) order by g.created_at desc), '[]')
    from group_members gm join group_orders g on g.id = gm.group_order_id join restaurants r on r.id = g.restaurant_id
   where gm.user_id = me() and gm.status = 'joined'
$$;

grant execute on function create_group_order, join_group, add_item, remove_item, leave_group, lock_group,
  place_group, cancel_group, pay_share, get_group, my_group_orders, me to authenticated;

-- Ownly Together restaurant catalogue (invented restaurants and dishes). Safe to re-run.
delete from menu_items; delete from restaurants where id in ('dd20eb8e-756a-5142-8ffb-a8173bf70f81', '39aae235-cb97-567d-8b9e-52227d94c436', 'b1c61a31-315a-56fa-b710-78808d6401ed', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', '81007c52-7a43-5f52-95c8-c21f1781b915', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e');

insert into restaurants (id, name, cuisine, area, city, lat, lng, veg_only, opens_at, closes_at, active) values
  ('dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Tiffin Tales', 'South Indian', 'Koramangala', 'Bengaluru', 12.933214, 77.623189, true, '07:00', '22:30', true),
  ('39aae235-cb97-567d-8b9e-52227d94c436', 'Biryani Bros', 'Biryani', 'HSR Layout', 'Bengaluru', 12.910733, 77.64579, false, '11:00', '23:30', true),
  ('b1c61a31-315a-56fa-b710-78808d6401ed', 'Green Bowl Co.', 'Salads and Bowls', 'BTM Layout', 'Bengaluru', 12.917873, 77.611977, true, '10:00', '22:00', true),
  ('0749c417-202d-5eb7-9b67-ec79be6dc328', 'Roll Republic', 'Rolls', 'Koramangala', 'Bengaluru', 12.937289, 77.628343, false, '12:00', '01:00', true),
  ('f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Dosa District', 'South Indian', 'Indiranagar', 'Bengaluru', 12.974982, 77.638853, true, '07:30', '22:30', true),
  ('c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Hyderabadi Handi', 'Hyderabadi', 'Gachibowli', 'Hyderabad', 17.443992, 78.351284, false, '11:30', '23:30', true),
  ('81007c52-7a43-5f52-95c8-c21f1781b915', 'Chai and Chakna', 'Snacks', 'HITEC City', 'Hyderabad', 17.445583, 78.374978, true, '08:00', '23:00', true),
  ('81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Pizza Patio', 'Pizza', 'Madhapur', 'Hyderabad', 17.445327, 78.389703, false, '11:00', '00:00', true);

insert into menu_items (id, restaurant_id, name, category, price, is_veg, is_available) values
  ('caac9eaa-aa4c-5b6b-9401-987a160ee00c', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Masala Dosa', 'Dosa', 90, true, true),
  ('4b238984-baef-58df-a09e-16f3071283b1', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Ghee Podi Idli', 'Idli', 80, true, true),
  ('0327fbc7-7628-5532-a834-3acff100aaad', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Rava Dosa', 'Dosa', 100, true, true),
  ('1f1d8cc7-dd4c-5b66-bd8e-85118b5b56e1', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Mini Meals', 'Meals', 140, true, true),
  ('f9ba7131-90c9-545a-bccb-902ae54b3d67', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Bisi Bele Bath', 'Rice', 110, true, true),
  ('5b81bf28-3b0c-52da-b08d-039b31e39d70', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Medu Vada (2)', 'Snacks', 60, true, true),
  ('73c18337-3b20-5e2d-a039-582564e4f9dd', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Filter Coffee', 'Beverages', 40, true, true),
  ('90acc9d0-e1c0-5aba-9e66-631799b2c2d7', 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', 'Kesari Bath', 'Desserts', 50, true, true),
  ('a1805030-7f0e-5858-9353-637249face12', '39aae235-cb97-567d-8b9e-52227d94c436', 'Chicken Dum Biryani', 'Biryani', 249, false, true),
  ('a8c169ae-1adc-50ce-ae72-993e4593d14a', '39aae235-cb97-567d-8b9e-52227d94c436', 'Mutton Biryani', 'Biryani', 329, false, false),
  ('fa94e712-2104-58a4-a232-510392fdb9c5', '39aae235-cb97-567d-8b9e-52227d94c436', 'Veg Dum Biryani', 'Biryani', 199, true, true),
  ('ea5b2c8d-19a3-5799-90d5-7bdaf03cb203', '39aae235-cb97-567d-8b9e-52227d94c436', 'Egg Biryani', 'Biryani', 189, false, true),
  ('a2431075-6f45-5c4e-bdb4-9c8441bc088e', '39aae235-cb97-567d-8b9e-52227d94c436', 'Chicken 65', 'Starters', 179, false, true),
  ('c61899f5-8674-5131-b1f7-9c9e0a689c1a', '39aae235-cb97-567d-8b9e-52227d94c436', 'Mirchi ka Salan', 'Sides', 69, true, true),
  ('d8f1cada-ad3b-5329-ae5d-f758facf3c8c', '39aae235-cb97-567d-8b9e-52227d94c436', 'Raita', 'Sides', 39, true, true),
  ('345bed51-79ea-579e-96a8-7e7077da1305', '39aae235-cb97-567d-8b9e-52227d94c436', 'Double ka Meetha', 'Desserts', 89, true, true),
  ('5dd996a1-0c67-54ce-8d3e-62adac34cd1d', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Paneer Tikka Bowl', 'Bowls', 219, true, true),
  ('adaa328c-c9ba-5c01-9500-85b16f9e07a3', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Quinoa Buddha Bowl', 'Bowls', 249, true, true),
  ('56891eff-d6e1-5f60-831e-a7db3231d2d7', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Greek Salad', 'Salads', 199, true, true),
  ('abd1cbf8-c9b2-5801-8258-5f5149826166', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Peanut Noodle Salad', 'Salads', 189, true, true),
  ('1e21d6a2-b461-5481-899e-3bfc8754d09a', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Hummus Wrap', 'Wraps', 169, true, true),
  ('06f81d47-3b65-5a9c-8447-eff389507f27', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Cold Pressed Juice', 'Beverages', 119, true, true),
  ('f6f8364a-bd5f-5468-914f-e46792c5b084', 'b1c61a31-315a-56fa-b710-78808d6401ed', 'Oats Brownie', 'Desserts', 89, true, true),
  ('b5fd4dc7-ec59-5f5b-b430-b5b5c68aecbd', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Chicken Tikka Roll', 'Rolls', 149, false, true),
  ('fdde49b9-978a-54d4-bdd7-b6e1d67bc5af', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Paneer Kathi Roll', 'Rolls', 129, true, true),
  ('ba73581c-ba92-56e8-9c7e-acf3729b56da', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Double Egg Roll', 'Rolls', 99, false, true),
  ('f665a0d4-3134-5812-85dd-baafb4703bbf', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Mutton Seekh Roll', 'Rolls', 179, false, true),
  ('4bc7f9b5-4d0b-586b-8d48-f1eaf03b142b', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Aloo Tikki Roll', 'Rolls', 89, true, true),
  ('86980403-7cf9-59f1-95e4-b4af0fe9d7c6', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Masala Fries', 'Sides', 79, true, true),
  ('65837568-963a-58bc-a807-80de69480f88', '0749c417-202d-5eb7-9b67-ec79be6dc328', 'Mint Lime Soda', 'Beverages', 59, true, true),
  ('5667dd90-9278-5ca1-853f-c3e370ff3ed1', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Benne Masala Dosa', 'Dosa', 120, true, true),
  ('0dc153d2-06a7-5d58-ba82-680f5049ffb3', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Set Dosa', 'Dosa', 95, true, true),
  ('2db1440a-5a82-5dbc-8bc9-6061a6eba973', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Onion Uttapam', 'Uttapam', 110, true, true),
  ('eda4bc72-d1a9-5eb1-97dd-5560a66c8331', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Pongal', 'Rice', 90, true, true),
  ('954a150e-fc59-58a1-abcb-d0f51fb138fa', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Vada Sambar', 'Snacks', 70, true, true),
  ('e60c4ab8-f431-5795-af8a-442d5cc6a53a', 'f9639085-0bd1-5d6f-93d4-b66536aedb3e', 'Badam Milk', 'Beverages', 60, true, true),
  ('5486039e-ad16-5cf9-8ee8-fbfa18b601f8', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Hyderabadi Chicken Biryani', 'Biryani', 269, false, true),
  ('f92cc87e-ee66-55a3-b681-d9e9ba7e7111', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Haleem', 'Mains', 239, false, true),
  ('b1152b59-b21c-5c97-b93f-9c13c990f1e2', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Paneer Biryani', 'Biryani', 229, true, true),
  ('9e88f0e6-a93c-5d20-a8ae-b131cb244b33', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Apollo Fish', 'Starters', 259, false, true),
  ('988f7038-9391-584e-9bfe-5623ff45b85f', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Bagara Rice', 'Rice', 149, true, true),
  ('9698f4f4-a42e-5350-af94-ffb96184fb59', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Qubani ka Meetha', 'Desserts', 109, true, true),
  ('67d2dca9-0ba5-59ed-ba97-ac7687de0341', 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'Irani Chai', 'Beverages', 30, true, true),
  ('58014215-bd91-5be1-89ee-90cfeab109ec', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Bun Maska', 'Snacks', 50, true, true),
  ('fa48deb9-4d94-581b-8295-06f8d530aab9', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Samosa (2)', 'Snacks', 40, true, true),
  ('86a800e3-3990-5efb-be9e-6ceead4ed818', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Vada Pav', 'Snacks', 45, true, true),
  ('5e0c30a9-8a26-5323-985a-b6d8993c2953', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Maggi Masala', 'Snacks', 70, true, true),
  ('ba98822f-cc6b-537f-af15-5dbe6298630f', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Cutting Chai', 'Beverages', 20, true, true),
  ('d15dcbac-3a32-5a03-bf7e-13223554ae03', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Ginger Lemon Tea', 'Beverages', 30, true, true),
  ('89aa0715-e01b-52c8-9b96-b6f0300c28cb', '81007c52-7a43-5f52-95c8-c21f1781b915', 'Osmania Biscuits', 'Snacks', 35, true, true),
  ('e735f4c2-254d-586b-92de-29559fe6403f', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Margherita (Medium)', 'Pizza', 249, true, true),
  ('c0ce6293-6c0b-5c81-90ea-08242f4e5748', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Farmhouse (Medium)', 'Pizza', 329, true, true),
  ('fc41204d-b70f-58d0-8e61-3d3f08f28373', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Chicken Pepperoni (Medium)', 'Pizza', 379, false, true),
  ('9ada0f33-166a-504a-811a-4e05326f9363', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Paneer Makhani (Medium)', 'Pizza', 349, true, true),
  ('bf842801-b164-50e4-9f88-7bb8bcc088bd', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Garlic Bread', 'Sides', 129, true, true),
  ('8f201203-2e7d-51fb-aeec-c172fb9a1293', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Choco Lava Cake', 'Desserts', 99, true, true),
  ('08181e3d-4475-58c2-aa71-792c3da1f9bc', '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', 'Coke 500 ml', 'Beverages', 60, true, true);
