-- ============================================================
-- Ownly Together: complete Supabase SQL (schema, privacy rules, functions, demo data)
-- Run ONCE on a fresh Supabase project: SQL Editor > New query > paste > Run.
-- Concept prototype by Sameer Mittimani. Not an official Rapido product. Demo data only.
-- ============================================================

-- Ownly Together: tables. Run 01, 02, 03 in order in the Supabase SQL editor.
-- Concept prototype by Sameer Mittimani. Demo data only.

create extension if not exists pgcrypto;

create type address_label   as enum ('home', 'office', 'friend', 'other');
create type location_source as enum ('gps', 'manual');
create type order_status    as enum ('open', 'locked', 'placed', 'delivered', 'cancelled');
create type split_rule      as enum ('equal', 'proportional');
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
  split_rule          split_rule not null default 'proportional',
  delivery_fee        numeric(8,2) not null default 0 check (delivery_fee >= 0),
  packaging_fee       numeric(8,2) not null default 0 check (packaging_fee >= 0),
  taxes               numeric(8,2) not null default 0 check (taxes >= 0),
  max_members         int not null default 6 check (max_members between 2 and 6),
  max_value           numeric(8,2) not null default 2000,
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
  delivery_share     numeric(8,2) not null default 0,
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
create or replace function create_group_order(p_restaurant uuid, p_address uuid, p_cut_off timestamptz,
                                              p_split split_rule default 'proportional')
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
  insert into group_orders (share_code, host_id, restaurant_id, delivery_address_id, cut_off_at, split_rule)
  values (new_share_code(), uid, p_restaurant, p_address, p_cut_off, p_split) returning * into g;
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

