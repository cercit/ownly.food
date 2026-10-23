-- Ownly Together: tidy-up after the security check. Run once.
revoke execute on function create_group_order(uuid, uuid, timestamptz), join_group(text),
  add_item(uuid, uuid, int, text, boolean), remove_item(uuid), leave_group(uuid), lock_group(uuid),
  place_group(uuid, numeric, numeric, numeric), cancel_group(uuid), pay_share(uuid, pay_method),
  get_group(uuid, text), my_group_orders(), me(), is_member(uuid) from public, anon;
grant execute on function create_group_order(uuid, uuid, timestamptz), join_group(text),
  add_item(uuid, uuid, int, text, boolean), remove_item(uuid), leave_group(uuid), lock_group(uuid),
  place_group(uuid, numeric, numeric, numeric), cancel_group(uuid), pay_share(uuid, pay_method),
  get_group(uuid, text), my_group_orders(), me(), is_member(uuid) to authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
alter function group_value(uuid) set search_path = public, extensions;
