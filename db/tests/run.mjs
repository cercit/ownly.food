// Local test of the Ownly Together SQL on PGlite (in-memory Postgres). Never touches Supabase.
// Run: node tests/run.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const NM = 'C:/Users/samsm/OneDrive/Desktop/Claude/PM Projects/AI-Credit-Underwriter/Lov_cercit/node_modules/@electric-sql/pglite/dist/';
const { PGlite } = await import(pathToFileURL(NM + 'index.js').href);
const { pgcrypto } = await import(pathToFileURL(NM + 'contrib/pgcrypto.js').href);

const db = new PGlite({ extensions: { pgcrypto } });
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ', msg); } else { fail++; console.log('  FAIL', msg); } };
const one = async (q, p = []) => (await db.query(q, p)).rows[0];
const throwsLike = async (q, p, re, msg) => {
  try { await db.query(q, p); ok(false, msg + ' (no error)'); }
  catch (e) { ok(re.test(e.message), `${msg} -> "${e.message}"`); }
};

await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon; create role authenticated;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(readFileSync(path.join(here, '..', 'ownly_together_supabase.sql'), 'utf8'));
console.log('applied ownly_together_supabase.sql');

const c = await one(`select (select count(*) from profiles) p, (select count(*) from restaurants) r, (select count(*) from menu_items) m, (select count(*) from group_orders) g`);
ok(+c.p === 0 && +c.r === 8 && +c.m === 57 && +c.g === 0, `fresh start: no demo accounts, catalogue loaded (${c.r} restaurants, ${c.m} dishes)`);

const signup = async (email, name) => (await one(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, name ? { full_name: name } : {}])).id;
const asUser = async u => { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [u]); await db.exec('set role authenticated'); };
const asAnon = async () => { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); await db.exec('set role anon'); };

// sign-ups: unlimited, each makes a profile
const host = await signup('Ananya@Example.org', 'Ananya Rao');
const f1 = await signup('karthik@example.org');
const many = [];
for (let i = 0; i < 14; i++) many.push(await signup(`friend${i}@example.org`, `Friend ${i}`));
const stranger = await signup('someone@example.org', 'Someone Else');
await db.exec('reset role');
ok(+(await one(`select count(*) n from profiles`)).n === 17, 'every sign-up gets a profile (17 sign-ups, no cap)');
ok((await one(`select email from profiles where auth_user_id = $1`, [host])).email === 'ananya@example.org', 'email stored in lower case');
ok((await one(`select full_name from profiles where auth_user_id = $1`, [f1])).full_name === 'karthik', 'no name given: profile uses the part before @ until edited');

await asAnon();
ok(+(await one(`select count(*) n from restaurants`)).n === 8, 'logged-out visitors can browse restaurants');
await throwsLike(`select count(*) from profiles`, [], /permission denied/, 'logged-out visitors cannot read profiles');

// onboarding
await asUser(f1);
await db.query(`update profiles set full_name = 'Karthik Iyer', phone = '+91 90000 10002', consent_location_at = now()`);
ok((await one(`select full_name from profiles`)).full_name === 'Karthik Iyer', 'user completes their own profile');
await db.query(`insert into addresses (user_id, label, label_name, line1, area, city, pincode, lat, lng, gps_accuracy_m, source, is_default)
  values (me(), 'home', 'Home', 'Flat 723', 'HSR Layout', 'Bengaluru', '560102', 12.914289, 77.644995, 12, 'gps', true)`);
await asUser(host);
for (const [label, name, area, pin, lat, lng, def] of [
  ['home', 'Home', 'Koramangala', '560034', 12.933967, 77.627259, true],
  ['office', 'Office', 'Bellandur', '560103', 12.925143, 77.672349, false],
  ['friend', "Rohan's flat", 'Koramangala', '560034', 12.937625, 77.621184, false]]) {
  await db.query(`insert into addresses (user_id, label, label_name, line1, area, city, pincode, lat, lng, gps_accuracy_m, source, is_default)
    values (me(), $1, $2, 'Line 1', $3, 'Bengaluru', $4, $5, $6, 15, 'gps', $7)`, [label, name, area, pin, lat, lng, def]);
}
await throwsLike(`insert into addresses (user_id, label, label_name, line1, area, city, pincode) values (me(), 'home', 'x', 'x', 'x', 'x', '12AB')`, [], /check/, 'pincode must be 6 digits');
const myAddr = (await db.query(`select id, label from addresses`)).rows;
ok(myAddr.length === 3, 'host sees only their own 3 addresses (home, office, friend)');
await throwsLike(`insert into payment_methods (user_id, type, display_label) values (me(), 'card', '4111111111111111')`, [], /check/, 'a full card number is rejected; only masked labels allowed');

