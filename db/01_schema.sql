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
