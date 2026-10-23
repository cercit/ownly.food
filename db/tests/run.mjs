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
const sqlFile = f => readFileSync(path.join(here, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ', msg); } else { fail++; console.log('  FAIL', msg); } };
const one = async (q, p = []) => (await db.query(q, p)).rows[0];
const throwsLike = async (q, p, re, msg) => {
  try { await db.query(q, p); ok(false, msg + ' (no error)'); }
  catch (e) { ok(re.test(e.message), `${msg} -> "${e.message}"`); }
};

// Supabase stand-ins: auth schema, auth.uid(), roles
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon; create role authenticated;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(sqlFile('ownly_together_supabase.sql'));
console.log('applied ownly_together_supabase.sql');

const c = await one(`select (select count(*) from profiles) p, (select count(*) from addresses) a, (select count(*) from restaurants) r,
  (select count(*) from menu_items) m, (select count(*) from group_orders) g, (select count(*) from payments) pay`);
ok(+c.p === 12 && +c.r === 8 && +c.g === 6, `seed loaded (profiles ${c.p}, addresses ${c.a}, restaurants ${c.r}, dishes ${c.m}, groups ${c.g}, payments ${c.pay})`);
const bad = await one(`select count(*) n from (select group_order_id, sum(total) t from payments group by 1) s
  join group_orders g on g.id = s.group_order_id
  where abs(s.t - ((select sum(qty*unit_price) from order_items where group_order_id = g.id) + g.delivery_fee + g.packaging_fee + g.taxes)) > 0.001`);
ok(+bad.n === 0, 'seeded shares add up exactly to each bill');

// sign-ups through the trigger
const host = (await one(`insert into auth.users (email) values ('demo.host@example.com') returning id`)).id;
const f1 = (await one(`insert into auth.users (email) values ('DEMO.friend1@example.com') returning id`)).id;
const stranger = (await one(`insert into auth.users (email, raw_user_meta_data) values ('new.person@example.org', '{"full_name":"New Person"}') returning id`)).id;
ok((await one(`select full_name from profiles where auth_user_id = $1`, [host])).full_name === 'Ananya Rao', 'OTP login links the seeded demo profile by email');
ok((await one(`select full_name from profiles where auth_user_id = $1`, [stranger])).full_name === 'New Person', 'a brand-new email gets its own profile');

const as = async u => { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [u]); await db.exec(`set role authenticated`); };

// privacy
await as(host);
ok(+(await one(`select count(*) n from profiles`)).n === 1, 'host sees only their own profile');
const myAddr = await db.query(`select id, label from addresses`);
ok(myAddr.rows.length === 3 && myAddr.rows.every(r => ['home', 'office', 'friend'].includes(r.label)), 'host sees only their own 3 addresses');
ok(+(await one(`select count(*) n from payment_methods`)).n === 2, 'host sees only their own payment methods');
ok(+(await one(`select count(*) n from restaurants`)).n === 8, 'restaurants are browsable');
const mine = (await one(`select my_group_orders() j`)).j;
ok(mine.length === 3, `history shows the host's 3 seeded group orders (${mine.map(x => x.share_code).join(', ')})`);

// S1 start
const tiffin = (await one(`select id from restaurants where name = 'Biryani Bros'`)).id;
const office = myAddr.rows.find(r => r.label === 'office').id;
const s1 = (await one(`select create_group_order($1, $2, now() + interval '1 hour') j`, [tiffin, office])).j;
ok(/^[A-Z0-9]{6}$/.test(s1.share_code) && s1.existing === false, `S1 happy path: group order opened with code ${s1.share_code}`);
const s1b = (await one(`select create_group_order($1, $2, now() + interval '1 hour') j`, [tiffin, office])).j;
ok(s1b.existing === true && s1b.id === s1.id, 'S1 already-done: second start returns the open order');
await throwsLike(`select create_group_order($1, $2, now() - interval '1 minute')`, [tiffin, office], /future/, 'S1 blocked: past cut-off');
await db.exec('reset role');
const otherAddr = (await db.query(`select id from addresses where label = 'home' and user_id <> (select id from profiles where auth_user_id = $1) limit 1`, [host])).rows;
await as(host);
await throwsLike(`select create_group_order($1, $2, now() + interval '1 hour')`, [tiffin, otherAddr[0]?.id ?? '00000000-0000-0000-0000-000000000000'], /saved addresses/, "S1 blocked: someone else's address");

// S2 join and add
const biryani = (await db.query(`select id, name, price, is_available from menu_items where restaurant_id = $1 order by price`, [tiffin])).rows;
await one(`select add_item($1, $2, 1, 'Less spicy')`, [s1.id, biryani.find(m => m.is_available).id]);
await as(f1);
const preview = (await one(`select get_group(null, $1) j`, [s1.share_code])).j;
ok(preview.is_member === false && preview.host === 'Ananya Rao' && !preview.members_list, 'non-member with the code sees only a preview');
const j = (await one(`select join_group($1) j`, [s1.share_code.toLowerCase()])).j;
const j_profile = (await one(`select me() id`)).id;
ok(j.already === false, 'S2 happy path: friend joins with the code (any case)');
ok((await one(`select join_group($1) j`, [s1.share_code])).j.already === true, 'S2 already-done: joining twice does not duplicate');
await one(`select add_item($1, $2, 2, null)`, [s1.id, biryani.filter(m => m.is_available)[1].id]);
await throwsLike(`select add_item($1, $2, 1, null)`, [s1.id, biryani.find(m => !m.is_available).id], /not available/, 'S2 blocked: sold-out dish');
const otherDish = (await db.query(`select id from menu_items where restaurant_id <> $1 limit 1`, [tiffin])).rows[0].id;
await throwsLike(`select add_item($1, $2, 1, null)`, [s1.id, otherDish], /not on this restaurant/, 'S2 blocked: dish from another restaurant');
await throwsLike(`select add_item($1, $2, 9, null)`, [s1.id, biryani.filter(m => m.is_available).at(-1).id], /over ₹2000/, 'S2 blocked: order would pass ₹2,000');
const cart = (await one(`select get_group($1) j`, [s1.id])).j;
ok(cart.members.length === 2 && cart.members.every(m => !('email' in m)), 'shared cart shows 2 members by name, no emails');
ok(cart.deliver_to.area && !('line1' in cart.deliver_to), 'delivery address shows label and area only');
ok((await db.query(`select user_id from addresses`)).rows.every(r => r.user_id === j_profile), "friend still sees only their own addresses, not the host's");
await throwsLike(`select place_group($1, 30, 10, 20)`, [s1.id], /Only the host/, 'only the host can place');
await throwsLike(`insert into order_items (group_order_id, member_id, menu_item_id, qty, unit_price) values ($1, $2, $3, 1, 1)`,
  [s1.id, j.member_id, biryani[0].id], /permission denied|row-level security/, 'direct inserts are blocked; writes go through functions');

// S3 place and pay
await as(host);
await one(`select place_group($1, 30, 10, 20)`, [s1.id]);
const placed = (await one(`select get_group($1) j`, [s1.id])).j;
const sum = placed.members.reduce((s, m) => s + +m.payment.total, 0);
ok(Math.abs(sum - (+placed.food_total + 60)) < 0.001, `shares add up to the bill (₹${sum.toFixed(2)})`);
ok(placed.members.find(m => m.role === 'host').payment.status === 'paid', "host's own share is marked paid (they paid the restaurant)");
await as(f1);
const pay = (await one(`select pay_share($1, 'upi') j`, [s1.id])).j;
ok(pay.status === 'paid' && /^pay_TEST_/.test(pay.reference), `S3 happy path: friend pays in test mode (${pay.reference})`);
ok((await one(`select pay_share($1, 'upi') j`, [s1.id])).j.already === true, 'S3 already-done: paying twice is not charged again');
await as(stranger);
await throwsLike(`select pay_share($1, 'upi')`, [s1.id], /nothing to pay/, 'S3 blocked: a non-member cannot pay');
ok(+(await one(`select count(*) n from group_orders`)).n === 0, 'a stranger cannot read any group order');

await db.exec('reset role');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