// S1 start
const rest = (await one(`select id from restaurants where name = 'Biryani Bros'`)).id;
const office = myAddr.find(r => r.label === 'office').id;
const s1 = (await one(`select create_group_order($1, $2, now() + interval '1 hour') j`, [rest, office])).j;
ok(/^[A-Z0-9]{6}$/.test(s1.share_code) && s1.existing === false, `S1 happy path: group order opened with code ${s1.share_code}`);
ok((await one(`select create_group_order($1, $2, now() + interval '1 hour') j`, [rest, office])).j.existing === true, 'S1 already-done: second start returns the open order');
await throwsLike(`select create_group_order($1, $2, now() - interval '1 minute')`, [rest, office], /future/, 'S1 blocked: past cut-off');
ok(+(await one(`select max_members from group_orders where id = $1`, [s1.id])).max_members === 12, 'group limit is 12 people');

// S2 join and add
const dishes = (await db.query(`select id, name, price, category, is_available from menu_items where restaurant_id = $1 order by price`, [rest])).rows;
const avail = dishes.filter(m => m.is_available);
const biryani = avail.find(m => m.name === 'Chicken Dum Biryani'), veg = avail.find(m => m.name === 'Veg Dum Biryani');
const starter = avail.find(m => m.name === 'Chicken 65'), raita = avail.find(m => m.name === 'Raita');
await one(`select add_item($1, $2, 1, 'Less spicy', false)`, [s1.id, biryani.id]);           // host own: 249
await one(`select add_item($1, $2, 2, null, true)`, [s1.id, starter.id]);                    // host shared: 2 x 179 = 358
await asUser(f1);
const preview = (await one(`select get_group(null, $1) j`, [s1.share_code])).j;
ok(preview.is_member === false && preview.host === 'Ananya Rao', 'non-member with the code sees only a preview');
const j = (await one(`select join_group($1) j`, [s1.share_code.toLowerCase()])).j;
ok(j.already === false, 'S2 happy path: friend joins with the code (any case)');
ok((await one(`select join_group($1) j`, [s1.share_code])).j.already === true, 'S2 already-done: joining twice does not duplicate');
await one(`select add_item($1, $2, 1, null)`, [s1.id, veg.id]);                               // friend own: 199
await throwsLike(`select add_item($1, $2, 1, null)`, [s1.id, dishes.find(m => !m.is_available).id], /not available/, 'S2 blocked: sold-out dish');
const otherDish = (await one(`select id from menu_items where restaurant_id <> $1 limit 1`, [rest])).id;
await throwsLike(`select add_item($1, $2, 1, null)`, [s1.id, otherDish], /not on this restaurant/, 'S2 blocked: dish from another restaurant');
await one(`select add_item($1, $2, 20, null)`, [s1.id, avail.at(-1).id]);
await db.exec('reset role');
await db.query(`delete from order_items where group_order_id = $1 and qty = 20`, [s1.id]);
ok(true, 'no order-value cap: a 20-portion line is accepted (then removed for the split test)');

// third member with nothing of their own, to check shared + charges reach everyone
await asUser(many[0]);
await one(`select join_group($1)`, [s1.share_code]);
// fill the group to 12, then the 13th is turned away
for (let i = 1; i <= 9; i++) { await asUser(many[i]); await one(`select join_group($1)`, [s1.share_code]); }
await asUser(many[10]);
await throwsLike(`select join_group($1)`, [s1.share_code], /full \(12 people\)/, 'the 13th person cannot join');
for (let i = 1; i <= 9; i++) { await asUser(many[i]); await one(`select leave_group($1)`, [s1.id]); }
await asUser(f1);
const cart = (await one(`select get_group($1) j`, [s1.id])).j;
ok(cart.members.length === 3 && cart.members.every(m => !('email' in m)), 'shared cart shows 3 members by name, no emails');
ok(cart.members.flatMap(m => m.items).some(i => i.is_shared), 'shared dishes are flagged in the cart');
ok(cart.deliver_to.area === 'Bellandur' && !('line1' in cart.deliver_to), 'delivery address shows label and area only');
await throwsLike(`select place_group($1, 30, 15, 45)`, [s1.id], /Only the host/, 'only the host can place');
await throwsLike(`insert into order_items (group_order_id, member_id, menu_item_id, qty, unit_price) values ($1, $2, $3, 1, 1)`,
  [s1.id, j.member_id, avail[0].id], /permission denied|row-level security/, 'direct inserts are blocked; writes go through functions');

