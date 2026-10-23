-- Ownly Together 06 (24 Oct 2026): mark an order delivered, send placed/delivered times to the app,
-- tighten table permissions, and keep an audit log of every change
-- Run once in the Supabase SQL editor, after 05. Safe to re-run.
-- Built by db/make_06.py (get_group is copied from 05 with placed_at and delivered_at added).

-- Tracking in the prototype steps forward on a timer counted from placed_at, so every phone in
-- the group shows the same stage. When the timer reaches "Delivered", any member's app calls this.
create or replace function mark_delivered(p_group uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare g group_orders;
begin
  if not is_member(p_group) then raise exception 'Join this group order first'; end if;
  select * into g from group_orders where id = p_group;
  if g.status = 'delivered' then
    return json_build_object('status', 'delivered', 'delivered_at', g.delivered_at, 'already', true);
  end if;
  if g.status <> 'placed' then raise exception 'Only a placed order can be delivered'; end if;
  update group_orders set status = 'delivered', delivered_at = now() where id = p_group returning * into g;
  return json_build_object('status', 'delivered', 'delivered_at', g.delivered_at, 'already', false);
end $$;
revoke execute on function mark_delivered(uuid) from public, anon;
grant execute on function mark_delivered(uuid) to authenticated;

-- Tighten Supabase's default table grants (row-level security already blocks these; this removes the reliance on it)
revoke all on restaurants, menu_items, profiles, addresses, payment_methods,
              group_orders, group_members, order_items, payments from anon, authenticated;
grant select on restaurants, menu_items to anon, authenticated;
grant select on profiles, group_orders, group_members, order_items, payments to authenticated;
grant select, insert, update, delete on addresses, payment_methods to authenticated;
-- profile: people may edit only these columns (not email or the login link)
grant update (full_name, phone, default_address_id, consent_location_at) on profiles to authenticated;

-- ---------- audit log: every change to orders, members, items, payments, profiles and addresses ----------
-- Written only by triggers; nobody can insert, edit or delete it from the app.
-- Updates store only the columns that changed (from -> to). Payment gateway tokens are never copied.
create table if not exists audit_log (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  actor_id       uuid,          -- profile that made the change (null for system actions such as sign-up)
  table_name     text not null,
  action         text not null, -- insert / update / delete
  row_id         uuid,
  group_order_id uuid,          -- set for group-order rows, so the group can see its own history
  changes        jsonb
);
create index if not exists audit_log_group_idx on audit_log (group_order_id, at);
create index if not exists audit_log_actor_idx on audit_log (actor_id, at);
alter table audit_log enable row level security;
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select using (
  (group_order_id is not null and is_member(group_order_id)) or (group_order_id is null and actor_id = me()));
revoke all on audit_log from anon, authenticated;
grant select on audit_log to authenticated;

create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare o jsonb; n jsonb; r jsonb; ch jsonb;
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old) - 'gateway_token'; end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new) - 'gateway_token'; end if;
  r := coalesce(n, o);
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('from', o -> k, 'to', n -> k)) into ch
      from jsonb_object_keys(n) k where n -> k is distinct from o -> k;
    if ch is null then return null; end if;
  else
    ch := r;
  end if;
  insert into audit_log (actor_id, table_name, action, row_id, group_order_id, changes)
  values (me(), tg_table_name, lower(tg_op), (r ->> 'id')::uuid,
          case when tg_table_name = 'group_orders' then (r ->> 'id')::uuid else (r ->> 'group_order_id')::uuid end, ch);
  return null;
end $$;
revoke execute on function audit_row() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['group_orders', 'group_members', 'order_items', 'payments', 'profiles', 'addresses', 'payment_methods'] loop
    execute format('drop trigger if exists audit_%1$s on %1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_row()', t);
  end loop;
end $$;
