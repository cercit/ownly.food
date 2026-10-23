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