// S3 place: own dishes full price; shared dishes and Rapido charges split equally across all 3
await asUser(host);
await one(`select place_group($1, 30, 15, 45)`, [s1.id]);
const placed = (await one(`select get_group($1) j`, [s1.id])).j;
const pay = Object.fromEntries(placed.members.map(m => [m.role === 'host' ? 'host' : (m.items.length ? 'f1' : 'f2'), m.payment]));
// shared 358 / 3 = 119.33; charges 90 / 3 = 30; bill 249 + 358 + 199 + 90 = 896
ok(+pay.f1.food === 199 && +pay.f1.shared_share === 119.33 && +pay.f1.charges_share === 30 && +pay.f1.total === 348.33, `friend pays own 199 + shared 119.33 + charges 30 = ₹${pay.f1.total}`);
ok(+pay.f2.food === 0 && +pay.f2.total === 149.33, `member with no own dishes still pays shared + charges = ₹${pay.f2.total}`);
const sum = placed.members.reduce((s, m) => s + +m.payment.total, 0);
ok(Math.abs(sum - 896) < 0.001, `shares add up exactly to the bill (₹${sum.toFixed(2)}; host absorbs the rounding paise)`);
ok(placed.members.every(m => m.payment.status === 'pending'), 'everyone, including the host, starts as pending and pays on the demo screen');
const hp = (await one(`select pay_share($1, 'upi') j`, [s1.id])).j;
ok(hp.status === 'paid', 'host pays their share on the demo screen too');
await asUser(f1);
const p1 = (await one(`select pay_share($1, 'card') j`, [s1.id])).j;
ok(p1.status === 'paid' && /^pay_TEST_/.test(p1.reference), `S3 happy path: friend pays in test mode (${p1.reference})`);
ok((await one(`select pay_share($1, 'card') j`, [s1.id])).j.already === true, 'S3 already-done: paying twice is not charged again');
ok((await one(`select my_group_orders() j`)).j[0].my_payment_status === 'paid', 'friend history shows the order as paid');
await asUser(stranger);
await throwsLike(`select pay_share($1, 'upi')`, [s1.id], /nothing to pay/, 'S3 blocked: a non-member cannot pay');
ok(+(await one(`select count(*) n from group_orders`)).n === 0, 'a stranger cannot read any group order');

// ---------- 05: Chennai catalogue, photos, host split rule ----------
await db.exec('reset role');
await db.exec(readFileSync(path.join(here, '..', '04_security_tidy.sql'), 'utf8').replace(/^\uFEFF/, ''));
await db.exec(readFileSync(path.join(here, '..', '05_chennai_split_images.sql'), 'utf8'));
await db.exec(readFileSync(path.join(here, '..', '05_chennai_split_images.sql'), 'utf8'));
console.log('applied 04 + 05 (05 twice, to prove it can be re-run)');
const k = await one(`select (select count(*) from restaurants) r, (select count(*) from menu_items) m,
  (select count(*) from restaurants where city <> 'Chennai') old, (select count(*) from group_orders) g,
  (select count(*) from menu_items where coalesce(image_url, '') = '') noimg, (select count(*) from restaurants where coalesce(image_url, '') = '') rnoimg,
  (select count(*) from menu_items where not is_available) na`);
ok(+k.r === 15 && +k.m === 150 && +k.old === 0, `catalogue is Chennai only: ${k.r} restaurants, ${k.m} dishes`);
ok(+k.noimg === 0 && +k.rnoimg === 0, 'every restaurant and dish has a photo');
ok(+k.na === 3, '3 dishes marked unavailable');
ok(+k.g === 0, 'old test orders on Bengaluru restaurants were cleared with them');
ok(+(await one(`select count(*) n from restaurants r where veg_only and exists (select 1 from menu_items m where m.restaurant_id = r.id and not m.is_veg)`)).n === 0,
  'no veg-only restaurant lists a non-veg dish');

await asAnon();
ok(+(await one(`select count(*) n from menu_items where image_url like 'https://images.pexels.com/%'`)).n === 150, 'logged-out visitors see dishes with photos');
await throwsLike(`select create_group_order(gen_random_uuid(), gen_random_uuid(), now() + interval '1 hour')`, [], /permission denied/, 'logged-out visitors cannot start a group order');

