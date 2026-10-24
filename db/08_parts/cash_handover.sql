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