create or replace function add_item(p_group uuid, p_menu_item uuid, p_qty int default 1, p_notes text default null)
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
  if group_value(p_group) + mi.price * p_qty > g.max_value then
    raise exception 'This would take the order over ₹% (one rider bag). Start a second group order.', g.max_value;
  end if;
  insert into order_items (group_order_id, member_id, menu_item_id, qty, unit_price, notes)
  values (p_group, mem, p_menu_item, p_qty, mi.price, p_notes) returning id into new_id;
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
declare g group_orders; food_total numeric; n int; extras numeric; m record; d numeric; t numeric; host_mem uuid;
begin
  select * into g from group_orders where id = p_group;
  if g.host_id is distinct from me() then raise exception 'Only the host can place the order'; end if;
  if g.status not in ('open', 'locked') then raise exception 'This order is already %', g.status; end if;
  food_total := group_value(p_group);
  if food_total = 0 then raise exception 'The cart is empty'; end if;
  update group_orders set status = 'placed', placed_at = now(), delivery_fee = p_delivery,
         packaging_fee = p_packaging, taxes = p_taxes where id = p_group;

  -- only members with items pay; delivery + packaging and taxes are split by the host's rule
  select count(distinct member_id) into n from order_items where group_order_id = p_group;
  extras := p_delivery + p_packaging;
  for m in
    select gm.id, gm.role, coalesce(sum(oi.qty * oi.unit_price), 0) as food
      from group_members gm join order_items oi on oi.member_id = gm.id
     where gm.group_order_id = p_group group by gm.id, gm.role
  loop
    if g.split_rule = 'equal' then
      d := round(extras / n, 2); t := round(p_taxes / n, 2);
    else
      d := round(extras * m.food / food_total, 2); t := round(p_taxes * m.food / food_total, 2);
    end if;
    insert into payments (group_order_id, member_id, food_amount, delivery_share, tax_share, total, payee, status, method_type, paid_at)
    values (p_group, m.id, m.food, d, t, m.food + d + t,
            case when m.role = 'host' then 'restaurant' else 'host' end::payee_type,
            case when m.role = 'host' then 'paid' else 'pending' end::pay_status,
            case when m.role = 'host' then 'upi' end::pay_method,
            case when m.role = 'host' then now() end);
  end loop;

  -- rounding pennies go to the host so the shares add up exactly to the bill
  select id into host_mem from group_members where group_order_id = p_group and role = 'host';
  update payments set total = total + ((food_total + extras + p_taxes) - (select sum(total) from payments where group_order_id = p_group)),
                      delivery_share = delivery_share + ((food_total + extras + p_taxes) - (select sum(total) from payments where group_order_id = p_group))
   where group_order_id = p_group and member_id = host_mem;
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
    'id', g.id, 'share_code', g.share_code, 'status', g.status, 'cut_off_at', g.cut_off_at, 'split_rule', g.split_rule,
    'delivery_fee', g.delivery_fee, 'packaging_fee', g.packaging_fee, 'taxes', g.taxes,
    'max_members', g.max_members, 'max_value', g.max_value, 'food_total', group_value(g.id), 'is_member', true,
    'is_host', g.host_id = me(),
    'restaurant', (select json_build_object('id', id, 'name', name, 'cuisine', cuisine, 'area', area) from restaurants where id = g.restaurant_id),
    'deliver_to', (select json_build_object('label', label, 'label_name', label_name, 'area', area, 'city', city) from addresses where id = g.delivery_address_id),
    'members', (select coalesce(json_agg(json_build_object('member_id', gm.id, 'name', p.full_name, 'role', gm.role,
                  'is_me', gm.user_id = me(),
                  'items', (select coalesce(json_agg(json_build_object('id', oi.id, 'dish', mi.name, 'qty', oi.qty,
                              'unit_price', oi.unit_price, 'notes', oi.notes, 'is_veg', mi.is_veg) order by oi.created_at), '[]')
                            from order_items oi join menu_items mi on mi.id = oi.menu_item_id where oi.member_id = gm.id),
                  'payment', (select json_build_object('food', food_amount, 'delivery_share', delivery_share, 'tax_share', tax_share,
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

-- Ownly Together demo data (synthetic). Run after 01 and 02. Safe to re-run: clears the demo tables first.
truncate payments, order_items, group_members, group_orders, payment_methods, menu_items, restaurants restart identity cascade;
update profiles set default_address_id = null;
delete from addresses where user_id in (select id from profiles where email like '%@example.com');
delete from profiles where email like '%@example.com' and auth_user_id is null;

insert into profiles (id, full_name, email, phone) values
  ('c03b9e6d-e466-5d7e-ac5d-a69e11798684', 'Ananya Rao', 'demo.host@example.com', '+91 90000 10001'),
  ('74104ded-358b-5a73-8cba-eb721b4b6d9f', 'Karthik Iyer', 'demo.friend1@example.com', '+91 90000 10002'),
  ('d7be7422-ca07-57e9-bf84-3a586fc5614f', 'Meera Nair', 'demo.friend2@example.com', '+91 90000 10003'),
  ('a7029ec7-bdce-5eb6-8d18-29f557640ed5', 'Rohan Kulkarni', 'rohan.k@example.com', '+91 90000 10004'),
  ('6042750e-e98e-5c52-a61f-1e69ec4f30a0', 'Sneha Patil', 'sneha.p@example.com', '+91 90000 10005'),
  ('3da6cc03-ba7f-5eb4-a129-5c8d7b96f596', 'Arjun Menon', 'arjun.m@example.com', '+91 90000 10006'),
  ('46042b3e-9e0a-51c8-9620-e1852f7143e0', 'Divya Shetty', 'divya.s@example.com', '+91 90000 10007'),
  ('8d43aabb-e90c-5ba2-bbf8-ae79a99d721a', 'Vikram Reddy', 'vikram.r@example.com', '+91 90000 10008'),
  ('355c89ac-fde8-5750-ba48-3e0b5c99b918', 'Pooja Sharma', 'pooja.s@example.com', '+91 90000 10009'),
  ('e1b01e79-6fd0-5859-a942-ef5a9102cf8d', 'Sai Teja', 'sai.t@example.com', '+91 90000 10010'),
  ('a9a8e99f-eb4a-58f9-ba6a-c183af652a59', 'Lakshmi Prasad', 'lakshmi.p@example.com', '+91 90000 10011'),
  ('9246fbd0-8807-532e-9061-c6128cb1afbd', 'Imran Khan', 'imran.k@example.com', '+91 90000 10012')
on conflict (email) do update set full_name = excluded.full_name, phone = excluded.phone;

create temp table pid_map as select s.seed_id, p.id from (values ('c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid, 'demo.host@example.com'), ('74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid, 'demo.friend1@example.com'), ('d7be7422-ca07-57e9-bf84-3a586fc5614f'::uuid, 'demo.friend2@example.com'), ('a7029ec7-bdce-5eb6-8d18-29f557640ed5'::uuid, 'rohan.k@example.com'), ('6042750e-e98e-5c52-a61f-1e69ec4f30a0'::uuid, 'sneha.p@example.com'), ('3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid, 'arjun.m@example.com'), ('46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid, 'divya.s@example.com'), ('8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid, 'vikram.r@example.com'), ('355c89ac-fde8-5750-ba48-3e0b5c99b918'::uuid, 'pooja.s@example.com'), ('e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid, 'sai.t@example.com'), ('a9a8e99f-eb4a-58f9-ba6a-c183af652a59'::uuid, 'lakshmi.p@example.com'), ('9246fbd0-8807-532e-9061-c6128cb1afbd'::uuid, 'imran.k@example.com')) s(seed_id, email) join profiles p on p.email = s.email;

insert into addresses (id, user_id, label, label_name, line1, line2, landmark, area, city, pincode, lat, lng, gps_accuracy_m, source, is_default) values
  ('753b2864-355c-5304-a370-3f0103e6080e', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'home', 'Home', 'Flat 662, Sunrise Residency', '10th Main', 'Near the metro', 'Koramangala', 'Bengaluru', '560034', 12.933967, 77.627259, 20, 'gps', true),
  ('405c8fb2-e10a-5149-84ff-d2032d450a95', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'office', 'Office', 'Prestige Tech Park, Tower B', '2th Main', 'Near the metro', 'Bellandur', 'Bengaluru', '560103', 12.925143, 77.672349, 35, 'gps', false),
  ('1d83b68e-0eee-508e-b1fd-6ba4e0aee028', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'friend', 'Rohan''s flat', 'House 73, 6th Cross', null, 'Gate with the blue door', 'Koramangala', 'Bengaluru', '560034', 12.937625, 77.621184, 15, 'manual', false),
  ('04dc981d-9764-5170-b502-962123e1a42d', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), 'home', 'Home', 'Flat 723, Silver Oak Residency', '6th Main', 'Opposite the park', 'HSR Layout', 'Bengaluru', '560102', 12.914289, 77.644995, 35, 'gps', true),
  ('1bb40f20-fe6b-5727-a3ee-e3e284fb8159', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), 'office', 'Office', 'Prestige Tech Park, Tower B', '17th Main', 'Opposite the park', 'Bellandur', 'Bengaluru', '560103', 12.928273, 77.677594, 35, 'manual', false),
  ('e1224a19-1548-590b-845f-463035e42336', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), 'friend', 'Arjun''s place', 'House 62, 8th Cross', null, 'Gate with the blue door', 'HSR Layout', 'Bengaluru', '560102', 12.909826, 77.649404, 15, 'manual', false),
  ('b37a8929-d19d-581b-bb1a-a02e664c2b17', (select id from pid_map where seed_id = 'd7be7422-ca07-57e9-bf84-3a586fc5614f'::uuid), 'home', 'Home', 'Flat 629, Lakeview Residency', '16th Main', 'Behind the bus stop', 'BTM Layout', 'Bengaluru', '560076', 12.918619, 77.612154, 8, 'gps', true),
  ('af794ec1-29ca-5877-808e-108f911199aa', (select id from pid_map where seed_id = 'd7be7422-ca07-57e9-bf84-3a586fc5614f'::uuid), 'office', 'Office', 'Koramangala Co-work Hub', '5th Main', 'Next to the bakery', 'Koramangala', 'Bengaluru', '560034', 12.937048, 77.627617, 12, 'manual', false),
  ('1785af06-a1df-5292-9dd7-d1ac8c39c375', (select id from pid_map where seed_id = 'a7029ec7-bdce-5eb6-8d18-29f557640ed5'::uuid), 'home', 'Home', 'Flat 171, Silver Oak Residency', '14th Main', 'Behind the bus stop', 'Koramangala', 'Bengaluru', '560034', 12.932507, 77.625501, 20, 'gps', true),
  ('81dcd074-a7cc-54bc-bfa3-b8a8b3e16d1b', (select id from pid_map where seed_id = 'a7029ec7-bdce-5eb6-8d18-29f557640ed5'::uuid), 'office', 'Office', 'Prestige Tech Park, Tower B', '11th Main', 'Opposite the park', 'Bellandur', 'Bengaluru', '560103', 12.929482, 77.677475, 20, 'gps', false),
  ('3de8aedf-530c-554d-9af9-ea8badd31845', (select id from pid_map where seed_id = '6042750e-e98e-5c52-a61f-1e69ec4f30a0'::uuid), 'home', 'Home', 'Flat 874, Sunrise Residency', '18th Main', 'Opposite the park', 'Indiranagar', 'Bengaluru', '560038', 12.977588, 77.640115, 35, 'gps', true),
  ('8d4618a5-d9c4-518d-9ac0-94c98545beae', (select id from pid_map where seed_id = '6042750e-e98e-5c52-a61f-1e69ec4f30a0'::uuid), 'office', 'Office', 'Koramangala Co-work Hub', '2th Main', 'Near the metro', 'Koramangala', 'Bengaluru', '560034', 12.932406, 77.627828, 20, 'gps', false),
  ('d7e93f4d-47cd-5f82-a119-27578b2d220a', (select id from pid_map where seed_id = '3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid), 'home', 'Home', 'Flat 108, Sunrise Residency', '1th Main', 'Opposite the park', 'HSR Layout', 'Bengaluru', '560102', 12.915192, 77.647519, 12, 'gps', true),
  ('1040d77e-b8b0-5593-99f6-9f52df53f120', (select id from pid_map where seed_id = '3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid), 'office', 'Office', 'HSR Startup Block', '3th Main', 'Near the metro', 'HSR Layout', 'Bengaluru', '560102', 12.913326, 77.646357, 12, 'manual', false),
  ('ed118512-9224-5f4b-95b1-c4a3d6ac3bde', (select id from pid_map where seed_id = '46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid), 'home', 'Home', 'Flat 612, Sunrise Residency', '6th Main', 'Near the metro', 'BTM Layout', 'Bengaluru', '560076', 12.913615, 77.607002, 35, 'gps', true),
  ('ff5c6fdc-4bf4-54fb-ac4b-5c136b872eab', (select id from pid_map where seed_id = '46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid), 'office', 'Office', 'HSR Startup Block', '18th Main', 'Opposite the park', 'HSR Layout', 'Bengaluru', '560102', 12.914525, 77.645014, 20, 'gps', false),
  ('97e11f7e-c6d6-50ca-b7f0-6a703b6089cb', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'home', 'Home', 'Flat 881, Sunrise Residency', '9th Main', 'Next to the bakery', 'Gachibowli', 'Hyderabad', '500032', 17.441069, 78.351251, 12, 'gps', true),
  ('a6a0cb7e-ae6b-59ee-8aba-dfba293e9f4a', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'office', 'Office', 'Cyber Towers, Wing 2', '2th Main', 'Next to the bakery', 'HITEC City', 'Hyderabad', '500081', 17.444982, 78.379471, 35, 'manual', false),
  ('0c97924c-7f4f-522d-b5cf-026ecad70313', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'friend', 'Sai''s apartment', 'House 62, 2th Cross', null, 'Gate with the blue door', 'Gachibowli', 'Hyderabad', '500032', 17.440705, 78.346207, 15, 'manual', false),
  ('44dc1559-0fee-54ec-ab8a-ac2495c0c7e9', (select id from pid_map where seed_id = '355c89ac-fde8-5750-ba48-3e0b5c99b918'::uuid), 'home', 'Home', 'Flat 546, Sunrise Residency', '1th Main', 'Next to the bakery', 'Madhapur', 'Hyderabad', '500081', 17.447326, 78.3915, 35, 'gps', true),
  ('95f0d1e4-0b16-5b63-ae09-bfaec9179f81', (select id from pid_map where seed_id = '355c89ac-fde8-5750-ba48-3e0b5c99b918'::uuid), 'office', 'Office', 'Cyber Towers, Wing 2', '16th Main', 'Behind the bus stop', 'HITEC City', 'Hyderabad', '500081', 17.440595, 78.374563, 8, 'manual', false),
  ('43391021-b144-5a53-8395-b54e32c5ead1', (select id from pid_map where seed_id = 'e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid), 'home', 'Home', 'Flat 304, Silver Oak Residency', '8th Main', 'Opposite the park', 'Gachibowli', 'Hyderabad', '500032', 17.443386, 78.348444, 35, 'gps', true),
  ('80c68a75-ec87-53e0-b379-293f1554a049', (select id from pid_map where seed_id = 'e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid), 'office', 'Office', 'Financial District Plaza', '11th Main', 'Opposite the park', 'Gachibowli', 'Hyderabad', '500032', 17.437489, 78.350086, 12, 'gps', false),
  ('9d8af68b-87ab-5883-a4a4-e888eff3f1a5', (select id from pid_map where seed_id = 'a9a8e99f-eb4a-58f9-ba6a-c183af652a59'::uuid), 'home', 'Home', 'Flat 754, Silver Oak Residency', '15th Main', 'Next to the bakery', 'HITEC City', 'Hyderabad', '500081', 17.439924, 78.37759, 8, 'gps', true),
  ('f088581c-671c-582a-bb92-b426a156655d', (select id from pid_map where seed_id = 'a9a8e99f-eb4a-58f9-ba6a-c183af652a59'::uuid), 'office', 'Office', 'Madhapur IT Park', '11th Main', 'Opposite the park', 'Madhapur', 'Hyderabad', '500081', 17.44515, 78.389915, 8, 'gps', false),
  ('d4df5c0c-70cb-5d07-a8e8-471f6e97ba77', (select id from pid_map where seed_id = '9246fbd0-8807-532e-9061-c6128cb1afbd'::uuid), 'home', 'Home', 'Flat 820, Lakeview Residency', '9th Main', 'Next to the bakery', 'Madhapur', 'Hyderabad', '500081', 17.450043, 78.388357, 20, 'gps', true),
  ('2459f123-cb13-50b4-ac51-71ab91c6e49a', (select id from pid_map where seed_id = '9246fbd0-8807-532e-9061-c6128cb1afbd'::uuid), 'office', 'Office', 'Financial District Plaza', '8th Main', 'Behind the bus stop', 'Gachibowli', 'Hyderabad', '500032', 17.436171, 78.347859, 12, 'manual', false);

update profiles p set default_address_id = a.id from addresses a where a.user_id = p.id and a.is_default;

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

insert into payment_methods (id, user_id, type, display_label, gateway_token, is_default) values
  ('b692f288-948b-54f0-84d2-a415616ea034', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'upi', 'dem•••@okaxis', 'tok_TEST_d75632be7a31', true),
  ('05fd6ba8-4562-5f03-89fc-62eba753a392', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'card', 'Visa •••• 4242', 'tok_TEST_77a0c3c91789', false),
  ('5951e496-7bcb-59d9-abae-101decd06aff', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), 'upi', 'dem•••@okaxis', 'tok_TEST_777b52cd5c66', true),
  ('68425918-ad99-57a9-869d-e7d273df25af', (select id from pid_map where seed_id = 'd7be7422-ca07-57e9-bf84-3a586fc5614f'::uuid), 'upi', 'dem•••@okaxis', 'tok_TEST_6d4720c5151e', true),
  ('c2c183e9-f6bb-5ba6-a3a9-d3600b332773', (select id from pid_map where seed_id = 'a7029ec7-bdce-5eb6-8d18-29f557640ed5'::uuid), 'upi', 'roh•••@okaxis', 'tok_TEST_7c5afa581b14', true),
  ('d5e4f114-dd16-5772-9704-7371b31e4239', (select id from pid_map where seed_id = 'a7029ec7-bdce-5eb6-8d18-29f557640ed5'::uuid), 'card', 'Visa •••• 4245', 'tok_TEST_022c96efaf4d', false),
  ('08b71a9d-3b6d-537f-aa57-447b77b3ec56', (select id from pid_map where seed_id = '6042750e-e98e-5c52-a61f-1e69ec4f30a0'::uuid), 'upi', 'sne•••@okaxis', 'tok_TEST_d561aa0fd304', true),
  ('41e35797-5971-5ef7-a282-8d21aa643e41', (select id from pid_map where seed_id = '3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid), 'upi', 'arj•••@okaxis', 'tok_TEST_f0df7433ef40', true),
  ('5217bcc7-4b7a-521f-b867-25943060d2d7', (select id from pid_map where seed_id = '46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid), 'upi', 'div•••@okaxis', 'tok_TEST_ced5373aa405', true),
  ('77c8ae8f-5ac6-5c83-a713-e5a2ec3b2996', (select id from pid_map where seed_id = '46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid), 'card', 'Visa •••• 4248', 'tok_TEST_5473d7a5d229', false),
  ('ef19f2b1-6a17-5265-9293-0f0efdc57d5f', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'upi', 'vik•••@okaxis', 'tok_TEST_7a310c7f0f72', true),
  ('f007144a-af3b-5280-bd27-a2347bf72d3c', (select id from pid_map where seed_id = '355c89ac-fde8-5750-ba48-3e0b5c99b918'::uuid), 'upi', 'poo•••@okaxis', 'tok_TEST_32602600d632', true),
  ('d648024c-cd1a-58f1-8594-059259cd781d', (select id from pid_map where seed_id = 'e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid), 'upi', 'sai•••@okaxis', 'tok_TEST_61cdd5564522', true),
  ('d258f7ff-20e4-5d13-9a4c-3118954bb120', (select id from pid_map where seed_id = 'e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid), 'card', 'Visa •••• 4251', 'tok_TEST_02487ea610c1', false),
  ('659f92ca-d24b-5997-87ab-d6dc435df1fc', (select id from pid_map where seed_id = 'a9a8e99f-eb4a-58f9-ba6a-c183af652a59'::uuid), 'upi', 'lak•••@okaxis', 'tok_TEST_5aa1375d3a78', true),
  ('1b953cc3-eee0-5184-9cc1-3c3d50263482', (select id from pid_map where seed_id = '9246fbd0-8807-532e-9061-c6128cb1afbd'::uuid), 'upi', 'imr•••@okaxis', 'tok_TEST_6964acc233c1', true);

insert into group_orders (id, share_code, host_id, restaurant_id, delivery_address_id, cut_off_at, status, split_rule, delivery_fee, packaging_fee, taxes, created_at, placed_at, delivered_at) values
  ('df08701c-4d8a-5f35-862a-c55eca4550a5', 'KORA24', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'dd20eb8e-756a-5142-8ffb-a8173bf70f81', '405c8fb2-e10a-5149-84ff-d2032d450a95', now() + interval '25.0 hours', 'open', 'proportional', 0, 0, 0, now() + interval '-0.5 hours', null, null),
  ('a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', 'HITEC7', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'c6ded8d5-7138-5b1f-8d63-10081c593f59', 'a6a0cb7e-ae6b-59ee-8aba-dfba293e9f4a', now() + interval '0.5 hours', 'locked', 'equal', 0, 0, 0, now() + interval '-1.0 hours', null, null),
  ('e7152ba1-a526-51f8-ae3f-f9c9188afbcc', 'BIRY4N', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), '39aae235-cb97-567d-8b9e-52227d94c436', '04dc981d-9764-5170-b502-962123e1a42d', now() + interval '-1.5 hours', 'placed', 'proportional', 35, 20, 48, now() + interval '-3.0 hours', now() + interval '-1.5 hours', null),
  ('c803ddec-14c4-5d4f-9e84-a4147e446b9c', 'GREEN2', (select id from pid_map where seed_id = 'd7be7422-ca07-57e9-bf84-3a586fc5614f'::uuid), 'b1c61a31-315a-56fa-b710-78808d6401ed', 'b37a8929-d19d-581b-bb1a-a02e664c2b17', now() + interval '-24.5 hours', 'delivered', 'equal', 25, 15, 32, now() + interval '-26.0 hours', now() + interval '-24.5 hours', now() + interval '-23.75 hours'),
  ('5c468dbe-590b-5472-9544-ef9147b77333', 'PIZZA5', (select id from pid_map where seed_id = 'e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid), '81ffef20-1cdd-531f-8c1a-a8b13faabc9e', '80c68a75-ec87-53e0-b379-293f1554a049', now() + interval '-48.5 hours', 'delivered', 'proportional', 40, 25, 61, now() + interval '-50.0 hours', now() + interval '-48.5 hours', now() + interval '-47.75 hours'),
  ('3402193e-f30d-52af-8f59-af4164b91214', 'ROLL66', (select id from pid_map where seed_id = '3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid), '0749c417-202d-5eb7-9b67-ec79be6dc328', 'd7e93f4d-47cd-5f82-a119-27578b2d220a', now() + interval '-70.5 hours', 'cancelled', 'equal', 0, 0, 0, now() + interval '-72.0 hours', null, null);

insert into group_members (id, group_order_id, user_id, role, status) values
  ('f028ecd4-a9bd-550d-9db8-2b1547bac8b1', 'df08701c-4d8a-5f35-862a-c55eca4550a5', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'host', 'joined'),
  ('0e3e3601-8420-5842-90ce-b78f502bade0', 'df08701c-4d8a-5f35-862a-c55eca4550a5', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), 'member', 'joined'),
  ('a92a819f-ceaf-5ec5-beea-a4b3c6041643', 'df08701c-4d8a-5f35-862a-c55eca4550a5', (select id from pid_map where seed_id = 'a7029ec7-bdce-5eb6-8d18-29f557640ed5'::uuid), 'member', 'joined'),
  ('111297b2-461b-5f6b-878b-97cffbe0af0f', 'df08701c-4d8a-5f35-862a-c55eca4550a5', (select id from pid_map where seed_id = '6042750e-e98e-5c52-a61f-1e69ec4f30a0'::uuid), 'member', 'joined'),
  ('38d221d4-4083-5ce3-8fa3-035e2110c113', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'host', 'joined'),
  ('9aa18d06-a73c-59f7-bc97-aacf2677c8af', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', (select id from pid_map where seed_id = '355c89ac-fde8-5750-ba48-3e0b5c99b918'::uuid), 'member', 'joined'),
  ('1e5cfb7e-5fb1-5627-ae3d-624d79815998', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', (select id from pid_map where seed_id = 'a9a8e99f-eb4a-58f9-ba6a-c183af652a59'::uuid), 'member', 'joined'),
  ('43a556bd-9a37-5f5e-91ac-c3b64bfa25ca', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', (select id from pid_map where seed_id = '74104ded-358b-5a73-8cba-eb721b4b6d9f'::uuid), 'host', 'joined'),
  ('565255ad-4d59-5cbf-947f-77f91d42ee9f', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'member', 'joined'),
  ('5ffc9469-fc69-58f0-8291-73f738a1923a', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', (select id from pid_map where seed_id = '3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid), 'member', 'joined'),
  ('931fc61a-44d0-5d49-9698-78800e5462d8', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', (select id from pid_map where seed_id = '46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid), 'member', 'joined'),
  ('1ce47080-c5ea-578d-aa02-bc48241a4434', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', (select id from pid_map where seed_id = 'd7be7422-ca07-57e9-bf84-3a586fc5614f'::uuid), 'host', 'joined'),
  ('30f9b3aa-8b57-5697-8869-506f64bffa22', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', (select id from pid_map where seed_id = 'c03b9e6d-e466-5d7e-ac5d-a69e11798684'::uuid), 'member', 'joined'),
  ('fa3ea695-8482-5f79-9e1c-f7d40209d781', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', (select id from pid_map where seed_id = '6042750e-e98e-5c52-a61f-1e69ec4f30a0'::uuid), 'member', 'joined'),
  ('745a4419-091c-5bd4-a075-b4b868bf59fe', '5c468dbe-590b-5472-9544-ef9147b77333', (select id from pid_map where seed_id = 'e1b01e79-6fd0-5859-a942-ef5a9102cf8d'::uuid), 'host', 'joined'),
  ('1a52dfb7-44c9-5678-b116-8a66f4d3a94e', '5c468dbe-590b-5472-9544-ef9147b77333', (select id from pid_map where seed_id = '8d43aabb-e90c-5ba2-bbf8-ae79a99d721a'::uuid), 'member', 'joined'),
  ('edc02e7f-77f4-5d0a-8285-fc3dd982837e', '5c468dbe-590b-5472-9544-ef9147b77333', (select id from pid_map where seed_id = '9246fbd0-8807-532e-9061-c6128cb1afbd'::uuid), 'member', 'joined'),
  ('09c16001-aed6-5262-8a79-c4b66d99cdcd', '5c468dbe-590b-5472-9544-ef9147b77333', (select id from pid_map where seed_id = '355c89ac-fde8-5750-ba48-3e0b5c99b918'::uuid), 'member', 'joined'),
  ('144f6e7e-1f91-5dca-9436-3acf5631308d', '3402193e-f30d-52af-8f59-af4164b91214', (select id from pid_map where seed_id = '3da6cc03-ba7f-5eb4-a129-5c8d7b96f596'::uuid), 'host', 'joined'),
  ('5ccf4663-d7fd-51df-a850-4faf8914df9a', '3402193e-f30d-52af-8f59-af4164b91214', (select id from pid_map where seed_id = '46042b3e-9e0a-51c8-9620-e1852f7143e0'::uuid), 'member', 'joined');

insert into order_items (id, group_order_id, member_id, menu_item_id, qty, unit_price, notes) values
  ('8d552b50-0be7-5b1b-b383-6cc6923948c8', 'df08701c-4d8a-5f35-862a-c55eca4550a5', 'f028ecd4-a9bd-550d-9db8-2b1547bac8b1', '5b81bf28-3b0c-52da-b08d-039b31e39d70', 1, 60, null),
  ('47792e6c-1162-52f3-bad0-224617a2e8e9', 'df08701c-4d8a-5f35-862a-c55eca4550a5', 'f028ecd4-a9bd-550d-9db8-2b1547bac8b1', '90acc9d0-e1c0-5aba-9e66-631799b2c2d7', 1, 50, 'Less spicy'),
  ('6902b88d-9332-5a8e-87c1-a7abe1cb1955', 'df08701c-4d8a-5f35-862a-c55eca4550a5', '0e3e3601-8420-5842-90ce-b78f502bade0', '5b81bf28-3b0c-52da-b08d-039b31e39d70', 1, 60, 'Pack separately'),
  ('13c3e4ac-ed7a-5b54-b4d2-663ad446476b', 'df08701c-4d8a-5f35-862a-c55eca4550a5', 'a92a819f-ceaf-5ec5-beea-a4b3c6041643', '5b81bf28-3b0c-52da-b08d-039b31e39d70', 1, 60, 'Pack separately'),
  ('3b075dd0-1568-5ffc-8ef9-21fa608c6a22', 'df08701c-4d8a-5f35-862a-c55eca4550a5', 'a92a819f-ceaf-5ec5-beea-a4b3c6041643', 'caac9eaa-aa4c-5b6b-9401-987a160ee00c', 1, 90, 'Less spicy'),
  ('51b06088-d758-54c6-b098-065b483a4cb0', 'df08701c-4d8a-5f35-862a-c55eca4550a5', 'a92a819f-ceaf-5ec5-beea-a4b3c6041643', '90acc9d0-e1c0-5aba-9e66-631799b2c2d7', 1, 50, 'Less spicy'),
  ('c9536c6f-6cb2-53dc-8433-f4d48cba78e1', 'df08701c-4d8a-5f35-862a-c55eca4550a5', '111297b2-461b-5f6b-878b-97cffbe0af0f', '5b81bf28-3b0c-52da-b08d-039b31e39d70', 1, 60, null),
  ('045c9647-9c9b-5cb9-917b-8b74bbb658c0', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', '38d221d4-4083-5ce3-8fa3-035e2110c113', '988f7038-9391-584e-9bfe-5623ff45b85f', 1, 149, 'No onion'),
  ('e60638b4-5fdd-51e6-85fb-b547a557b101', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', '38d221d4-4083-5ce3-8fa3-035e2110c113', '5486039e-ad16-5cf9-8ee8-fbfa18b601f8', 1, 269, null),
  ('a71ed814-2ec5-575b-aa34-2cfd559038d5', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', '9aa18d06-a73c-59f7-bc97-aacf2677c8af', 'f92cc87e-ee66-55a3-b681-d9e9ba7e7111', 1, 239, 'Pack separately'),
  ('80402c39-7dc6-53f3-937c-6b3c9e87ff6f', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', '9aa18d06-a73c-59f7-bc97-aacf2677c8af', '9e88f0e6-a93c-5d20-a8ae-b131cb244b33', 1, 259, null),
  ('f1e2d78c-3339-54b7-8734-2775f6199844', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', '1e5cfb7e-5fb1-5627-ae3d-624d79815998', '9e88f0e6-a93c-5d20-a8ae-b131cb244b33', 1, 259, 'No onion'),
  ('7666c512-c081-5774-b331-43869fc3e3ae', 'a4520b89-70eb-5bf4-a2ea-c7d78e0c26a6', '1e5cfb7e-5fb1-5627-ae3d-624d79815998', '67d2dca9-0ba5-59ed-ba97-ac7687de0341', 1, 30, null),
  ('7c011ed9-8c7c-5cf0-bb24-93472725e991', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '43a556bd-9a37-5f5e-91ac-c3b64bfa25ca', 'a2431075-6f45-5c4e-bdb4-9c8441bc088e', 1, 179, 'Less spicy'),
  ('51db9408-558a-5238-ab93-d57b2effb7ba', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '43a556bd-9a37-5f5e-91ac-c3b64bfa25ca', 'd8f1cada-ad3b-5329-ae5d-f758facf3c8c', 1, 39, 'Less spicy'),
  ('51aaf3cf-1079-5e41-b0d7-5aa4bcf142a8', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '565255ad-4d59-5cbf-947f-77f91d42ee9f', 'c61899f5-8674-5131-b1f7-9c9e0a689c1a', 1, 69, null),
  ('339a0870-f233-5fba-98d5-e3bdb9198e07', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '565255ad-4d59-5cbf-947f-77f91d42ee9f', '345bed51-79ea-579e-96a8-7e7077da1305', 1, 89, 'Less spicy'),
  ('f0554a39-72b8-51a1-a99a-a0503ae2912e', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '5ffc9469-fc69-58f0-8291-73f738a1923a', '345bed51-79ea-579e-96a8-7e7077da1305', 1, 89, 'Pack separately'),
  ('8547d614-6160-516d-92bd-0fadd7d932c6', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '5ffc9469-fc69-58f0-8291-73f738a1923a', 'fa94e712-2104-58a4-a232-510392fdb9c5', 1, 199, null),
  ('24f383fd-5e20-573b-a022-e4b3525e8e21', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '931fc61a-44d0-5d49-9698-78800e5462d8', 'fa94e712-2104-58a4-a232-510392fdb9c5', 1, 199, null),
  ('851e0be6-2e59-558f-b3d2-d231cd8ba63e', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '931fc61a-44d0-5d49-9698-78800e5462d8', 'd8f1cada-ad3b-5329-ae5d-f758facf3c8c', 1, 39, 'No onion'),
  ('33f8c52f-0e2e-517c-b215-291df73d91d2', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '1ce47080-c5ea-578d-aa02-bc48241a4434', 'f6f8364a-bd5f-5468-914f-e46792c5b084', 1, 89, 'Less spicy'),
  ('cec16c70-ee15-594a-85d2-543f78332c35', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '1ce47080-c5ea-578d-aa02-bc48241a4434', 'adaa328c-c9ba-5c01-9500-85b16f9e07a3', 1, 249, 'Pack separately'),
  ('5beeb801-c8d8-5746-b6e6-eb1aca35a90c', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '1ce47080-c5ea-578d-aa02-bc48241a4434', '5dd996a1-0c67-54ce-8d3e-62adac34cd1d', 1, 219, 'Extra chutney'),
  ('a9c8bca8-0e61-59da-8e41-f581dbcf8e16', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '30f9b3aa-8b57-5697-8869-506f64bffa22', 'abd1cbf8-c9b2-5801-8258-5f5149826166', 1, 189, 'Extra chutney'),
  ('3f9a5ab8-1528-5bbc-a319-61781d4beb71', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '30f9b3aa-8b57-5697-8869-506f64bffa22', '1e21d6a2-b461-5481-899e-3bfc8754d09a', 1, 169, 'Less spicy'),
  ('049e8520-1829-5a69-9ba7-9acda056fa9b', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', 'fa3ea695-8482-5f79-9e1c-f7d40209d781', 'adaa328c-c9ba-5c01-9500-85b16f9e07a3', 1, 249, null),
  ('45109672-d77b-556f-bffc-b6c3f786b157', '5c468dbe-590b-5472-9544-ef9147b77333', '745a4419-091c-5bd4-a075-b4b868bf59fe', 'c0ce6293-6c0b-5c81-90ea-08242f4e5748', 1, 329, 'No onion'),
  ('b20de82f-6d83-57b8-ac0d-ce421c9e65a1', '5c468dbe-590b-5472-9544-ef9147b77333', '745a4419-091c-5bd4-a075-b4b868bf59fe', '08181e3d-4475-58c2-aa71-792c3da1f9bc', 2, 60, null),
  ('74e7ffcb-08a1-5063-a076-18e1f0c4ae3d', '5c468dbe-590b-5472-9544-ef9147b77333', '1a52dfb7-44c9-5678-b116-8a66f4d3a94e', 'c0ce6293-6c0b-5c81-90ea-08242f4e5748', 1, 329, null),
  ('78bb6e9e-a7e7-51d0-81e6-c9287e39fdf2', '5c468dbe-590b-5472-9544-ef9147b77333', '1a52dfb7-44c9-5678-b116-8a66f4d3a94e', 'e735f4c2-254d-586b-92de-29559fe6403f', 1, 249, null),
  ('76a34462-230c-5e6a-96d1-3bb8ce373108', '5c468dbe-590b-5472-9544-ef9147b77333', '1a52dfb7-44c9-5678-b116-8a66f4d3a94e', 'fc41204d-b70f-58d0-8e61-3d3f08f28373', 1, 379, null),
  ('c35ee114-753f-54c6-905a-a63ba5cdd4ba', '5c468dbe-590b-5472-9544-ef9147b77333', 'edc02e7f-77f4-5d0a-8285-fc3dd982837e', 'c0ce6293-6c0b-5c81-90ea-08242f4e5748', 1, 329, null),
  ('afcda314-3751-5a6f-a717-c9594d3e730b', '5c468dbe-590b-5472-9544-ef9147b77333', 'edc02e7f-77f4-5d0a-8285-fc3dd982837e', '9ada0f33-166a-504a-811a-4e05326f9363', 1, 349, 'Extra chutney'),
  ('06bf3295-a77d-57eb-9371-ee3da342e602', '5c468dbe-590b-5472-9544-ef9147b77333', 'edc02e7f-77f4-5d0a-8285-fc3dd982837e', 'e735f4c2-254d-586b-92de-29559fe6403f', 1, 249, 'Pack separately'),
  ('da77c9b8-a0ef-5968-a4f0-1c6f0c78c95e', '5c468dbe-590b-5472-9544-ef9147b77333', '09c16001-aed6-5262-8a79-c4b66d99cdcd', '8f201203-2e7d-51fb-aeec-c172fb9a1293', 1, 99, 'Pack separately'),
  ('8861217a-de99-5ae4-8bff-68eaa56df721', '5c468dbe-590b-5472-9544-ef9147b77333', '09c16001-aed6-5262-8a79-c4b66d99cdcd', '9ada0f33-166a-504a-811a-4e05326f9363', 1, 349, 'Extra chutney'),
  ('1b67a2b4-8633-5e05-89d3-d4b637293e5d', '5c468dbe-590b-5472-9544-ef9147b77333', '09c16001-aed6-5262-8a79-c4b66d99cdcd', 'c0ce6293-6c0b-5c81-90ea-08242f4e5748', 1, 329, 'Extra chutney'),
  ('38bce6ad-bf3d-59b1-9afc-16c9204711d5', '3402193e-f30d-52af-8f59-af4164b91214', '144f6e7e-1f91-5dca-9436-3acf5631308d', '86980403-7cf9-59f1-95e4-b4af0fe9d7c6', 1, 79, 'Pack separately'),
  ('502a2f6e-e9b5-5d6f-89d2-5543c798a74a', '3402193e-f30d-52af-8f59-af4164b91214', '144f6e7e-1f91-5dca-9436-3acf5631308d', 'ba73581c-ba92-56e8-9c7e-acf3729b56da', 1, 99, null),
  ('7b2746a9-393e-5ffe-8292-6fbadaf88d54', '3402193e-f30d-52af-8f59-af4164b91214', '5ccf4663-d7fd-51df-a850-4faf8914df9a', 'ba73581c-ba92-56e8-9c7e-acf3729b56da', 1, 99, 'Pack separately');

insert into payments (id, group_order_id, member_id, food_amount, delivery_share, tax_share, total, payee, method_type, status, gateway_payment_id, paid_at) values
  ('856c9a00-59b2-5517-8467-cb2a4f9555c9', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '43a556bd-9a37-5f5e-91ac-c3b64bfa25ca', 218, 13.29, 11.6, 242.89, 'restaurant', 'upi', 'paid', 'pay_TEST_3690A5DE12', now() - interval '1 hour'),
  ('084d11e3-f3ef-5715-928c-f0841b8f3cac', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '565255ad-4d59-5cbf-947f-77f91d42ee9f', 158, 9.63, 8.41, 176.04, 'host', 'card', 'paid', 'pay_TEST_DE23C04018', now() - interval '1 hour'),
  ('4ac3c0ea-eb37-54a2-bbca-9e341b37de3e', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '5ffc9469-fc69-58f0-8291-73f738a1923a', 288, 17.56, 15.33, 320.89, 'host', null, 'pending', null, null),
  ('896b2ce0-673a-5f75-a70d-acfabd05b3f7', 'e7152ba1-a526-51f8-ae3f-f9c9188afbcc', '931fc61a-44d0-5d49-9698-78800e5462d8', 238, 14.51, 12.67, 265.18, 'host', 'upi', 'paid', 'pay_TEST_C2706050D8', now() - interval '1 hour'),
  ('ce799975-0afc-5aa8-b72e-4f751a68ac71', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '1ce47080-c5ea-578d-aa02-bc48241a4434', 557, 13.33, 10.67, 581.0, 'restaurant', 'upi', 'paid', 'pay_TEST_E328542F02', now() - interval '1 hour'),
  ('6a705cd3-3afd-56a5-8fa7-0ec8eba2a8c5', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', '30f9b3aa-8b57-5697-8869-506f64bffa22', 358, 13.33, 10.67, 382.0, 'host', 'upi', 'paid', 'pay_TEST_6071A82FF0', now() - interval '1 hour'),
  ('181fbea6-463d-5176-92c1-a276a209a7d6', 'c803ddec-14c4-5d4f-9e84-a4147e446b9c', 'fa3ea695-8482-5f79-9e1c-f7d40209d781', 249, 13.33, 10.67, 273.0, 'host', 'upi', 'paid', 'pay_TEST_A282F61F6B', now() - interval '1 hour'),
  ('a331d640-071f-59d4-ae9b-cc7d7c5720ac', '5c468dbe-590b-5472-9544-ef9147b77333', '745a4419-091c-5bd4-a075-b4b868bf59fe', 449, 9.39, 8.81, 467.2, 'restaurant', 'upi', 'paid', 'pay_TEST_A44379BA20', now() - interval '1 hour'),
  ('dd25d5f0-72d2-5151-a247-0060f814109d', '5c468dbe-590b-5472-9544-ef9147b77333', '1a52dfb7-44c9-5678-b116-8a66f4d3a94e', 957, 20.0, 18.77, 995.77, 'host', 'card', 'paid', 'pay_TEST_35D6673D38', now() - interval '1 hour'),
  ('eff83b6c-af83-5b18-922d-4dcdb456d0c8', '5c468dbe-590b-5472-9544-ef9147b77333', 'edc02e7f-77f4-5d0a-8285-fc3dd982837e', 927, 19.37, 18.18, 964.55, 'host', 'upi', 'paid', 'pay_TEST_013E779113', now() - interval '1 hour'),
  ('ee59e9b2-c631-56ef-9cfc-91cf265d2f88', '5c468dbe-590b-5472-9544-ef9147b77333', '09c16001-aed6-5262-8a79-c4b66d99cdcd', 777, 16.24, 15.24, 808.48, 'host', 'upi', 'paid', 'pay_TEST_8E98BE63E6', now() - interval '1 hour');

drop table pid_map;