// equal split: 3 people, food 600 (one person 600, two have nothing), charges 90 -> 690 / 3 = 230 each
await asUser(host);
const che = (await one(`select r.id, (select id from menu_items where restaurant_id = r.id and is_available order by price desc limit 1) dish,
  (select price from menu_items where restaurant_id = r.id and is_available order by price desc limit 1) price
  from restaurants r where r.name = 'Anjappar - Adyar'`));
const eq = (await one(`select create_group_order($1, $2, now() + interval '1 hour', 'equal') j`, [che.id, office])).j;
ok(eq.split_rule === 'equal' && eq.existing === false, `host starts a group with "split everything equally" (${eq.share_code})`);
const dflt = (await one(`select create_group_order((select id from restaurants where name = 'Ratna Cafe - Mylapore'), $1, now() + interval '1 hour') j`, [office])).j;
ok(dflt.split_rule === 'itemised', 'without a choice, the split defaults to "pay for what you ordered"');
await one(`select add_item($1, $2, 1, null, false)`, [eq.id, che.dish]);
await asUser(f1); await one(`select join_group($1)`, [eq.share_code]);
await asUser(many[0]); await one(`select join_group($1)`, [eq.share_code]);
ok((await one(`select get_group(null, $1) j`, [eq.share_code])).j.split_rule === 'equal', 'members see which split rule the host chose');
await asUser(stranger);
const pv = (await one(`select get_group(null, $1) j`, [eq.share_code])).j;
ok(pv.split_rule === 'equal' && pv.image_url && pv.is_member === false, 'the join preview shows the split rule and restaurant photo');
await asUser(host);
await one(`select place_group($1, 40, 20, 30)`, [eq.id]);
const eqp = (await one(`select get_group($1) j`, [eq.id])).j;
const bill = +che.price + 90, each = Math.round(bill / 3 * 100) / 100;
const totals = eqp.members.map(m => +m.payment.total);
ok(eqp.members.filter(m => m.role !== 'host').every(m => +m.payment.total === each), `equal split: each member pays ₹${each} of ₹${bill}`);
ok(Math.abs(totals.reduce((a, b) => a + b, 0) - bill) < 0.001, `equal split: shares add up exactly to ₹${bill}`);
ok(eqp.members.every(m => m.payment.status === 'pending'), 'equal split: everyone, host included, starts as pending');
ok(eqp.members.flatMap(m => m.items).every(i => i.image_url), 'cart items carry their photos');

// ---------- 06: delivered + shared tracking clock ----------
await db.exec('reset role');
// live Supabase grants every table privilege to anon and authenticated by default; copy that before 06
await db.exec(`grant all on all tables in schema public to anon, authenticated`);
await db.exec(readFileSync(path.join(here, '..', '06_delivered.sql'), 'utf8'));
await db.exec(readFileSync(path.join(here, '..', '06_delivered.sql'), 'utf8'));
console.log('applied 06 (twice)');
await asUser(f1);
const beforeDel = (await one(`select get_group($1) j`, [eq.id])).j;
ok(beforeDel.placed_at && beforeDel.delivered_at === null, 'members get the placed time, so every phone runs the same tracking clock');
await asUser(stranger);
await throwsLike(`select mark_delivered($1)`, [eq.id], /Join this group/, 'a non-member cannot mark an order delivered');
await asUser(f1);
const del = (await one(`select mark_delivered($1) j`, [eq.id])).j;
ok(del.status === 'delivered' && del.already === false, 'a member\'s app marks the order delivered when tracking finishes');
ok((await one(`select mark_delivered($1) j`, [eq.id])).j.already === true, 'marking delivered twice is harmless');
ok((await one(`select my_group_orders() j`)).j.find(o => o.id === eq.id).status === 'delivered', 'order history shows Delivered');
await asUser(host);
await throwsLike(`select mark_delivered($1)`, [dflt.id], /Only a placed order/, 'an order that is still open cannot be marked delivered');
await asAnon();
await throwsLike(`select mark_delivered($1)`, [eq.id], /permission denied/, 'logged-out visitors cannot call it');
await throwsLike(`insert into restaurants (name, cuisine, area, city, opens_at, closes_at) values ('x','x','x','Chennai','10:00','22:00')`, [],
  /permission denied/, 'logged-out visitors cannot add restaurants');
