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


-- ---------- 3. Chennai catalogue (15 restaurants, 150 dishes) ----------
-- Old Bengaluru/Hyderabad restaurants go, with any test group orders placed on them.
delete from group_orders where restaurant_id in (select id from restaurants where city <> 'Chennai');
delete from restaurants where city <> 'Chennai';

insert into restaurants (name, cuisine, area, city, lat, lng, veg_only, opens_at, closes_at, active, image_url)
select * from (values
  ('Murugan Idli Shop - T. Nagar', 'South Indian', 'T. Nagar', 'Chennai', 13.037618, 80.230685, true, time '11:00', time '23:00', true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('McDonald''s - T. Nagar', 'Burgers / Fast Food', 'T. Nagar', 'Chennai', 13.040152, 80.245117, false, time '10:00', time '00:45', true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'South Indian / North Indian', 'Adyar', 'Chennai', 13.008130, 80.258800, true, time '06:30', time '22:30', true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Anjappar - Adyar', 'Chettinad / Biryani', 'Adyar', 'Chennai', 13.006741, 80.257615, false, time '11:30', time '00:00', true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Pind - Velachery', 'North Indian / Punjabi', 'Velachery', 'Chennai', 12.975130, 80.222025, true, time '12:00', time '23:00', true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pizza Hut - Velachery', 'Pizza / Fast Food', 'Velachery', 'Chennai', 12.975090, 80.220489, false, time '11:00', time '23:00', true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'South Indian / Sweets', 'OMR', 'Chennai', 12.944193, 80.237540, true, time '06:00', time '00:00', true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Biryani / South Indian', 'OMR', 'Chennai', 12.941390, 80.236080, false, time '11:00', time '01:00', true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Chinese / Indo-Chinese', 'Anna Nagar', 'Chennai', 13.087700, 80.213200, false, time '11:00', time '23:00', true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Ice Cream / Desserts', 'Anna Nagar', 'Chennai', 13.085306, 80.204306, true, time '11:00', time '02:30', true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'North Indian / Modern Indian', 'Nungambakkam', 'Chennai', 13.066834, 80.254041, false, time '11:00', time '23:00', true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Cafe / Desserts / Continental', 'Nungambakkam', 'Chennai', 13.061089, 80.248250, false, time '09:00', time '23:00', true, 'https://images.pexels.com/photos/13215205/pexels-photo-13215205.jpeg'),
  ('Ratna Cafe - Mylapore', 'South Indian', 'Mylapore', 'Chennai', 13.031810, 80.272450, true, time '07:30', time '23:30', true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Nithya Amirtham - Mylapore', 'South Indian / Sweets', 'Mylapore', 'Chennai', 13.034544, 80.268043, true, time '06:00', time '22:30', true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'South Indian / North Indian', 'Mylapore', 'Chennai', 13.032452, 80.267786, true, time '07:00', time '23:00', true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg')
) v(name, cuisine, area, city, lat, lng, veg_only, opens_at, closes_at, active, image_url)
where not exists (select 1 from restaurants x where x.name = v.name);

insert into menu_items (restaurant_id, name, category, price, is_veg, is_available, image_url)
select r.id, v.name, v.category, v.price, v.is_veg, v.is_available, v.image_url from (values
  ('Murugan Idli Shop - T. Nagar', 'Idli 3 Pcs', 'Tiffin', 114, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Ghee Podi Idli 1pcs', 'Tiffin', 77, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Mini Podi Idli', 'Tiffin', 182, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Sambar Idli', 'Tiffin', 120, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Medhu Vadai', 'Tiffin', 61, true, true, 'https://images.pexels.com/photos/20422135/pexels-photo-20422135.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Plain Dosai', 'Tiffin', 163, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Ghee Dosai', 'Tiffin', 230, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Ghee Podi Dosai', 'Tiffin', 265, true, false, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Ghee Masala Dosai', 'Tiffin', 269, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Murugan Idli Shop - T. Nagar', 'Onion Uthappam', 'Tiffin', 234, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('McDonald''s - T. Nagar', 'McAloo Tikki Burger with Cheese', 'Burgers', 105, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'Mexican McAloo Tikki with Cheese', 'Burgers', 105, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'McSpicy Paneer Burger', 'Burgers', 225, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'McSpicy Chicken Burger', 'Burgers', 225, false, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'Signature Whole Muscle Chicken Burger', 'Burgers', 229, false, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'McChicken Burger Combo', 'Combos', 325, false, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'McSpicy Paneer Burger Combo', 'Combos', 355, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'Mexican McAloo Tikki Double Patty Burger Combo', 'Combos', 255, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'McAloo Tikki Burger Happy Meal', 'Combos', 225, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('McDonald''s - T. Nagar', 'Fries (Regular)', 'Starters', 110, true, true, 'https://images.pexels.com/photos/20722041/pexels-photo-20722041.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Kadubu Idly (2 Nos)', 'Tiffin', 180, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Ghee Podi Dosa', 'Tiffin', 230, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Masala Dosa', 'Tiffin', 200, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'South Indian Meals', 'Combos', 300, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Veg Manchurian', 'Chinese', 384, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Sweet Pongal', 'Desserts', 143, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Rasa Malai', 'Desserts', 156, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Basundhi', 'Desserts', 156, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Gulab Jamun', 'Desserts', 114, true, true, 'https://images.pexels.com/photos/7449105/pexels-photo-7449105.jpeg'),
  ('Sangeetha Veg Restaurant - Adyar', 'Special Coffee', 'Beverages', 75, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Anjappar - Adyar', 'Mutton Biriyani', 'Biryani', 429, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Vegetable Biriyani', 'Biryani', 290, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Chicken Meals', 'Combos', 320, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Chicken ''65'' (b/l)', 'Starters', 235, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Tandoori Chicken', 'Starters', 280, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Chicken Tikka', 'Starters', 390, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Anjappar Poricha Kozhi', 'Starters', 420, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Egg Masala', 'Mains', 179, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Anjappar - Adyar', 'Idly (2pc)', 'Tiffin', 75, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Anjappar - Adyar', 'Idiyappam (1 Pc)', 'Tiffin', 35, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Pind - Velachery', 'Vegetable Seekh Kebab', 'Starters', 350, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Royal Mix Paneer Tikka', 'Starters', 404, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Paneer Butter Masala', 'Mains', 379, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Kadhai Paneer', 'Mains', 379, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Palak Paneer', 'Mains', 369, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Sarson Ka Saag Te Makki Di Roti Combo', 'Combos', 467, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Family Naan', 'Breads', 233, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Khasta Roti', 'Breads', 99, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Veg Pulao', 'Rice', 279, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pind - Velachery', 'Special Dum Biryani', 'Biryani', 309, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Pizza Hut - Velachery', 'Margherita', 'Pizza', 149, true, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Corn & Cheese', 'Pizza', 229, true, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Veggie Feast', 'Pizza', 229, true, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Classic Corn', 'Pizza', 105, true, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Chicken Pepperoni', 'Pizza', 399, false, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Garlic Bread', 'Breads', 149, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Pizza Hut - Velachery', 'Classic White Sauce Pasta Veg', 'Mains', 279, true, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Italian Red Sauce Pasta Veg', 'Mains', 229, true, true, 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg'),
  ('Pizza Hut - Velachery', 'Choco Volcano', 'Desserts', 119, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Pizza Hut - Velachery', 'Brow-wow-nie', 'Desserts', 109, true, true, 'https://images.pexels.com/photos/13215205/pexels-photo-13215205.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Ghee Roast', 'Tiffin', 230, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Butter Roast', 'Tiffin', 230, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Podi Uthappam', 'Tiffin', 170, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Ghee Onion Rava Dosa', 'Tiffin', 230, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Ghee Onion Rava Masala Dosa', 'Tiffin', 255, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Ghee Pongal', 'Tiffin', 150, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Curd Rice', 'Rice', 140, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Kuzhi Paniyaram Sweet (6 Pcs)', 'Desserts', 160, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Chikoo Milkshake', 'Beverages', 280, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Geetham Veg Restaurant - OMR', 'Ghee Mysore Pak (500 Gms)', 'Desserts', 514, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Naidu Mutton Biryani', 'Biryani', 399, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Chicken 65 Biryani', 'Biryani', 375, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Mutton Kola Biryani', 'Biryani', 375, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Egg Biryani', 'Biryani', 285, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Mushroom Biryani', 'Biryani', 300, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Veg Biryani', 'Biryani', 290, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Paneer Biryani', 'Biryani', 330, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Guntur Chicken Biryani', 'Biryani', 370, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Thalappakatti Guntur Mushroom Biryani', 'Biryani', 330, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Dindigul Thalappakatti - OMR', 'Chicken Biryani Jumbo (serves 3)', 'Biryani', 969, false, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Desi Chilli Potato - Mini', 'Starters', 189, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Veg Wheat Momo With Momo Chutney', 'Starters', 307, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Chicken Wheat Momo With Momo Chutney', 'Starters', 337, false, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Classic Salted Fries', 'Starters', 148, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Fries + Schezwan Sprinkler', 'Starters', 148, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Veg Manchow Soup with Crispy Noodles', 'Chinese', 179, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Chowmein Chicken - Half (500 ml)', 'Chinese', 249, false, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Chicken Manchurian Gravy - Half', 'Chinese', 269, false, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Hunan Chicken Dry - Mini', 'Chinese', 229, false, false, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Chinese Wok - Anna Nagar', 'Veg Hakka Noodles - Half', 'Chinese', 229, true, true, 'https://images.pexels.com/photos/30676160/pexels-photo-30676160.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Oreo Shot Ice Cream', 'Desserts', 210, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Almond Nutella Fudge', 'Desserts', 250, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'La-Ferrero Ice Cream', 'Desserts', 250, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Coffee Craze', 'Desserts', 230, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Lotus Biscoff Ice Cream', 'Desserts', 250, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Tiramisu Ice Cream', 'Desserts', 230, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Sugar Free Choco Brownie', 'Desserts', 230, true, true, 'https://images.pexels.com/photos/13215205/pexels-photo-13215205.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Classic Cold Coffee', 'Beverages', 230, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Oreo Cold Coffee', 'Beverages', 250, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Cream Stone Ice Cream - Anna Nagar', 'Ferrero Delight Thick Shake', 'Beverages', 245, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Nawabi Veg Biryani', 'Biryani', 635, true, true, 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Himalayan Cheese Mushrooms', 'Starters', 570, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Grilled Anardaana Paneer', 'Starters', 640, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Indori Bhutta Scramble', 'Starters', 450, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Fiery Thecha Prawns', 'Starters', 670, false, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Calcutta Club Fish Fry', 'Starters', 820, false, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Kashmiri Mutton Seekh Kebab with Naan', 'Mains', 900, false, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Chur Chur Paratha', 'Breads', 165, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Lachedar Burnt Garlic Naan', 'Breads', 150, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Bombay Brasserie - Nungambakkam', 'Kaapi Misu', 'Desserts', 415, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Tiny Chocolate Cake', 'Desserts', 400, false, false, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Nutella Tiramisu', 'Desserts', 450, false, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Triple Chocolate Brownie', 'Desserts', 350, false, true, 'https://images.pexels.com/photos/13215205/pexels-photo-13215205.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Milo Tiramisu', 'Desserts', 494, false, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Chocolate Croissant', 'Desserts', 221, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Chicken Drums - 4 Pcs', 'Starters', 555, false, true, 'https://images.pexels.com/photos/13215205/pexels-photo-13215205.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Tiny Cake Shake', 'Beverages', 475, false, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Mocha', 'Beverages', 350, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Americano', 'Beverages', 245, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Sandy''s Chocolate Laboratory - Nungambakkam', 'Iced Mocha', 'Beverages', 375, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Ratna Cafe - Mylapore', 'Plain Idly (2)', 'Tiffin', 82, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Ratna Cafe - Mylapore', 'Sambar Idly (2)', 'Tiffin', 120, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Ratna Cafe - Mylapore', 'Ghee Pongal', 'Tiffin', 110, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Ratna Cafe - Mylapore', 'Medhu Vadai', 'Tiffin', 69, true, true, 'https://images.pexels.com/photos/20422135/pexels-photo-20422135.jpeg'),
  ('Ratna Cafe - Mylapore', 'Onion Rava Dosa', 'Tiffin', 180, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Ratna Cafe - Mylapore', 'Podi Masala Dosa', 'Tiffin', 180, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Ratna Cafe - Mylapore', 'Plain Oothappam', 'Tiffin', 130, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Ratna Cafe - Mylapore', 'Onion Podi Oothappam', 'Tiffin', 200, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Ratna Cafe - Mylapore', 'Badam Halwa (1pc)', 'Desserts', 80, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg'),
  ('Ratna Cafe - Mylapore', 'Spl Filter Coffee', 'Beverages', 75, true, true, 'https://images.pexels.com/photos/16536171/pexels-photo-16536171.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Idli(2 Pcs)', 'Tiffin', 79, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Plain Dosa', 'Tiffin', 143, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Ghee Dosa', 'Tiffin', 207, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Ghee Masala Dosa', 'Tiffin', 231, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Masala Dosa', 'Tiffin', 176, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Onion Rava Dosa', 'Tiffin', 184, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Poori(2 Pcs)', 'Tiffin', 153, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Idiyappam(3 Pcs)', 'Tiffin', 153, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Chole Poori', 'Tiffin', 207, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Nithya Amirtham - Mylapore', 'Guntur Podi Idli(2 Pcs)', 'Tiffin', 143, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Idly', 'Tiffin', 80, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Pongal', 'Tiffin', 125, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Medhu Vadai [1 Pc]', 'Tiffin', 70, true, true, 'https://images.pexels.com/photos/20422135/pexels-photo-20422135.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Sambar Vadai', 'Tiffin', 85, true, true, 'https://images.pexels.com/photos/20422135/pexels-photo-20422135.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Poori With Sd [3 Pcs]', 'Tiffin', 150, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Chapathi With Sd', 'Breads', 150, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Parotta With Sd', 'Breads', 150, true, true, 'https://images.pexels.com/photos/20446413/pexels-photo-20446413.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Mini Tiffin', 'Combos', 240, true, true, 'https://images.pexels.com/photos/36854501/pexels-photo-36854501.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Rava Kitchadi', 'Tiffin', 105, true, true, 'https://images.pexels.com/photos/35351659/pexels-photo-35351659.jpeg'),
  ('Sangeetha Veg Restaurant - Mylapore', 'Rava Kesari', 'Desserts', 120, true, true, 'https://images.pexels.com/photos/9227722/pexels-photo-9227722.jpeg')
) v(restaurant, name, category, price, is_veg, is_available, image_url)
join restaurants r on r.name = v.restaurant
where not exists (select 1 from menu_items x where x.restaurant_id = r.id and x.name = v.name);