await throwsLike(`delete from menu_items`, [], /permission denied/, 'logged-out visitors cannot delete dishes');
ok(+(await one(`select count(*) n from menu_items`)).n === 150, 'logged-out visitors can still browse all 150 dishes');

await asUser(f1);
await db.query(`update profiles set full_name = 'Karthik I.', phone = '+91 90000 10003'`);
ok((await one(`select full_name from profiles`)).full_name === 'Karthik I.', 'people can still edit their own name and phone');
await throwsLike(`update profiles set email = 'someone-else@example.org'`, [], /permission denied/, 'people cannot change their profile email');
await throwsLike(`update profiles set auth_user_id = gen_random_uuid()`, [], /permission denied/, 'people cannot change their login link');
await throwsLike(`insert into payments (group_order_id, member_id, food_amount, shared_share, delivery_share, tax_share, total, payee, status)
  select group_order_id, member_id, 0, 0, 0, 0, 0, 'host', 'paid' from payments limit 1`, [], /permission denied/, 'nobody can write payments directly');
await throwsLike(`update group_orders set status = 'delivered'`, [], /permission denied/, 'nobody can change an order status directly');
await db.query(`insert into addresses (user_id, label, label_name, line1, area, city, pincode) values (me(), 'office', 'Office', 'Tidel Park', 'OMR', 'Chennai', '600113')`);
ok(+(await one(`select count(*) n from addresses where city = 'Chennai'`)).n === 1, 'people can still save their own addresses');

// audit log: run a full group order after 06, then read the record
const mine = (await db.query(`select table_name, action, changes from audit_log where group_order_id is null order by id`)).rows;
const nameChange = mine.find(a => a.table_name === 'profiles' && a.action === 'update');
ok(nameChange && nameChange.changes.full_name.to === 'Karthik I.' && !('email' in nameChange.changes),
  `profile edit recorded with only what changed (name: "${nameChange?.changes.full_name.from}" -> "${nameChange?.changes.full_name.to}")`);
ok(mine.some(a => a.table_name === 'addresses' && a.action === 'insert'), 'saving an address is recorded');
await asUser(host);
const ratnaDish = (await one(`select id from menu_items where restaurant_id = (select restaurant_id from group_orders where id = $1) and is_available limit 1`, [dflt.id])).id;
await one(`select add_item($1, $2, 2, 'extra chutney', false)`, [dflt.id, ratnaDish]);
await asUser(f1); await one(`select join_group($1)`, [dflt.share_code]);
await asUser(host); await one(`select lock_group($1)`, [dflt.id]); await one(`select place_group($1, 30, 0, 0)`, [dflt.id]);
await one(`select pay_share($1, 'upi')`, [dflt.id]);
const trail = (await db.query(`select table_name, action, actor_id, changes from audit_log where group_order_id = $1 order by id`, [dflt.id])).rows;
const has = (t, a, f = () => true) => trail.some(x => x.table_name === t && x.action === a && f(x));
ok(has('order_items', 'insert', x => x.changes.notes === 'extra chutney'), 'adding a dish is recorded, with its note');
ok(has('group_members', 'insert'), 'joining is recorded');
ok(has('group_orders', 'update', x => x.changes.status?.from === 'open' && x.changes.status?.to === 'locked'), 'lock recorded as status open -> locked');
ok(has('group_orders', 'update', x => x.changes.status?.to === 'placed'), 'placing the order is recorded');
ok(has('payments', 'update', x => x.changes.status?.to === 'paid'), 'a payment is recorded as pending -> paid');
ok(trail.every(x => x.actor_id), 'every group action records who did it');
await asUser(f1);
ok(+(await one(`select count(*) n from audit_log where group_order_id = $1`, [dflt.id])).n === trail.length, 'group members can see the group\'s full history');
await asUser(stranger);
ok(+(await one(`select count(*) n from audit_log`)).n === 0, 'outsiders see none of it');
await asUser(host);
await throwsLike(`insert into audit_log (table_name, action) values ('x', 'insert')`, [], /permission denied/, 'nobody can add to the audit log');
await throwsLike(`delete from audit_log`, [], /permission denied/, 'nobody can delete from the audit log');
await db.query(`insert into payment_methods (user_id, type, display_label, gateway_token) values (me(), 'card', 'Visa •••• 4242', 'tok_secret_123')`);
await db.exec('reset role');
ok(+(await one(`select count(*) n from audit_log where changes::text like '%tok_secret%'`)).n === 0, 'payment gateway tokens are never copied into the log');

await db.exec('reset role');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
